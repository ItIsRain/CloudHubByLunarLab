import { buildMetadata } from "@/lib/seo";
import CommunitiesPage from "./page-client";

export const metadata = buildMetadata({
  title: "Communities",
  description: "Explore and join communities of like-minded event organizers and participants.",
  path: "/explore/communities",
});

export default function Page() {
  return <CommunitiesPage />;
}
