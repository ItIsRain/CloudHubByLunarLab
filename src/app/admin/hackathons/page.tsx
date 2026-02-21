"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  Star,
  StarOff,
  Check,
  X,
  ChevronLeft,
  Users,
  DollarSign,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { useHackathons } from "@/hooks/use-hackathons";
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

export default function AdminHackathonsPage() {
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons();
  const hackathons = hackathonsData?.data || [];
  const [search, setSearch] = React.useState("");
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

  if (hackathonsLoading) return <><Navbar /><main className="min-h-screen bg-background pt-24 pb-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="shimmer rounded-xl h-96 w-full" /></div></main></>;

  const filteredHackathons = hackathons.filter((hack) => {
    const matchSearch =
      hack.name.toLowerCase().includes(search.toLowerCase()) ||
      hack.organizer.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" || hack.status === statusFilter;
    return matchSearch && matchStatus;
  });

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

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <div className="flex-1">
              <Input
                placeholder="Search hackathons by name or organizer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Name</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden md:table-cell">Organizer</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden lg:table-cell">Participants</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden sm:table-cell">Prize Pool</th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Featured</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredHackathons.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            No hackathons found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredHackathons.map((hack, i) => (
                          <motion.tr
                            key={hack.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.05 }}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-sm">{hack.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                                  by {hack.organizer.name}
                                </p>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                              {hack.organizer.name}
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={statusStyles[hack.status] || "secondary"}
                                className="capitalize text-xs whitespace-nowrap"
                              >
                                {hack.status.replace("-", " ")}
                              </Badge>
                            </td>
                            <td className="p-4 hidden lg:table-cell">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                {hack.participantCount}
                              </div>
                            </td>
                            <td className="p-4 hidden sm:table-cell">
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                                {formatCurrency(
                                  (hack.prizes ?? []).reduce((sum, p) => sum + (p.value || 0), 0),
                                  hack.prizes?.[0]?.currency || "USD"
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => toggleFeatured(hack.id, hack.name)}
                                className={cn(
                                  "inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                                  featured[hack.id]
                                    ? "text-yellow-500 bg-yellow-500/10"
                                    : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                                )}
                              >
                                {featured[hack.id] ? (
                                  <Star className="h-4 w-4 fill-current" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="p-4">
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
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
}
