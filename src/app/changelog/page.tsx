import { buildMetadata } from "@/lib/seo";
import ChangelogPage from "./page-client";

export const metadata = buildMetadata({
  title: "Changelog",
  description: "See what's new on CloudHub — latest features, improvements, and fixes.",
  path: "/changelog",
});

export default function Page() {
  return <ChangelogPage />;
}
