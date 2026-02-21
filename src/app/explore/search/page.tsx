import { buildMetadata } from "@/lib/seo";
import SearchResultsPage from "./page-client";

export const metadata = buildMetadata({
  title: "Search Events & Hackathons",
  description: "Search for events, hackathons, and communities on CloudHub.",
  path: "/explore/search",
});

export default function Page() {
  return <SearchResultsPage />;
}
