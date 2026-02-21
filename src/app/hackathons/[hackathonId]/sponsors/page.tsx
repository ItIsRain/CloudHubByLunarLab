import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonSponsorsPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Sponsors" });

  return buildMetadata({
    title: `Sponsors - ${h.name}`,
    description: `Sponsors and partners of ${h.name}.`,
    path: `/hackathons/${h.slug}/sponsors`,
  });
}

export default function Page() {
  return <HackathonSponsorsPage />;
}
