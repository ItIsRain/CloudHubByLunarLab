"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  X,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { cn } from "@/lib/utils";
import type { HackathonStatus, HackathonFilters } from "@/lib/types";
import { useHackathons } from "@/hooks/use-hackathons";

const statusFilters: { value: HackathonStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Open" },
  { value: "registration-open", label: "Registration Open" },
  { value: "hacking", label: "Hacking" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
];

const sortOptions = [
  { value: "date", label: "Start Date" },
  { value: "prize", label: "Prize Pool" },
  { value: "participants", label: "Most Participants" },
  { value: "newest", label: "Newest" },
];

export default function AllHackathonsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<
    HackathonStatus | "all"
  >("all");
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

  const { data: hackathonsData, isLoading } = useHackathons({
    search: searchQuery || undefined,
    status: selectedStatus !== "all" ? [selectedStatus] : undefined,
    sortBy: sortBy as HackathonFilters["sortBy"],
    pageSize,
  });

  const filteredHackathons = hackathonsData?.data || [];

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSortBy("date");
  };

  const hasActiveFilters =
    selectedStatus !== "all" || searchQuery !== "";

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
                  All Hackathons
                </h1>
                <p className="text-muted-foreground">
                  Compete, build, and win prizes with teams around the world
                </p>
              </div>
              <div className="w-full sm:w-80">
                <Input
                  type="text"
                  placeholder="Search hackathons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                  className="h-11"
                />
              </div>
            </div>
          </motion.div>

          {/* Status Filter Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar"
          >
            <div className="flex gap-2 pb-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedStatus === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {filter.label}
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
              {/* Results Count */}
              <span className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block h-4 w-32 rounded shimmer" />
                ) : (
                  <>
                    {hackathonsData?.total ?? 0}{" "}
                    {hackathonsData?.total === 1 ? "hackathon" : "hackathons"}{" "}
                    found
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
            </div>
          </motion.div>

          {/* Hackathons Grid */}
          {isLoading ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
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
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHackathons.map((hackathon, i) => (
                <motion.div
                  key={hackathon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <HackathonCard hackathon={hackathon} />
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredHackathons.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                No hackathons found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Try adjusting your search or status filter to find the hackathon
                you&apos;re looking for.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </motion.div>
          )}

          {/* Load More */}
          {!isLoading && hackathonsData?.hasMore && (
            <div className="text-center mt-12">
              <Button variant="outline" size="lg" onClick={() => setPageSize((s) => s + 24)}>
                Load More Hackathons
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
