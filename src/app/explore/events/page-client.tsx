"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Grid,
  List,
  ChevronDown,
  X,
  SlidersHorizontal,
  Calendar,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/cards/event-card";
import { cn } from "@/lib/utils";
import type { EventCategory, EventFilters } from "@/lib/types";
import { useEvents } from "@/hooks/use-events";
import { categories } from "@/lib/constants";

type ViewMode = "grid" | "list";
type PriceFilter = "all" | "free" | "paid";

const sortOptions = [
  { value: "date", label: "Date" },
  { value: "popularity", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
];

export default function AllEventsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [priceFilter, setPriceFilter] = React.useState<PriceFilter>("all");
  const [sortBy, setSortBy] = React.useState("date");
  const [showSortDropdown, setShowSortDropdown] = React.useState(false);
  const [pageSize, setPageSize] = React.useState(24);

  const sortDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: eventsData, isLoading } = useEvents({
    search: searchQuery || undefined,
    category: selectedCategory ? [selectedCategory as EventCategory] : undefined,
    isFree: priceFilter === "free" ? true : priceFilter === "paid" ? false : undefined,
    sortBy: (sortBy === "date" || sortBy === "popularity" || sortBy === "newest") ? sortBy as EventFilters["sortBy"] : undefined,
    pageSize,
  });

  const allEvents = eventsData?.data || [];
  const filteredEvents = priceFilter === "all"
    ? allEvents
    : allEvents.filter((e) => {
        const eventIsFree = e.tickets.length === 0 || e.tickets.every((t) => t.price === 0);
        return priceFilter === "free" ? eventIsFree : !eventIsFree;
      });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setPriceFilter("all");
    setSortBy("date");
  };

  const hasActiveFilters =
    selectedCategory !== null || priceFilter !== "all" || searchQuery !== "";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl font-bold mb-2">
                  All Events
                </h1>
                <p className="text-muted-foreground">
                  Discover conferences, meetups, workshops, and more
                </p>
              </div>
              <div className="w-full sm:w-80">
                <Input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                  className="h-11"
                />
              </div>
            </div>
          </motion.div>

          {/* Category Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar"
          >
            <div className="flex gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  selectedCategory === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.value
                        ? null
                        : category.value
                    )
                  }
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === category.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Filter Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              {/* Price Filter */}
              <div className="flex rounded-xl border bg-muted/50 p-1">
                {(["all", "free", "paid"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPriceFilter(filter)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                      priceFilter === filter
                        ? "bg-background shadow-sm"
                        : "hover:bg-muted"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Results Count */}
              <span className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block h-4 w-32 rounded shimmer" />
                ) : (
                  <>
                    {eventsData?.total ?? 0}{" "}
                    {eventsData?.total === 1 ? "event" : "events"} found
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}

              {/* Sort Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  {sortOptions.find((o) => o.value === sortBy)?.label}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
                <AnimatePresence>
                  {showSortDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-card shadow-lg z-30 overflow-hidden"
                    >
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors",
                            sortBy === option.value &&
                              "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* View Mode Toggle */}
              <div className="flex rounded-lg border bg-muted/50 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "grid" ? "bg-background shadow-sm" : ""
                  )}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "list" ? "bg-background shadow-sm" : ""
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Events Grid */}
          {isLoading ? (
            <div
              className={cn(
                "grid gap-6",
                viewMode === "grid"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1"
              )}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card overflow-hidden">
                  <div className="aspect-[16/9] shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 rounded shimmer" />
                    <div className="h-3 w-full rounded shimmer" />
                    <div className="h-3 w-1/2 rounded shimmer" />
                    <div className="flex gap-2 pt-2">
                      <div className="h-6 w-16 rounded-full shimmer" />
                      <div className="h-6 w-20 rounded-full shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-6",
                viewMode === "grid"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1"
              )}
            >
              {filteredEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <EventCard
                    event={event}
                    variant={viewMode === "list" ? "compact" : "default"}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                No events found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Try adjusting your search or filters to find what you&apos;re
                looking for.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </motion.div>
          )}

          {/* Load More */}
          {!isLoading && eventsData?.hasMore && (
            <div className="text-center mt-12">
              <Button variant="outline" size="lg" onClick={() => setPageSize((s) => s + 24)}>
                Load More Events
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
