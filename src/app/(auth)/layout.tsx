import type { Metadata } from "next";
import AuthLayout from "./auth-layout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
