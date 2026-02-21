import { buildMetadata } from "@/lib/seo";
import FeaturesPage from "./page-client";

export const metadata = buildMetadata({
  title: "Features",
  description: "Explore all CloudHub features — event management, hackathon platform, team formation, ticketing, analytics, and more.",
  path: "/features",
});

export default function Page() {
  return <FeaturesPage />;
}
