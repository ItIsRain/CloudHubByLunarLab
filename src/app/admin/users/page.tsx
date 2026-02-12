"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, getInitials } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";

type UserStatus = "active" | "suspended" | "banned";

const getUserStatus = (index: number): UserStatus => {
  if (index % 17 === 0) return "banned";
  if (index % 11 === 0) return "suspended";
  return "active";
};

const statusStyles: Record<UserStatus, { variant: "success" | "warning" | "destructive"; label: string }> = {
  active: { variant: "success", label: "Active" },
  suspended: { variant: "warning", label: "Suspended" },
  banned: { variant: "destructive", label: "Banned" },
};

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");

  const filteredUsers = mockUsers.filter((user) => {
    const matchSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      roleFilter === "all" || user.roles.includes(roleFilter as never);
    return matchSearch && matchRole;
  });

  const displayedUsers = filteredUsers.slice(0, 10);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                    <ChevronLeft className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              </div>
              <h1 className="font-display text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground mt-1">Manage and moderate platform users</p>
            </div>
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
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Roles</option>
              <option value="attendee">Attendee</option>
              <option value="organizer">Organizer</option>
              <option value="judge">Judge</option>
              <option value="mentor">Mentor</option>
              <option value="admin">Admin</option>
            </select>
          </motion.div>

          {/* Users Table */}
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
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">User</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden md:table-cell">Email</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Role</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden sm:table-cell">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden lg:table-cell">Joined</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayedUsers.map((user, i) => {
                        const status = getUserStatus(i);
                        const style = statusStyles[status];
                        return (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.05 }}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar size="sm">
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{user.name}</p>
                                  <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">{user.email}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((role) => (
                                  <Badge key={role} variant="secondary" className="capitalize text-xs">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 hidden sm:table-cell">
                              <Badge variant={style.variant} dot className="text-xs">
                                {style.label}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <Link href={`/profile/${user.username}`}>
                                  <Button variant="ghost" size="sm" className="h-8 px-2" title="View profile">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-yellow-500 hover:text-yellow-600"
                                  title="Suspend user"
                                  onClick={() => {
                                    if (window.confirm(`Suspend user ${user.name}?`)) {
                                      toast.success(`${user.name} has been suspended`);
                                    }
                                  }}
                                >
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-red-500 hover:text-red-600"
                                  title="Ban user"
                                  onClick={() => {
                                    if (window.confirm(`Ban user ${user.name}? This action is serious.`)) {
                                      toast.success(`${user.name} has been banned`);
                                    }
                                  }}
                                >
                                  <ShieldBan className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-blue-500 hover:text-blue-600"
                                  title="Make admin"
                                  onClick={() => {
                                    toast.success(`${user.name} is now an admin`);
                                  }}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing 1-10 of {filteredUsers.length} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled className="h-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 bg-primary text-primary-foreground">
                      1
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8">
                      2
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8">
                      3
                    </Button>
                    <Button variant="outline" size="sm" className="h-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
}
