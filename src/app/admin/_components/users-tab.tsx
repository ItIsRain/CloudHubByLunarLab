"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { formatDate, getInitials } from "@/lib/utils";
import { useAdminUsers, useUpdateUser } from "@/hooks/use-admin-users";
import { toast } from "sonner";
import type { User, UserRole } from "@/lib/types";

// ─── Status display config ──────────────────────────────────────

type UserStatus = "active" | "suspended" | "banned";

const statusStyles: Record<
  UserStatus,
  { variant: "success" | "warning" | "destructive"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  suspended: { variant: "warning", label: "Suspended" },
  banned: { variant: "destructive", label: "Banned" },
};

// ─── Column definitions ─────────────────────────────────────────

const columnHelper = createColumnHelper<User>();

// ─── Custom debounce hook ───────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─── Component ──────────────────────────────────────────────────

export function UsersTab() {
  const [searchInput, setSearchInput] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const { data, isLoading } = useAdminUsers({
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : (roleFilter as UserRole),
    status: statusFilter === "all" ? undefined : (statusFilter as "active" | "suspended" | "banned"),
    page,
    pageSize,
  });

  const updateUser = useUpdateUser();

  const users: User[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // ─── Action handlers ────────────────────────────────────────

  const handleSuspend = React.useCallback(
    async (user: User) => {
      if (!window.confirm(`Suspend user ${user.name}?`)) return;
      try {
        await updateUser.mutateAsync({
          userId: user.id,
          status: "suspended",
        });
        toast.success(`${user.name} has been suspended`);
      } catch {
        toast.error(`Failed to suspend ${user.name}`);
      }
    },
    [updateUser]
  );

  const handleBan = React.useCallback(
    async (user: User) => {
      if (!window.confirm(`Ban user ${user.name}? This action is serious.`))
        return;
      try {
        await updateUser.mutateAsync({
          userId: user.id,
          status: "banned",
        });
        toast.success(`${user.name} has been banned`);
      } catch {
        toast.error(`Failed to ban ${user.name}`);
      }
    },
    [updateUser]
  );

  const handleRestore = React.useCallback(
    async (user: User) => {
      if (!window.confirm(`Restore user ${user.name} to active status?`))
        return;
      try {
        await updateUser.mutateAsync({
          userId: user.id,
          status: "active",
        });
        toast.success(`${user.name} has been restored to active`);
      } catch {
        toast.error(`Failed to restore ${user.name}`);
      }
    },
    [updateUser]
  );

  const handleMakeAdmin = React.useCallback(
    async (user: User) => {
      if (!window.confirm(`Grant admin privileges to ${user.name}?`)) return;
      try {
        await updateUser.mutateAsync({
          userId: user.id,
          roles: [...user.roles, "admin"],
        });
        toast.success(`${user.name} is now an admin`);
      } catch {
        toast.error(`Failed to update ${user.name}'s role`);
      }
    },
    [updateUser]
  );

  // ─── Columns ────────────────────────────────────────────────

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
                <p className="text-xs text-muted-foreground md:hidden">
                  {user.email}
                </p>
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
              <Badge
                key={role}
                variant="secondary"
                className="capitalize text-xs"
              >
                {role}
              </Badge>
            ))}
          </div>
        ),
        enableGlobalFilter: false,
      }),
      columnHelper.accessor("status", {
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
          const isSuspendedOrBanned =
            user.status === "suspended" || user.status === "banned";
          const isAdmin = user.roles.includes("admin");

          return (
            <div className="flex items-center justify-end gap-1">
              <Link href={`/profile/${user.username}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  title="View profile"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>

              {isSuspendedOrBanned ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-green-500 hover:text-green-600"
                  title="Restore user"
                  disabled={updateUser.isPending}
                  onClick={() => handleRestore(user)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-yellow-500 hover:text-yellow-600"
                    title="Suspend user"
                    disabled={updateUser.isPending}
                    onClick={() => handleSuspend(user)}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-500 hover:text-red-600"
                    title="Ban user"
                    disabled={updateUser.isPending}
                    onClick={() => handleBan(user)}
                  >
                    <ShieldBan className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {!isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-blue-500 hover:text-blue-600"
                  title="Make admin"
                  disabled={updateUser.isPending}
                  onClick={() => handleMakeAdmin(user)}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [handleSuspend, handleBan, handleRestore, handleMakeAdmin, updateUser.isPending]
  );

  // ─── Shared select styling ──────────────────────────────────

  const selectClasses =
    "h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  // ─── Render ─────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Search + Filters toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search users by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClasses}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Table (search disabled — handled externally with debounce) */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        skeletonRows={pageSize}
        searchable={false}
        emptyTitle="No users found"
        emptyDescription="No users match your search or filter criteria."
        emptyIcon={<Users className="h-6 w-6 text-muted-foreground" />}
        showPageSizeSelector={false}
      />

      {/* Server-side pagination */}
      {!isLoading && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} of {total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-3 text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
