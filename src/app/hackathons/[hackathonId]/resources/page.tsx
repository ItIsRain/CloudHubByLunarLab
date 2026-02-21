import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonResourcesPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Resources" });

  return buildMetadata({
    title: `Resources - ${h.name}`,
    description: `Resources and tools for ${h.name} participants.`,
    path: `/hackathons/${h.slug}/resources`,
  });
}

export default function Page() {
  return <HackathonResourcesPage />;
}
