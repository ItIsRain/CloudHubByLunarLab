import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/constants";
import { writeAuditLog } from "@/lib/audit";

const SPONSOR_COLS =
  "id,name,slug,logo,website,description,tier,contact_email,contact_name,status,created_by,created_at,updated_at";

function dbRowToSponsor(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    logo: row.logo as string,
    website: row.website as string | undefined,
    description: row.description as string | undefined,
    tier: row.tier as string,
    contactEmail: row.contact_email as string | undefined,
    contactName: row.contact_name as string | undefined,
    status: row.status as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sponsorId: string }> }
) {
  try {
    const { sponsorId } = await params;
    const supabase = await getSupabaseServerClient();

    const isUuid = UUID_RE.test(sponsorId);
    let query = supabase.from("sponsors").select(SPONSOR_COLS);
    query = isUuid ? query.eq("id", sponsorId) : query.eq("slug", sponsorId);

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
    }

    return NextResponse.json({ sponsor: dbRowToSponsor(data as Record<string, unknown>) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Free-form tier (see POST /api/sponsors for rationale); normalized to
// lowercase trimmed form on write.
const tierSchema = z
  .string()
  .min(1)
  .max(40)
  .transform((v) => v.trim().toLowerCase().replace(/\s+/g, " "))
  .refine((v) => v.length > 0, "Tier is required");

const updateSponsorSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  logo: z.string().url().max(2048).optional(),
  website: z.string().url().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  tier: tierSchema.optional(),
  contactEmail: z.string().email().max(255).nullable().optional(),
  contactName: z.string().max(100).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sponsorId: string }> }
) {
  try {
    const { sponsorId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!UUID_RE.test(sponsorId)) {
      return NextResponse.json({ error: "Invalid sponsor ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSponsorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    const { name, logo, website, description, tier, contactEmail, contactName, status } = parsed.data;
    if (name !== undefined) updates.name = name;
    if (logo !== undefined) updates.logo = logo;
    if (website !== undefined) updates.website = website;
    if (description !== undefined) updates.description = description;
    if (tier !== undefined) updates.tier = tier;
    if (contactEmail !== undefined) updates.contact_email = contactEmail;
    if (contactName !== undefined) updates.contact_name = contactName;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: sponsor, error } = await supabase
      .from("sponsors")
      .update(updates)
      .eq("id", sponsorId)
      .select(SPONSOR_COLS)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Sponsor not found or unauthorized" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to update sponsor" }, { status: 500 });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "update",
      entityType: "sponsor",
      entityId: sponsorId,
      newValues: parsed.data,
    }, request);

    return NextResponse.json({ sponsor: dbRowToSponsor(sponsor as Record<string, unknown>) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sponsorId: string }> }
) {
  try {
    const { sponsorId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!UUID_RE.test(sponsorId)) {
      return NextResponse.json({ error: "Invalid sponsor ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("sponsors")
      .delete()
      .eq("id", sponsorId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete sponsor" }, { status: 500 });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "delete",
      entityType: "sponsor",
      entityId: sponsorId,
    }, request);

    return NextResponse.json({ message: "Sponsor deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
