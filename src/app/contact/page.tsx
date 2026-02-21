import { buildMetadata } from "@/lib/seo";
import ContactPage from "./page-client";

export const metadata = buildMetadata({
  title: "Contact Us",
  description: "Get in touch with the CloudHub team. We'd love to hear from you.",
  path: "/contact",
});

export default function Page() {
  return <ContactPage />;
}
