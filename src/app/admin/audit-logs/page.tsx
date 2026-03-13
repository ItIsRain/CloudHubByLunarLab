"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Shield,
  Search,
  Filter,
  ChevronRight,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { useAuditLogs } from "@/hooks/use-audit-logs";

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-500 border-green-500/20",
  update: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  delete: "bg-red-500/10 text-red-500 border-red-500/20",
  login: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  logout: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  publish: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  revoke: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const entityIcons: Record<string, string> = {
  event: "calendar",
  hackathon: "trophy",
  user: "user",
  sponsor: "building",
  team: "users",
  submission: "file",
  certificate: "award",
  blog_post: "book",
  community: "globe",
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = React.useState(1);
  const [actionFilter, setActionFilter] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");

  const { data, isLoading, refetch } = useAuditLogs({
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
    page,
    pageSize: 50,
  });

  const logs = data?.data || [];
  const totalPages = data?.totalPages || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-display">Audit Logs</h1>
              <p className="text-muted-foreground">
                Track all actions across the platform
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-6"
        >
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="publish">Publish</option>
            <option value="login">Login</option>
            <option value="revoke">Revoke</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Entities</option>
            <option value="event">Events</option>
            <option value="hackathon">Hackathons</option>
            <option value="user">Users</option>
            <option value="team">Teams</option>
            <option value="sponsor">Sponsors</option>
            <option value="submission">Submissions</option>
            <option value="certificate">Certificates</option>
            <option value="blog_post">Blog Posts</option>
            <option value="community">Communities</option>
          </select>
        </motion.div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Logs", value: data?.total || 0, icon: Shield, color: "text-blue-500" },
            {
              label: "Successful",
              value: logs.filter((l) => l.status === "success").length,
              icon: CheckCircle2,
              color: "text-green-500",
            },
            {
              label: "Failed",
              value: logs.filter((l) => l.status === "failure").length,
              icon: XCircle,
              color: "text-red-500",
            },
            {
              label: "Unique Actors",
              value: new Set(logs.map((l) => l.actorId).filter(Boolean)).size,
              icon: User,
              color: "text-purple-500",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Activity Log
              {data?.total ? (
                <Badge variant="outline" className="ml-2 font-normal">
                  {data.total} entries
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <div className="shimmer h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="shimmer h-4 w-3/4 rounded" />
                      <div className="shimmer h-3 w-1/2 rounded" />
                    </div>
                    <div className="shimmer h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-medium mb-1">No audit logs found</h3>
                <p className="text-sm text-muted-foreground">
                  {actionFilter || entityFilter
                    ? "Try adjusting your filters"
                    : "Actions will appear here as they happen"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs
                  .filter((log) =>
                    !searchTerm ||
                    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.actor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-4 py-3 px-2 hover:bg-muted/30 rounded-lg transition-colors"
                    >
                      {/* Actor Avatar */}
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.actor?.avatar || ""} />
                        <AvatarFallback className="text-xs">
                          {log.actor ? getInitials(log.actor.name) : "?"}
                        </AvatarFallback>
                      </Avatar>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {log.actor?.name || "System"}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              actionColors[log.action] || "bg-muted"
                            )}
                          >
                            {log.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.entityType}
                          </span>
                          {log.entityId && (
                            <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                              {log.entityId.slice(0, 8)}...
                            </code>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </span>
                          {log.ipAddress && (
                            <span className="text-xs text-muted-foreground">
                              from {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                          {log.errorMessage && (
                            <span className="text-xs text-red-400 max-w-[150px] truncate">
                              {log.errorMessage}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
