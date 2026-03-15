import { buildMetadata } from "@/lib/seo";
import EditCompetitionPage from "./page-client";

export const metadata = buildMetadata({
  title: "Edit Competition Form",
  description: "Edit your competition application form.",
  path: "/dashboard/competitions/edit",
});

export default function Page() {
  return <EditCompetitionPage />;
}
