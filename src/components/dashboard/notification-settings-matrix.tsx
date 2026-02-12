"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Mail, Smartphone, Monitor } from "lucide-react";

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
}

const categories: NotificationCategory[] = [
  { id: "events", label: "Event Reminders", description: "Upcoming events you've registered for" },
  { id: "hackathons", label: "Hackathon Updates", description: "Status changes and announcements" },
  { id: "teams", label: "Team Activity", description: "Invites, joins, and messages" },
  { id: "submissions", label: "Submission Feedback", description: "Scores, reviews, and results" },
  { id: "community", label: "Community", description: "New events from followed communities" },
  { id: "marketing", label: "News & Tips", description: "Platform updates and blog posts" },
];

const channels = [
  { id: "email", label: "Email", icon: Mail },
  { id: "push", label: "Push", icon: Smartphone },
  { id: "inApp", label: "In-App", icon: Monitor },
];

type Settings = Record<string, Record<string, boolean>>;

const defaultSettings: Settings = {
  events: { email: true, push: true, inApp: true },
  hackathons: { email: true, push: true, inApp: true },
  teams: { email: true, push: true, inApp: true },
  submissions: { email: true, push: false, inApp: true },
  community: { email: false, push: false, inApp: true },
  marketing: { email: false, push: false, inApp: false },
};

export function NotificationSettingsMatrix() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const toggle = (categoryId: string, channelId: string) => {
    setSettings((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [channelId]: !prev[categoryId][channelId],
      },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-[1fr,repeat(3,80px)] gap-2 mb-4 items-center">
          <div />
          {channels.map((ch) => (
            <div key={ch.id} className="flex flex-col items-center gap-1">
              <ch.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{ch.label}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[1fr,repeat(3,80px)] gap-2 items-center py-3 border-b border-border last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              {channels.map((ch) => (
                <div key={ch.id} className="flex justify-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings[cat.id][ch.id]}
                    aria-label={`${cat.label} ${ch.label}`}
                    onClick={() => toggle(cat.id, ch.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      settings[cat.id][ch.id] ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings[cat.id][ch.id] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
