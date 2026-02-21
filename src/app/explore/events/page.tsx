import { buildMetadata } from "@/lib/seo";
import AllEventsPage from "./page-client";

export const metadata = buildMetadata({
  title: "Browse Events",
  description: "Browse and filter all upcoming events — conferences, meetups, workshops, and more.",
  path: "/explore/events",
});

export default function Page() {
  return <AllEventsPage />;
}
