"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Grid,
  List,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/cards/event-card";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { cn } from "@/lib/utils";
import type { EventCategory, EventFilters, HackathonFilters } from "@/lib/types";
import { useEvents } from "@/hooks/use-events";
import { useHackathons } from "@/hooks/use-hackathons";
import { categories } from "@/lib/constants";

type ViewMode = "grid" | "list";
type ContentType = "all" | "events" | "hackathons";

const sortOptions = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "upcoming", label: "Upcoming" },
  { value: "popular", label: "Most Popular" },
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [contentType, setContentType] = React.useState<ContentType>("all");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [sortBy, setSortBy] = React.useState("trending");
  const [showFilters, setShowFilters] = React.useState(false);
  const [showSort, setShowSort] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    search: searchQuery || undefined,
    category: selectedCategories.length > 0 ? selectedCategories as EventCategory[] : undefined,
    sortBy: sortBy as EventFilters["sortBy"],
    pageSize: 12,
  });

  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons({
    search: searchQuery || undefined,
    category: selectedCategories.length > 0 ? selectedCategories as EventCategory[] : undefined,
    sortBy: sortBy as HackathonFilters["sortBy"],
    pageSize: 12,
  });

  const filteredEvents = eventsData?.data || [];
  const filteredHackathons = hackathonsData?.data || [];
  const isLoading = eventsLoading || hackathonsLoading;

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery("");
  };

  const totalResults =
    contentType === "all"
      ? filteredEvents.length + filteredHackathons.length
      : contentType === "events"
        ? filteredEvents.length
        : filteredHackathons.length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Discover
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Explore Events & Hackathons
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find your next event, join a hackathon, and connect with communities
              around the world.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="relative">
              <Input
                type="text"
                placeholder="Search events, hackathons, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-5 w-5" />}
                className="h-14 pl-12 pr-4 text-lg rounded-2xl shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Category Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 -mx-4 px-4 overflow-x-auto no-scrollbar"
          >
            <div className="flex gap-2 pb-2">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => toggleCategory(category.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategories.includes(category.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Filters Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              {/* Content Type Toggle */}
              <div className="flex rounded-xl border bg-muted/50 p-1">
                {(["all", "events", "hackathons"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                      contentType === type
                        ? "bg-background shadow-sm"
                        : "hover:bg-muted"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Results count */}
              <span className="text-sm text-muted-foreground">
                {totalResults} results
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Active Filters */}
              {selectedCategories.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedCategories.slice(0, 2).map((cat) => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat)}
                    >
                      {categories.find((c) => c.value === cat)?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  {selectedCategories.length > 2 && (
                    <Badge variant="secondary">
                      +{selectedCategories.length - 2}
                    </Badge>
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Sort Dropdown */}
              <div className="relative" ref={sortRef}>
                <Button variant="outline" size="sm" onClick={() => setShowSort(!showSort)}>
                  Sort: {sortOptions.find((o) => o.value === sortBy)?.label}
                  <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", showSort && "rotate-180")} />
                </Button>
                {showSort && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border bg-background shadow-lg py-1">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                          sortBy === opt.value && "text-primary font-medium"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
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

              {/* Filter Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </motion.div>

          {/* Content Grid */}
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
              {/* Events */}
              {(contentType === "all" || contentType === "events") &&
                filteredEvents.map((event, i) => (
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

              {/* Hackathons */}
              {(contentType === "all" || contentType === "hackathons") &&
                filteredHackathons.map((hackathon, i) => (
                  <motion.div
                    key={hackathon.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: (filteredEvents.length + i) * 0.05,
                    }}
                  >
                    <HackathonCard
                      hackathon={hackathon}
                      variant={viewMode === "list" ? "default" : "default"}
                    />
                  </motion.div>
                ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && totalResults === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                No results found
              </h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filters to find what you&apos;re looking
                for.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </motion.div>
          )}

          {/* Results count */}
          {!isLoading && totalResults > 0 && (
            <div className="text-center mt-12">
              <p className="text-sm text-muted-foreground">
                Showing {totalResults} result{totalResults !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
