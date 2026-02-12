"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Video, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EventType } from "@/lib/types";

interface LocationData {
  type: EventType;
  address?: string;
  city?: string;
  country?: string;
  platform?: string;
  meetingUrl?: string;
}

interface LocationPickerProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  className?: string;
}

const locationTypes: { value: EventType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "in-person",
    label: "In-Person",
    icon: <MapPin className="h-5 w-5" />,
    description: "Physical venue location",
  },
  {
    value: "online",
    label: "Online",
    icon: <Video className="h-5 w-5" />,
    description: "Virtual event platform",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    icon: <Globe className="h-5 w-5" />,
    description: "Both in-person and online",
  },
];

export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const updateField = (field: keyof LocationData, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const showPhysical = value.type === "in-person" || value.type === "hybrid";
  const showOnline = value.type === "online" || value.type === "hybrid";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-3">
        {locationTypes.map((lt) => (
          <button
            key={lt.value}
            type="button"
            onClick={() => onChange({ ...value, type: lt.value })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
              value.type === lt.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/30 hover:bg-muted/50"
            )}
          >
            {lt.icon}
            <span className="text-sm font-semibold">{lt.label}</span>
            <span className="text-xs text-muted-foreground text-center">
              {lt.description}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Physical location fields */}
        {showPhysical && (
          <motion.div
            key="physical"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Venue Details
            </h4>
            <div className="grid gap-4 sm:grid-cols-1">
              <Input
                placeholder="Venue name & address"
                value={value.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                icon={<MapPin className="h-4 w-4" />}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="City"
                  value={value.city || ""}
                  onChange={(e) => updateField("city", e.target.value)}
                />
                <Input
                  placeholder="Country"
                  value={value.country || ""}
                  onChange={(e) => updateField("country", e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Online fields */}
        {showOnline && (
          <motion.div
            key="online"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Online Platform
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                value={value.platform || ""}
                onChange={(e) => updateField("platform", e.target.value)}
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select platform</option>
                <option value="Zoom">Zoom</option>
                <option value="Google Meet">Google Meet</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Discord">Discord</option>
                <option value="Gather.town">Gather.town</option>
                <option value="YouTube Live">YouTube Live</option>
                <option value="Twitch">Twitch</option>
                <option value="Other">Other</option>
              </select>
              <Input
                placeholder="Meeting URL"
                value={value.meetingUrl || ""}
                onChange={(e) => updateField("meetingUrl", e.target.value)}
                icon={<Globe className="h-4 w-4" />}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
