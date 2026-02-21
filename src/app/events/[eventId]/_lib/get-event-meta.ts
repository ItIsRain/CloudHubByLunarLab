import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EventMeta = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  start_date: string | null;
  end_date: string | null;
  type: string | null;
  location: Record<string, string> | null;
  organizer_id: string | null;
  tickets: { name: string; price: number; currency?: string }[] | null;
};

export async function getEventMeta(eventId: string): Promise<EventMeta | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const filter = UUID_RE.test(eventId) ? "id" : "slug";
  const { data } = await supabase
    .from("events")
    .select("id, slug, title, tagline, description, cover_image, start_date, end_date, type, location, organizer_id, tickets")
    .eq(filter, eventId)
    .single();

  return data as EventMeta | null;
}
