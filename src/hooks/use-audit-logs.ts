"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";

interface AuditLogActor {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  username: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actor: AuditLogActor | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  status: "success" | "failure";
  errorMessage: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export function useAuditLogs(filters?: {
  action?: string;
  entityType?: string;
  actorId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.action) params.set("action", filters.action);
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.actorId) params.set("actorId", filters.actorId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => fetchJson<AuditLogsResponse>(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`),
  });
}
