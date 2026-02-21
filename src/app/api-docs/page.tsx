import { buildMetadata } from "@/lib/seo";
import ApiDocsPage from "./page-client";

export const metadata = buildMetadata({
  title: "API - Coming Soon",
  description: "The CloudHub developer API is coming soon. Build custom integrations for events, hackathons, teams, and more.",
  path: "/api-docs",
});

export default function Page() {
  return <ApiDocsPage />;
}
