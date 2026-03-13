import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Shared result shape returned for every suggestion item.
 */
interface SuggestionItem {
  type: "event" | "hackathon" | "profile" | "community";
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  url: string;
}

interface SuggestionsResponse {
  events: SuggestionItem[];
  hackathons: SuggestionItem[];
  profiles: SuggestionItem[];
  communities: SuggestionItem[];
}

const MAX_PER_CATEGORY = 5;

/**
 * GET /api/search/suggestions?q=<query>
 *
 * Public endpoint — no auth required.
 * Returns up to 5 suggestions from each category (events, hackathons, profiles, communities).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json(
        { error: "Query parameter 'q' must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Escape PostgREST special characters to prevent filter injection
    const safe = q.replace(/[%_,.()\\]/g, (c) => `\\${c}`);
    const pattern = `%${safe}%`;

    const supabase = await getSupabaseServerClient();

    // Run all four queries in parallel
    const [eventsResult, hackathonsResult, profilesResult, communitiesResult] =
      await Promise.all([
        // Events: search title + tagline, public + published only
        supabase
          .from("events")
          .select("id, slug, title, tagline, cover_image")
          .eq("visibility", "public")
          .eq("status", "published")
          .or(`title.ilike.${pattern},tagline.ilike.${pattern}`)
          .order("registration_count", { ascending: false })
          .limit(MAX_PER_CATEGORY),

        // Hackathons: search name, public + published-like statuses
        supabase
          .from("hackathons")
          .select("id, slug, name, tagline, cover_image")
          .eq("visibility", "public")
          .in("status", [
            "published",
            "registration-open",
            "registration-closed",
            "hacking",
            "submission",
            "judging",
          ])
          .or(`name.ilike.${pattern},tagline.ilike.${pattern}`)
          .order("participant_count", { ascending: false })
          .limit(MAX_PER_CATEGORY),

        // Profiles: search name + username
        supabase
          .from("profiles")
          .select("id, username, name, headline, avatar")
          .or(`name.ilike.${pattern},username.ilike.${pattern}`)
          .limit(MAX_PER_CATEGORY),

        // Communities: search name, public + active only
        supabase
          .from("communities")
          .select("id, slug, name, description, logo")
          .eq("visibility", "public")
          .eq("status", "active")
          .ilike("name", pattern)
          .order("member_count", { ascending: false })
          .limit(MAX_PER_CATEGORY),
      ]);

    // Map results into the uniform SuggestionItem shape
    const events: SuggestionItem[] = (eventsResult.data || []).map(
      (row: Record<string, unknown>) => ({
        type: "event" as const,
        id: row.id as string,
        title: row.title as string,
        subtitle: (row.tagline as string) || null,
        image: (row.cover_image as string) || null,
        url: `/events/${(row.slug as string) || (row.id as string)}`,
      })
    );

    const hackathons: SuggestionItem[] = (hackathonsResult.data || []).map(
      (row: Record<string, unknown>) => ({
        type: "hackathon" as const,
        id: row.id as string,
        title: row.name as string,
        subtitle: (row.tagline as string) || null,
        image: (row.cover_image as string) || null,
        url: `/hackathons/${(row.slug as string) || (row.id as string)}`,
      })
    );

    const profiles: SuggestionItem[] = (profilesResult.data || []).map(
      (row: Record<string, unknown>) => ({
        type: "profile" as const,
        id: row.id as string,
        title: row.name as string,
        subtitle: (row.headline as string) || `@${row.username as string}`,
        image: (row.avatar as string) || null,
        url: `/profile/${row.username as string}`,
      })
    );

    const communities: SuggestionItem[] = (communitiesResult.data || []).map(
      (row: Record<string, unknown>) => ({
        type: "community" as const,
        id: row.id as string,
        title: row.name as string,
        subtitle: (row.description as string)?.slice(0, 80) || null,
        image: (row.logo as string) || null,
        url: `/communities/${(row.slug as string) || (row.id as string)}`,
      })
    );

    const response: SuggestionsResponse = {
      events,
      hackathons,
      profiles,
      communities,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("Search suggestions error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
