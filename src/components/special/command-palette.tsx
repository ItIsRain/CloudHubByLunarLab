"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Compass,
  Calendar,
  Trophy,
  Settings,
  User,
  Plus,
  Sun,
  Moon,
  ArrowRight,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

interface PaletteItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  section: "recent" | "navigation" | "actions";
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setTheme, theme } = useUIStore();

  const allItems: PaletteItem[] = [
    // Recent
    {
      id: "recent-dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => router.push("/dashboard"),
      section: "recent",
    },
    {
      id: "recent-explore",
      label: "Explore Events",
      icon: <Compass className="h-4 w-4" />,
      action: () => router.push("/explore"),
      section: "recent",
    },

    // Navigation
    {
      id: "nav-dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      shortcut: "G D",
      action: () => router.push("/dashboard"),
      section: "navigation",
    },
    {
      id: "nav-explore",
      label: "Explore",
      icon: <Compass className="h-4 w-4" />,
      shortcut: "G E",
      action: () => router.push("/explore"),
      section: "navigation",
    },
    {
      id: "nav-events",
      label: "Events",
      icon: <Calendar className="h-4 w-4" />,
      shortcut: "G V",
      action: () => router.push("/events"),
      section: "navigation",
    },
    {
      id: "nav-hackathons",
      label: "Hackathons",
      icon: <Trophy className="h-4 w-4" />,
      shortcut: "G H",
      action: () => router.push("/hackathons"),
      section: "navigation",
    },
    {
      id: "nav-settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      shortcut: "G S",
      action: () => router.push("/dashboard/settings"),
      section: "navigation",
    },
    {
      id: "nav-profile",
      label: "Profile",
      icon: <User className="h-4 w-4" />,
      shortcut: "G P",
      action: () => router.push("/dashboard/profile"),
      section: "navigation",
    },

    // Actions
    {
      id: "action-create-event",
      label: "Create Event",
      icon: <Plus className="h-4 w-4" />,
      shortcut: "C E",
      action: () => router.push("/events/create"),
      section: "actions",
    },
    {
      id: "action-create-hackathon",
      label: "Create Hackathon",
      icon: <Plus className="h-4 w-4" />,
      shortcut: "C H",
      action: () => router.push("/hackathons/create"),
      section: "actions",
    },
    {
      id: "action-toggle-theme",
      label: "Toggle Theme",
      icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      shortcut: "T T",
      action: () => setTheme(theme === "dark" ? "light" : "dark"),
      section: "actions",
    },
  ];

  const filteredItems = query.trim()
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const sections = [
    { key: "recent" as const, label: "Recent" },
    { key: "navigation" as const, label: "Navigation" },
    { key: "actions" as const, label: "Actions" },
  ];

  const flatFiltered = sections.flatMap((section) =>
    filteredItems.filter((item) => item.section === section.key)
  );

  // Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Arrow key navigation
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatFiltered.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatFiltered.length - 1
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (flatFiltered[selectedIndex]) {
          flatFiltered[selectedIndex].action();
          setOpen(false);
        }
      }
    },
    [flatFiltered, selectedIndex]
  );

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  let globalIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className={cn(
          "relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border bg-background shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search..."
            className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded-md border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            sections.map((section) => {
              const sectionItems = filteredItems.filter(
                (item) => item.section === section.key
              );
              if (sectionItems.length === 0) return null;

              return (
                <div key={section.key} className="mb-2">
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  {sectionItems.map((item) => {
                    globalIndex++;
                    const isSelected = globalIndex === selectedIndex;
                    const currentIndex = globalIndex;

                    return (
                      <button
                        key={item.id}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        )}
                        onClick={() => {
                          item.action();
                          setOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 text-left font-medium">
                          {item.label}
                        </span>
                        {item.shortcut && (
                          <div className="flex items-center gap-1">
                            {item.shortcut.split(" ").map((key, i) => (
                              <kbd
                                key={i}
                                className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                        {isSelected && (
                          <ArrowRight className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{" "}
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>{" "}
              Close
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
