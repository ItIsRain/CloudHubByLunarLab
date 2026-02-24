import type { SupabaseClient } from "@supabase/supabase-js";
import { rowToTimeline, type HackathonTimeline } from "@/lib/hackathon-phases";

const TIMELINE_COLUMNS =
  "registration_start, registration_end, hacking_start, hacking_end, submission_deadline, judging_start, judging_end, winners_announcement, status";

/**
 * Fetches the 8 date columns + status for a hackathon and returns a HackathonTimeline.
 */
export async function getHackathonTimeline(
  supabase: SupabaseClient,
  hackathonId: string
): Promise<HackathonTimeline | null> {
  const { data } = await supabase
    .from("hackathons")
    .select(TIMELINE_COLUMNS)
    .eq("id", hackathonId)
    .single();

  if (!data) return null;
  return rowToTimeline(data as Record<string, unknown>);
}

/**
 * Checks if a user has access to a private entity.
 * Returns true if:
 *   - Entity is not private (public/unlisted)
 *   - User is the organizer
 *   - User has a pending/accepted entity_invitation
 *   - (Hackathons only) User has a pending/accepted judge_invitation
 */
export async function hasPrivateEntityAccess(
  supabase: SupabaseClient,
  entityType: "event" | "hackathon",
  entityId: string,
  userId: string | undefined,
  userEmail: string | undefined
): Promise<boolean> {
  const table = entityType === "event" ? "events" : "hackathons";
  const { data: entity } = await supabase
    .from(table)
    .select("visibility, organizer_id")
    .eq("id", entityId)
    .single();

  if (!entity) return false;
  if (entity.visibility !== "private") return true;
  if (userId && entity.organizer_id === userId) return true;

  if (userEmail) {
    const email = userEmail.toLowerCase();

    if (entityType === "hackathon") {
      // Parallelize both invitation checks for hackathons
      const [entityInviteRes, judgeInviteRes] = await Promise.all([
        supabase
          .from("entity_invitations")
          .select("id")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("email", email)
          .in("status", ["accepted", "pending"])
          .maybeSingle(),
        supabase
          .from("judge_invitations")
          .select("id")
          .eq("hackathon_id", entityId)
          .eq("email", email)
          .in("status", ["accepted", "pending"])
          .maybeSingle(),
      ]);
      if (entityInviteRes.data || judgeInviteRes.data) return true;
    } else {
      const { data: invite } = await supabase
        .from("entity_invitations")
        .select("id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("email", email)
        .in("status", ["accepted", "pending"])
        .maybeSingle();
      if (invite) return true;
    }
  }

  return false;
}

/**
 * Verifies the user is a judge for the given hackathon.
 * Checks: judge_invitations (accepted), hackathon judges JSONB, or organizer.
 */
export async function verifyIsJudge(
  supabase: SupabaseClient,
  hackathonId: string,
  userId: string
): Promise<boolean> {
  // Parallelize: check judge_invitations and fetch hackathon data simultaneously
  const [invitationRes, hackathonRes] = await Promise.all([
    supabase
      .from("judge_invitations")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .eq("status", "accepted")
      .or(`user_id.eq.${userId},accepted_by.eq.${userId}`)
      .maybeSingle(),
    supabase
      .from("hackathons")
      .select("judges, organizer_id")
      .eq("id", hackathonId)
      .single(),
  ]);

  if (invitationRes.data) return true;

  const hackathon = hackathonRes.data;
  if (!hackathon) return false;

  // Organizer can always judge
  if (hackathon.organizer_id === userId) return true;

  // Check judges JSONB array (array of objects with userId/id field)
  const judges = hackathon.judges as unknown[];
  if (Array.isArray(judges)) {
    return judges.some((j) => {
      if (typeof j === "string") return j === userId;
      if (typeof j === "object" && j !== null) {
        const judge = j as Record<string, unknown>;
        return judge.userId === userId || judge.id === userId || judge.user_id === userId;
      }
      return false;
    });
  }

  return false;
}

/**
 * Verifies the user is a team leader or the hackathon organizer.
 */
export async function verifyIsTeamLeaderOrOrganizer(
  supabase: SupabaseClient,
  teamId: string,
  userId: string
): Promise<boolean> {
  // Parallelize: check leader status and fetch team data simultaneously
  const [leaderRes, teamRes] = await Promise.all([
    supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .eq("is_leader", true)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("hackathon_id")
      .eq("id", teamId)
      .single(),
  ]);

  if (leaderRes.data) return true;
  if (!teamRes.data) return false;

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", teamRes.data.hackathon_id)
    .single();

  return hackathon?.organizer_id === userId;
}
