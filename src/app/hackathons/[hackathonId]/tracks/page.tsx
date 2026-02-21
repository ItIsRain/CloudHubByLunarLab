import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonTracksPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Tracks" });

  return buildMetadata({
    title: `Tracks - ${h.name}`,
    description: `Explore tracks and categories for ${h.name}.`,
    path: `/hackathons/${h.slug}/tracks`,
  });
}

export default function Page() {
  return <HackathonTracksPage />;
}
