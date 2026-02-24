import { buildMetadata } from "@/lib/seo";
import AboutPage from "./page-client";

export const metadata = buildMetadata({
  title: "About CloudHub",
  description: "Learn about CloudHub by Lunar Limited (formerly CloudLynq) — our mission, team, and vision for the future of events.",
  path: "/about",
});

export default function Page() {
  return <AboutPage />;
}
