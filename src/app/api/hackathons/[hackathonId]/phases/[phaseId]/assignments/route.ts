import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

/** GET - List assignments for a phase (organizer only) */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    // Use admin client — API-level ownership check is the auth gate.
    const supabase = getSupabaseAdminClient();

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    // Verify phase belongs to this hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id, blind_review")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found in this hackathon" }, { status: 404 });
    }

    const isOrganizer = hackathon.organizer_id === auth.userId;
    const url = new URL(request.url);
    const isMineQuery = url.searchParams.get("mine") === "true";

    // Reviewers can fetch their own assignments with ?mine=true
    if (!isOrganizer && !isMineQuery) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isOrganizer) {
      // Verify the caller is an accepted reviewer
      const { data: reviewerRecord } = await supabase
        .from("phase_reviewers")
        .select("id, status")
        .eq("phase_id", phaseId)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (!reviewerRecord || reviewerRecord.status !== "accepted") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const isBlindReview = phase.blind_review === true;

    // Build query — reviewer sees only their own assignments
    let query = supabase
      .from("reviewer_assignments")
      .select(`
        id,
        phase_id,
        reviewer_id,
        registration_id,
        assigned_at,
        registration:hackathon_registrations!reviewer_assignments_registration_id_fkey(
          id,
          user_id,
          status,
          form_data,
          applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email)
        ),
        reviewer:phase_reviewers!reviewer_assignments_reviewer_id_fkey(
          id,
          user_id,
          name,
          email,
          status
        )
      `)
      .eq("phase_id", phaseId)
      .order("assigned_at", { ascending: false });

    if (!isOrganizer) {
      query = query.eq("reviewer_id", auth.userId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 400 });
    }

    // Strip applicant identity for blind review (reviewer only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let responseData: any[] = assignments || [];
    if (!isOrganizer && isBlindReview) {
      responseData = responseData.map((a: Record<string, unknown>) => ({
        ...a,
        registration: a.registration
          ? { ...(a.registration as Record<string, unknown>), applicant: null, form_data: null }
          : null,
      }));
    }

    return NextResponse.json({ data: responseData });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST - Auto-assign reviewers to applicants using round-robin load balancing */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, screening_config")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the phase configuration (reviewer_count, campus_filter) and verify it belongs to this hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id, reviewer_count, campus_filter, status")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Only allow assignments when phase is active or scoring
    const assignPhaseStatus = (phase as { status: string }).status;
    if (assignPhaseStatus !== "active" && assignPhaseStatus !== "scoring") {
      return NextResponse.json(
        { error: `Cannot create assignments when phase status is '${assignPhaseStatus}'. Phase must be 'active' or 'scoring'.` },
        { status: 400 }
      );
    }

    const reviewerCount = (phase.reviewer_count as number) || 2;

    // 1. Get all accepted reviewers for this phase
    const { data: reviewers, error: reviewersError } = await supabase
      .from("phase_reviewers")
      .select("id, user_id, name")
      .eq("phase_id", phaseId)
      .eq("status", "accepted");

    if (reviewersError) {
      return NextResponse.json({ error: "Failed to fetch reviewers" }, { status: 400 });
    }

    if (!reviewers || reviewers.length === 0) {
      return NextResponse.json(
        { error: "No accepted reviewers found for this phase" },
        { status: 400 }
      );
    }

    // 2. Get eligible applicants, optionally filtered by campus
    const screeningConfig = (hackathon.screening_config as Record<string, unknown>) || {};
    const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
    const campusFilter = phase.campus_filter as string | null;

    let regQuery = supabase
      .from("hackathon_registrations")
      .select("id, user_id, form_data")
      .eq("hackathon_id", hackathonId)
      .in("status", ["accepted", "eligible"]);

    const { data: registrations, error: regError } = await regQuery;

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 400 });
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { error: "No eligible applicants found" },
        { status: 400 }
      );
    }

    // Apply campus filter in JS (since it depends on JSONB field lookup)
    let filteredRegistrations = registrations;
    if (campusFilter && quotaFieldId) {
      filteredRegistrations = registrations.filter((reg) => {
        const formData = reg.form_data as Record<string, unknown> | null;
        if (!formData) return false;
        return String(formData[quotaFieldId] || "") === campusFilter;
      });
    }

    if (filteredRegistrations.length === 0) {
      return NextResponse.json(
        { error: "No applicants match the campus filter for this phase" },
        { status: 400 }
      );
    }

    // 3. Get existing assignments to skip duplicates
    const { data: existingAssignments } = await supabase
      .from("reviewer_assignments")
      .select("reviewer_id, registration_id")
      .eq("phase_id", phaseId);

    const existingPairs = new Set(
      (existingAssignments || []).map(
        (a) => `${a.reviewer_id}:${a.registration_id}`
      )
    );

    // Count current load per reviewer (for load balancing)
    const reviewerLoad = new Map<string, number>();
    for (const r of reviewers) {
      reviewerLoad.set(r.user_id, 0);
    }
    for (const a of existingAssignments || []) {
      const current = reviewerLoad.get(a.reviewer_id as string) || 0;
      reviewerLoad.set(a.reviewer_id as string, current + 1);
    }

    // 4. Round-robin assignment with load balancing
    const newAssignments: {
      phase_id: string;
      reviewer_id: string;
      registration_id: string;
      assigned_at: string;
    }[] = [];

    for (const reg of filteredRegistrations) {
      // Sort reviewers by current load (ascending) for load balancing
      const sortedReviewers = [...reviewers].sort((a, b) => {
        const loadA = reviewerLoad.get(a.user_id) || 0;
        const loadB = reviewerLoad.get(b.user_id) || 0;
        return loadA - loadB;
      });

      let assigned = 0;
      for (const reviewer of sortedReviewers) {
        if (assigned >= reviewerCount) break;

        const pairKey = `${reviewer.user_id}:${reg.id}`;
        if (existingPairs.has(pairKey)) {
          // Already assigned, count it toward the target
          assigned++;
          continue;
        }

        newAssignments.push({
          phase_id: phaseId,
          reviewer_id: reviewer.user_id,
          registration_id: reg.id,
          assigned_at: new Date().toISOString(),
        });

        // Update load tracking
        const currentLoad = reviewerLoad.get(reviewer.user_id) || 0;
        reviewerLoad.set(reviewer.user_id, currentLoad + 1);
        existingPairs.add(pairKey);
        assigned++;
      }
    }

    if (newAssignments.length === 0) {
      return NextResponse.json({
        data: {
          created: 0,
          message: "All applicants are already fully assigned to reviewers",
        },
      });
    }

    // 5. Bulk insert new assignments
    const { error: insertError } = await supabase
      .from("reviewer_assignments")
      .insert(newAssignments);

    if (insertError) {
      return NextResponse.json({ error: "Failed to create assignments" }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        created: newAssignments.length,
        totalApplicants: filteredRegistrations.length,
        totalReviewers: reviewers.length,
        reviewersPerApplicant: reviewerCount,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE - Clear all assignments for a phase */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow clearing assignments if phase is draft or active; also verify phase belongs to this hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("status")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const phaseStatus = phase.status as string;
    if (phaseStatus !== "draft" && phaseStatus !== "active") {
      return NextResponse.json(
        { error: `Cannot clear assignments when phase status is '${phaseStatus}'. Only 'draft' or 'active' phases allowed.` },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from("reviewer_assignments")
      .delete()
      .eq("phase_id", phaseId);

    if (error) {
      return NextResponse.json({ error: "Failed to clear assignments" }, { status: 400 });
    }

    return NextResponse.json({
      data: { cleared: true, count: count || 0 },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
