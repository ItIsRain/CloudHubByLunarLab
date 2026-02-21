import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonOverviewPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Overview" });

  return buildMetadata({
    title: `Overview - ${h.name}`,
    description: h.tagline ?? `Overview of ${h.name} hackathon.`,
    path: `/hackathons/${h.slug}/overview`,
  });
}

export default function Page() {
  return <HackathonOverviewPage />;
}
