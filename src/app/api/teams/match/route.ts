import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTeam } from "@/lib/supabase/mappers";
import { z } from "zod";

const matchSchema = z.object({
  hackathon_id: z.string().uuid(),
});

interface ParticipantProfile {
  id: string;
  skills: string[];
  interests: string[];
  name: string;
}

/**
 * Compute a compatibility score between two participants.
 *
 * Weights:
 *   - Shared skills: 0.3  (they can collaborate on common ground)
 *   - Complementary skills: 0.5  (diversity of skill set is most valuable)
 *   - Shared interests: 0.2  (alignment on goals/motivation)
 */
function computeCompatibility(a: ParticipantProfile, b: ParticipantProfile): number {
  const aSkills = new Set(a.skills.map((s) => s.toLowerCase()));
  const bSkills = new Set(b.skills.map((s) => s.toLowerCase()));
  const aInterests = new Set(a.interests.map((s) => s.toLowerCase()));
  const bInterests = new Set(b.interests.map((s) => s.toLowerCase()));

  // Shared skills
  const sharedSkills = [...aSkills].filter((s) => bSkills.has(s)).length;
  const totalUniqueSkills = new Set([...aSkills, ...bSkills]).size;
  const sharedSkillScore = totalUniqueSkills > 0 ? sharedSkills / totalUniqueSkills : 0;

  // Complementary skills (skills one has that the other doesn't)
  const complementaryA = [...aSkills].filter((s) => !bSkills.has(s)).length;
  const complementaryB = [...bSkills].filter((s) => !aSkills.has(s)).length;
  const complementaryScore = totalUniqueSkills > 0
    ? (complementaryA + complementaryB) / totalUniqueSkills
    : 0;

  // Shared interests
  const sharedInterests = [...aInterests].filter((s) => bInterests.has(s)).length;
  const totalUniqueInterests = new Set([...aInterests, ...bInterests]).size;
  const sharedInterestScore = totalUniqueInterests > 0
    ? sharedInterests / totalUniqueInterests
    : 0;

  return (
    sharedSkillScore * 0.3 +
    complementaryScore * 0.5 +
    sharedInterestScore * 0.2
  );
}

/**
 * Compute how well a candidate fits with an existing team.
 * Average the compatibility with each existing team member.
 */
function computeTeamFit(
  candidate: ParticipantProfile,
  teamMembers: ParticipantProfile[]
): number {
  if (teamMembers.length === 0) return 0;
  const total = teamMembers.reduce(
    (sum, member) => sum + computeCompatibility(candidate, member),
    0
  );
  return total / teamMembers.length;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = matchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { hackathon_id } = parsed.data;

    // Verify the hackathon exists and the user is the organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("id, organizer_id, min_team_size, max_team_size, name")
      .eq("id", hackathon_id)
      .single();

    if (!hackathon) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    if (hackathon.organizer_id !== user.id) {
      return NextResponse.json(
        { error: "Only the hackathon organizer can trigger auto-matching" },
        { status: 403 }
      );
    }

    const minTeamSize = (hackathon.min_team_size as number) || 2;
    const maxTeamSize = (hackathon.max_team_size as number) || 5;
    const optimalSize = Math.min(maxTeamSize, Math.max(minTeamSize, 4));

    // Get all registered participants
    const { data: registrations } = await supabase
      .from("hackathon_registrations")
      .select("user_id")
      .eq("hackathon_id", hackathon_id)
      .in("status", ["confirmed", "approved"]);

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { error: "No registered participants to match" },
        { status: 400 }
      );
    }

    const registeredUserIds = registrations.map((r) => r.user_id as string);

    // Get users already on a team
    const { data: existingMembers } = await supabase
      .from("team_members")
      .select("user_id, teams!inner(hackathon_id)")
      .eq("teams.hackathon_id", hackathon_id);

    const usersOnTeam = new Set(
      (existingMembers || []).map((m) => m.user_id as string)
    );

    // Filter to unmatched participants
    const unmatchedIds = registeredUserIds.filter((id) => !usersOnTeam.has(id));

    if (unmatchedIds.length === 0) {
      return NextResponse.json(
        { error: "All registered participants are already on teams" },
        { status: 400 }
      );
    }

    // Fetch profiles for unmatched participants
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, skills, interests")
      .in("id", unmatchedIds);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: "No participant profiles found" },
        { status: 400 }
      );
    }

    const participants: ParticipantProfile[] = profiles.map((p) => ({
      id: p.id as string,
      name: (p.name as string) || "",
      skills: (p.skills as string[]) || [],
      interests: (p.interests as string[]) || [],
    }));

    // Greedy team formation algorithm
    const remaining = new Set(participants.map((p) => p.id));
    const participantMap = new Map(participants.map((p) => [p.id, p]));
    const formedTeams: ParticipantProfile[][] = [];

    while (remaining.size >= minTeamSize) {
      // Start a new team with a random participant
      const [firstId] = remaining;
      const first = participantMap.get(firstId)!;
      remaining.delete(firstId);
      const team: ParticipantProfile[] = [first];

      // Greedily add the best-fitting members up to optimalSize
      while (team.length < optimalSize && remaining.size > 0) {
        let bestId = "";
        let bestScore = -1;

        for (const candidateId of remaining) {
          const candidate = participantMap.get(candidateId)!;
          const score = computeTeamFit(candidate, team);
          if (score > bestScore) {
            bestScore = score;
            bestId = candidateId;
          }
        }

        if (bestId) {
          team.push(participantMap.get(bestId)!);
          remaining.delete(bestId);
        } else {
          break;
        }
      }

      formedTeams.push(team);
    }

    // Handle leftover participants (fewer than minTeamSize)
    if (remaining.size > 0) {
      const leftovers = [...remaining].map((id) => participantMap.get(id)!);

      if (formedTeams.length > 0) {
        // Distribute leftovers into existing teams that have room
        for (const leftover of leftovers) {
          let bestTeamIdx = -1;
          let bestScore = -1;

          for (let i = 0; i < formedTeams.length; i++) {
            if (formedTeams[i].length < maxTeamSize) {
              const score = computeTeamFit(leftover, formedTeams[i]);
              if (score > bestScore) {
                bestScore = score;
                bestTeamIdx = i;
              }
            }
          }

          if (bestTeamIdx >= 0) {
            formedTeams[bestTeamIdx].push(leftover);
          } else {
            // All teams are full, create a small team anyway
            formedTeams.push([leftover]);
          }
        }
      } else {
        // Not enough participants for even one team
        formedTeams.push(leftovers);
      }
    }

    // Create teams in the database
    const createdTeams = [];

    for (let i = 0; i < formedTeams.length; i++) {
      const members = formedTeams[i];
      const teamName = `Team ${i + 1}`;

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          description: `Auto-matched team for ${hackathon.name}`,
          avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(teamName + hackathon_id)}`,
          hackathon_id,
          max_size: maxTeamSize,
          status: "forming",
        })
        .select("id")
        .single();

      if (teamError || !team) {
        console.error("Failed to create team:", teamError);
        continue;
      }

      // Add all members (first member is leader)
      const memberInserts = members.map((m, idx) => ({
        team_id: team.id,
        user_id: m.id,
        role: "Developer",
        is_leader: idx === 0,
      }));

      const { error: memberError } = await supabase
        .from("team_members")
        .insert(memberInserts);

      if (memberError) {
        console.error("Failed to add team members:", memberError);
        continue;
      }

      // Fetch the full team with members
      const { data: fullTeam } = await supabase
        .from("teams")
        .select("*, team_members(*, user:profiles!team_members_user_id_fkey(*))")
        .eq("id", team.id)
        .single();

      if (fullTeam) {
        createdTeams.push(dbRowToTeam(fullTeam as Record<string, unknown>));
      }

      // Send notifications to team members
      for (const member of members) {
        await supabase.from("notifications").insert({
          user_id: member.id,
          type: "team-invite" as const,
          title: "You've been matched to a team!",
          message: `You've been auto-matched to "${teamName}" for ${hackathon.name}.`,
          link: `/hackathons/${hackathon_id}/teams`,
        });
      }
    }

    // Update team_count on the hackathon
    const { count: teamCount } = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathon_id);

    if (teamCount !== null) {
      await supabase
        .from("hackathons")
        .update({ team_count: teamCount })
        .eq("id", hackathon_id);
    }

    return NextResponse.json({
      data: createdTeams,
      matched: participants.length,
      teamsCreated: createdTeams.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
