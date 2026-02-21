import { buildMetadata } from "@/lib/seo";
import PrivacyPolicyPage from "./page-client";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "CloudHub privacy policy — how we collect, use, and protect your data.",
  path: "/legal/privacy",
});

export default function Page() {
  return <PrivacyPolicyPage />;
}
