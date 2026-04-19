import { buildMetadata } from "@/lib/seo";
import SearchResultsPage from "./page-client";

export const metadata = buildMetadata({
  title: "Search Events & Competitions",
  description: "Search for events, competitions, and communities on CloudHub.",
  path: "/explore/search",
});

export default function Page() {
  return <SearchResultsPage />;
}
