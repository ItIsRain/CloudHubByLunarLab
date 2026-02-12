"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Check,
  X,
  Download,
  UserCheck,
  FileText,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { mockHackathons, mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";

type ParticipantStatus = "approved" | "pending" | "rejected";

interface MockParticipant {
  id: string;
  user: (typeof mockUsers)[0];
  team: string;
  track: string;
  status: ParticipantStatus;
  joinedAt: string;
}

function createMockParticipants(): MockParticipant[] {
  const statuses: ParticipantStatus[] = ["approved", "pending", "rejected"];
  const teams = ["AI Pioneers", "Web3 Wizards", "Code Crusaders", "Byte Builders", "None", "Hack Heroes", "Digital Dragons", "None", "Tech Titans", "Innovation Inc"];
  const tracks = ["AI/ML Innovation", "Web3 & Blockchain", "Developer Tools", "Social Impact", "AI/ML Innovation", "Developer Tools", "Social Impact", "Web3 & Blockchain", "AI/ML Innovation", "Developer Tools"];

  return mockUsers.slice(0, 10).map((user, i) => ({
    id: `participant-${i + 1}`,
    user,
    team: teams[i],
    track: tracks[i],
    status: statuses[i % 3],
    joinedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  }));
}

const statusBadgeConfig: Record<ParticipantStatus, { variant: "success" | "warning" | "destructive" }> = {
  approved: { variant: "success" },
  pending: { variant: "warning" },
  rejected: { variant: "destructive" },
};

export default function ParticipantsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [participants, setParticipants] = React.useState<MockParticipant[]>(
    createMockParticipants
  );

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Hackathon Not Found</h2>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const pendingCount = participants.filter((p) => p.status === "pending").length;

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.user.name.toLowerCase().includes(search.toLowerCase()) ||
      p.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" as const } : p))
    );
    toast.success("Participant approved!");
  };

  const handleReject = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" as const } : p))
    );
    toast.success("Participant rejected.");
  };

  const handleApproveAll = () => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.status === "pending" ? { ...p, status: "approved" as const } : p
      )
    );
    toast.success("All pending participants approved!");
  };

  const selectClasses =
    "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href={`/dashboard/hackathons/${hackathonId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">Participants</h1>
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount} Pending</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApproveAll}
              disabled={pendingCount === 0}
            >
              <UserCheck className="h-4 w-4" />
              Approve All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.success("Export started. Download will begin shortly.")}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="flex-1">
            <Input
              placeholder="Search participants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        Email
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                        Team
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                        Track
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        Joined
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((participant, i) => (
                      <motion.tr
                        key={participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                        className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarImage
                                src={participant.user.avatar}
                                alt={participant.user.name}
                              />
                              <AvatarFallback>
                                {getInitials(participant.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">
                              {participant.user.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                          {participant.user.email}
                        </td>
                        <td className="p-4 text-sm hidden lg:table-cell">
                          {participant.team}
                        </td>
                        <td className="p-4 text-sm hidden lg:table-cell">
                          {participant.track}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              statusBadgeConfig[participant.status].variant
                            }
                            className="capitalize"
                          >
                            {participant.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                          {formatDate(participant.joinedAt)}
                        </td>
                        <td className="p-4 text-right">
                          {participant.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApprove(participant.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReject(participant.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              --
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredParticipants.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No participants match your filters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </>
  );
}
