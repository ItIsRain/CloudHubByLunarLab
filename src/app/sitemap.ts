import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";

// Use a plain Supabase client (no cookies) so this works at build time
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getClient();

  // ── Static routes ─────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/explore",
    "/explore/events",
    "/explore/hackathons",
    "/explore/search",
    "/explore/communities",
    "/events",
    "/hackathons",
    "/events/create",
    "/hackathons/create",
    "/pricing",
    "/about",
    "/contact",
    "/blog",
    "/careers",
    "/changelog",
    "/legal/terms",
    "/legal/privacy",
    "/legal/cookies",
  ].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? ("daily" as const) : ("weekly" as const),
    priority: route === "/" ? 1 : route.startsWith("/explore") ? 0.9 : 0.7,
  }));

  // ── Dynamic event routes ──────────────────────────────────────
  const { data: events } = await supabase
    .from("events")
    .select("slug, updated_at")
    .eq("status", "published")
    .eq("visibility", "public");

  // Only sitemap the main event page. The sub-pages (schedule, speakers,
  // tickets, gallery, recap, live) are reachable via tabs on the main page
  // and rarely have enough unique content to merit their own index entry —
  // listing them en masse triggers "Crawled - currently not indexed" in GSC.
  const eventRoutes: MetadataRoute.Sitemap = (events ?? []).map((e) => ({
    url: `${SITE_URL}/events/${e.slug}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // ── Dynamic hackathon routes ──────────────────────────────────
  const { data: hackathons } = await supabase
    .from("hackathons")
    .select("slug, updated_at")
    .in("status", [
      "published",
      "registration-open",
      "registration-closed",
      "hacking",
      "submission",
      "judging",
      "completed",
    ])
    .eq("visibility", "public");

  // Only sitemap the main hackathon page. The 10 sub-pages (overview, faq,
  // schedule, teams, tracks, sponsors, submissions, mentors, leaderboard,
  // resources) duplicate content the main page already exposes via tabs,
  // and listing them all forces Google to crawl ~11x more URLs per
  // hackathon than necessary — most got bucketed into "Crawled - currently
  // not indexed" because they're thin/duplicative.
  const hackathonRoutes: MetadataRoute.Sitemap = (hackathons ?? []).map(
    (h) => ({
      url: `${SITE_URL}/hackathons/${h.slug}`,
      lastModified: new Date(h.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })
  );

  // ── Public profile routes ─────────────────────────────────────
  // Only sitemap profiles that actually have content. Empty profiles get
  // flagged by GSC as "Crawled - currently not indexed" because they look
  // like thin/low-value pages, which drags down site authority.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, updated_at, bio, headline, avatar")
    .not("username", "is", null);

  const profileRoutes: MetadataRoute.Sitemap = (profiles ?? [])
    .filter((p) => {
      const hasContent =
        (p.bio && (p.bio as string).trim().length > 20) ||
        (p.headline && (p.headline as string).trim().length > 0) ||
        !!p.avatar;
      return hasContent && p.username;
    })
    .map((p) => ({
      url: `${SITE_URL}/profile/${p.username}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

  // ── Dynamic blog post routes ─────────────────────────────────
  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const blogRoutes: MetadataRoute.Sitemap = (blogPosts ?? []).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at || p.published_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...eventRoutes,
    ...hackathonRoutes,
    ...profileRoutes,
    ...blogRoutes,
  ];
}
