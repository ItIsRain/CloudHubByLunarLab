"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, Bell, ArrowRight, Check, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ApiDocsPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [subscribed, setSubscribed] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "api_waitlist" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
      } else {
        setSubscribed(true);
        toast.success(data.message === "Already subscribed" ? "You're already on the list!" : "You're on the list!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden pt-24 pb-16 min-h-[70vh] flex items-center">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-background to-fuchsia-500/5" />
          <div className="absolute inset-0 grid-bg opacity-40" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
                <Code2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Developer API
              </Badge>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="gradient-text">API</span>{" "}
                Coming Soon
              </h1>

              <p className="text-xl text-muted-foreground mb-4">
                We&apos;re building a powerful REST API so you can integrate CloudHub into your
                workflows, automate event management, and build custom experiences.
              </p>

              <p className="text-muted-foreground mb-10">
                The API will include endpoints for events, hackathons, teams, submissions,
                registrations, and more — with full OpenAPI documentation.
              </p>

              {/* Code preview card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 mb-10 text-left"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                  <span className="text-xs text-muted-foreground ml-2 font-mono">api-preview.sh</span>
                </div>
                <pre className="font-mono text-sm text-muted-foreground overflow-x-auto">
                  <code>{`# List upcoming events
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.1i1.ae/v1/events?status=published

# Create a hackathon
curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "AI Buildathon", "type": "online"}' \\
  https://api.1i1.ae/v1/hackathons`}</code>
                </pre>
              </motion.div>

              {/* Notify CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <h3 className="font-display text-lg font-semibold mb-3">
                  Get notified when the API launches
                </h3>
                {subscribed ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    You&apos;re on the list! We&apos;ll notify you at launch.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="flex-1"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <Button variant="gradient" type="submit" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Notify Me
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-10"
              >
                <Button variant="outline" asChild>
                  <Link href="/features">
                    Explore Features
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
