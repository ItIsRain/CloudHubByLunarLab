import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

export interface AuditLogEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  status?: "success" | "failure";
  errorMessage?: string;
}

/**
 * Write an audit log entry. Uses the admin client to bypass RLS
 * (the audit_logs table has no INSERT policy for regular users).
 *
 * Best-effort: failures are logged but never bubble up to callers,
 * so audit logging cannot break the primary request flow.
 */
export async function writeAuditLog(
  entry: AuditLogEntry,
  request?: NextRequest
): Promise<void> {
  try {
    const admin = getSupabaseAdminClient();

    const ipHeader =
      request?.headers.get("x-forwarded-for") ??
      request?.headers.get("x-real-ip");
    const ip = ipHeader?.split(",")[0]?.trim() || null;
    const userAgent = request?.headers.get("user-agent")?.slice(0, 500) || null;

    await admin.from("audit_logs").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      old_values: entry.oldValues ?? {},
      new_values: entry.newValues ?? {},
      ip_address: ip,
      user_agent: userAgent,
      status: entry.status ?? "success",
      error_message: entry.errorMessage ?? null,
    });
  } catch (err) {
    // Never let audit logging break the request
    console.error("[audit] Failed to write log:", err);
  }
}
