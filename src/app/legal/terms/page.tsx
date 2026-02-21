import { buildMetadata } from "@/lib/seo";
import TermsOfServicePage from "./page-client";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description: "CloudHub terms of service and user agreement.",
  path: "/legal/terms",
});

export default function Page() {
  return <TermsOfServicePage />;
}
