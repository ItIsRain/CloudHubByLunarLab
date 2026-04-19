import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await getSupabaseServerClient();

    const tier = searchParams.get("tier");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));

    let query = supabase
      .from("sponsors")
      .select(SPONSOR_COLS, { count: "exact" });

    if (tier) {
      query = query.eq("tier", tier);
    }
    if (search) {
      const safe = search.replace(/[%_,.()\\]/g, (c) => `\\${c}`);
      query = query.ilike("name", `%${safe}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("tier", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch sponsors" }, { status: 500 });
    }

    const total = count ?? 0;
    return NextResponse.json({
      data: (data || []).map((r) => dbRowToSponsor(r as Record<string, unknown>)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: from + pageSize < total,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Tier is free-form (e.g. "platinum", "gold", "title sponsor") — stored
// lowercased for stable grouping/filtering. Callers choose a preset or supply
// their own custom label.
const tierSchema = z
  .string()
  .min(1)
  .max(40)
  .transform((v) => v.trim().toLowerCase().replace(/\s+/g, " "))
  .refine((v) => v.length > 0, "Tier is required");

const createSponsorSchema = z.object({
  name: z.string().min(1).max(150),
  logo: z.string().url().max(2048),
  website: z.string().url().max(500).optional(),
  description: z.string().max(2000).optional(),
  tier: tierSchema.default("bronze"),
  contactEmail: z.string().email().max(255).optional(),
  contactName: z.string().max(100).optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSponsorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid sponsor data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, logo, website, description, tier, contactEmail, contactName } = parsed.data;
    const slug = slugify(name);

    const { data: sponsor, error } = await supabase
      .from("sponsors")
      .insert({
        name,
        slug,
        logo,
        website: website ?? null,
        description: description ?? null,
        tier,
        contact_email: contactEmail ?? null,
        contact_name: contactName ?? null,
        created_by: user.id,
      })
      .select(SPONSOR_COLS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A sponsor with this name already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create sponsor" }, { status: 500 });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "create",
      entityType: "sponsor",
      entityId: sponsor.id as string,
      newValues: parsed.data,
    }, request);

    return NextResponse.json(
      { sponsor: dbRowToSponsor(sponsor as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
