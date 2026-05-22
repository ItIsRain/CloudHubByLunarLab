import { Suspense } from "react";
import type { Metadata } from "next";
import CoOrganizerAcceptClient from "./page-client";

export const dynamic = "force-dynamic";

// Token-bearing invite link — must never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CoOrganizerAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 grid place-items-center px-4">
          <div className="shimmer rounded-xl h-48 w-full max-w-md" />
        </div>
      }
    >
      <CoOrganizerAcceptClient />
    </Suspense>
  );
}
