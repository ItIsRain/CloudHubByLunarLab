import { buildMetadata } from "@/lib/seo";
import ApiDocsPage from "./page-client";

export const metadata = buildMetadata({
  title: "API Reference",
  description:
    "Complete REST API documentation for CloudHub. Integrate events, hackathons, teams, and submissions into your workflows with our developer API.",
  path: "/api-docs",
});

export default function Page() {
  return <ApiDocsPage />;
}
