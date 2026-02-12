"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface AddToCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
}

function formatGoogleDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function AddToCalendarDialog({
  open,
  onOpenChange,
  title,
  description = "",
  startDate,
  endDate,
  location = "",
}: AddToCalendarDialogProps) {
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description);
  const encodedLoc = encodeURIComponent(location);

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${encodedDesc}&location=${encodedLoc}`;

  const outlookUrl = `https://outlook.live.com/calendar/0/action/compose?subject=${encodedTitle}&startdt=${startDate}&enddt=${endDate}&body=${encodedDesc}&location=${encodedLoc}`;

  const calendarOptions = [
    {
      name: "Google Calendar",
      href: googleUrl,
      icon: "G",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      name: "Outlook Calendar",
      href: outlookUrl,
      icon: "O",
      color: "bg-sky-500/10 text-sky-600",
    },
    {
      name: "Apple Calendar",
      href: "#",
      icon: "A",
      color: "bg-gray-500/10 text-gray-600",
      onClick: () => {
        const icsContent = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "BEGIN:VEVENT",
          `DTSTART:${formatGoogleDate(startDate)}`,
          `DTEND:${formatGoogleDate(endDate)}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${description}`,
          `LOCATION:${location}`,
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");
        const blob = new Blob([icsContent], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/\s+/g, "_")}.ics`;
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Add to Calendar
          </DialogTitle>
          <DialogDescription>
            Choose your calendar provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {calendarOptions.map((cal) => (
            <Button
              key={cal.name}
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              asChild={!cal.onClick}
              onClick={cal.onClick}
            >
              {cal.onClick ? (
                <span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${cal.color}`}>
                    {cal.icon}
                  </span>
                  {cal.name}
                </span>
              ) : (
                <a href={cal.href} target="_blank" rel="noopener noreferrer">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${cal.color}`}>
                    {cal.icon}
                  </span>
                  {cal.name}
                </a>
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
