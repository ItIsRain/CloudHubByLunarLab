import type { Metadata } from "next";
import { getHackathonMeta } from "../_lib/get-hackathon-meta";
import { buildMetadata } from "@/lib/seo";
import HackathonFAQPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "FAQ" });

  return buildMetadata({
    title: `FAQ - ${h.name}`,
    description: `Frequently asked questions about ${h.name}.`,
    path: `/hackathons/${h.slug}/faq`,
  });
}

export default function Page() {
  return <HackathonFAQPage />;
}
