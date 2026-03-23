import { buildMetadata, buildBlogListJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import BlogPage from "./page-client";

export const metadata = buildMetadata({
  title: "Blog",
  description:
    "Insights, guides, and news from the CloudHub team. Tips on event management, hackathon organization, community building, and more.",
  path: "/blog",
});

export default function Page() {
  return (
    <>
      <JsonLd data={buildBlogListJsonLd()} />
      <BlogPage />
    </>
  );
}
