import { buildMetadata } from "@/lib/seo";
import ExplorePage from "./page-client";

export const metadata = buildMetadata({
  title: "Explore Events & Hackathons",
  description: "Discover upcoming events, hackathons, and communities near you.",
  path: "/explore",
});

export default function Page() {
  return <ExplorePage />;
}
