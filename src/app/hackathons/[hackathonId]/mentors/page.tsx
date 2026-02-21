import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonMentorsPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Mentors" });

  return buildMetadata({
    title: `Mentors - ${h.name}`,
    description: `Meet the mentors for ${h.name}.`,
    path: `/hackathons/${h.slug}/mentors`,
  });
}

export default function Page() {
  return <HackathonMentorsPage />;
}
