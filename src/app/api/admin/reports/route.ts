import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToReport } from "@/lib/supabase/mappers";
import { verifyAdmin } from "@/lib/verify-admin";

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50)
    );

    // Use admin client to bypass RLS
    const admin = getSupabaseAdminClient();

    let query = admin
      .from("reports")
      .select("*, reporter:profiles!reporter_id(*)", { count: "exact" });

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Failed to fetch reports:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    const total = count ?? 0;
    const reports = (data || []).map((row) =>
      dbRowToReport(row as Record<string, unknown>)
    );

    return NextResponse.json({
      data: reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
