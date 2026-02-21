import type { Metadata } from "next";
import { getEventMeta } from "../_lib/get-event-meta";
import { buildMetadata } from "@/lib/seo";
import SpeakersPage from "./page-client";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventMeta(eventId);
  if (!event) return buildMetadata({ title: "Speakers" });

  return buildMetadata({
    title: `Speakers - ${event.title}`,
    description: `Meet the speakers at ${event.title}.`,
    path: `/events/${event.slug}/speakers`,
  });
}

export default function Page() {
  return <SpeakersPage />;
}
