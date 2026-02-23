"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Trophy,
  Code2,
  Award,
  MapPin,
  Globe,
  Github,
  Twitter,
  Linkedin,
  UserX,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/cards/event-card";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { getCertificatesForUser } from "@/lib/mock-data";
import { useEvents } from "@/hooks/use-events";
import { useHackathons } from "@/hooks/use-hackathons";
import { useSubmissions } from "@/hooks/use-submissions";
import { useQuery } from "@tanstack/react-query";
import { getInitials, formatDate } from "@/lib/utils";
import type { User } from "@/lib/types";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const { data: profileData, isLoading: profileLoading } = useQuery<{ data: User }>({
    queryKey: ["profile", username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
  });
  const user = profileData?.data;
  const { data: eventsData } = useEvents(user ? { organizerId: user.id } : undefined);
  const { data: hackathonsData } = useHackathons(user ? { organizerId: user.id } : undefined);
  const { data: submissionsData } = useSubmissions(user ? { userId: user.id } : undefined);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-16 pb-16">
          <div className="relative h-48 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10">
            <div className="absolute inset-0 grid-bg opacity-20" />
          </div>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
              <div className="shimmer h-32 w-32 rounded-full" />
              <div className="flex-1 space-y-3 pt-4">
                <div className="shimmer h-8 w-48 rounded-lg" />
                <div className="shimmer h-4 w-32 rounded-lg" />
                <div className="shimmer h-4 w-64 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shimmer h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <UserX className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">User Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn&apos;t find a user with that username.
            </p>
            <Button asChild>
              <Link href="/explore">Back to Explore</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    { label: "Events", value: user.eventsAttended, icon: Calendar },
    { label: "Hackathons", value: user.hackathonsParticipated, icon: Trophy },
    { label: "Projects", value: user.projectsSubmitted, icon: Code2 },
    { label: "Wins", value: user.wins, icon: Award },
  ];

  const userEvents = (eventsData?.data || []).slice(0, 3);
  const userHackathons = (hackathonsData?.data || []).slice(0, 2);
  const userSubmissions = (submissionsData?.data || []).slice(0, 4);
  const userCertificates = getCertificatesForUser(user.id);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-16 pb-16">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10">
          <div className="absolute inset-0 grid-bg opacity-20" />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start gap-6 mb-8"
          >
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
              {user.headline && <p className="text-sm mt-1">{user.headline}</p>}
              {user.bio && (
                <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{user.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {user.location}
                  </span>
                )}
                {user.website && (
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
                {user.github && (
                  <a href={`https://github.com/${user.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <Github className="h-3.5 w-3.5" /> {user.github}
                  </a>
                )}
                {user.twitter && (
                  <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <Twitter className="h-3.5 w-3.5" /> {user.twitter}
                  </a>
                )}
                {user.linkedin && (
                  <a href={`https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <Linkedin className="h-3.5 w-3.5" /> {user.linkedin}
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <stat.icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="font-display text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Skills */}
          {user.skills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-8"
            >
              <h3 className="text-sm font-medium mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="outline">{skill}</Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="events">
              <TabsList>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="hackathons">Hackathons</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
              </TabsList>

              <TabsContent value="events">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {userEvents.map((event, i) => (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <EventCard event={event} variant="compact" />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="hackathons">
                <div className="space-y-4 mt-4">
                  {userHackathons.map((h, i) => (
                    <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <HackathonCard hackathon={h} />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="projects">
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  {userSubmissions.map((sub, i) => (
                    <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h4 className="font-medium">{sub.projectName}</h4>
                          <p className="text-sm text-muted-foreground">{sub.tagline}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {sub.techStack.slice(0, 3).map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant={sub.status === "winner" ? "default" : "outline"}>
                              {sub.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{sub.upvotes} upvotes</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="certificates">
                {userCertificates.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-display text-lg font-bold mb-1">No certificates yet</h3>
                    <p className="text-sm text-muted-foreground">Certificates will appear once earned.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    {userCertificates.map((cert, i) => (
                      <motion.div key={cert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card>
                          <CardContent className="p-4">
                            <Badge variant="outline" className="text-xs mb-2">{cert.type}</Badge>
                            <h4 className="font-medium">{cert.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{cert.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">Issued: {formatDate(cert.issuedAt)}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
