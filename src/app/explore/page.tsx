import { buildMetadata } from "@/lib/seo";
import ExplorePage from "./page-client";

export const metadata = buildMetadata({
  title: "Explore Events & Competitions",
  description: "Discover upcoming events, competitions, and communities near you.",
  path: "/explore",
});

export default function Page() {
  return <ExplorePage />;
}
