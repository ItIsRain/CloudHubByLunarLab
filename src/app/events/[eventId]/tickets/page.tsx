import type { Metadata } from "next";
import { getEventMeta } from "../_lib/get-event-meta";
import { buildMetadata } from "@/lib/seo";
import TicketsPage from "./page-client";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventMeta(eventId);
  if (!event) return buildMetadata({ title: "Tickets" });

  return buildMetadata({
    title: `Tickets - ${event.title}`,
    description: `Get tickets for ${event.title}.`,
    path: `/events/${event.slug}/tickets`,
  });
}

export default function Page() {
  return <TicketsPage />;
}
