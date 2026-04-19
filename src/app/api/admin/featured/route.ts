import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { verifyAdmin } from "@/lib/verify-admin";

const VALID_ENTITY_TYPES = ["event", "hackathon"] as const;
type EntityType = (typeof VALID_ENTITY_TYPES)[number];

const TABLE_MAP: Record<EntityType, string> = {
  event: "events",
  hackathon: "hackathons",
};

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    // Parse and validate body
    const body = await request.json();
    const { entityType, entityId, featured } = body as {
      entityType: unknown;
      entityId: unknown;
      featured: unknown;
    };

    if (
      typeof entityType !== "string" ||
      !VALID_ENTITY_TYPES.includes(entityType as EntityType)
    ) {
      return NextResponse.json(
        { error: "entityType must be \"event\" or \"competition\"" },
        { status: 400 }
      );
    }

    if (typeof entityId !== "string" || entityId.trim().length === 0) {
      return NextResponse.json(
        { error: "entityId is required" },
        { status: 400 }
      );
    }

    // Validate UUID format to prevent filter-injection / IDOR
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(entityId as string)) {
      return NextResponse.json(
        { error: "entityId must be a valid UUID" },
        { status: 400 }
      );
    }

    if (typeof featured !== "boolean") {
      return NextResponse.json(
        { error: "featured must be a boolean" },
        { status: 400 }
      );
    }

    const validEntityType = entityType as EntityType;
    const table = TABLE_MAP[validEntityType];

    // Use admin client to bypass RLS
    const admin = getSupabaseAdminClient();

    const { data: updated, error: updateError } = await admin
      .from(table)
      .update({ is_featured: featured })
      .eq("id", entityId)
      .select("id, is_featured")
      .single();

    if (updateError) {
      console.error(`Failed to update ${table}.is_featured:`, updateError.message);
      return NextResponse.json(
        { error: `Failed to update ${validEntityType}` },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: `${validEntityType} not found` },
        { status: 404 }
      );
    }

    // Write audit log (best-effort)
    await writeAuditLog(
      {
        actorId: adminCheck.userId,
        action: featured ? "feature" : "unfeature",
        entityType: validEntityType,
        entityId,
        oldValues: { is_featured: !featured },
        newValues: { is_featured: featured },
        status: "success",
      },
      request
    );

    return NextResponse.json({
      success: true,
      entityType: validEntityType,
      entityId,
      featured,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
