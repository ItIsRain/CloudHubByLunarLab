import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/verify-admin";

export async function GET() {
  try {
    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    const supabase = await getSupabaseServerClient();

    // Calculate date boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run all count queries in parallel
    const [
      totalUsersRes,
      totalEventsRes,
      totalHackathonsRes,
      totalTeamsRes,
      totalSubmissionsRes,
      newUsersThisMonthRes,
      newEventsThisMonthRes,
      activeHackathonsRes,
      eventCategoriesRes,
      hackathonStatusesRes,
      userRolesRes,
      registrationTrendsRes,
      recentUsersRes,
      recentAuditLogsRes,
    ] = await Promise.all([
      // Total users
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),

      // Total events
      supabase
        .from("events")
        .select("id", { count: "exact", head: true }),

      // Total hackathons
      supabase
        .from("hackathons")
        .select("id", { count: "exact", head: true }),

      // Total teams
      supabase
        .from("teams")
        .select("id", { count: "exact", head: true }),

      // Total submissions
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true }),

      // New users this month
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth),

      // New events this month
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth),

      // Active hackathons (not draft)
      supabase
        .from("hackathons")
        .select("id", { count: "exact", head: true })
        .neq("status", "draft"),

      // Events by category
      supabase
        .from("events")
        .select("category"),

      // Hackathons by status
      supabase
        .from("hackathons")
        .select("status"),

      // Users with roles (for role breakdown)
      supabase
        .from("profiles")
        .select("roles"),

      // Registration trends (last 30 days)
      supabase
        .from("event_registrations")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true }),

      // Recent users (for dashboard table)
      supabase
        .from("profiles")
        .select("id, name, email, avatar, username, roles, created_at")
        .order("created_at", { ascending: false })
        .limit(10),

      // Recent audit logs (for activity feed)
      supabase
        .from("audit_logs")
        .select("*, actor:profiles!actor_id(id, name, email, avatar, username)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Aggregate events by category
    const eventsByCategory: Record<string, number> = {};
    for (const row of eventCategoriesRes.data || []) {
      const cat = (row.category as string) || "unknown";
      eventsByCategory[cat] = (eventsByCategory[cat] || 0) + 1;
    }

    // Aggregate hackathons by status
    const hackathonsByStatus: Record<string, number> = {};
    for (const row of hackathonStatusesRes.data || []) {
      const st = (row.status as string) || "unknown";
      hackathonsByStatus[st] = (hackathonsByStatus[st] || 0) + 1;
    }

    // Aggregate users by role (a user can have multiple roles)
    const usersByRole: Record<string, number> = {};
    for (const row of userRolesRes.data || []) {
      const userRoles = (row.roles as string[]) || ["attendee"];
      for (const role of userRoles) {
        usersByRole[role] = (usersByRole[role] || 0) + 1;
      }
    }

    // Aggregate registration trends by day
    const trendMap: Record<string, number> = {};
    // Pre-fill all 30 days with zero
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = 0;
    }
    for (const row of registrationTrendsRes.data || []) {
      const day = (row.created_at as string).slice(0, 10);
      if (trendMap[day] !== undefined) {
        trendMap[day] += 1;
      }
    }
    const registrationTrends = Object.entries(trendMap).map(([date, count]) => ({
      date,
      count,
    }));

    // Map recent users
    const recentUsers = (recentUsersRes.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar,
      username: row.username,
      roles: row.roles || ["attendee"],
      createdAt: row.created_at,
    }));

    // Map recent audit logs
    const recentAuditLogs = (recentAuditLogsRes.data || []).map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      actor: row.actor
        ? {
            id: (row.actor as Record<string, unknown>).id,
            name: (row.actor as Record<string, unknown>).name,
            avatar: (row.actor as Record<string, unknown>).avatar,
            username: (row.actor as Record<string, unknown>).username,
          }
        : null,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      status: row.status,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      data: {
        totalUsers: totalUsersRes.count || 0,
        totalEvents: totalEventsRes.count || 0,
        totalHackathons: totalHackathonsRes.count || 0,
        totalTeams: totalTeamsRes.count || 0,
        totalSubmissions: totalSubmissionsRes.count || 0,
        newUsersThisMonth: newUsersThisMonthRes.count || 0,
        newEventsThisMonth: newEventsThisMonthRes.count || 0,
        activeHackathons: activeHackathonsRes.count || 0,
        eventsByCategory,
        hackathonsByStatus,
        usersByRole,
        registrationTrends,
        recentUsers,
        recentAuditLogs,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
