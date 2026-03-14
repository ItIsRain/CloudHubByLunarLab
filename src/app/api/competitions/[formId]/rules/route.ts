import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToScreeningRule } from "@/lib/supabase/mappers";

interface Params {
  params: Promise<{ formId: string }>;
}

// ── GET — list rules for a form ─────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  // Verify access
  const { data: form } = await admin
    .from("competition_forms")
    .select("organizer_id")
    .eq("id", formId)
    .single();

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  let authorized = form.organizer_id === auth.userId;
  if (!authorized) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    authorized = ((profile?.roles as string[]) || []).includes("admin");
  }
  if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { data, error } = await admin
    .from("screening_rules")
    .select("*")
    .eq("form_id", formId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: (data || []).map((r) => dbRowToScreeningRule(r as Record<string, unknown>)),
  });
}

// ── POST — create a rule ────────────────────────────────
export async function POST(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const { data: form } = await admin
    .from("competition_forms")
    .select("organizer_id")
    .eq("id", formId)
    .single();

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  let authorized = form.organizer_id === auth.userId;
  if (!authorized) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    authorized = ((profile?.roles as string[]) || []).includes("admin");
  }
  if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Rule name is required" }, { status: 400 });

  const ruleType = body.ruleType === "soft" ? "soft" : "hard";
  const fieldId = String(body.fieldId || "").trim();
  if (!fieldId) return NextResponse.json({ error: "Field ID is required" }, { status: 400 });

  const validOperators = [
    "equals", "not_equals", "contains", "not_contains",
    "greater_than", "less_than", "greater_equal", "less_equal",
    "in", "not_in", "is_empty", "is_not_empty", "is_true", "is_false",
  ];
  const operator = String(body.operator || "");
  if (!validOperators.includes(operator)) {
    return NextResponse.json({ error: `Invalid operator. Valid: ${validOperators.join(", ")}` }, { status: 400 });
  }

  // Get next sort order
  const { data: lastRule } = await admin
    .from("screening_rules")
    .select("sort_order")
    .eq("form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : ((lastRule?.sort_order || 0) + 1);

  const { data, error } = await admin
    .from("screening_rules")
    .insert({
      form_id: formId,
      name,
      description: body.description ? String(body.description) : null,
      rule_type: ruleType,
      field_id: fieldId,
      operator,
      value: body.value !== undefined ? body.value : null,
      sort_order: sortOrder,
      enabled: body.enabled !== false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { data: dbRowToScreeningRule(data as Record<string, unknown>) },
    { status: 201 }
  );
}
