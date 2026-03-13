import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    const roles = (profile?.roles as string[]) || [];
    if (!roles.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const actorId = searchParams.get("actorId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50));

    let query = supabase
      .from("audit_logs")
      .select("*, actor:profiles!actor_id(id,name,email,avatar,username)", { count: "exact" });

    if (action) query = query.eq("action", action);
    if (entityType) query = query.eq("entity_type", entityType);
    if (actorId) query = query.eq("actor_id", actorId);
    if (status) query = query.eq("status", status);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }

    const total = count ?? 0;
    const logs = (data || []).map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      actor: row.actor
        ? {
            id: (row.actor as Record<string, unknown>).id,
            name: (row.actor as Record<string, unknown>).name,
            email: (row.actor as Record<string, unknown>).email,
            avatar: (row.actor as Record<string, unknown>).avatar,
            username: (row.actor as Record<string, unknown>).username,
          }
        : null,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      oldValues: row.old_values,
      newValues: row.new_values,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: from + pageSize < total,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
