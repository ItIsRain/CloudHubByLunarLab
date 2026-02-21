import { buildMetadata } from "@/lib/seo";
import CreateHackathonPage from "./page-client";

export const metadata = buildMetadata({
  title: "Create a Hackathon",
  description: "Launch your own hackathon on CloudHub.",
  path: "/hackathons/create",
});

export default function Page() {
  return <CreateHackathonPage />;
}
