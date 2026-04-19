import { buildMetadata } from "@/lib/seo";
import CreateHackathonPage from "./page-client";

export const metadata = buildMetadata({
  title: "Create a Competition",
  description: "Launch your own competition on CloudHub.",
  path: "/hackathons/create",
});

export default function Page() {
  return <CreateHackathonPage />;
}
