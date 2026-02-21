import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import TeamsPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Teams" });

  return buildMetadata({
    title: `Teams - ${h.name}`,
    description: `Browse teams participating in ${h.name}.`,
    path: `/hackathons/${h.slug}/teams`,
  });
}

export default function Page() {
  return <TeamsPage />;
}
