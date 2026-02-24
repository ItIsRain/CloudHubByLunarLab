import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HackathonMeta = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  hacking_start: string | null;
  hacking_end: string | null;
  type: string | null;
  organizer_id: string | null;
  total_prize_pool: number | null;
  visibility: string | null;
};

export async function getHackathonMeta(hackathonId: string): Promise<HackathonMeta | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const filter = UUID_RE.test(hackathonId) ? "id" : "slug";
  const { data } = await supabase
    .from("hackathons")
    .select("id, slug, name, tagline, description, cover_image, hacking_start, hacking_end, type, organizer_id, total_prize_pool, visibility")
    .eq(filter, hackathonId)
    .single();

  if (!data) return null;

  // Don't leak private entity details in metadata/OG tags
  if (data.visibility === "private") return null;

  return data as HackathonMeta;
}
