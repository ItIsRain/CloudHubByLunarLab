import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonSchedulePage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Schedule" });

  return buildMetadata({
    title: `Schedule - ${h.name}`,
    description: `Full schedule for ${h.name} hackathon.`,
    path: `/hackathons/${h.slug}/schedule`,
  });
}

export default function Page() {
  return <HackathonSchedulePage />;
}
