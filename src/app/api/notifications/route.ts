import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToNotification } from "@/lib/supabase/mappers";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = request.nextUrl;
    const type = url.searchParams.get("type");
    const unreadOnly = url.searchParams.get("unread") === "true";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10) || 50));
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }
    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const total = count || 0;
    const notifications = (data || []).map((row) =>
      dbRowToNotification(row as Record<string, unknown>)
    );

    return NextResponse.json({
      data: notifications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + pageSize < total,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, link } = body;

    // Only allow user-initiated notification types from the client.
    // System-only types (registration-confirmed, payment-received, submission-scored)
    // are created server-side and must NOT be creatable by users.
    const allowedTypes = [
      "event-reminder", "event-update",
      "hackathon-update", "hackathon-deadline",
      "team-invite", "team-update", "announcement", "general",
    ];

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title, and message are required" },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    if (typeof title !== "string" || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be a string under 200 characters" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.length > 2000) {
      return NextResponse.json(
        { error: "Message must be a string under 2000 characters" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type,
        title: title.slice(0, 200),
        message: message.slice(0, 2000),
        link: link ? String(link).slice(0, 500) : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToNotification(data as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
