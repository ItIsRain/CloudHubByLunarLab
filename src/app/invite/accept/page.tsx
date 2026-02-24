import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AcceptInvitationPage from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Accept Invitation",
  description: "Accept your invitation to join a private event or hackathon on CloudHub.",
  path: "/invite/accept",
});

export default function Page() {
  return <AcceptInvitationPage />;
}
