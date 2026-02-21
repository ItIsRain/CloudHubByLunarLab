import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HackathonMeta = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  start_date: string | null;
  end_date: string | null;
  type: string | null;
  organizer_id: string | null;
  prize_pool: number | null;
};

export async function getHackathonMeta(hackathonId: string): Promise<HackathonMeta | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const filter = UUID_RE.test(hackathonId) ? "id" : "slug";
  const { data } = await supabase
    .from("hackathons")
    .select("id, slug, name, tagline, description, cover_image, start_date, end_date, type, organizer_id, prize_pool")
    .eq(filter, hackathonId)
    .single();

  return data as HackathonMeta | null;
}
