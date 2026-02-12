"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
];

interface DateTimePickerProps {
  value?: string;
  onChange: (isoString: string) => void;
  label?: string;
  showTimezone?: boolean;
  timezone?: string;
  onTimezoneChange?: (tz: string) => void;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  showTimezone = false,
  timezone = "America/Los_Angeles",
  onTimezoneChange,
  className,
}: DateTimePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const dateValue = value ? new Date(value) : undefined;
  const timeValue = dateValue ? format(dateValue, "HH:mm") : "";

  // Close calendar on outside click
  useEffect(() => {
    if (!showCalendar) return;
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCalendar]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const existing = dateValue || new Date();
    date.setHours(existing.getHours(), existing.getMinutes());
    onChange(date.toISOString());
    setShowCalendar(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    const date = dateValue ? new Date(dateValue) : new Date();
    date.setHours(hours || 0, minutes || 0);
    onChange(date.toISOString());
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-3">
        {/* Date picker */}
        <div className="relative flex-1" ref={calendarRef}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full justify-start gap-2 font-normal"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {dateValue ? format(dateValue, "MMM d, yyyy") : "Select date"}
          </Button>

          {showCalendar && (
            <div className="absolute z-50 mt-1 rounded-xl border border-border bg-popover p-3 shadow-lg">
              <DayPicker
                mode="single"
                selected={dateValue}
                onSelect={handleDateSelect}
                showOutsideDays
                classNames={{
                  root: "text-sm text-foreground",
                  months: "relative flex flex-col",
                  month: "w-full",
                  month_caption: "flex justify-center items-center h-10 relative mb-1",
                  caption_label: "text-sm font-semibold",
                  nav: "absolute inset-x-0 flex justify-between items-center",
                  button_previous:
                    "inline-flex items-center justify-center rounded-lg w-8 h-8 hover:bg-muted transition-colors",
                  button_next:
                    "inline-flex items-center justify-center rounded-lg w-8 h-8 hover:bg-muted transition-colors",
                  chevron: "w-4 h-4 fill-foreground",
                  month_grid: "w-full border-collapse",
                  weekdays: "flex",
                  weekday:
                    "flex-1 text-muted-foreground text-xs font-medium p-2 text-center",
                  week: "flex w-full mt-0.5",
                  day: "flex-1 p-0 text-center text-sm",
                  day_button:
                    "inline-flex items-center justify-center rounded-lg w-9 h-9 text-sm font-normal hover:bg-muted transition-colors cursor-pointer",
                  selected:
                    "!bg-primary !text-primary-foreground hover:!bg-primary font-semibold",
                  today: "font-bold text-primary",
                  outside: "text-muted-foreground/40",
                  disabled: "text-muted-foreground/30",
                  hidden: "invisible",
                }}
              />
            </div>
          )}
        </div>

        {/* Time input */}
        <div className="w-32">
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Timezone selector */}
      {showTimezone && (
        <select
          value={timezone}
          onChange={(e) => onTimezoneChange?.(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
