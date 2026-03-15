import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { fireWebhooks } from "@/lib/webhook-delivery";
import { UUID_RE } from "@/lib/constants";
import {
  sendApplicationAcceptedEmail,
  sendApplicationRejectedEmail,
  sendApplicationWaitlistedEmail,
  sendApplicationUnderReviewEmail,
  sendApplicationEligibleEmail,
  sendApplicationIneligibleEmail,
} from "@/lib/resend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

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

    // Verify user is the hackathon organizer
    const { data: hackathonCheck } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathonCheck) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathonCheck.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50));
    const offset = (page - 1) * pageSize;

    // When search is active, we must fetch all rows first (search is on joined profile
    // fields which can't be filtered at the PostgREST level), then paginate in JS.
    // Without search, use Supabase-level pagination for efficiency.
    const useServerPagination = !search;

    // Fetch registrations, teams, and tracks in parallel
    let regQuery = supabase
      .from("hackathon_registrations")
      .select("id, user_id, hackathon_id, status, form_data, completeness_score, eligibility_passed, screening_completed_at, screening_results, screening_flags, internal_notes, created_at, user:profiles!hackathon_registrations_user_id_fkey(*)", { count: "exact" })
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (status) {
      regQuery = regQuery.eq("status", status);
    }

    if (useServerPagination) {
      regQuery = regQuery.range(offset, offset + pageSize - 1);
    }

    const [regResult, teamsResult, hackathonResult] = await Promise.all([
      regQuery,
      supabase
        .from("teams")
        .select("id, name, hackathon_id, team_members(user_id)")
        .eq("hackathon_id", hackathonId),
      supabase
        .from("hackathons")
        .select("tracks")
        .eq("id", hackathonId)
        .single(),
    ]);

    const { data: registrations, error, count } = regResult;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch participants" }, { status: 400 });
    }

    // Build a user_id -> team name lookup
    const userTeamMap: Record<string, string> = {};
    if (teamsResult.data) {
      for (const team of teamsResult.data) {
        const members = (team.team_members as { user_id: string }[]) || [];
        for (const member of members) {
          userTeamMap[member.user_id] = team.name;
        }
      }
    }

    const hackathon = hackathonResult.data;

    const tracks = (hackathon?.tracks as { id?: string; name: string }[]) || [];
    const firstTrackName = tracks.length > 0 ? tracks[0].name : null;

    // Map registrations to response shape
    let participants = (registrations || []).map(
      (reg: Record<string, unknown>) => {
        const userProfile = reg.user as Record<string, unknown>;
        const userId = reg.user_id as string;

        return {
          id: reg.id as string,
          userId,
          hackathonId: reg.hackathon_id as string,
          status: reg.status as string,
          createdAt: reg.created_at as string,
          user: userProfile ? profileToPublicUser(userProfile) : null,
          teamName: userTeamMap[userId] || null,
          trackName: firstTrackName,
          formData: (reg.form_data as Record<string, unknown>) || null,
          completenessScore: typeof reg.completeness_score === "number" ? reg.completeness_score : 0,
          eligibilityPassed: reg.eligibility_passed as boolean | null,
          screeningCompletedAt: reg.screening_completed_at as string | null,
          screeningResults: (reg.screening_results as unknown[]) || [],
          screeningFlags: (reg.screening_flags as unknown[]) || [],
          internalNotes: (reg.internal_notes as string) || null,
        };
      }
    );

    // Apply search filter on name/email (done in JS since it spans joined data)
    if (search) {
      const term = search.toLowerCase();
      participants = participants.filter((p) => {
        if (!p.user) return false;
        return (
          p.user.name.toLowerCase().includes(term) ||
          p.user.email.toLowerCase().includes(term)
        );
      });
    }

    // When searching, total and pagination are based on filtered results
    const total = search ? participants.length : (count || 0);

    // Apply JS-level pagination when search is active
    if (search) {
      participants = participants.slice(offset, offset + pageSize);
    }

    return NextResponse.json({
      data: participants,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

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

    // Verify caller is the hackathon organizer (include name for notifications)
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { registrationId, registrationIds, status, internalNotes } = body as {
      registrationId?: string;
      registrationIds?: string[];
      status?: string;
      internalNotes?: string;
    };

    // ── Notes-only update ─────────────────────────────────
    if (registrationId && internalNotes !== undefined && !status) {
      const { data: noteData, error: noteErr } = await supabase
        .from("hackathon_registrations")
        .update({ internal_notes: internalNotes })
        .eq("id", registrationId)
        .eq("hackathon_id", hackathonId)
        .select("id")
        .single();

      if (noteErr || !noteData) {
        return NextResponse.json(
          { error: "Failed to update notes" },
          { status: 400 }
        );
      }

      return NextResponse.json({ data: { id: noteData.id, internalNotes } });
    }

    // ── Status update (single or bulk) ────────────────────
    const ids = registrationIds ?? (registrationId ? [registrationId] : []);
    if (ids.length === 0 || !status) {
      return NextResponse.json(
        { error: "registrationId (or registrationIds) and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "pending", "confirmed", "under_review", "eligible", "ineligible",
      "accepted", "waitlisted", "rejected", "cancelled", "approved", "declined",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch current statuses so we only notify on actual change
    const { data: currentRegs } = await supabase
      .from("hackathon_registrations")
      .select("id, user_id, status, user:profiles!hackathon_registrations_user_id_fkey(email, name)")
      .eq("hackathon_id", hackathonId)
      .in("id", ids);

    const previousStatusMap = new Map<string, { userId: string; status: string; email?: string; name?: string }>();
    for (const reg of currentRegs ?? []) {
      const profile = reg.user as { email?: string; name?: string } | null;
      previousStatusMap.set(reg.id, {
        userId: reg.user_id,
        status: reg.status as string,
        email: profile?.email,
        name: profile?.name,
      });
    }

    // Perform the bulk update
    const { data, error } = await supabase
      .from("hackathon_registrations")
      .update({ status })
      .eq("hackathon_id", hackathonId)
      .in("id", ids)
      .select("id, user_id, hackathon_id, status, created_at, user:profiles!hackathon_registrations_user_id_fkey(*)");

    if (error) {
      return NextResponse.json({ error: "Failed to update status" }, { status: 400 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No registrations found" },
        { status: 404 }
      );
    }

    // Send notifications + emails only for registrations whose status actually changed
    const notifiableStatuses = ["cancelled", "rejected", "approved", "accepted", "waitlisted", "ineligible", "eligible"];
    const hackathonName = hackathon.name || "the hackathon";
    const messages: Record<string, { title: string; message: string }> = {
      cancelled: {
        title: "Registration Cancelled",
        message: `Your registration for ${hackathonName} has been cancelled by the organizer.`,
      },
      rejected: {
        title: "Application Rejected",
        message: `Your application for ${hackathonName} has been rejected.`,
      },
      approved: {
        title: "Registration Approved",
        message: `Your registration for ${hackathonName} has been approved! You're all set to participate.`,
      },
      accepted: {
        title: "Application Accepted",
        message: `Congratulations! Your application for ${hackathonName} has been accepted!`,
      },
      waitlisted: {
        title: "Application Waitlisted",
        message: `Your application for ${hackathonName} has been placed on the waitlist. We'll notify you if a spot opens up.`,
      },
      eligible: {
        title: "Application Eligible",
        message: `Your application for ${hackathonName} has passed screening and is eligible for selection.`,
      },
      ineligible: {
        title: "Application Ineligible",
        message: `Your application for ${hackathonName} did not meet the eligibility criteria.`,
      },
    };

    for (const reg of data) {
      const prev = previousStatusMap.get(reg.id);
      const statusChanged = prev && prev.status !== status;

      if (statusChanged && notifiableStatuses.includes(status)) {
        const notif = messages[status];
        if (notif) {
          supabase.from("notifications").insert({
            user_id: reg.user_id,
            type: "hackathon-update",
            title: notif.title,
            message: notif.message,
            link: `/hackathons/${hackathonId}`,
          }).then(({ error: notifErr }) => {
            if (notifErr) console.error("Failed to insert notification:", notifErr);
          });
        }

        // Send email (fire-and-forget)
        const userEmail = prev.email;
        const userName = prev.name || "Applicant";
        if (userEmail) {
          const emailParams = { to: userEmail, applicantName: userName, hackathonName, hackathonId };
          const emailSenders: Record<string, () => Promise<unknown>> = {
            accepted: () => sendApplicationAcceptedEmail(emailParams),
            approved: () => sendApplicationAcceptedEmail(emailParams),
            rejected: () => sendApplicationRejectedEmail(emailParams),
            waitlisted: () => sendApplicationWaitlistedEmail(emailParams),
            under_review: () => sendApplicationUnderReviewEmail(emailParams),
            eligible: () => sendApplicationEligibleEmail(emailParams),
            ineligible: () => sendApplicationIneligibleEmail(emailParams),
          };
          const sender = emailSenders[status];
          if (sender) sender().catch((e) => console.error(`Failed to send ${status} email:`, e));
        }
      }

      // Fire webhook per registration
      fireWebhooks(auth.userId, "hackathon.participant.status_changed", {
        hackathonId,
        hackathonName: hackathon.name,
        registrationId: reg.id,
        userId: reg.user_id,
        status: reg.status,
      });
    }

    // Return single item for single-update backwards compatibility, array for bulk
    if (ids.length === 1 && data.length === 1) {
      const d = data[0];
      const userProfile = (d as Record<string, unknown>).user as Record<string, unknown>;
      return NextResponse.json({
        data: {
          id: d.id,
          userId: d.user_id,
          hackathonId: d.hackathon_id,
          status: d.status,
          createdAt: d.created_at,
          user: userProfile ? profileToPublicUser(userProfile) : null,
        },
      });
    }

    return NextResponse.json({
      data: {
        updated: data.length,
        status,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
