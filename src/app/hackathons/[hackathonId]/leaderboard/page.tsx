import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonLeaderboardPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Leaderboard" });

  return buildMetadata({
    title: `Leaderboard - ${h.name}`,
    description: `Rankings and leaderboard for ${h.name}.`,
    path: `/hackathons/${h.slug}/leaderboard`,
  });
}

export default function Page() {
  return <HackathonLeaderboardPage />;
}
