import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToCampusQuota } from "@/lib/supabase/mappers";
import { UUID_RE } from "@/lib/constants";

interface Params {
  params: Promise<{ formId: string }>;
}

// ── GET — list quotas ───────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const { formId } = await params;

  if (!UUID_RE.test(formId)) {
    return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
  }

  // CRIT-03 fix: require authentication before using admin client
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("campus_quotas")
    .select("id, form_id, campus, quota, filled, created_at, updated_at")
    .eq("form_id", formId);

  if (error) return NextResponse.json({ error: "Failed to fetch quotas" }, { status: 500 });

  return NextResponse.json({
    data: (data || []).map((r) => dbRowToCampusQuota(r as Record<string, unknown>)),
  });
}

// ── POST — set/update quotas (upserts all at once) ──────
export async function POST(request: NextRequest, { params }: Params) {
  const { formId } = await params;

  if (!UUID_RE.test(formId)) {
    return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
  }

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Expect { quotas: [{ campus: "Abu Dhabi", quota: 75 }, ...] }
  const quotas = body.quotas;
  if (!Array.isArray(quotas)) {
    return NextResponse.json({ error: "quotas must be an array of { campus, quota }" }, { status: 400 });
  }

  // Validate
  for (const q of quotas) {
    if (!q.campus || typeof q.campus !== "string") {
      return NextResponse.json({ error: "Each quota must have a campus name" }, { status: 400 });
    }
    if (!q.quota || typeof q.quota !== "number" || q.quota < 1) {
      return NextResponse.json({ error: "Each quota must have a positive number" }, { status: 400 });
    }
  }

  // Delete existing and re-insert
  await admin.from("campus_quotas").delete().eq("form_id", formId);

  const rows = quotas.map((q: { campus: string; quota: number }) => ({
    form_id: formId,
    campus: q.campus,
    quota: q.quota,
  }));

  const { data, error } = await admin
    .from("campus_quotas")
    .insert(rows)
    .select("*");

  if (error) return NextResponse.json({ error: "Failed to save quotas" }, { status: 500 });

  return NextResponse.json({
    data: (data || []).map((r) => dbRowToCampusQuota(r as Record<string, unknown>)),
  });
}
