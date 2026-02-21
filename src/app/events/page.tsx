import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Events",
  description: "Discover and attend the best events — conferences, meetups, workshops, and more.",
  path: "/events",
});

export default function Page() {
  redirect("/explore/events");
}
