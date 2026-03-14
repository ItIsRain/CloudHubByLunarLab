import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata({
    title: "Apply",
    description: "Submit your application for this competition.",
    path: `/apply/${slug}`,
  });
}

export { default } from "./page-client";
