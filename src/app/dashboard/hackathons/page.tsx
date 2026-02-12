"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Rocket, Users } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { mockHackathons } from "@/lib/mock-data";

const organizingHackathons = mockHackathons.slice(0, 3);
const participatingHackathons = mockHackathons.slice(3, 6);

export default function MyHackathonsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">My Hackathons</h1>
            <p className="text-muted-foreground mt-1">
              Manage hackathons you organize or participate in
            </p>
          </div>
          <Link href="/hackathons/create">
            <Button variant="gradient">
              <Plus className="h-4 w-4" />
              Create Hackathon
            </Button>
          </Link>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="organizing" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="organizing" className="gap-2">
                <Rocket className="h-4 w-4" />
                Organizing
              </TabsTrigger>
              <TabsTrigger value="participating" className="gap-2">
                <Users className="h-4 w-4" />
                Participating
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organizing">
              {organizingHackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {organizingHackathons.map((h, i) => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="relative">
                        <HackathonCard hackathon={h} />
                        <Link
                          href={`/dashboard/hackathons/${h.id}`}
                          className="absolute top-3 right-14 z-10"
                        >
                          <Button size="sm" variant="secondary">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Rocket className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">
                    No hackathons yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Create your first hackathon and bring builders together to
                    innovate and compete.
                  </p>
                  <Link href="/hackathons/create">
                    <Button variant="gradient">
                      <Plus className="h-4 w-4" />
                      Create Hackathon
                    </Button>
                  </Link>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="participating">
              {participatingHackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {participatingHackathons.map((h, i) => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <HackathonCard hackathon={h} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">
                    Not participating in any hackathons
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Explore active hackathons and join one to start building
                    with a team.
                  </p>
                  <Link href="/explore">
                    <Button variant="outline">Browse Hackathons</Button>
                  </Link>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </>
  );
}
