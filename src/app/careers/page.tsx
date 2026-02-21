import { buildMetadata } from "@/lib/seo";
import CareersPage from "./page-client";

export const metadata = buildMetadata({
  title: "Careers at Lunar Labs",
  description: "Join the Lunar Labs team and help build the future of events and hackathons.",
  path: "/careers",
});

export default function Page() {
  return <CareersPage />;
}
