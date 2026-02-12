"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  Edit2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/cards/event-card";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { useAuthStore } from "@/store/auth-store";
import { cn, getInitials } from "@/lib/utils";
import { mockEvents, mockHackathons, mockSubmissions } from "@/lib/mock-data";

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <p className="text-muted-foreground">Please log in to view your profile.</p>
          <Button asChild className="mt-4">
            <Link href="/login">Sign In</Link>
          </Button>
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

  const userEvents = mockEvents.slice(0, 3);
  const userHackathons = mockHackathons.slice(0, 2);
  const userSubmissions = mockSubmissions.slice(0, 4);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-16 pb-16">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10">
          <div className="absolute inset-0 grid-bg opacity-20" />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          {/* Profile Header */}
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
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-3xl font-bold">{user.name}</h1>
                  <p className="text-muted-foreground">@{user.username}</p>
                  {user.headline && (
                    <p className="text-sm mt-1">{user.headline}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/profile/edit">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Link>
                </Button>
              </div>

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
            {stats.map((stat, i) => (
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
              </TabsList>

              <TabsContent value="events">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {userEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <EventCard event={event} variant="compact" />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="hackathons">
                <div className="space-y-4 mt-4">
                  {userHackathons.map((h, i) => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <HackathonCard hackathon={h} />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="projects">
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  {userSubmissions.map((sub, i) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
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
                            <span className="text-xs text-muted-foreground">
                              {sub.upvotes} upvotes
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
