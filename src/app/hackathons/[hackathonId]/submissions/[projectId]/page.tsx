import type { Metadata } from "next";
import { getHackathonMeta } from "../../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import ProjectDetailPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string; projectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Project" });

  return buildMetadata({
    title: `Project - ${h.name}`,
    description: `Project submission for ${h.name} hackathon.`,
    path: `/hackathons/${h.slug}/submissions`,
  });
}

export default function Page() {
  return <ProjectDetailPage />;
}
