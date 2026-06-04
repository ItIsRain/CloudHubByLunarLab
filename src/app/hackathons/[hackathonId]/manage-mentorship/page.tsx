import type { Metadata } from "next";
import ManageMentorshipClient from "./page-client";

export const metadata: Metadata = {
  title: "Manage Mentorship",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ManageMentorshipClient />;
}
