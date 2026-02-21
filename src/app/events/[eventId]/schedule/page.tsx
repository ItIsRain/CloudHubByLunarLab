import type { Metadata } from "next";
import { getEventMeta } from "../_lib/get-event-meta";
import { buildMetadata } from "@/lib/seo";
import SchedulePage from "./page-client";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventMeta(eventId);
  if (!event) return buildMetadata({ title: "Schedule" });

  return buildMetadata({
    title: `Schedule - ${event.title}`,
    description: `Full schedule and agenda for ${event.title}.`,
    path: `/events/${event.slug}/schedule`,
  });
}

export default function Page() {
  return <SchedulePage />;
}
