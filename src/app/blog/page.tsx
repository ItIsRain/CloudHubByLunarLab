import { buildMetadata } from "@/lib/seo";
import BlogPage from "./page-client";

export const metadata = buildMetadata({
  title: "Blog",
  description: "Insights, guides, and news from the CloudHub team.",
  path: "/blog",
});

export default function Page() {
  return <BlogPage />;
}
