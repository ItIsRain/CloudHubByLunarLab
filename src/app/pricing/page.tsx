import { buildMetadata } from "@/lib/seo";
import PricingPage from "./page-client";

export const metadata = buildMetadata({
  title: "Pricing",
  description: "Simple, transparent pricing for event organizers of all sizes.",
  path: "/pricing",
});

export default function Page() {
  return <PricingPage />;
}
