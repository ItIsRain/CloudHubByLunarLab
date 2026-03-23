import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { UUID_RE } from "@/lib/constants";
import type { TeamSuggestion } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const hackathonId = request.nextUrl.searchParams.get("hackathon_id");

    if (!hackathonId || !UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Valid hackathon_id query parameter is required" },
        { status: 400 }
      );
    }

    // Verify hackathon exists
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    // Get current user's profile
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, name, skills, interests")
      .eq("id", user.id)
      .single();

    if (!myProfile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const mySkills = new Set(
      ((myProfile.skills as string[]) || []).map((s) => s.toLowerCase())
    );
    const myInterests = new Set(
      ((myProfile.interests as string[]) || []).map((s) => s.toLowerCase())
    );

    // Get all registered participants
    const { data: registrations } = await supabase
      .from("hackathon_registrations")
      .select("user_id")
      .eq("hackathon_id", hackathonId)
      .in("status", ["confirmed", "approved"]);

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const registeredUserIds = registrations
      .map((r) => r.user_id as string)
      .filter((id) => id !== user.id);

    if (registeredUserIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get users already on a team
    const { data: existingMembers } = await supabase
      .from("team_members")
      .select("user_id, teams!inner(hackathon_id)")
      .eq("teams.hackathon_id", hackathonId);

    const usersOnTeam = new Set(
      (existingMembers || []).map((m) => m.user_id as string)
    );

    // Filter to unmatched participants (excluding current user)
    const unmatchedIds = registeredUserIds.filter((id) => !usersOnTeam.has(id));

    if (unmatchedIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", unmatchedIds);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Score each candidate
    const suggestions: TeamSuggestion[] = profiles.map((p) => {
      const pSkills = ((p.skills as string[]) || []).map((s) => s.toLowerCase());
      const pInterests = ((p.interests as string[]) || []).map((s) => s.toLowerCase());
      const pSkillSet = new Set(pSkills);
      const pInterestSet = new Set(pInterests);

      const sharedSkills = [...mySkills].filter((s) => pSkillSet.has(s));
      const complementarySkills = [...pSkillSet].filter((s) => !mySkills.has(s));
      const sharedInterests = [...myInterests].filter((s) => pInterestSet.has(s));

      const totalUniqueSkills = new Set([...mySkills, ...pSkillSet]).size;
      const totalUniqueInterests = new Set([...myInterests, ...pInterestSet]).size;

      const sharedSkillScore = totalUniqueSkills > 0
        ? sharedSkills.length / totalUniqueSkills
        : 0;
      const complementaryScore = totalUniqueSkills > 0
        ? complementarySkills.length / totalUniqueSkills
        : 0;
      const sharedInterestScore = totalUniqueInterests > 0
        ? sharedInterests.length / totalUniqueInterests
        : 0;

      const score = sharedSkillScore * 0.3 + complementaryScore * 0.5 + sharedInterestScore * 0.2;

      // Return original-cased skills/interests for display
      const originalSkills = (p.skills as string[]) || [];
      const originalInterests = (p.interests as string[]) || [];

      return {
        user: profileToPublicUser(p as Record<string, unknown>),
        compatibilityScore: Math.round(score * 100),
        sharedSkills: originalSkills.filter((s) => mySkills.has(s.toLowerCase())),
        complementarySkills: originalSkills.filter((s) => !mySkills.has(s.toLowerCase())),
        sharedInterests: originalInterests.filter((s) => myInterests.has(s.toLowerCase())),
      };
    });

    // Sort by compatibility score descending, take top 10
    const topSuggestions = suggestions
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 10);

    return NextResponse.json({ data: topSuggestions });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
