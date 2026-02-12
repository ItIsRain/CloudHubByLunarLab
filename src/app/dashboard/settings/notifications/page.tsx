"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { NotificationSettingsMatrix } from "@/components/dashboard/notification-settings-matrix";
import { toast } from "sonner";

export default function NotificationSettingsPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/dashboard/settings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Link>
            </Button>
            <h1 className="font-display text-3xl font-bold mb-1">Notification Preferences</h1>
            <p className="text-muted-foreground">
              Choose how and when you want to be notified
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <NotificationSettingsMatrix />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex justify-end mt-6"
          >
            <Button onClick={() => toast.success("Notification preferences saved!")}>
              Save Preferences
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
