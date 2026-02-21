import { buildMetadata } from "@/lib/seo";
import AllHackathonsPage from "./page-client";

export const metadata = buildMetadata({
  title: "Browse Hackathons",
  description: "Find hackathons to join — compete, build, and win prizes.",
  path: "/explore/hackathons",
});

export default function Page() {
  return <AllHackathonsPage />;
}
