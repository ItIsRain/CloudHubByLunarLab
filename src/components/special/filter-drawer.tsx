"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: Record<string, string>) => void;
}

const categories = [
  "Conference",
  "Workshop",
  "Meetup",
  "Hackathon",
  "Webinar",
  "Bootcamp",
  "Networking",
  "Panel",
];

export function FilterDrawer({
  open,
  onOpenChange,
  onApply,
}: FilterDrawerProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [location, setLocation] = useState("");

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleClearAll = () => {
    setSelectedCategories([]);
    setPriceMin("");
    setPriceMax("");
    setDateStart("");
    setDateEnd("");
    setLocation("");
  };

  const handleApply = () => {
    const filters: Record<string, string> = {};
    if (selectedCategories.length > 0) {
      filters.categories = selectedCategories.join(",");
    }
    if (priceMin) filters.priceMin = priceMin;
    if (priceMax) filters.priceMax = priceMax;
    if (dateStart) filters.dateStart = dateStart;
    if (dateEnd) filters.dateEnd = dateEnd;
    if (location) filters.location = location;

    onApply(filters);
    onOpenChange(false);
  };

  const hasFilters =
    selectedCategories.length > 0 ||
    priceMin ||
    priceMax ||
    dateStart ||
    dateEnd ||
    location;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "max-h-[85vh] overflow-y-auto rounded-t-2xl border-t bg-background shadow-2xl"
            )}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Filters</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6 px-5 py-4">
              {/* Category */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <label
                      key={category}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        selectedCategories.includes(category)
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                      />
                      {category}
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Price Range</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    placeholder="Min ($)"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max ($)"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Date</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Location</label>
                <Input
                  placeholder="City, state, or country..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearAll}
                disabled={!hasFilters}
                className="flex-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear All
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                className="flex-1"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
