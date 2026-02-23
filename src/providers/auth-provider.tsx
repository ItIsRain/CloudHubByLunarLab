"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const logout = useAuthStore((s) => s.logout);
  const hasHydrated = React.useRef(false);

  React.useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      fetchUser();
    }

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        logout();
      } else if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        fetchUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, logout]);

  return <>{children}</>;
}
