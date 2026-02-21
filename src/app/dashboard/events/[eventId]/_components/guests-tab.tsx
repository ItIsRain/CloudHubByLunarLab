"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Ban,
  Mail,
  Eye,
  RotateCcw,
  FileText,
  Users,
  UserCheck,
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
import type { Event, EventGuest } from "@/lib/types";
import {
  useEventGuests,
  useUpdateGuestStatus,
} from "@/hooks/use-event-guests";
import { toast } from "sonner";

interface GuestsTabProps {
  event: Event;
  eventId: string;
}

const statusBadgeConfig: Record<
  string,
  { variant: "success" | "warning" | "destructive" | "muted" }
> = {
  confirmed: { variant: "success" },
  "checked-in": { variant: "success" },
  pending: { variant: "warning" },
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
      label: "Confirm",
      icon: CheckCircle2,
      targetStatus: "confirmed",
      className: "text-green-600",
    });
    actions.push({
      label: "Cancel",
      icon: XCircle,
      targetStatus: "cancelled",
      className: "text-red-600",
    });
  }

  if (status === "confirmed") {
    actions.push({
      label: "Check In",
      icon: UserCheck,
      targetStatus: "checked-in",
      className: "text-green-600",
    });
    actions.push({
      label: "Cancel Registration",
      icon: Ban,
      targetStatus: "cancelled",
      className: "text-red-600",
    });
  }

  if (status === "cancelled") {
    actions.push({
      label: "Reinstate",
      icon: RotateCcw,
      targetStatus: "confirmed",
      className: "text-green-600",
    });
  }

  return actions;
}

export function GuestsTab({ event, eventId }: GuestsTabProps) {
  const { data: guestsData, isLoading } = useEventGuests(eventId);
  const updateStatus = useUpdateGuestStatus();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const guests = guestsData?.data ?? [];

  const confirmedCount = guests.filter((g) => g.status === "confirmed").length;
  const checkedInCount = guests.filter(
    (g) => g.status === "checked-in"
  ).length;
  const cancelledCount = guests.filter(
    (g) => g.status === "cancelled"
  ).length;

  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      !search ||
      (g.user &&
        (g.user.name.toLowerCase().includes(search.toLowerCase()) ||
          g.user.email.toLowerCase().includes(search.toLowerCase())));
    const matchesStatus =
      statusFilter === "all" || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (
    registrationId: string,
    newStatus: string,
    label: string
  ) => {
    try {
      await updateStatus.mutateAsync({
        eventId,
        registrationId,
        status: newStatus,
      });
      toast.success(`Guest ${label.toLowerCase()}!`);
    } catch {
      toast.error("Failed to update guest status.");
    }
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Ticket Type", "Status", "Registered"].join(","),
      ...filteredGuests.map((g) =>
        [
          `"${g.user?.name || "Unknown"}"`,
          g.user?.email || "",
          `"${(g.ticketType as { name?: string } | null)?.name || "General"}"`,
          g.status,
          g.createdAt,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guests.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded!");
  };

  const summaryCards = [
    {
      label: "Confirmed",
      count: confirmedCount,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Checked In",
      count: checkedInCount,
      icon: UserCheck,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Cancelled",
      count: cancelledCount,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold">Guests</h2>
          <Badge variant="muted">{guests.length} Total</Badge>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    card.bgColor
                  )}
                >
                  <card.icon className={cn("h-4 w-4", card.color)} />
                </div>
                <div>
                  <p className="text-xl font-bold font-display">{card.count}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1">
          <Input
            placeholder="Search guests..."
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
          <option value="confirmed">Confirmed</option>
          <option value="checked-in">Checked In</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
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
                          Ticket Type
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                          Date
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((guest, i) => {
                        const badgeConf = statusBadgeConfig[guest.status] || {
                          variant: "muted" as const,
                        };
                        const statusActions = getStatusActions(guest.status);
                        return (
                          <motion.tr
                            key={guest.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.03 }}
                            className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar size="sm">
                                  <AvatarImage
                                    src={guest.user?.avatar}
                                    alt={guest.user?.name}
                                  />
                                  <AvatarFallback>
                                    {getInitials(guest.user?.name || "?")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">
                                  {guest.user?.name || "Unknown"}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                              {guest.user?.email}
                            </td>
                            <td className="p-4 text-sm hidden lg:table-cell">
                              {(
                                guest.ticketType as {
                                  name?: string;
                                } | null
                              )?.name || (
                                <span className="text-muted-foreground">
                                  General
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={badgeConf.variant}
                                className="capitalize"
                              >
                                {guest.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                              {formatDate(guest.createdAt)}
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
                                  {statusActions.map((action) => (
                                    <DropdownMenuItem
                                      key={action.targetStatus}
                                      onClick={() =>
                                        handleStatusChange(
                                          guest.id,
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
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (guest.user?.username) {
                                        window.open(
                                          `/profile/${guest.user.username}`,
                                          "_blank"
                                        );
                                      } else {
                                        toast.info(
                                          "This user has no public profile."
                                        );
                                      }
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (guest.user?.email) {
                                        window.location.href = `mailto:${guest.user.email}`;
                                      }
                                    }}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
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

                {filteredGuests.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-1">
                      No guests found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No guests match your current filters.
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
