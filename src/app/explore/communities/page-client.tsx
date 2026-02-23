"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ArrowLeft, Bell } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

export default function CommunitiesPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mb-8">
              <Users className="h-14 w-14 text-primary" />
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Communities
            </h1>

            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-medium mb-6">
              <Bell className="h-4 w-4" />
              Coming Soon
            </div>

            <p className="text-muted-foreground text-lg max-w-lg mb-8 leading-relaxed">
              We&apos;re building a space for like-minded builders, designers, and
              innovators to connect, share knowledge, and grow together. Stay
              tuned!
            </p>

            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/explore/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Browse Events
                </Link>
              </Button>
              <Button
                onClick={() =>
                  toast.success("We'll notify you when communities launch!")
                }
              >
                <Bell className="h-4 w-4 mr-2" />
                Notify Me
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
