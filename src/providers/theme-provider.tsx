"use client";

import * as React from "react";
import { useUIStore } from "@/store/ui-store";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, setTheme } = useUIStore();

  React.useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (resolvedTheme: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches ? "dark" : "light");

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  return <>{children}</>;
}

export function useTheme() {
  const { theme, setTheme } = useUIStore();

  const resolvedTheme = React.useMemo(() => {
    if (theme === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "light";
    }
    return theme;
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
}
