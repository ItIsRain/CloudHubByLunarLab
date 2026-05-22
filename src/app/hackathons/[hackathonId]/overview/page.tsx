import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonOverviewPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Overview" });

  // /overview renders essentially the same content as the main hackathon
  // page (the main page IS the overview, just with tabs). Canonical points
  // to the main URL so Google consolidates duplicates instead of flagging
  // "duplicate without user-selected canonical."
  return buildMetadata({
    title: `Overview - ${h.name}`,
    description: h.tagline ?? `Overview of ${h.name} competition.`,
    path: `/hackathons/${h.slug}`,
  });
}

export default function Page() {
  return <HackathonOverviewPage />;
}
