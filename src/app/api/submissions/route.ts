import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  dbRowToCompetitionPhase,
  dbRowToHackathon,
  dbRowToSubmission,
  submissionFormToDbRow,
} from "@/lib/supabase/mappers";
import { hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { submissionsArePubliclyVisible } from "@/lib/hackathon-phases";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { fireWebhooks } from "@/lib/webhook-delivery";
import { getCurrentSubmissionTarget } from "@/lib/submission-window";

const SUBMISSION_SELECT =
  "*, team:teams(*, team_members(*, user:profiles!team_members_user_id_fkey(*)))";

export async function GET(request: NextRequest) {
  try {
    // Dual auth: session cookies OR API key (also allows unauthenticated for public submissions)
    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const url = request.nextUrl;
    const hackathonId = url.searchParams.get("hackathonId");
    const teamId = url.searchParams.get("teamId");
    const userId = url.searchParams.get("userId");
    const status = url.searchParams.get("status");
    const phaseIdFilter = url.searchParams.get("phaseId");
    const sortBy = url.searchParams.get("sortBy") || "recent";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10) || 50));
    const offset = (page - 1) * pageSize;

    // Determine authenticated user ID (works for both session and API key auth)
    const authUserId = auth.type !== "unauthenticated" ? auth.userId : null;

    // For session auth, also get email for private entity access check
    let authUserEmail: string | undefined;
    if (auth.type === "session") {
      const { data: { user } } = await supabase.auth.getUser();
      authUserEmail = user?.email ?? undefined;
    } else if (auth.type === "api_key") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", auth.userId)
        .single();
      authUserEmail = (profile?.email as string) ?? undefined;
    }

    let query = supabase
      .from("submissions")
      .select(SUBMISSION_SELECT, { count: "exact" });

    if (hackathonId) {
      const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", hackathonId, authUserId ?? undefined, authUserEmail);
      if (!canAccess) {
        return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
      }
      query = query.eq("hackathon_id", hackathonId);

      // Submissions are private until winners are announced. Before that, only
      // organizers, collaborators, and members of the submitting team can see
      // them. After winners_announcement, all submitted entries are public.
      const { data: hackTiming } = await supabase
        .from("hackathons")
        .select("organizer_id, winners_announcement")
        .eq("id", hackathonId)
        .single();

      const publicVisible = submissionsArePubliclyVisible(
        (hackTiming?.winners_announcement as string | null | undefined) ?? null
      );

      if (!publicVisible) {
        const isOrganizer = !!authUserId && hackTiming?.organizer_id === authUserId;
        let isCollaborator = false;
        if (authUserId && !isOrganizer) {
          const { data: collab } = await supabase
            .from("hackathon_collaborators")
            .select("id")
            .eq("hackathon_id", hackathonId)
            .eq("user_id", authUserId)
            .maybeSingle();
          isCollaborator = !!collab;
        }

        if (!isOrganizer && !isCollaborator) {
          if (!authUserId) {
            // Unauthenticated viewers see nothing pre-announcement.
            return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
          }
          // Auth users can still see their own team's submission(s).
          const { data: teamRows } = await supabase
            .from("team_members")
            .select("team_id")
            .eq("user_id", authUserId);
          const ownTeamIds = (teamRows || []).map((m) => m.team_id as string);
          if (ownTeamIds.length === 0) {
            return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
          }
          query = query.in("team_id", ownTeamIds);
        }
      }
    }
    if (teamId) query = query.eq("team_id", teamId);
    if (phaseIdFilter) {
      // Special sentinel "null" lets callers fetch the global-round submission
      // (where phase_id IS NULL) without having to omit the param entirely.
      if (phaseIdFilter === "null") {
        query = query.is("phase_id", null);
      } else {
        query = query.eq("phase_id", phaseIdFilter);
      }
    }

    // Unauthenticated users can ONLY see submitted submissions and cannot filter by userId/teamId
    if (!authUserId) {
      query = query.eq("status", "submitted");
      if (userId || teamId) {
        return NextResponse.json(
          { error: "Authentication required to filter by user or team" },
          { status: 401 }
        );
      }
    } else if (status) {
      query = query.eq("status", status);
    }

    // If filtering by userId, only allow own ID — prevent IDOR
    if (userId) {
      const effectiveUserId = authUserId ? userId === authUserId ? userId : authUserId : null;
      if (!effectiveUserId) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
        });
      }
      const { data: memberTeamIds } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", effectiveUserId);

      const teamIds = (memberTeamIds || []).map((m) => m.team_id);
      if (teamIds.length === 0) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
        });
      }
      query = query.in("team_id", teamIds);
    }

    // Sorting
    if (sortBy === "votes") {
      query = query.order("upvotes", { ascending: false });
    } else if (sortBy === "score") {
      query = query.order("average_score", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 400 });
    }

    const total = count || 0;
    const submissions = (data || []).map((row) =>
      dbRowToSubmission(row as Record<string, unknown>)
    );

    return NextResponse.json({
      data: submissions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + pageSize < total,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const body = await request.json();

    // Require hackathonId and teamId
    if (!body.hackathonId && !body.hackathon_id) {
      return NextResponse.json(
        { error: "hackathonId is required" },
        { status: 400 }
      );
    }
    if (!body.teamId && !body.team_id) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const dbPayload = submissionFormToDbRow(body);
    const hackathonId = dbPayload.hackathon_id as string;

    // Verify submission window is open, using the phase-aware helper so
    // phased competitions gate against the active phase rather than the
    // hackathon-level submission_deadline.
    if (hackathonId) {
      const [hackRes, phasesRes] = await Promise.all([
        supabase.from("hackathons").select("*").eq("id", hackathonId).single(),
        supabase
          .from("competition_phases")
          .select("*")
          .eq("hackathon_id", hackathonId),
      ]);

      if (!hackRes.data) {
        return NextResponse.json(
          { error: "Competition not found" },
          { status: 404 }
        );
      }

      const hackathon = dbRowToHackathon(hackRes.data as Record<string, unknown>);
      const phases = (phasesRes.data || []).map((r) =>
        dbRowToCompetitionPhase(r as Record<string, unknown>)
      );
      const target = getCurrentSubmissionTarget(hackathon, phases);

      if (target.kind === "none") {
        return NextResponse.json(
          { error: "This competition does not accept submissions." },
          { status: 403 }
        );
      }
      if (target.status !== "active") {
        return NextResponse.json(
          {
            error:
              target.status === "upcoming"
                ? "Submissions have not opened yet."
                : "Submissions are closed.",
          },
          { status: 403 }
        );
      }

      // Resolve phase_id: client may pass it explicitly, otherwise pin to
      // the currently-active target. If the client passes a phase that
      // isn't the active one, reject — prevents stale clients from
      // writing to a closed window.
      const requestedPhaseId =
        (dbPayload.phase_id as string | null | undefined) ?? undefined;
      const expectedPhaseId = target.kind === "phase" ? target.phaseId : null;
      if (requestedPhaseId !== undefined && requestedPhaseId !== expectedPhaseId) {
        return NextResponse.json(
          {
            error:
              "Submissions are only being accepted for the currently active phase.",
          },
          { status: 403 }
        );
      }
      dbPayload.phase_id = expectedPhaseId;
    }

    // Verify the user is the team LEADER — only the leader may create/submit
    // the team's project.
    const { data: membership } = await supabase
      .from("team_members")
      .select("is_leader")
      .eq("team_id", dbPayload.team_id as string)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a team member to create a submission" },
        { status: 403 }
      );
    }
    if (membership.is_leader !== true) {
      return NextResponse.json(
        { error: "Only the team leader can submit the team's project." },
        { status: 403 }
      );
    }

    // Validate and default status
    if (!dbPayload.status) dbPayload.status = "draft";
    if (dbPayload.status !== "draft" && dbPayload.status !== "submitted") {
      return NextResponse.json(
        { error: "Status must be 'draft' or 'submitted'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert(dbPayload)
      .select(SUBMISSION_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create submission" }, { status: 400 });
    }

    // Fire webhook for the hackathon organizer
    if (hackathonId) {
      const { data: hackOrg } = await supabase
        .from("hackathons")
        .select("organizer_id, name")
        .eq("id", hackathonId)
        .single();

      if (hackOrg?.organizer_id) {
        const eventType = dbPayload.status === "submitted" ? "submission.submitted" : "submission.created";
        fireWebhooks(hackOrg.organizer_id, eventType, {
          submissionId: (data as Record<string, unknown>).id,
          hackathonId,
          hackathonName: hackOrg.name,
          teamId: dbPayload.team_id,
          title: dbPayload.title || null,
          status: dbPayload.status,
        });
      }
    }

    return NextResponse.json({
      data: dbRowToSubmission(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
