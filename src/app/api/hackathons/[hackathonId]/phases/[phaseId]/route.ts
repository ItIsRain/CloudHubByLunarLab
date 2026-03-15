import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import {
  dbRowToCompetitionPhase,
  dbRowToPhaseReviewer,
  phaseFormToDbRow,
} from "@/lib/supabase/mappers";

const VALID_PHASE_TYPES = ["bootcamp", "final", "custom"] as const;
const VALID_STATUSES = [
  "draft",
  "active",
  "scoring",
  "calibration",
  "completed",
] as const;

type Params = Promise<{ hackathonId: string; phaseId: string }>;

// ─── Shared auth + ownership check ──────────────────────

async function authenticateOrganizer(
  request: NextRequest,
  hackathonId: string
) {
  const auth = await authenticateRequest(request);

  if (auth.type === "unauthenticated") {
    return {
      auth: null,
      supabase: null,
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
        error: NextResponse.json({ error: scopeError }, { status: 403 }),
      } as const;
    }
  }

  const supabase =
    auth.type === "api_key"
      ? getSupabaseAdminClient()
      : await getSupabaseServerClient();

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) {
    return {
      auth: null,
      supabase: null,
      error: NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      ),
    } as const;
  }

  if (hackathon.organizer_id !== auth.userId) {
    return {
      auth: null,
      supabase: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { auth, supabase, error: null } as const;
}

// ─── GET /api/hackathons/[hackathonId]/phases/[phaseId] ──

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const { supabase, error } = await authenticateOrganizer(
      request,
      hackathonId
    );
    if (error) return error;

    // Fetch phase
    const { data: phase, error: phaseError } = await supabase
      .from("competition_phases")
      .select("*")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json(
        { error: "Phase not found" },
        { status: 404 }
      );
    }

    // Fetch reviewers for this phase
    const { data: reviewers } = await supabase
      .from("phase_reviewers")
      .select("*")
      .eq("phase_id", phaseId);

    // Fetch aggregate counts in parallel
    const [scoresResult, assignmentsResult] = await Promise.all([
      supabase
        .from("phase_scores")
        .select("*", { count: "exact", head: true })
        .eq("phase_id", phaseId),
      supabase
        .from("reviewer_assignments")
        .select("*", { count: "exact", head: true })
        .eq("phase_id", phaseId),
    ]);

    const mappedPhase = dbRowToCompetitionPhase(
      phase as Record<string, unknown>
    );
    const mappedReviewers = (reviewers || []).map((r) =>
      dbRowToPhaseReviewer(r as Record<string, unknown>)
    );

    return NextResponse.json({
      data: {
        ...mappedPhase,
        reviewers: mappedReviewers,
        scoreCount: scoresResult.count || 0,
        assignmentCount: assignmentsResult.count || 0,
      },
    });
  } catch (err) {
    console.error(
      "GET /api/hackathons/[hackathonId]/phases/[phaseId] error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/hackathons/[hackathonId]/phases/[phaseId] ─

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const { supabase, error } = await authenticateOrganizer(
      request,
      hackathonId
    );
    if (error) return error;

    // Verify phase exists and belongs to this hackathon
    const { data: existing, error: fetchError } = await supabase
      .from("competition_phases")
      .select("*")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Phase not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate phaseType if provided
    if (
      body.phaseType !== undefined &&
      !VALID_PHASE_TYPES.includes(
        body.phaseType as (typeof VALID_PHASE_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: `phaseType must be one of: ${VALID_PHASE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (
      body.status !== undefined &&
      !VALID_STATUSES.includes(
        body.status as (typeof VALID_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate scoringCriteria if provided
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

    // Validate scoringScaleMax if provided
    if (
      body.scoringScaleMax !== undefined &&
      (typeof body.scoringScaleMax !== "number" || body.scoringScaleMax < 1 || body.scoringScaleMax > 100)
    ) {
      return NextResponse.json(
        { error: "scoringScaleMax must be a positive number (max 100)" },
        { status: 400 }
      );
    }

    // Validate reviewerCount if provided
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

    // Validate sortOrder if provided
    if (body.sortOrder !== undefined && (typeof body.sortOrder !== "number" || !Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 1000)) {
      return NextResponse.json(
        { error: "sortOrder must be an integer between 0 and 1000" },
        { status: 400 }
      );
    }

    // Validate boolean fields
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

    // Validate name if provided
    if (
      body.name !== undefined &&
      (typeof body.name !== "string" || body.name.trim() === "")
    ) {
      return NextResponse.json(
        { error: "name must be a non-empty string" },
        { status: 400 }
      );
    }

    // String length limits
    if (
      body.name !== undefined &&
      typeof body.name === "string" &&
      body.name.length > 200
    ) {
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

    // Build the update payload using the mapper (only includes provided fields)
    const updatePayload = phaseFormToDbRow({
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.description !== undefined && {
        description: body.description,
      }),
      ...(body.phaseType !== undefined && { phaseType: body.phaseType }),
      ...(body.campusFilter !== undefined && {
        campusFilter: body.campusFilter,
      }),
      ...(body.scoringCriteria !== undefined && {
        scoringCriteria: body.scoringCriteria,
      }),
      ...(body.scoringScaleMax !== undefined && {
        scoringScaleMax: body.scoringScaleMax,
      }),
      ...(body.requireRecommendation !== undefined && {
        requireRecommendation: body.requireRecommendation,
      }),
      ...(body.reviewerCount !== undefined && {
        reviewerCount: body.reviewerCount,
      }),
      ...(body.isWeighted !== undefined && { isWeighted: body.isWeighted }),
      ...(body.blindReview !== undefined && {
        blindReview: body.blindReview,
      }),
      ...(body.startDate !== undefined && { startDate: body.startDate }),
      ...(body.endDate !== undefined && { endDate: body.endDate }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.status !== undefined && { status: body.status }),
    });

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("competition_phases")
      .update(updatePayload)
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Phase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update phase" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: dbRowToCompetitionPhase(updated as Record<string, unknown>),
    });
  } catch (err) {
    console.error(
      "PATCH /api/hackathons/[hackathonId]/phases/[phaseId] error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/hackathons/[hackathonId]/phases/[phaseId] ─

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const { supabase, error } = await authenticateOrganizer(
      request,
      hackathonId
    );
    if (error) return error;

    // Verify phase exists and check status
    const { data: existing, error: fetchError } = await supabase
      .from("competition_phases")
      .select("status")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Phase not found" },
        { status: 404 }
      );
    }

    // Cascade deletes handle child rows (reviewers, assignments, scores, decisions)
    // via ON DELETE CASCADE foreign keys
    const { error: deleteError } = await supabase
      .from("competition_phases")
      .delete()
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId);

    if (deleteError) {
      console.error("Phase delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete phase" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Phase deleted successfully" });
  } catch (err) {
    console.error(
      "DELETE /api/hackathons/[hackathonId]/phases/[phaseId] error:",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
