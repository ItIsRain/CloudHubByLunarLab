import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

interface ConflictInsert {
  phase_id: string;
  reviewer_id: string;
  registration_id: string;
  conflict_type: "self_registration" | "same_team";
  resolved: boolean;
  detected_at: string;
}

/** POST - Detect conflicts for a phase (organizer triggers this) */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
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

    // Verify user is the organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify phase belongs to this hackathon
    const { data: phaseOwnership } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phaseOwnership) {
      return NextResponse.json({ error: "Phase not found in this competition" }, { status: 404 });
    }

    // Fetch all accepted phase reviewers for this phase
    const { data: reviewers, error: reviewersError } = await supabase
      .from("phase_reviewers")
      .select("id, user_id")
      .eq("phase_id", phaseId)
      .eq("status", "accepted");

    if (reviewersError) {
      return NextResponse.json({ error: "Failed to fetch reviewers" }, { status: 500 });
    }

    // Fetch all non-cancelled registrations for this hackathon
    const { data: registrations, error: regsError } = await supabase
      .from("hackathon_registrations")
      .select("id, user_id")
      .eq("hackathon_id", hackathonId)
      .not("status", "eq", "cancelled");

    if (regsError) {
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
    }

    const conflicts: ConflictInsert[] = [];
    const now = new Date().toISOString();
    let selfRegistrationCount = 0;
    let sameTeamCount = 0;

    // Build a set of registration user_ids for fast lookup
    const registrationsByUserId = new Map<string, string[]>();
    for (const reg of registrations || []) {
      const existing = registrationsByUserId.get(reg.user_id) || [];
      registrationsByUserId.set(reg.user_id, [...existing, reg.id]);
    }

    // 1. Detect self_registration conflicts: reviewer.user_id matches a registration.user_id
    for (const reviewer of reviewers || []) {
      const regIds = registrationsByUserId.get(reviewer.user_id);
      if (regIds) {
        for (const regId of regIds) {
          conflicts.push({
            phase_id: phaseId,
            reviewer_id: reviewer.user_id,
            registration_id: regId,
            conflict_type: "self_registration",
            resolved: false,
            detected_at: now,
          });
          selfRegistrationCount++;
        }
      }
    }

    // 2. Detect same_team conflicts: reviewer is on the same team as an applicant
    // Fetch all team memberships for this hackathon
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("hackathon_id", hackathonId);

    if (teams && teams.length > 0) {
      const teamIds = teams.map((t) => t.id);

      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .in("team_id", teamIds);

      if (teamMembers && teamMembers.length > 0) {
        // Build a map: team_id -> set of user_ids
        const teamToUsers = new Map<string, Set<string>>();
        for (const tm of teamMembers) {
          const users = teamToUsers.get(tm.team_id) || new Set<string>();
          users.add(tm.user_id);
          teamToUsers.set(tm.team_id, users);
        }

        // Build a map: user_id -> set of teammate user_ids (excluding self)
        const userToTeammates = new Map<string, Set<string>>();
        for (const [, users] of teamToUsers) {
          const userArray = [...users];
          for (const uid of userArray) {
            const existing = userToTeammates.get(uid) || new Set<string>();
            for (const otherId of userArray) {
              if (otherId !== uid) {
                existing.add(otherId);
              }
            }
            userToTeammates.set(uid, existing);
          }
        }

        // For each reviewer, check if any registrant is their teammate
        const reviewerUserIds = new Set((reviewers || []).map((r) => r.user_id));
        for (const reviewer of reviewers || []) {
          const teammates = userToTeammates.get(reviewer.user_id);
          if (!teammates) continue;

          for (const [applicantUserId, regIds] of registrationsByUserId) {
            // Skip if the applicant is also a reviewer (already caught by self_registration)
            if (applicantUserId === reviewer.user_id) continue;
            if (teammates.has(applicantUserId)) {
              for (const regId of regIds) {
                conflicts.push({
                  phase_id: phaseId,
                  reviewer_id: reviewer.user_id,
                  registration_id: regId,
                  conflict_type: "same_team",
                  resolved: false,
                  detected_at: now,
                });
                sameTeamCount++;
              }
            }
          }
        }
      }
    }

    // Upsert conflicts to avoid duplicates
    let insertedCount = 0;
    if (conflicts.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("reviewer_conflicts")
        .upsert(conflicts, {
          onConflict: "phase_id,reviewer_id,registration_id",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insertError) {
        return NextResponse.json({ error: "Failed to insert conflicts" }, { status: 500 });
      }

      insertedCount = inserted?.length ?? conflicts.length;
    }

    return NextResponse.json({
      data: {
        detected: conflicts.length,
        newConflicts: insertedCount,
        selfRegistration: selfRegistrationCount,
        sameTeam: sameTeamCount,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET - List conflicts for a phase */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
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

    // Verify user is the organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify phase belongs to this hackathon
    const { data: phaseOwnership } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phaseOwnership) {
      return NextResponse.json({ error: "Phase not found in this competition" }, { status: 404 });
    }

    // Fetch conflicts (no FK on reviewer_id, so enrich manually)
    const { data: conflicts, error } = await supabase
      .from("reviewer_conflicts")
      .select(`
        id,
        phase_id,
        reviewer_id,
        registration_id,
        conflict_type,
        resolved,
        resolved_by,
        resolved_at,
        detected_at
      `)
      .eq("phase_id", phaseId)
      .order("detected_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch conflicts:", error);
      return NextResponse.json({ error: "Failed to fetch conflicts" }, { status: 500 });
    }

    // Enrich with reviewer profile + applicant profile
    const reviewerIds = [...new Set((conflicts || []).map((c) => c.reviewer_id))];
    const registrationIds = [...new Set((conflicts || []).map((c) => c.registration_id))];

    let reviewerMap: Record<string, { id: string; name: string; email: string; avatar: string | null }> = {};
    let applicantMap: Record<string, { id: string; name: string; email: string }> = {};

    if (reviewerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar")
        .in("id", reviewerIds);
      if (profiles) {
        for (const p of profiles) {
          reviewerMap[p.id] = p as typeof reviewerMap[string];
        }
      }
    }

    if (registrationIds.length > 0) {
      const { data: regs } = await supabase
        .from("hackathon_registrations")
        .select("id, user_id, applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email)")
        .in("id", registrationIds);
      if (regs) {
        for (const r of regs) {
          const applicant = r.applicant as unknown as { id: string; name: string; email: string } | null;
          if (applicant) {
            applicantMap[r.id] = applicant;
          }
        }
      }
    }

    const enrichedConflicts = (conflicts || []).map((c) => ({
      ...c,
      reviewer: reviewerMap[c.reviewer_id] || null,
      applicant: applicantMap[c.registration_id] || null,
    }));

    return NextResponse.json({ data: enrichedConflicts });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH - Resolve a conflict */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
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

    // Verify user is the organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body
    let body: { conflictId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { conflictId } = body;
    if (!conflictId || !UUID_RE.test(conflictId)) {
      return NextResponse.json({ error: "conflictId must be a valid UUID" }, { status: 400 });
    }

    // Verify the conflict belongs to this phase
    const { data: existing } = await supabase
      .from("reviewer_conflicts")
      .select("id, phase_id, resolved")
      .eq("id", conflictId)
      .eq("phase_id", phaseId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Conflict not found in this phase" }, { status: 404 });
    }

    if (existing.resolved) {
      return NextResponse.json({ error: "Conflict is already resolved" }, { status: 409 });
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("reviewer_conflicts")
      .update({
        resolved: true,
        resolved_by: auth.userId,
        resolved_at: now,
      })
      .eq("id", conflictId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to resolve conflict" }, { status: 400 });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
