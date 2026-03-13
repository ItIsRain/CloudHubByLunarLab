import { buildMetadata } from "@/lib/seo";
import CertificateVerifyClient from "./page-client";

export const metadata = buildMetadata({
  title: "Verify Certificate",
  description:
    "Verify the authenticity of a CloudHub certificate. Enter the verification code to confirm participation, achievements, and contributions.",
  path: "/certificates/verify",
});

export default function Page() {
  return <CertificateVerifyClient />;
}
