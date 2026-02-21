"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  UserCheck,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Ban,
  Mail,
  Eye,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { Hackathon, HackathonParticipant } from "@/lib/types";
import {
  useHackathonParticipants,
  useUpdateParticipantStatus,
} from "@/hooks/use-hackathon-participants";
import { toast } from "sonner";

interface ParticipantsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const statusBadgeConfig: Record<
  string,
  { variant: "success" | "warning" | "destructive" | "muted" }
> = {
  approved: { variant: "success" },
  confirmed: { variant: "success" },
  pending: { variant: "warning" },
  rejected: { variant: "destructive" },
  cancelled: { variant: "muted" },
};

const selectClasses =
  "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

function getStatusActions(status: string) {
  const actions: {
    label: string;
    icon: React.ElementType;
    targetStatus: string;
    className?: string;
  }[] = [];

  if (status === "pending") {
    actions.push({
      label: "Approve",
      icon: CheckCircle2,
      targetStatus: "approved",
      className: "text-green-600",
    });
    actions.push({
      label: "Reject",
      icon: XCircle,
      targetStatus: "rejected",
      className: "text-red-600",
    });
  }

  if (status === "approved" || status === "confirmed") {
    actions.push({
      label: "Cancel Registration",
      icon: Ban,
      targetStatus: "cancelled",
      className: "text-red-600",
    });
  }

  if (status === "rejected") {
    actions.push({
      label: "Re-approve",
      icon: RotateCcw,
      targetStatus: "approved",
      className: "text-green-600",
    });
  }

  if (status === "cancelled") {
    actions.push({
      label: "Reinstate",
      icon: ShieldCheck,
      targetStatus: "confirmed",
      className: "text-green-600",
    });
  }

  return actions;
}

export function ParticipantsTab({
  hackathon,
  hackathonId,
}: ParticipantsTabProps) {
  const { data: participantsData, isLoading } =
    useHackathonParticipants(hackathonId);
  const updateStatus = useUpdateParticipantStatus();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const participants = participantsData?.data ?? [];

  const pendingCount = participants.filter(
    (p) => p.status === "pending"
  ).length;

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.user.name.toLowerCase().includes(search.toLowerCase()) ||
      p.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (
    registrationId: string,
    newStatus: string,
    label: string
  ) => {
    try {
      await updateStatus.mutateAsync({
        hackathonId,
        registrationId,
        status: newStatus,
      });
      toast.success(`Participant ${label.toLowerCase()}!`);
    } catch {
      toast.error(`Failed to update participant status.`);
    }
  };

  const handleApproveAll = async () => {
    const pendingParticipants = participants.filter(
      (p) => p.status === "pending"
    );
    try {
      await Promise.all(
        pendingParticipants.map((p) =>
          updateStatus.mutateAsync({
            hackathonId,
            registrationId: p.id,
            status: "approved",
          })
        )
      );
      toast.success("All pending participants approved!");
    } catch {
      toast.error("Failed to approve all participants.");
    }
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Team", "Track", "Status", "Joined"].join(","),
      ...filteredParticipants.map((p) =>
        [
          `"${p.user.name}"`,
          p.user.email,
          `"${p.teamName || "N/A"}"`,
          `"${p.trackName || "N/A"}"`,
          p.status,
          p.createdAt,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participants.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded!");
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard!");
  };

  const handleViewProfile = (participant: HackathonParticipant) => {
    if (participant.user.username) {
      window.open(`/profile/${participant.user.username}`, "_blank");
    } else {
      toast.info("This user has no public profile.");
    }
  };

  const handleSendEmail = (participant: HackathonParticipant) => {
    window.location.href = `mailto:${participant.user.email}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold">Participants</h2>
          <Badge variant="muted">{participants.length} Total</Badge>
          {pendingCount > 0 && (
            <Badge variant="warning">{pendingCount} Pending</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApproveAll}
            disabled={pendingCount === 0 || updateStatus.isPending}
          >
            <UserCheck className="h-4 w-4" />
            Approve All
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-4"
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
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="shimmer rounded-lg h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
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
                      {filteredParticipants.map((participant, i) => {
                        const badgeConf = statusBadgeConfig[
                          participant.status
                        ] || { variant: "muted" as const };
                        const statusActions = getStatusActions(
                          participant.status
                        );
                        return (
                          <motion.tr
                            key={participant.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.03 }}
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
                              {participant.teamName || (
                                <span className="text-muted-foreground">
                                  No team
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-sm hidden lg:table-cell">
                              {participant.trackName || (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={badgeConf.variant}
                                className="capitalize"
                              >
                                {participant.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                              {formatDate(participant.createdAt)}
                            </td>
                            <td className="p-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {/* Status actions */}
                                  {statusActions.map((action) => (
                                    <DropdownMenuItem
                                      key={action.targetStatus}
                                      onClick={() =>
                                        handleStatusChange(
                                          participant.id,
                                          action.targetStatus,
                                          action.label
                                        )
                                      }
                                      disabled={updateStatus.isPending}
                                      className={action.className}
                                    >
                                      <action.icon className="h-4 w-4 mr-2" />
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}

                                  {statusActions.length > 0 && (
                                    <DropdownMenuSeparator />
                                  )}

                                  {/* Common actions */}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleViewProfile(participant)
                                    }
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleSendEmail(participant)
                                    }
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCopyEmail(participant.user.email)
                                    }
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Copy Email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredParticipants.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-1">
                      No participants found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No participants match your current filters.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
