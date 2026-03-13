import { fetchJson } from "@/lib/fetch-json";
import { useQuery } from "@tanstack/react-query";

export interface AdminStatsRecentUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  username: string;
  roles: string[];
  createdAt: string;
}

export interface AdminStatsAuditLog {
  id: string;
  actorId: string | null;
  actor: {
    id: string;
    name: string;
    avatar: string | null;
    username: string;
  } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  status: string;
  createdAt: string;
}

export interface RegistrationTrendPoint {
  date: string;
  count: number;
}

export interface AdminStatsData {
  totalUsers: number;
  totalEvents: number;
  totalHackathons: number;
  totalTeams: number;
  totalSubmissions: number;
  newUsersThisMonth: number;
  newEventsThisMonth: number;
  activeHackathons: number;
  eventsByCategory: Record<string, number>;
  hackathonsByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
  registrationTrends: RegistrationTrendPoint[];
  recentUsers: AdminStatsRecentUser[];
  recentAuditLogs: AdminStatsAuditLog[];
}

export function useAdminStats() {
  return useQuery<{ data: AdminStatsData }>({
    queryKey: ["admin-stats"],
    queryFn: () => fetchJson<{ data: AdminStatsData }>("/api/admin/stats"),
    staleTime: 60 * 1000, // cache for 1 minute
    retry: false,
  });
}

export function useAdminRegistrationTrends() {
  const query = useAdminStats();
  return {
    ...query,
    data: query.data?.data.registrationTrends,
  };
}
