"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Users, Calendar, ArrowRight, Globe } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { mockCommunities } from "@/lib/mock-data";

export default function CommunitiesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredCommunities = React.useMemo(() => {
    if (!searchQuery) return mockCommunities;
    return mockCommunities.filter(
      (community) =>
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

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
            <h1 className="font-display text-4xl font-bold mb-2">
              Communities
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Join communities of like-minded builders, designers, and
              innovators. Attend events, share knowledge, and grow together.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="max-w-md mb-10"
          >
            <Input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-11"
            />
          </motion.div>

          {/* Communities Grid */}
          {filteredCommunities.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCommunities.map((community, i) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Card
                    hover
                    className="h-full flex flex-col overflow-hidden"
                  >
                    {/* Cover gradient */}
                    <div className="h-24 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 relative">
                      {community.coverImage && (
                        <img
                          src={community.coverImage}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-60"
                        />
                      )}
                    </div>

                    <CardContent className="flex-1 flex flex-col pt-0 -mt-8 relative z-10">
                      {/* Avatar */}
                      <Avatar size="xl" className="ring-4 ring-card mb-3">
                        <AvatarImage
                          src={community.logo}
                          alt={community.name}
                        />
                        <AvatarFallback className="text-lg font-bold">
                          {community.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <h3 className="font-display text-lg font-bold mb-1">
                        {community.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                        {community.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span className="font-medium text-foreground">
                            {community.memberCount.toLocaleString()}
                          </span>
                          <span>members</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium text-foreground">
                            {community.eventCount}
                          </span>
                          <span>events</span>
                        </div>
                      </div>

                      {/* Action */}
                      <Link href={`/calendar/${community.slug}`}>
                        <Button
                          variant="outline"
                          className="w-full group"
                          size="sm"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          View Calendar
                          <ArrowRight className="h-4 w-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Globe className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                No communities found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn&apos;t find any communities matching &quot;
                {searchQuery}&quot;. Try a different search term.
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
