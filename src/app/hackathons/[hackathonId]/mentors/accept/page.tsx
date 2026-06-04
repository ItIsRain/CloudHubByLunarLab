import type { Metadata } from "next";
import { Suspense } from "react";
import MentorAcceptClient from "./page-client";

export const metadata: Metadata = {
  title: "Mentor Invitation",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MentorAcceptClient />
    </Suspense>
  );
}
