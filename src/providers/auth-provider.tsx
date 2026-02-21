"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const hasHydrated = React.useRef(false);

  React.useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      fetchUser();
    }
  }, [fetchUser]);

  return <>{children}</>;
}
