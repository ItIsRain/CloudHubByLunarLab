import { buildMetadata } from "@/lib/seo";
import CareersPage from "./page-client";

export const metadata = buildMetadata({
  title: "Careers at Lunar Limited",
  description: "Join the Lunar Limited team and help build the future of events and hackathons.",
  path: "/careers",
});

export default function Page() {
  return <CareersPage />;
}
