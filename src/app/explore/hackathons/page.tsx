import { buildMetadata } from "@/lib/seo";
import AllHackathonsPage from "./page-client";

export const metadata = buildMetadata({
  title: "Browse Competitions",
  description: "Find competitions to join — compete, build, and win prizes.",
  path: "/explore/hackathons",
});

export default function Page() {
  return <AllHackathonsPage />;
}
