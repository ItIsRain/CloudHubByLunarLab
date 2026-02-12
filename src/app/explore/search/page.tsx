"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, X, Users, Calendar, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventCard } from "@/components/cards/event-card";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { cn } from "@/lib/utils";
import {
  mockEvents,
  mockHackathons,
  mockCommunities,
  mockUsers,
} from "@/lib/mock-data";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = React.useState(queryParam);

  // Update input if the URL param changes
  React.useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  const query = queryParam.toLowerCase();

  const filteredEvents = React.useMemo(
    () =>
      query
        ? mockEvents.filter(
            (e) =>
              e.title.toLowerCase().includes(query) ||
              e.tagline?.toLowerCase().includes(query) ||
              e.tags.some((t) => t.toLowerCase().includes(query))
          )
        : [],
    [query]
  );

  const filteredHackathons = React.useMemo(
    () =>
      query
        ? mockHackathons.filter(
            (h) =>
              h.name.toLowerCase().includes(query) ||
              h.tagline?.toLowerCase().includes(query) ||
              h.tags.some((t) => t.toLowerCase().includes(query))
          )
        : [],
    [query]
  );

  const filteredCommunities = React.useMemo(
    () =>
      query
        ? mockCommunities.filter(
            (c) =>
              c.name.toLowerCase().includes(query) ||
              c.description.toLowerCase().includes(query)
          )
        : [],
    [query]
  );

  const filteredUsers = React.useMemo(
    () =>
      query
        ? mockUsers
            .filter(
              (u) =>
                u.name.toLowerCase().includes(query) ||
                u.username.toLowerCase().includes(query) ||
                u.skills.some((s) => s.toLowerCase().includes(query))
            )
            .slice(0, 20)
        : [],
    [query]
  );

  const totalResults =
    filteredEvents.length +
    filteredHackathons.length +
    filteredCommunities.length +
    filteredUsers.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/explore/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header + Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-4xl font-bold mb-6">
              Search Results
            </h1>
            <form onSubmit={handleSearch} className="max-w-2xl relative">
              <Input
                type="text"
                placeholder="Search events, hackathons, communities, people..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                icon={<Search className="h-5 w-5" />}
                className="h-14 pl-12 pr-12 text-lg rounded-2xl shadow-lg"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    router.push("/explore/search");
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </form>
            {query && (
              <p className="mt-4 text-muted-foreground">
                {totalResults} {totalResults === 1 ? "result" : "results"} for{" "}
                <span className="font-semibold text-foreground">
                  &quot;{queryParam}&quot;
                </span>
              </p>
            )}
          </motion.div>

          {/* No query state */}
          {!query && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                Start searching
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter a search term to find events, hackathons, communities,
                and people.
              </p>
            </motion.div>
          )}

          {/* Results with Tabs */}
          {query && totalResults > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-8 bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
                  <TabsTrigger value="all" className="rounded-lg">
                    All ({totalResults})
                  </TabsTrigger>
                  <TabsTrigger value="events" className="rounded-lg">
                    Events ({filteredEvents.length})
                  </TabsTrigger>
                  <TabsTrigger value="hackathons" className="rounded-lg">
                    Hackathons ({filteredHackathons.length})
                  </TabsTrigger>
                  <TabsTrigger value="communities" className="rounded-lg">
                    Communities ({filteredCommunities.length})
                  </TabsTrigger>
                  <TabsTrigger value="users" className="rounded-lg">
                    Users ({filteredUsers.length})
                  </TabsTrigger>
                </TabsList>

                {/* All Tab */}
                <TabsContent value="all" className="space-y-10">
                  {/* Events Section */}
                  {filteredEvents.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display text-xl font-bold">
                          Events
                        </h2>
                        {filteredEvents.length > 4 && (
                          <TabsTrigger
                            value="events"
                            className="text-sm text-primary hover:underline cursor-pointer bg-transparent shadow-none"
                          >
                            View all {filteredEvents.length} events
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </TabsTrigger>
                        )}
                      </div>
                      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredEvents.slice(0, 4).map((event, i) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                          >
                            <EventCard event={event} variant="default" />
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Hackathons Section */}
                  {filteredHackathons.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display text-xl font-bold">
                          Hackathons
                        </h2>
                        {filteredHackathons.length > 3 && (
                          <TabsTrigger
                            value="hackathons"
                            className="text-sm text-primary hover:underline cursor-pointer bg-transparent shadow-none"
                          >
                            View all {filteredHackathons.length} hackathons
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </TabsTrigger>
                        )}
                      </div>
                      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredHackathons.slice(0, 3).map((hackathon, i) => (
                          <motion.div
                            key={hackathon.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                          >
                            <HackathonCard hackathon={hackathon} />
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Communities Section */}
                  {filteredCommunities.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display text-xl font-bold">
                          Communities
                        </h2>
                      </div>
                      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCommunities.map((community, i) => (
                          <motion.div
                            key={community.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                          >
                            <Card hover className="p-4">
                              <div className="flex items-start gap-4">
                                <Avatar size="lg">
                                  <AvatarImage
                                    src={community.logo}
                                    alt={community.name}
                                  />
                                  <AvatarFallback>
                                    {community.name
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-display font-bold truncate">
                                    {community.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {community.description}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3.5 w-3.5" />
                                      {community.memberCount.toLocaleString()}{" "}
                                      members
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {community.eventCount} events
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Users Section */}
                  {filteredUsers.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display text-xl font-bold">
                          Users
                        </h2>
                        {filteredUsers.length > 6 && (
                          <TabsTrigger
                            value="users"
                            className="text-sm text-primary hover:underline cursor-pointer bg-transparent shadow-none"
                          >
                            View all {filteredUsers.length} users
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </TabsTrigger>
                        )}
                      </div>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredUsers.slice(0, 6).map((user, i) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                          >
                            <Card hover className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar size="md">
                                  <AvatarImage
                                    src={user.avatar}
                                    alt={user.name}
                                  />
                                  <AvatarFallback>
                                    {user.name
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold truncate">
                                    {user.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {user.headline || `@${user.username}`}
                                  </p>
                                </div>
                              </div>
                              {user.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {user.skills.slice(0, 3).map((skill) => (
                                    <Badge
                                      key={skill}
                                      variant="muted"
                                      className="text-xs"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                  {user.skills.length > 3 && (
                                    <Badge
                                      variant="muted"
                                      className="text-xs"
                                    >
                                      +{user.skills.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events">
                  {filteredEvents.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredEvents.map((event, i) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                          <EventCard event={event} variant="default" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyTabState label="events" query={queryParam} />
                  )}
                </TabsContent>

                {/* Hackathons Tab */}
                <TabsContent value="hackathons">
                  {filteredHackathons.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredHackathons.map((hackathon, i) => (
                        <motion.div
                          key={hackathon.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                          <HackathonCard hackathon={hackathon} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyTabState label="hackathons" query={queryParam} />
                  )}
                </TabsContent>

                {/* Communities Tab */}
                <TabsContent value="communities">
                  {filteredCommunities.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredCommunities.map((community, i) => (
                        <motion.div
                          key={community.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                          <Card hover className="p-4">
                            <div className="flex items-start gap-4">
                              <Avatar size="lg">
                                <AvatarImage
                                  src={community.logo}
                                  alt={community.name}
                                />
                                <AvatarFallback>
                                  {community.name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-display font-bold truncate">
                                  {community.name}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {community.description}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {community.memberCount.toLocaleString()}{" "}
                                    members
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {community.eventCount} events
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyTabState label="communities" query={queryParam} />
                  )}
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                  {filteredUsers.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredUsers.map((user, i) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                          <Card hover className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar size="md">
                                <AvatarImage
                                  src={user.avatar}
                                  alt={user.name}
                                />
                                <AvatarFallback>
                                  {user.name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate">
                                  {user.name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  {user.headline || `@${user.username}`}
                                </p>
                              </div>
                            </div>
                            {user.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {user.skills.slice(0, 4).map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="muted"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {user.skills.length > 4 && (
                                  <Badge
                                    variant="muted"
                                    className="text-xs"
                                  >
                                    +{user.skills.length - 4}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span>
                                {user.eventsAttended} events attended
                              </span>
                              <span>
                                {user.hackathonsParticipated} hackathons
                              </span>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyTabState label="users" query={queryParam} />
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {/* No results at all */}
          {query && totalResults === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                No results found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn&apos;t find anything matching &quot;{queryParam}
                &quot;. Try a different search term or browse our explore page.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    router.push("/explore/search");
                  }}
                >
                  Clear search
                </Button>
                <Link href="/explore">
                  <Button>Browse Explore</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EmptyTabState({
  label,
  query,
}: {
  label: string;
  query: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg font-bold mb-1">
        No {label} found
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
        No {label} match &quot;{query}&quot;. Try a different search term.
      </p>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 w-64 bg-muted rounded" />
              <div className="h-14 max-w-2xl bg-muted rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    }>
      <SearchResultsContent />
    </React.Suspense>
  );
}
