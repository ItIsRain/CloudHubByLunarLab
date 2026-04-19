import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { dbRowToReport } from "@/lib/supabase/mappers";
import type { ReportStatus } from "@/lib/types";
import { verifyAdmin } from "@/lib/verify-admin";

const VALID_STATUSES: ReportStatus[] = [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    if (!UUID_RE.test(reportId)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Validate and apply status
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as ReportStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = body.status;

      // Set resolution metadata when resolving or dismissing
      if (body.status === "resolved" || body.status === "dismissed") {
        updates.resolved_by = adminCheck.userId;
        updates.resolved_at = new Date().toISOString();
      }
    }

    // Apply resolution note
    if (body.resolutionNote !== undefined) {
      if (typeof body.resolutionNote !== "string" || body.resolutionNote.length > 5000) {
        return NextResponse.json(
          { error: "resolutionNote must be a string of at most 5000 characters" },
          { status: 400 }
        );
      }
      updates.resolution_note = body.resolutionNote;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdminClient();

    // Fetch current state for audit log
    const { data: existing } = await admin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    const { data, error } = await admin
      .from("reports")
      .update(updates)
      .eq("id", reportId)
      .select("*, reporter:profiles!reporter_id(*)")
      .single();

    if (error) {
      console.error("Failed to update report:", error.message);
      return NextResponse.json(
        { error: "Failed to update report" },
        { status: 400 }
      );
    }

    // Write audit log
    await writeAuditLog(
      {
        actorId: adminCheck.userId,
        action: "report.update",
        entityType: "report",
        entityId: reportId,
        oldValues: {
          status: existing.status,
          resolution_note: existing.resolution_note,
        },
        newValues: updates,
      },
      request
    );

    return NextResponse.json({
      data: dbRowToReport(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    if (!UUID_RE.test(reportId)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    const admin = getSupabaseAdminClient();

    // Fetch report before deletion for audit log
    const { data: existing } = await admin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    const { error } = await admin
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      console.error("Failed to delete report:", error.message);
      return NextResponse.json(
        { error: "Failed to delete report" },
        { status: 400 }
      );
    }

    // Write audit log
    await writeAuditLog(
      {
        actorId: adminCheck.userId,
        action: "report.delete",
        entityType: "report",
        entityId: reportId,
        oldValues: {
          type: existing.type,
          entity_id: existing.entity_id,
          entity_title: existing.entity_title,
          status: existing.status,
        },
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
