import { buildMetadata } from "@/lib/seo";
import CreateCompetitionPage from "./page-client";

export const metadata = buildMetadata({
  title: "Create Competition Form",
  description: "Create a new competition application form on CloudHub.",
  path: "/dashboard/competitions/create",
});

export default function Page() {
  return <CreateCompetitionPage />;
}
