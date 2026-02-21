import type { Metadata } from "next";
import { getHackathonMeta } from "./_lib/get-hackathon-meta";
import { buildMetadata, buildHackathonJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import HackathonDetailPage from "./page-client";

type Props = { params: Promise<{ hackathonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);
  if (!h) return buildMetadata({ title: "Hackathon Not Found" });

  const desc = h.prize_pool
    ? `${h.tagline ?? h.name} — $${h.prize_pool.toLocaleString()} in prizes.`
    : h.tagline ?? h.description?.slice(0, 160) ?? undefined;

  return buildMetadata({
    title: h.name,
    description: desc,
    path: `/hackathons/${h.slug}`,
    image: h.cover_image ?? undefined,
  });
}

export default async function Page({ params }: Props) {
  const { hackathonId } = await params;
  const h = await getHackathonMeta(hackathonId);

  return (
    <>
      {h && (
        <JsonLd
          data={buildHackathonJsonLd({
            name: h.name,
            description: h.description ?? undefined,
            startDate: h.start_date ?? "",
            endDate: h.end_date ?? "",
            coverImage: h.cover_image ?? undefined,
            type: h.type ?? undefined,
            slug: h.slug,
            prizePool: h.prize_pool ?? undefined,
          })}
        />
      )}
      <HackathonDetailPage />
    </>
  );
}
