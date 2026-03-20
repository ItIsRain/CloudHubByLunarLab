import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import {
  dbRowToCompetitionPhase,
  phaseFormToDbRow,
} from "@/lib/supabase/mappers";
import { checkHackathonAccess, canEdit } from "@/lib/check-hackathon-access";

const VALID_PHASE_TYPES = ["bootcamp", "final", "custom"] as const;

// ─── Helpers ─────────────────────────────────────────────

async function authenticateOrganizer(
  request: NextRequest,
  hackathonId: string
) {
  const auth = await authenticateRequest(request);

  if (auth.type === "unauthenticated") {
    return {
      auth: null,
      supabase: null,
      hackathon: null,
      error: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    } as const;
  }

  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) {
      return {
        auth: null,
        supabase: null,
        hackathon: null,
        error: NextResponse.json({ error: scopeError }, { status: 403 }),
      } as const;
    }
  }

  // Always use admin client — API-level auth + RBAC is the gate.
  // RLS on competition_phases has circular dependency with phase_reviewers.
  const supabase = getSupabaseAdminClient();

  // Check access via RBAC (canEdit check is done by caller)
  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess || !canEdit(access.role)) {
    return {
      auth: null,
      supabase: null,
      hackathon: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id, screening_config")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) {
    return {
      auth: null,
      supabase: null,
      hackathon: null,
      error: NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      ),
    } as const;
  }

  return { auth, supabase, hackathon, error: null } as const;
}

// ─── GET /api/hackathons/[hackathonId]/phases ────────────
// Public read: returns basic phase info (name, dates, type, status)
// Authenticated organizer: returns full data with aggregate counts

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

    // Try to authenticate — but allow public access for basic reads
    const auth = await authenticateRequest(request);
    const isAuthenticated = auth.type !== "unauthenticated";

    // Always use admin client for reading phases (public endpoint).
    // The organizer check below gates access to aggregate counts.
    const adminSb = getSupabaseAdminClient();

    // Check if the user is the organizer (for extended data)
    let isOrganizer = false;
    let hackathon: Record<string, unknown> | null = null;

    const { data: hackathonRow } = await adminSb
      .from("hackathons")
      .select("organizer_id, screening_config")
      .eq("id", hackathonId)
      .single();

    if (!hackathonRow) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    hackathon = hackathonRow as Record<string, unknown>;
    isOrganizer = isAuthenticated && hackathon.organizer_id === auth.userId;

    // Fetch all phases ordered by sort_order
    const { data: phases, error: phasesError } = await adminSb
      .from("competition_phases")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("sort_order", { ascending: true });

    if (phasesError) {
      return NextResponse.json(
        { error: "Failed to fetch phases" },
        { status: 500 }
      );
    }

    if (!phases || phases.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Public read: return basic phase info only
    if (!isOrganizer) {
      const data = phases.map((p) => dbRowToCompetitionPhase(p as Record<string, unknown>));
      return NextResponse.json({ data });
    }

    // ── Organizer-only: aggregate counts ──────────────────
    const phaseIds = phases.map((p) => (p as Record<string, unknown>).id as string);

    const [reviewersResult, scoresResult, assignmentsResult] =
      await Promise.all([
        adminSb
          .from("phase_reviewers")
          .select("phase_id")
          .in("phase_id", phaseIds),
        adminSb
          .from("phase_scores")
          .select("phase_id")
          .in("phase_id", phaseIds),
        adminSb
          .from("reviewer_assignments")
          .select("phase_id")
          .in("phase_id", phaseIds),
      ]);

    const reviewerCounts: Record<string, number> = {};
    const scoreCounts: Record<string, number> = {};
    const assignmentCounts: Record<string, number> = {};

    for (const r of reviewersResult.data || []) {
      const pid = (r as Record<string, unknown>).phase_id as string;
      reviewerCounts[pid] = (reviewerCounts[pid] || 0) + 1;
    }
    for (const s of scoresResult.data || []) {
      const pid = (s as Record<string, unknown>).phase_id as string;
      scoreCounts[pid] = (scoreCounts[pid] || 0) + 1;
    }
    for (const a of assignmentsResult.data || []) {
      const pid = (a as Record<string, unknown>).phase_id as string;
      assignmentCounts[pid] = (assignmentCounts[pid] || 0) + 1;
    }

    const screeningConfig =
      (hackathon!.screening_config as Record<string, unknown>) || {};
    const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
    const applicantCounts: Record<string, number> = {};

    const phasesWithCampus = phases.filter(
      (p) => (p as Record<string, unknown>).campus_filter
    );

    if (quotaFieldId && phasesWithCampus.length > 0) {
      const { data: registrations } = await adminSb
        .from("hackathon_registrations")
        .select("form_data")
        .eq("hackathon_id", hackathonId)
        .in("status", ["accepted", "eligible"]);

      if (registrations) {
        const campusCounts: Record<string, number> = {};
        for (const reg of registrations) {
          const formData = (reg as Record<string, unknown>).form_data as
            | Record<string, unknown>
            | null;
          if (formData) {
            const fieldValue = String(formData[quotaFieldId] || "");
            if (fieldValue) {
              campusCounts[fieldValue] = (campusCounts[fieldValue] || 0) + 1;
            }
          }
        }

        for (const p of phasesWithCampus) {
          const row = p as Record<string, unknown>;
          const campus = row.campus_filter as string;
          applicantCounts[row.id as string] = campusCounts[campus] || 0;
        }
      }
    }

    const phasesWithoutCampus = phases.filter(
      (p) => !(p as Record<string, unknown>).campus_filter
    );
    if (phasesWithoutCampus.length > 0) {
      const { count } = await adminSb
        .from("hackathon_registrations")
        .select("*", { count: "exact", head: true })
        .eq("hackathon_id", hackathonId)
        .in("status", ["accepted", "eligible"]);

      for (const p of phasesWithoutCampus) {
        applicantCounts[(p as Record<string, unknown>).id as string] =
          count || 0;
      }
    }

    const data = phases.map((p) => {
      const row = p as Record<string, unknown>;
      const phaseId = row.id as string;
      return {
        ...dbRowToCompetitionPhase(row),
        reviewerCount_agg: reviewerCounts[phaseId] || 0,
        scoreCount: scoreCounts[phaseId] || 0,
        assignmentCount: assignmentCounts[phaseId] || 0,
        applicantCount: applicantCounts[phaseId] || 0,
      };
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/hackathons/[hackathonId]/phases error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/hackathons/[hackathonId]/phases ───────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

    const { supabase, error } = await authenticateOrganizer(
      request,
      hackathonId
    );
    if (error) return error;

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (
      !body.phaseType ||
      !VALID_PHASE_TYPES.includes(body.phaseType as (typeof VALID_PHASE_TYPES)[number])
    ) {
      return NextResponse.json(
        {
          error: `phaseType must be one of: ${VALID_PHASE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // String length limits
    if (typeof body.name === "string" && body.name.length > 200) {
      return NextResponse.json(
        { error: "name must be under 200 characters" },
        { status: 400 }
      );
    }

    if (
      body.description !== undefined &&
      typeof body.description === "string" &&
      body.description.length > 5000
    ) {
      return NextResponse.json(
        { error: "description must be under 5000 characters" },
        { status: 400 }
      );
    }

    if (
      body.location !== undefined &&
      typeof body.location === "string" &&
      body.location.length > 500
    ) {
      return NextResponse.json(
        { error: "location must be under 500 characters" },
        { status: 400 }
      );
    }

    if (
      body.campusFilter !== undefined &&
      typeof body.campusFilter === "string" &&
      body.campusFilter.length > 200
    ) {
      return NextResponse.json(
        { error: "campusFilter must be under 200 characters" },
        { status: 400 }
      );
    }

    if (body.scoringCriteria !== undefined) {
      if (!Array.isArray(body.scoringCriteria)) {
        return NextResponse.json(
          { error: "scoringCriteria must be an array" },
          { status: 400 }
        );
      }
      if (body.scoringCriteria.length > 50) {
        return NextResponse.json(
          { error: "scoringCriteria cannot exceed 50 items" },
          { status: 400 }
        );
      }
      for (const c of body.scoringCriteria) {
        if (!c || typeof c !== "object") {
          return NextResponse.json(
            { error: "Each scoring criterion must be an object" },
            { status: 400 }
          );
        }
        if (typeof c.name !== "string" || c.name.trim() === "" || c.name.length > 200) {
          return NextResponse.json(
            { error: "Each criterion must have a name (max 200 chars)" },
            { status: 400 }
          );
        }
        if (typeof c.maxScore !== "number" || c.maxScore < 1 || c.maxScore > 100) {
          return NextResponse.json(
            { error: "Each criterion maxScore must be 1-100" },
            { status: 400 }
          );
        }
        if (c.weight !== undefined && (typeof c.weight !== "number" || c.weight < 0 || c.weight > 100)) {
          return NextResponse.json(
            { error: "Each criterion weight must be 0-100" },
            { status: 400 }
          );
        }
      }
    }

    if (
      body.scoringScaleMax !== undefined &&
      (typeof body.scoringScaleMax !== "number" || body.scoringScaleMax < 1 || body.scoringScaleMax > 100)
    ) {
      return NextResponse.json(
        { error: "scoringScaleMax must be a positive number (max 100)" },
        { status: 400 }
      );
    }

    if (
      body.reviewerCount !== undefined &&
      (typeof body.reviewerCount !== "number" ||
        !Number.isInteger(body.reviewerCount) ||
        body.reviewerCount < 1 ||
        body.reviewerCount > 50)
    ) {
      return NextResponse.json(
        { error: "reviewerCount must be a positive integer (max 50)" },
        { status: 400 }
      );
    }

    if (body.sortOrder !== undefined && (typeof body.sortOrder !== "number" || !Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 1000)) {
      return NextResponse.json(
        { error: "sortOrder must be an integer between 0 and 1000" },
        { status: 400 }
      );
    }

    if (body.requireRecommendation !== undefined && typeof body.requireRecommendation !== "boolean") {
      return NextResponse.json(
        { error: "requireRecommendation must be a boolean" },
        { status: 400 }
      );
    }
    if (body.isWeighted !== undefined && typeof body.isWeighted !== "boolean") {
      return NextResponse.json(
        { error: "isWeighted must be a boolean" },
        { status: 400 }
      );
    }
    if (body.blindReview !== undefined && typeof body.blindReview !== "boolean") {
      return NextResponse.json(
        { error: "blindReview must be a boolean" },
        { status: 400 }
      );
    }

    // Build DB row from the form data using the mapper
    const dbRow = phaseFormToDbRow({
      name: body.name.trim(),
      description: body.description,
      phaseType: body.phaseType,
      campusFilter: body.campusFilter ?? null,
      scoringCriteria: body.scoringCriteria ?? [],
      scoringScaleMax: body.scoringScaleMax ?? 3,
      requireRecommendation: body.requireRecommendation ?? true,
      reviewerCount: body.reviewerCount ?? 3,
      isWeighted: body.isWeighted ?? false,
      blindReview: body.blindReview ?? true,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      location: body.location ?? null,
      sortOrder: body.sortOrder ?? 0,
    });

    // Attach hackathon_id (not part of the form mapper)
    const insertPayload = { ...dbRow, hackathon_id: hackathonId };

    const { data: created, error: insertError } = await supabase
      .from("competition_phases")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      console.error("Phase insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create phase" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { data: dbRowToCompetitionPhase(created as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/hackathons/[hackathonId]/phases error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
