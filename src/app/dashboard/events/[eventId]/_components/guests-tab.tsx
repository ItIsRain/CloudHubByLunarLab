"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Download,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Ban,
  Mail,
  Eye,
  RotateCcw,
  FileText,
  UserCheck,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
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

const columnHelper = createColumnHelper<EventGuest>();

export function GuestsTab({ event, eventId }: GuestsTabProps) {
  const { data: guestsData, isLoading } = useEventGuests(eventId);
  const updateStatus = useUpdateGuestStatus();

  const [statusFilter, setStatusFilter] = React.useState("all");

  const guests = guestsData?.data ?? [];

  const confirmedCount = guests.filter((g) => g.status === "confirmed").length;
  const checkedInCount = guests.filter(
    (g) => g.status === "checked-in"
  ).length;
  const cancelledCount = guests.filter(
    (g) => g.status === "cancelled"
  ).length;

  const filteredGuests = React.useMemo(
    () =>
      statusFilter === "all"
        ? guests
        : guests.filter((g) => g.status === statusFilter),
    [guests, statusFilter]
  );

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

  const columns = React.useMemo(
    () => [
      columnHelper.accessor((row) => row.user?.name || "Unknown", {
        id: "name",
        header: "Name",
        cell: ({ row }) => {
          const guest = row.original;
          return (
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
          );
        },
      }),
      columnHelper.accessor((row) => row.user?.email || "", {
        id: "email",
        header: "Email",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden md:inline">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor(
        (row) =>
          (row.ticketType as { name?: string } | null)?.name || "General",
        {
          id: "ticketType",
          header: "Ticket Type",
          cell: ({ getValue }) => {
            const val = getValue();
            return (
              <span className="text-sm hidden lg:inline">
                {val === "General" ? (
                  <span className="text-muted-foreground">General</span>
                ) : (
                  val
                )}
              </span>
            );
          },
        }
      ),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          const badgeConf = statusBadgeConfig[status] || {
            variant: "muted" as const,
          };
          return (
            <Badge variant={badgeConf.variant} className="capitalize">
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Date",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden md:inline">
            {formatDate(getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const guest = row.original;
          const statusActions = getStatusActions(guest.status);
          return (
            <div className="text-right">
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
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [updateStatus.isPending]
  );

  const selectClasses =
    "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

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

      {/* DataTable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={filteredGuests}
          isLoading={isLoading}
          searchable={true}
          searchPlaceholder="Search guests..."
          emptyTitle="No guests found"
          emptyDescription="No guests match your current filters."
          emptyIcon={<FileText className="h-6 w-6 text-muted-foreground" />}
          toolbar={
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
          }
        />
      </motion.div>
    </div>
  );
}
