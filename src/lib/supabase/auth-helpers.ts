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
 * Verifies the user is a judge for the given hackathon.
 * Checks: judge_invitations (accepted), hackathon judges JSONB, or organizer.
 */
export async function verifyIsJudge(
  supabase: SupabaseClient,
  hackathonId: string,
  userId: string
): Promise<boolean> {
  // 1. Check judge_invitations table for accepted invite
  // The accept endpoint stores the accepting user in `accepted_by`, so check both columns
  const { data: invitation } = await supabase
    .from("judge_invitations")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("status", "accepted")
    .or(`user_id.eq.${userId},accepted_by.eq.${userId}`)
    .maybeSingle();

  if (invitation) return true;

  // 2. Check hackathon's judges JSONB array and organizer_id
  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("judges, organizer_id")
    .eq("id", hackathonId)
    .single();

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
  // Check if user is team leader
  const { data: leader } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("is_leader", true)
    .maybeSingle();

  if (leader) return true;

  // Check if user is the hackathon organizer
  const { data: team } = await supabase
    .from("teams")
    .select("hackathon_id")
    .eq("id", teamId)
    .single();

  if (!team) return false;

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", team.hackathon_id)
    .single();

  return hackathon?.organizer_id === userId;
}
