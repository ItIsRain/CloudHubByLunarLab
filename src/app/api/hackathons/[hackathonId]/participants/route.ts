import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { fireWebhooks } from "@/lib/webhook-delivery";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit } from "@/lib/check-hackathon-access";

// Statuses that free up a spot — when an applicant moves TO one of these,
// the next waitlisted person can be auto-promoted.
const SPOT_FREEING_STATUSES = new Set(["cancelled", "rejected", "declined"]);

/**
 * Auto-promote waitlisted applicants when spots open up. Promotes one
 * person per freed spot (FIFO by `created_at`). Fires notifications so
 * the promoted applicant knows immediately.
 *
 * Called fire-and-forget after a status update that moves registrations
 * into a spot-freeing status.
 */
async function autoPromoteWaitlist(
  hackathonId: string,
  hackathonName: string,
  freedSpots: number
) {
  if (freedSpots <= 0) return;

  try {
    const admin = getSupabaseAdminClient();

    // Fetch the oldest N waitlisted registrations
    const { data: waitlisted } = await admin
      .from("hackathon_registrations")
      .select("id, user_id")
      .eq("hackathon_id", hackathonId)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true })
      .limit(freedSpots);

    if (!waitlisted || waitlisted.length === 0) return;

    const idsToPromote = waitlisted.map((w) => w.id as string);

    // Promote to "accepted"
    const { error } = await admin
      .from("hackathon_registrations")
      .update({ status: "accepted" })
      .in("id", idsToPromote);

    if (error) {
      console.error("[waitlist-auto-promote] Failed to promote:", error);
      return;
    }

    // Notify each promoted applicant
    const notifications = waitlisted.map((w) => ({
      user_id: w.user_id,
      type: "hackathon-update",
      title: "You've Been Accepted!",
      message: `A spot opened up in ${hackathonName} and you've been moved off the waitlist. Congratulations!`,
      link: `/hackathons/${hackathonId}`,
    }));

    await admin.from("notifications").insert(notifications);

    console.warn(
      `[waitlist-auto-promote] Promoted ${idsToPromote.length} applicant(s) for hackathon ${hackathonId}`
    );
  } catch (err) {
    // Non-critical — log and swallow so the original request still succeeds
    console.error("[waitlist-auto-promote] Error:", err);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
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

    // Verify user has access (any collaborator role can view participants)
    const getAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!getAccess.hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const allParam = searchParams.get("all");
    const wantAll = allParam === "true" || allParam === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50));
    const offset = (page - 1) * pageSize;

    // We need to fetch ALL rows (no server-side page limit) when:
    //  - search is active: it filters on joined profile fields that can't be
    //    filtered at the PostgREST level, so we filter/paginate in JS, OR
    //  - the caller explicitly asks for everything (`all=true`), e.g. the
    //    organizer Applications tab which renders/exports the full list.
    const needAllRows = !!search || wantAll;

    const REG_SELECT =
      "id, user_id, hackathon_id, status, form_data, completeness_score, eligibility_passed, screening_completed_at, screening_results, screening_flags, internal_notes, results_published_at, created_at, user:profiles!hackathon_registrations_user_id_fkey(*)";

    // Build a registration query for a given row range. Reused for both the
    // single-page path and the batched fetch-all path.
    const buildRegQuery = (from: number, to: number) => {
      let q = supabase
        .from("hackathon_registrations")
        .select(REG_SELECT, { count: "exact" })
        .eq("hackathon_id", hackathonId)
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      return q.range(from, to);
    };

    // Kick off the supporting queries (teams, submissions, tracks) in parallel
    // with the registration fetch below.
    const supportingQueries = Promise.all([
      supabase
        .from("teams")
        .select("id, name, hackathon_id, team_members(user_id)")
        .eq("hackathon_id", hackathonId),
      // Pull each team's submission so we can derive track from either
      // the built-in `track` column or a custom form-data field.
      supabase
        .from("submissions")
        .select("team_id, track, form_data")
        .eq("hackathon_id", hackathonId),
      // Pull tracks + the configured trackFieldId (mirrors the campus/quota
      // pattern: screening_config.trackFieldId points to a form field whose
      // value identifies the team's track choice).
      supabase
        .from("hackathons")
        .select("tracks, screening_config")
        .eq("id", hackathonId)
        .single(),
    ]);

    // Fetch registrations — either a single page, or every row in batches of
    // 1000 to get past PostgREST's default max-rows ceiling.
    let registrations: Record<string, unknown>[] = [];
    let count = 0;
    let error: { message: string } | null = null;

    if (needAllRows) {
      const BATCH_SIZE = 1000;
      let from = 0;
      while (true) {
        const { data, error: batchErr, count: batchCount } = await buildRegQuery(
          from,
          from + BATCH_SIZE - 1
        );
        if (batchErr) {
          error = batchErr;
          break;
        }
        if (typeof batchCount === "number") count = batchCount;
        const batch = (data as Record<string, unknown>[]) || [];
        registrations.push(...batch);
        if (batch.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }
    } else {
      const { data, error: pageErr, count: pageCount } = await buildRegQuery(
        offset,
        offset + pageSize - 1
      );
      registrations = (data as Record<string, unknown>[]) || [];
      count = pageCount || 0;
      error = pageErr;
    }

    const [teamsResult, submissionsResult, hackTrackResult] =
      await supportingQueries;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch participants" }, { status: 400 });
    }

    // Build a user_id -> team name lookup AND user_id -> team_id lookup
    const userTeamMap: Record<string, string> = {};
    const userTeamIdMap: Record<string, string> = {};
    if (teamsResult.data) {
      for (const team of teamsResult.data) {
        const members = (team.team_members as { user_id: string }[]) || [];
        for (const member of members) {
          userTeamMap[member.user_id] = team.name as string;
          userTeamIdMap[member.user_id] = team.id as string;
        }
      }
    }

    // Resolve the optional "this form field IS the track" link. Mirrors the
    // campus pattern in screening_config.quotaFieldId. If set, the field's
    // stored value is matched against the hackathon's tracks list — by id
    // first, then by name/label — to look up the track's display name.
    const screeningConfig =
      (hackTrackResult.data?.screening_config as Record<string, unknown>) || {};
    const trackFieldId = (screeningConfig.trackFieldId as string | undefined) || null;
    const tracks =
      (hackTrackResult.data?.tracks as { id?: string; name?: string }[] | undefined) || [];

    function resolveTrackName(raw: unknown): string | null {
      if (raw === null || raw === undefined || raw === "") return null;
      const candidates: string[] = Array.isArray(raw)
        ? raw.map((v) => String(v))
        : [String(raw)];
      for (const candidate of candidates) {
        const match = tracks.find(
          (t) => t.id === candidate || t.name === candidate
        );
        if (match?.name) return match.name;
      }
      return candidates[0] || null;
    }

    // Build team_id -> track-name lookup from submissions (built-in track
    // column OR the configured form-data field). Registration form_data is
    // checked inline below when no submission has been made yet.
    const teamTrackMap: Record<string, string> = {};

    if (submissionsResult.data) {
      for (const sub of submissionsResult.data as {
        team_id: string;
        track: unknown;
        form_data: Record<string, unknown> | null;
      }[]) {
        if (!sub.team_id) continue;

        // First preference: the linked form-data field on the submission.
        if (trackFieldId && sub.form_data) {
          const resolved = resolveTrackName(sub.form_data[trackFieldId]);
          if (resolved) {
            teamTrackMap[sub.team_id] = resolved;
            continue;
          }
        }

        // Fallback: the built-in track JSONB column.
        const track = sub.track as { name?: string } | string | null | undefined;
        if (track) {
          const name = typeof track === "string" ? track : track.name;
          if (name) teamTrackMap[sub.team_id] = name;
        }
      }
    }

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
          trackName: (() => {
            const teamId = userTeamIdMap[userId];
            const teamTrack = teamId ? teamTrackMap[teamId] : undefined;
            if (teamTrack) return teamTrack;
            // Final fallback: the trackFieldId resolves against this user's
            // own registration form_data (covers hackathons where the track
            // is captured at registration time, not submission time).
            if (trackFieldId) {
              const regFormData = reg.form_data as Record<string, unknown> | null;
              if (regFormData) {
                const resolved = resolveTrackName(regFormData[trackFieldId]);
                if (resolved) return resolved;
              }
            }
            return null;
          })(),
          formData: (reg.form_data as Record<string, unknown>) || null,
          completenessScore: typeof reg.completeness_score === "number" ? reg.completeness_score : 0,
          eligibilityPassed: reg.eligibility_passed as boolean | null,
          screeningCompletedAt: reg.screening_completed_at as string | null,
          screeningResults: (reg.screening_results as unknown[]) || [],
          screeningFlags: (reg.screening_flags as unknown[]) || [],
          internalNotes: (reg.internal_notes as string) || null,
          resultsPublishedAt: reg.results_published_at as string | null,
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
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
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

    // Verify caller has access (owner/admin/editor can modify participants)
    const patchAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!patchAccess.hasAccess || !canEdit(patchAccess.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { registrationId, registrationIds, status, internalNotes, reason } = body as {
      registrationId?: string;
      registrationIds?: string[];
      status?: string;
      internalNotes?: string;
      reason?: string;
    };

    // Validate optional reason field
    if (reason !== undefined && (typeof reason !== "string" || reason.length > 2000)) {
      return NextResponse.json(
        { error: "reason must be a string of at most 2000 characters" },
        { status: 400 }
      );
    }

    // ── Notes-only update ─────────────────────────────────
    if (registrationId && internalNotes !== undefined && !status) {
      if (!UUID_RE.test(registrationId)) {
        return NextResponse.json({ error: "Invalid registration ID format" }, { status: 400 });
      }
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

    // Validate all IDs are UUIDs to prevent injection
    if (ids.some((id) => !UUID_RE.test(id))) {
      return NextResponse.json({ error: "Invalid registration ID format" }, { status: 400 });
    }

    // Limit bulk operations
    if (ids.length > 500) {
      return NextResponse.json({ error: "Maximum 500 registrations per bulk update" }, { status: 400 });
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

    // Validate status transitions — prevent nonsensical moves while keeping organizer flexibility
    // Each key lists the statuses that CAN transition TO it
    const allowedTransitions: Record<string, string[]> = {
      pending: ["under_review", "eligible", "ineligible", "accepted", "rejected", "cancelled", "approved"],
      confirmed: ["accepted", "approved", "waitlisted", "cancelled"],
      under_review: ["pending", "eligible"],
      eligible: ["under_review", "pending"],
      ineligible: ["pending", "under_review", "eligible", "accepted"],
      accepted: ["eligible", "under_review", "pending", "waitlisted", "confirmed", "declined", "rejected", "ineligible"],
      approved: ["pending", "under_review", "eligible", "declined"],
      waitlisted: ["eligible", "under_review", "pending", "accepted"],
      rejected: ["pending", "under_review", "eligible", "ineligible", "accepted"],
      declined: ["accepted", "approved", "confirmed"],
      cancelled: ["accepted", "approved", "confirmed", "pending", "eligible", "waitlisted", "under_review"],
    };

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

    // Validate transitions — collect any invalid ones
    const validFromStatuses = allowedTransitions[status];
    if (validFromStatuses) {
      const invalidTransitions: string[] = [];
      for (const [regId, prev] of previousStatusMap) {
        if (prev.status === status) continue; // no-op, skip
        if (!validFromStatuses.includes(prev.status)) {
          invalidTransitions.push(`${regId.slice(0, 8)}… (${prev.status} → ${status})`);
        }
      }
      if (invalidTransitions.length > 0 && invalidTransitions.length === ids.length) {
        return NextResponse.json(
          { error: `Invalid status transition: ${invalidTransitions[0]}. Cannot move from "${previousStatusMap.values().next().value?.status}" to "${status}".` },
          { status: 400 }
        );
      }
      // For bulk ops, filter out invalid ones and proceed with valid transitions
      if (invalidTransitions.length > 0) {
        const validIds = ids.filter((id) => {
          const prev = previousStatusMap.get(id);
          return !prev || prev.status === status || validFromStatuses.includes(prev.status);
        });
        if (validIds.length === 0) {
          return NextResponse.json({ error: "No valid status transitions in this batch" }, { status: 400 });
        }
        // Update only valid IDs
        const { data, error } = await supabase
          .from("hackathon_registrations")
          .update({ status })
          .eq("hackathon_id", hackathonId)
          .in("id", validIds)
          .select("id, user_id, hackathon_id, status, created_at, user:profiles!hackathon_registrations_user_id_fkey(*)");

        if (error) {
          return NextResponse.json({ error: "Failed to update status" }, { status: 400 });
        }

        // Send notifications/emails/webhooks for successfully updated registrations
        const hackathonName = hackathon.name || "the competition";
        const notifiableStatuses = ["cancelled", "rejected", "approved", "accepted", "waitlisted", "ineligible", "eligible", "under_review", "declined"];
        const partialMessages: Record<string, { title: string; message: string }> = {
          cancelled: { title: "Registration Cancelled", message: `Your registration for ${hackathonName} has been cancelled by the organizer.` },
          rejected: { title: "Application Rejected", message: `Your application for ${hackathonName} has been rejected.` },
          approved: { title: "Registration Approved", message: `Your registration for ${hackathonName} has been approved! You're all set to participate.` },
          accepted: { title: "Application Accepted", message: `Congratulations! Your application for ${hackathonName} has been accepted!` },
          waitlisted: { title: "Application Waitlisted", message: `Your application for ${hackathonName} has been placed on the waitlist.` },
          eligible: { title: "Application Eligible", message: `Your application for ${hackathonName} has passed screening and is eligible for selection.` },
          ineligible: { title: "Application Ineligible", message: `Your application for ${hackathonName} did not meet the eligibility criteria.` },
          under_review: { title: "Application Under Review", message: `Your application for ${hackathonName} is being reviewed by the organizers.` },
          declined: { title: "Application Declined", message: `Your application for ${hackathonName} has been declined.` },
        };

        for (const reg of data || []) {
          const prev = previousStatusMap.get(reg.id);
          const statusChanged = prev && prev.status !== status;
          if (statusChanged && notifiableStatuses.includes(status)) {
            const notif = partialMessages[status];
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
            // Fire webhook
            fireWebhooks(auth.userId, "hackathon.participant.status_changed", {
              hackathonId,
              hackathonName: hackathon.name,
              registrationId: reg.id,
              userId: reg.user_id,
              status: reg.status,
            });
          }
        }

        // Audit log: insert screening_overrides for status changes (fire-and-forget)
        const partialOverrideRecords = (data || [])
          .filter((reg) => {
            const prev = previousStatusMap.get(reg.id);
            return prev && prev.status !== status;
          })
          .map((reg) => ({
            hackathon_id: hackathonId,
            registration_id: reg.id,
            previous_status: previousStatusMap.get(reg.id)!.status,
            new_status: status,
            overridden_by: auth.userId,
            reason: reason || null,
          }));
        if (partialOverrideRecords.length > 0) {
          supabase
            .from("screening_overrides")
            .insert(partialOverrideRecords)
            .then(() => {}, () => {});
        }

        // Auto-promote waitlisted if spots freed
        if (SPOT_FREEING_STATUSES.has(status)) {
          const freedSpots = (data ?? []).filter((reg) => {
            const prev = previousStatusMap.get(reg.id);
            return prev && prev.status !== status;
          }).length;
          if (freedSpots > 0) {
            autoPromoteWaitlist(hackathonId, hackathonName, freedSpots);
          }
        }

        return NextResponse.json({
          data: {
            updated: data?.length || 0,
            skipped: invalidTransitions.length,
            status,
          },
        });
      }
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
    const notifiableStatuses = ["cancelled", "rejected", "approved", "accepted", "waitlisted", "ineligible", "eligible", "under_review", "declined"];
    const hackathonName = hackathon.name || "the competition";
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
      under_review: {
        title: "Application Under Review",
        message: `Your application for ${hackathonName} is being reviewed by the organizers.`,
      },
      declined: {
        title: "Application Declined",
        message: `Your application for ${hackathonName} has been declined.`,
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

      }

      // Fire webhook per registration only if status actually changed
      if (statusChanged) fireWebhooks(auth.userId, "hackathon.participant.status_changed", {
        hackathonId,
        hackathonName: hackathon.name,
        registrationId: reg.id,
        userId: reg.user_id,
        status: reg.status,
      });
    }

    // Audit log: insert screening_overrides for status changes (fire-and-forget)
    const overrideRecords = (data || [])
      .filter((reg) => {
        const prev = previousStatusMap.get(reg.id);
        return prev && prev.status !== status;
      })
      .map((reg) => ({
        hackathon_id: hackathonId,
        registration_id: reg.id,
        previous_status: previousStatusMap.get(reg.id)!.status,
        new_status: status,
        overridden_by: auth.userId,
        reason: reason || null,
      }));
    if (overrideRecords.length > 0) {
      supabase
        .from("screening_overrides")
        .insert(overrideRecords)
        .then(() => {}, () => {});
    }

    // Auto-promote waitlisted applicants if spots were freed up
    if (SPOT_FREEING_STATUSES.has(status)) {
      const freedSpots = (data ?? []).filter((reg) => {
        const prev = previousStatusMap.get(reg.id);
        return prev && prev.status !== status; // actually changed
      }).length;
      if (freedSpots > 0) {
        // Fire-and-forget — don't block the response
        autoPromoteWaitlist(hackathonId, hackathonName, freedSpots);
      }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

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

    // Verify caller has access (owner/admin/editor can delete cancelled registrations)
    const delAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!delAccess.hasAccess || !canEdit(delAccess.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId || !UUID_RE.test(registrationId)) {
      return NextResponse.json({ error: "Valid registrationId query parameter is required" }, { status: 400 });
    }

    // Only allow deleting cancelled registrations
    const { data: reg } = await supabase
      .from("hackathon_registrations")
      .select("id, status")
      .eq("id", registrationId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (reg.status !== "cancelled") {
      return NextResponse.json(
        { error: "Only cancelled registrations can be deleted" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("hackathon_registrations")
      .delete()
      .eq("id", registrationId)
      .eq("hackathon_id", hackathonId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete registration" }, { status: 400 });
    }

    return NextResponse.json({ data: { deleted: true, id: registrationId } });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
