"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  Trophy,
  Users,
  User,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useSearchSuggestions,
  type SuggestionItem,
  type SearchSuggestions as SearchSuggestionsData,
} from "@/hooks/use-search";

interface SearchSuggestionsProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  activeIndex: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Called whenever query data changes, so the parent can access the data for keyboard nav. */
  onDataChange?: (data: SearchSuggestionsData | undefined) => void;
}

/**
 * Category metadata for display.
 */
const CATEGORY_CONFIG = {
  events: { label: "Events", icon: Calendar },
  hackathons: { label: "Hackathons", icon: Trophy },
  profiles: { label: "People", icon: User },
  communities: { label: "Communities", icon: Users },
} as const;

type CategoryKey = keyof typeof CATEGORY_CONFIG;

const CATEGORY_ORDER: CategoryKey[] = [
  "events",
  "hackathons",
  "profiles",
  "communities",
];

export function SearchSuggestions({
  query,
  isOpen,
  onClose,
  onSelect,
  activeIndex,
  inputRef,
  onDataChange,
}: SearchSuggestionsProps) {
  const { data, isLoading, isFetching } = useSearchSuggestions(query);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Report data back to parent for keyboard navigation
  React.useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, inputRef]);

  const showLoading = isLoading || isFetching;
  const trimmedQuery = query.trim();
  const shouldShow = isOpen && trimmedQuery.length >= 2;

  // Build a flat list of all items for keyboard navigation
  const flatItems = React.useMemo(() => {
    if (!data) return [];
    const items: SuggestionItem[] = [];
    for (const key of CATEGORY_ORDER) {
      const categoryItems = data[key];
      if (categoryItems?.length) {
        items.push(...categoryItems);
      }
    }
    return items;
  }, [data]);

  const hasResults = flatItems.length > 0;

  // Scroll active item into view
  React.useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.querySelector(
        `[data-suggestion-index="${activeIndex}"]`
      );
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!shouldShow) return null;

  // Map from flat index to the item
  let flatIndex = 0;

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full left-0 right-0 mt-2 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden max-h-[420px] overflow-y-auto"
      >
        {/* Loading state */}
        {showLoading && !hasResults && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        )}

        {/* No results */}
        {!showLoading && !hasResults && trimmedQuery.length >= 2 && (
          <div className="py-8 text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No results for &quot;{trimmedQuery}&quot;
            </p>
          </div>
        )}

        {/* Results grouped by category */}
        {hasResults && (
          <div className="py-1">
            {CATEGORY_ORDER.map((key) => {
              const items = data?.[key];
              if (!items?.length) return null;
              const config = CATEGORY_CONFIG[key];
              const Icon = config.icon;

              return (
                <div key={key}>
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </div>
                  {items.map((item) => {
                    const idx = flatIndex++;
                    const isActive = idx === activeIndex;
                    return (
                      <SuggestionRow
                        key={`${item.type}-${item.id}`}
                        item={item}
                        isActive={isActive}
                        index={idx}
                        onSelect={() => {
                          onSelect(item.url);
                          onClose();
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* "View all results" link */}
            <div className="border-t px-3 py-2">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-primary hover:bg-muted rounded-lg transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(
                    `/explore/search?q=${encodeURIComponent(trimmedQuery)}`
                  );
                  onClose();
                }}
              >
                <Search className="h-4 w-4" />
                View all results for &quot;{trimmedQuery}&quot;
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Single suggestion row.
 */
function SuggestionRow({
  item,
  isActive,
  index,
  onSelect,
}: {
  item: SuggestionItem;
  isActive: boolean;
  index: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-suggestion-index={index}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors",
        isActive ? "bg-muted" : "hover:bg-muted/50"
      )}
      onMouseDown={(e) => {
        // Use mousedown to fire before the input's blur event
        e.preventDefault();
        onSelect();
      }}
    >
      {/* Thumbnail / avatar */}
      {item.type === "profile" ? (
        <Avatar size="sm">
          <AvatarImage src={item.image || undefined} alt={item.title} />
          <AvatarFallback>
            {item.title
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : item.image ? (
        <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
            sizes="36px"
          />
        </div>
      ) : (
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {item.type === "event" && (
            <Calendar className="h-4 w-4 text-muted-foreground" />
          )}
          {item.type === "hackathon" && (
            <Trophy className="h-4 w-4 text-muted-foreground" />
          )}
          {item.type === "community" && (
            <Users className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">
            {item.subtitle}
          </p>
        )}
      </div>
    </button>
  );
}
