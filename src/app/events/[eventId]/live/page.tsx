import type { Metadata } from "next";
import { getEventMeta } from "../_lib/get-event-meta";
import { buildMetadata } from "@/lib/seo";
import LivePage from "./page-client";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventMeta(eventId);
  if (!event) return buildMetadata({ title: "Live" });

  return buildMetadata({
    title: `Live - ${event.title}`,
    description: `Watch ${event.title} live.`,
    path: `/events/${event.slug}/live`,
  });
}

export default function Page() {
  return <LivePage />;
}
