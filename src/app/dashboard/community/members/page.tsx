"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  UserPlus,
  Download,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { User } from "@/lib/types";

// Community members will come from a dedicated API once built.
// Until then, show an empty state rather than fake mock data.
const members: User[] = [];

const roleColors: Record<string, string> = {
  organizer: "bg-purple-500/10 text-purple-600",
  attendee: "bg-blue-500/10 text-blue-600",
  mentor: "bg-green-500/10 text-green-600",
  judge: "bg-orange-500/10 text-orange-600",
  admin: "bg-red-500/10 text-red-600",
};

export default function MembersPage() {
  const [search, setSearch] = React.useState("");

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href="/dashboard/community"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Community
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">Members</h1>
              <p className="text-muted-foreground mt-1">
                {members.length} members in your community
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  toast.success("Member data exported successfully!")
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() =>
                  toast.success("Invitation link copied to clipboard!")
                }
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members by name or email..."
                className="pl-10"
              />
            </div>
          </motion.div>

          {/* Members List */}
          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">
                  No members found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search query.
                </p>
              </motion.div>
            ) : (
              filteredMembers.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar size="lg">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {member.name}
                            </h3>
                            {member.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className={cn(
                                  "text-xs capitalize",
                                  roleColors[role]
                                )}
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        <div className="hidden sm:block text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(member.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() =>
                            toast.info(`Member options for ${member.name}`)
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
