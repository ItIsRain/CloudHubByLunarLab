import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonSubmissionsPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Submissions" });

  return buildMetadata({
    title: `Submissions - ${h.name}`,
    description: `Browse project submissions for ${h.name}.`,
    path: `/hackathons/${h.slug}/submissions`,
  });
}

export default function Page() {
  return <HackathonSubmissionsPage />;
}
