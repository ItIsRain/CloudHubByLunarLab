import { buildMetadata } from "@/lib/seo";
import CookiePolicyPage from "./page-client";

export const metadata = buildMetadata({
  title: "Cookie Policy",
  description: "CloudHub cookie policy — how we use cookies and similar technologies.",
  path: "/legal/cookies",
});

export default function Page() {
  return <CookiePolicyPage />;
}
