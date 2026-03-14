import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToScreeningRule } from "@/lib/supabase/mappers";

interface Params {
  params: Promise<{ formId: string; ruleId: string }>;
}

async function verifyAccess(formId: string, userId: string) {
  const admin = getSupabaseAdminClient();
  const { data: form } = await admin
    .from("competition_forms")
    .select("organizer_id")
    .eq("id", formId)
    .single();

  if (!form) return false;
  if (form.organizer_id === userId) return true;

  const { data: profile } = await admin
    .from("profiles")
    .select("roles")
    .eq("id", userId)
    .single();
  return ((profile?.roles as string[]) || []).includes("admin");
}

// ── PATCH — update a rule ───────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { formId, ruleId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (!(await verifyAccess(formId, auth.userId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = String(body.name);
  if (body.description !== undefined) updateData.description = body.description;
  if (body.ruleType !== undefined) updateData.rule_type = body.ruleType === "soft" ? "soft" : "hard";
  if (body.fieldId !== undefined) updateData.field_id = String(body.fieldId);
  if (body.operator !== undefined) updateData.operator = String(body.operator);
  if (body.value !== undefined) updateData.value = body.value;
  if (body.sortOrder !== undefined) updateData.sort_order = Number(body.sortOrder);
  if (body.enabled !== undefined) updateData.enabled = body.enabled === true;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("screening_rules")
    .update(updateData)
    .eq("id", ruleId)
    .eq("form_id", formId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  return NextResponse.json({ data: dbRowToScreeningRule(data as Record<string, unknown>) });
}

// ── DELETE — delete a rule ──────────────────────────────
export async function DELETE(request: NextRequest, { params }: Params) {
  const { formId, ruleId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (!(await verifyAccess(formId, auth.userId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("screening_rules")
    .delete()
    .eq("id", ruleId)
    .eq("form_id", formId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
