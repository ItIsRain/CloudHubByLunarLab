"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  AlertTriangle,
  XCircle,
  Search as SearchIcon,
  FileWarning,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

type ReportType = "Event" | "Hackathon" | "User" | "Comment";
type ReportStatus = "Pending" | "Resolved";

interface Report {
  id: string;
  type: ReportType;
  itemTitle: string;
  reporter: string;
  reason: string;
  date: string;
  status: ReportStatus;
}

const mockReports: Report[] = [
  {
    id: "report-1",
    type: "Event",
    itemTitle: "Suspicious Crypto Giveaway Event",
    reporter: "Sarah Kim",
    reason: "Potential scam - promises unrealistic returns and requires personal wallet information.",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Pending",
  },
  {
    id: "report-2",
    type: "User",
    itemTitle: "bot_user_2938",
    reporter: "Marcus Johnson",
    reason: "Spam account sending promotional messages to multiple users.",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Pending",
  },
  {
    id: "report-3",
    type: "Hackathon",
    itemTitle: "Fake Prizes Hackathon",
    reporter: "Emma Wilson",
    reason: "Misleading prize pool. Past participants report that prizes were never distributed.",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Pending",
  },
  {
    id: "report-4",
    type: "Comment",
    itemTitle: "Offensive comment on AI Summit 2024",
    reporter: "Alex Chen",
    reason: "Contains harassment and inappropriate language targeting other participants.",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Resolved",
  },
  {
    id: "report-5",
    type: "Event",
    itemTitle: "Plagiarized Event Page",
    reporter: "David Park",
    reason: "Event description and images copied from another organizer's event.",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Resolved",
  },
  {
    id: "report-6",
    type: "User",
    itemTitle: "impersonator_account",
    reporter: "Sarah Kim",
    reason: "This account is impersonating a well-known tech influencer to deceive users.",
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Pending",
  },
];

const typeColors: Record<ReportType, "default" | "destructive" | "warning" | "secondary"> = {
  Event: "default",
  Hackathon: "warning",
  User: "destructive",
  Comment: "secondary",
};

export default function AdminReportsPage() {
  const [filter, setFilter] = React.useState<"All" | ReportType>("All");

  const filteredReports =
    filter === "All"
      ? mockReports
      : mockReports.filter((r) => r.type === filter);

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
            <h1 className="font-display text-3xl font-bold">Reported Content</h1>
            <p className="text-muted-foreground mt-1">Review and act on user-reported content</p>
          </motion.div>

          {/* Filter Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            {(["All", "Event", "Hackathon", "User", "Comment"] as const).map((type) => (
              <Button
                key={type}
                variant={filter === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(type)}
                className="capitalize"
              >
                {type}s
                {type !== "All" && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {mockReports.filter((r) => r.type === type).length}
                  </Badge>
                )}
              </Button>
            ))}
          </motion.div>

          {/* Report Cards */}
          {filteredReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="py-16 text-center">
                  <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold mb-2">No Reports Found</h3>
                  <p className="text-muted-foreground text-sm">
                    No reports match the selected filter. Try selecting a different category.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge variant={typeColors[report.type]} className="text-xs">
                          {report.type}
                        </Badge>
                        <Badge
                          variant={report.status === "Pending" ? "warning" : "success"}
                          dot
                          className="text-xs"
                        >
                          {report.status}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-sm mb-2">{report.itemTitle}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {report.reason}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span>Reported by {report.reporter}</span>
                        <span>{formatDate(report.date)}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => toast.info(`Reviewing report: ${report.itemTitle}`)}
                        >
                          <SearchIcon className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground"
                          title="Dismiss"
                          onClick={() => toast.info(`Report dismissed: ${report.itemTitle}`)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-600"
                          title="Take action"
                          onClick={() => toast.success(`Action taken on: ${report.itemTitle}`)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
