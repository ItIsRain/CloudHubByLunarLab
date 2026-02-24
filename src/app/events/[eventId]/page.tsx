import type { Metadata } from "next";
import { getEventMeta } from "./_lib/get-event-meta";
import { buildMetadata, buildEventJsonLd, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import EventDetailPage from "./page-client";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventMeta(eventId);
  if (!event) return buildMetadata({ title: "Event Not Found" });

  const meta = buildMetadata({
    title: event.title,
    description: event.tagline ?? event.description?.slice(0, 160) ?? undefined,
    path: `/events/${event.slug}`,
    image: event.cover_image ?? undefined,
  });

  // Prevent indexing for private/unlisted events
  if (event.visibility && event.visibility !== "public") {
    meta.robots = { index: false, follow: false };
  }

  return meta;
}

export default async function Page({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventMeta(eventId);

  return (
    <>
      {event && (
        <JsonLd
          data={buildEventJsonLd({
            title: event.title,
            description: event.description ?? undefined,
            startDate: event.start_date ?? "",
            endDate: event.end_date ?? "",
            coverImage: event.cover_image ?? undefined,
            location: event.location ?? undefined,
            type: event.type ?? undefined,
            tickets: event.tickets ?? undefined,
            slug: event.slug,
          })}
        />
      )}
      <EventDetailPage />
    </>
  );
}
