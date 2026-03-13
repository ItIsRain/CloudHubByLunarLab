"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  Star,
  StarOff,
  Check,
  X,
  ChevronLeft,
  Users,
  DollarSign,
  Code,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { cn, formatCurrency } from "@/lib/utils";
import { useHackathons } from "@/hooks/use-hackathons";
import type { Hackathon } from "@/lib/types";
import { toast } from "sonner";

const statusStyles: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "gradient"> = {
  draft: "secondary",
  "registration-open": "success",
  "registration-closed": "warning",
  hacking: "gradient",
  submission: "default",
  judging: "warning",
  completed: "secondary",
};

const columnHelper = createColumnHelper<Hackathon>();

export default function AdminHackathonsPage() {
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons();
  const hackathons = hackathonsData?.data || [];
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [featured, setFeatured] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (hackathons.length > 0 && Object.keys(featured).length === 0) {
      const map: Record<string, boolean> = {};
      hackathons.forEach((h) => {
        map[h.id] = h.isFeatured;
      });
      setFeatured(map);
    }
  }, [hackathons, featured]);

  const filteredHackathons = React.useMemo(
    () =>
      statusFilter === "all"
        ? hackathons
        : hackathons.filter((h) => h.status === statusFilter),
    [hackathons, statusFilter]
  );

  const toggleFeatured = (id: string, name: string) => {
    setFeatured((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        toast.success(`"${name}" has been featured`);
      } else {
        toast.info(`"${name}" has been unfeatured`);
      }
      return next;
    });
  };

  const columns = React.useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ row }) => {
          const hack = row.original;
          return (
            <div>
              <p className="font-medium text-sm">{hack.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                by {hack.organizer.name}
              </p>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.organizer.name, {
        id: "organizer",
        header: "Organizer",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden md:inline">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => (
          <Badge
            variant={statusStyles[getValue()] || "secondary"}
            className="capitalize text-xs whitespace-nowrap"
          >
            {getValue().replace("-", " ")}
          </Badge>
        ),
      }),
      columnHelper.accessor("participantCount", {
        header: "Participants",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1 text-sm text-muted-foreground hidden lg:flex">
            <Users className="h-3.5 w-3.5" />
            {getValue()}
          </div>
        ),
      }),
      columnHelper.accessor(
        (row) => (row.prizes ?? []).reduce((sum, p) => sum + (p.value || 0), 0),
        {
          id: "prizePool",
          header: "Prize Pool",
          cell: ({ row }) => {
            const hack = row.original;
            const total = (hack.prizes ?? []).reduce(
              (sum, p) => sum + (p.value || 0),
              0
            );
            return (
              <div className="flex items-center gap-1 text-sm font-medium hidden sm:flex">
                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                {formatCurrency(total, hack.prizes?.[0]?.currency || "USD")}
              </div>
            );
          },
        }
      ),
      columnHelper.display({
        id: "featured",
        header: "Featured",
        cell: ({ row }) => {
          const hack = row.original;
          const isFeatured = featured[hack.id] ?? hack.isFeatured;
          return (
            <div className="text-center">
              <button
                onClick={() => toggleFeatured(hack.id, hack.name)}
                className={cn(
                  "inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                  isFeatured
                    ? "text-yellow-500 bg-yellow-500/10"
                    : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                )}
              >
                {isFeatured ? (
                  <Star className="h-4 w-4 fill-current" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        },
        enableSorting: false,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const hack = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Link href={`/hackathons/${hack.slug}`}>
                <Button variant="ghost" size="sm" className="h-8 px-2" title="View">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-green-500 hover:text-green-600"
                title="Approve"
                onClick={() => toast.success(`"${hack.name}" approved`)}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-red-500 hover:text-red-600"
                title="Reject"
                onClick={() => toast.error(`"${hack.name}" rejected`)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [featured]
  );

  if (hackathonsLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
      </>
    );
  }

  const selectClasses =
    "h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                  <ChevronLeft className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            </div>
            <h1 className="font-display text-3xl font-bold">Hackathon Moderation</h1>
            <p className="text-muted-foreground mt-1">Review, moderate, and feature hackathons</p>
          </motion.div>

          {/* DataTable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <DataTable
              columns={columns}
              data={filteredHackathons}
              searchable={true}
              searchPlaceholder="Search hackathons by name or organizer..."
              emptyTitle="No hackathons found"
              emptyDescription="No hackathons match your search or filter criteria."
              emptyIcon={<Code className="h-6 w-6 text-muted-foreground" />}
              toolbar={
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={selectClasses}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="registration-open">Registration Open</option>
                  <option value="registration-closed">Registration Closed</option>
                  <option value="hacking">Hacking</option>
                  <option value="submission">Submission</option>
                  <option value="judging">Judging</option>
                  <option value="completed">Completed</option>
                </select>
              }
            />
          </motion.div>
        </div>
      </main>
    </>
  );
}
