import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Hackathons",
  description: "Browse upcoming hackathons — compete, collaborate, and build something amazing.",
  path: "/hackathons",
});

export default function Page() {
  redirect("/explore/hackathons");
}
