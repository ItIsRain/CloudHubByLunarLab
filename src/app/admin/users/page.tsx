"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ChevronLeft,
  Users,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import { formatDate, getInitials } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";
import type { User } from "@/lib/types";

type UserStatus = "active" | "suspended" | "banned";

interface UserWithStatus extends User {
  _status: UserStatus;
}

const statusStyles: Record<UserStatus, { variant: "success" | "warning" | "destructive"; label: string }> = {
  active: { variant: "success", label: "Active" },
  suspended: { variant: "warning", label: "Suspended" },
  banned: { variant: "destructive", label: "Banned" },
};

const columnHelper = createColumnHelper<UserWithStatus>();

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = React.useState("all");

  const usersWithStatus: UserWithStatus[] = React.useMemo(
    () =>
      mockUsers.map((user, i) => ({
        ...user,
        _status: (i % 17 === 0 ? "banned" : i % 11 === 0 ? "suspended" : "active") as UserStatus,
      })),
    []
  );

  const filteredUsers = React.useMemo(
    () =>
      roleFilter === "all"
        ? usersWithStatus
        : usersWithStatus.filter((u) => u.roles.includes(roleFilter as never)),
    [usersWithStatus, roleFilter]
  );

  const columns = React.useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          return (
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
          );
        },
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden md:inline">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("roles", {
        header: "Role",
        cell: ({ getValue }) => (
          <div className="flex flex-wrap gap-1">
            {getValue().map((role) => (
              <Badge key={role} variant="secondary" className="capitalize text-xs">
                {role}
              </Badge>
            ))}
          </div>
        ),
        enableGlobalFilter: false,
      }),
      columnHelper.accessor("_status", {
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          const style = statusStyles[status];
          return (
            <span className="hidden sm:inline">
              <Badge variant={style.variant} dot className="text-xs">
                {style.label}
              </Badge>
            </span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Joined",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden lg:inline">
            {formatDate(getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
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
          );
        },
        enableSorting: false,
      }),
    ],
    []
  );

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

          {/* DataTable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <DataTable
              columns={columns}
              data={filteredUsers}
              searchable={true}
              searchPlaceholder="Search users by name or email..."
              emptyTitle="No users found"
              emptyDescription="No users match your search or filter criteria."
              emptyIcon={<Users className="h-6 w-6 text-muted-foreground" />}
              toolbar={
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={selectClasses}
                >
                  <option value="all">All Roles</option>
                  <option value="attendee">Attendee</option>
                  <option value="organizer">Organizer</option>
                  <option value="judge">Judge</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              }
            />
          </motion.div>
        </div>
      </main>
    </>
  );
}
