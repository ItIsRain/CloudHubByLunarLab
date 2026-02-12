"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useUIStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("rounded-full", className)}
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const Icon =
    theme === "dark" ? Moon : theme === "system" ? Monitor : Sun;
  const label =
    theme === "dark"
      ? "Dark mode"
      : theme === "system"
        ? "System theme"
        : "Light mode";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("rounded-full", className)}
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5 transition-transform duration-300" />
    </Button>
  );
}
