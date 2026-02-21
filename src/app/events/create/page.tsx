import { buildMetadata } from "@/lib/seo";
import CreateEventPage from "./page-client";

export const metadata = buildMetadata({
  title: "Create an Event",
  description: "Create and publish your next event on CloudHub.",
  path: "/events/create",
});

export default function Page() {
  return <CreateEventPage />;
}
