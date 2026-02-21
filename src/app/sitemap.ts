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
    .eq("status", "published");

  const eventSubPages = [
    "schedule",
    "speakers",
    "tickets",
    "gallery",
    "recap",
    "live",
  ];

  const eventRoutes: MetadataRoute.Sitemap = (events ?? []).flatMap((e) => [
    {
      url: `${SITE_URL}/events/${e.slug}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...eventSubPages.map((sub) => ({
      url: `${SITE_URL}/events/${e.slug}/${sub}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]);

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
    ]);

  const hackathonSubPages = [
    "overview",
    "faq",
    "schedule",
    "teams",
    "tracks",
    "sponsors",
    "submissions",
    "mentors",
    "leaderboard",
    "resources",
  ];

  const hackathonRoutes: MetadataRoute.Sitemap = (hackathons ?? []).flatMap(
    (h) => [
      {
        url: `${SITE_URL}/hackathons/${h.slug}`,
        lastModified: new Date(h.updated_at),
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      ...hackathonSubPages.map((sub) => ({
        url: `${SITE_URL}/hackathons/${h.slug}/${sub}`,
        lastModified: new Date(h.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ]
  );

  // ── Public profile routes ─────────────────────────────────────
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, updated_at");

  const profileRoutes: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${SITE_URL}/profile/${p.username}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...eventRoutes, ...hackathonRoutes, ...profileRoutes];
}
