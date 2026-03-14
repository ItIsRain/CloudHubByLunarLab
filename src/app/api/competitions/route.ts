import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToCompetitionForm } from "@/lib/supabase/mappers";
import { writeAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";

// ── GET /api/competitions — list forms ──────────────────
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    // Public can browse published forms
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("competition_forms")
      .select("*")
      .in("status", ["published", "closed"])
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: (data || []).map((r) => dbRowToCompetitionForm(r as Record<string, unknown>)) });
  }

  const scopeErr = auth.type === "api_key" ? assertScope(auth, "/api/competitions") : null;
  if (scopeErr) return NextResponse.json({ error: scopeErr }, { status: 403 });

  // Authenticated: show user's own forms + published forms
  const supabase = auth.type === "api_key" ? getSupabaseAdminClient() : await getSupabaseServerClient();

  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "true";
  const status = url.searchParams.get("status");

  let query = supabase
    .from("competition_forms")
    .select("*, organizer:profiles!organizer_id(*)")
    .order("created_at", { ascending: false });

  if (mine) {
    query = query.eq("organizer_id", auth.userId);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: (data || []).map((r) => dbRowToCompetitionForm(r as Record<string, unknown>)),
  });
}

// ── POST /api/competitions — create form ────────────────
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const scopeErr = auth.type === "api_key" ? assertScope(auth, "/api/competitions") : null;
  if (scopeErr) return NextResponse.json({ error: scopeErr }, { status: 403 });

  // Verify organizer or admin role
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("roles")
    .eq("id", auth.userId)
    .single();

  const roles = (profile?.roles as string[]) || [];
  if (!roles.includes("organizer") && !roles.includes("admin")) {
    return NextResponse.json({ error: "Only organizers and admins can create competition forms" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const competitionName = String(body.competitionName || "").trim();

  if (!title || title.length > 300) {
    return NextResponse.json({ error: "Title is required (max 300 chars)" }, { status: 400 });
  }
  if (!competitionName || competitionName.length > 300) {
    return NextResponse.json({ error: "Competition name is required (max 300 chars)" }, { status: 400 });
  }

  // Generate unique slug
  let slug = slugify(title);
  const { data: existing } = await admin
    .from("competition_forms")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const validTypes = ["startup", "hackathon", "pitch", "innovation", "other"];
  const competitionType = validTypes.includes(body.competitionType as string)
    ? body.competitionType
    : "startup";

  const insertData = {
    organizer_id: auth.userId,
    title,
    slug,
    description: body.description ? String(body.description).slice(0, 5000) : null,
    cover_image: body.coverImage ? String(body.coverImage) : null,
    logo: body.logo ? String(body.logo) : null,
    competition_name: competitionName,
    competition_type: competitionType,
    fields: Array.isArray(body.fields) ? body.fields : [],
    sections: Array.isArray(body.sections) ? body.sections : [],
    status: "draft",
    opens_at: body.opensAt || null,
    closes_at: body.closesAt || null,
    max_applications: body.maxApplications ? Number(body.maxApplications) : null,
    allow_edit_after_submit: body.allowEditAfterSubmit === true,
    confirmation_email_template: body.confirmationEmailTemplate ? String(body.confirmationEmailTemplate) : null,
    primary_color: body.primaryColor ? String(body.primaryColor) : "#ff4400",
  };

  const { data, error } = await admin
    .from("competition_forms")
    .insert(insertData)
    .select("*, organizer:profiles!organizer_id(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void writeAuditLog({
    actorId: auth.userId,
    action: "create",
    entityType: "competition_form",
    entityId: data.id,
    newValues: { title, slug, competition_name: competitionName },
  });

  return NextResponse.json(
    { data: dbRowToCompetitionForm(data as Record<string, unknown>) },
    { status: 201 }
  );
}
