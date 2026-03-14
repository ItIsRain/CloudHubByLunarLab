import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToCompetitionForm } from "@/lib/supabase/mappers";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ formId: string }>;
}

// ── GET /api/competitions/[formId] — get form detail ────
export async function GET(request: NextRequest, { params }: Params) {
  const { formId } = await params;

  // Try public access first (published forms)
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("competition_forms")
    .select("*, organizer:profiles!organizer_id(*)")
    .eq("id", formId)
    .single();

  if (error || !data) {
    // Try by slug
    const { data: bySlug, error: slugErr } = await admin
      .from("competition_forms")
      .select("*, organizer:profiles!organizer_id(*)")
      .eq("slug", formId)
      .single();

    if (slugErr || !bySlug) {
      return NextResponse.json({ error: "Competition form not found" }, { status: 404 });
    }

    // Check access
    const auth = await authenticateRequest(request);
    if (bySlug.status !== "published" && bySlug.status !== "closed") {
      if (auth.type === "unauthenticated" || auth.userId !== bySlug.organizer_id) {
        return NextResponse.json({ error: "Competition form not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ data: dbRowToCompetitionForm(bySlug as Record<string, unknown>) });
  }

  // Check access for non-published forms
  if (data.status !== "published" && data.status !== "closed") {
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated" || auth.userId !== data.organizer_id) {
      return NextResponse.json({ error: "Competition form not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ data: dbRowToCompetitionForm(data as Record<string, unknown>) });
}

// ── PATCH /api/competitions/[formId] — update form ──────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const scopeErr = auth.type === "api_key" ? assertScope(auth, "/api/competitions") : null;
  if (scopeErr) return NextResponse.json({ error: scopeErr }, { status: 403 });

  const admin = getSupabaseAdminClient();

  // Verify ownership
  const { data: existing } = await admin
    .from("competition_forms")
    .select("id, organizer_id, status")
    .eq("id", formId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  // Check admin role for non-owners
  if (existing.organizer_id !== auth.userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    if (!((profile?.roles as string[]) || []).includes("admin")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  const allowedFields: Record<string, string> = {
    title: "title",
    description: "description",
    coverImage: "cover_image",
    logo: "logo",
    competitionName: "competition_name",
    competitionType: "competition_type",
    fields: "fields",
    sections: "sections",
    status: "status",
    opensAt: "opens_at",
    closesAt: "closes_at",
    maxApplications: "max_applications",
    allowEditAfterSubmit: "allow_edit_after_submit",
    confirmationEmailTemplate: "confirmation_email_template",
    primaryColor: "primary_color",
  };

  for (const [key, dbCol] of Object.entries(allowedFields)) {
    if (key in body) {
      updateData[dbCol] = body[key];
    }
  }

  // Validate status transitions
  if (updateData.status) {
    const validStatuses = ["draft", "published", "closed", "archived"];
    if (!validStatuses.includes(updateData.status as string)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("competition_forms")
    .update(updateData)
    .eq("id", formId)
    .select("*, organizer:profiles!organizer_id(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void writeAuditLog({
    actorId: auth.userId,
    action: "update",
    entityType: "competition_form",
    entityId: formId,
    newValues: updateData,
  });

  return NextResponse.json({ data: dbRowToCompetitionForm(data as Record<string, unknown>) });
}

// ── DELETE /api/competitions/[formId] — delete form ─────
export async function DELETE(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin
    .from("competition_forms")
    .select("id, organizer_id")
    .eq("id", formId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  if (existing.organizer_id !== auth.userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    if (!((profile?.roles as string[]) || []).includes("admin")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  const { error } = await admin
    .from("competition_forms")
    .delete()
    .eq("id", formId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void writeAuditLog({
    actorId: auth.userId,
    action: "delete",
    entityType: "competition_form",
    entityId: formId,
  });

  return NextResponse.json({ success: true });
}
