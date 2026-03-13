import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

const VALID_ENTITY_TYPES = ["event", "hackathon"] as const;
type EntityType = (typeof VALID_ENTITY_TYPES)[number];

const VALID_ACTIONS = ["approve", "reject", "cancel"] as const;
type ModerationAction = (typeof VALID_ACTIONS)[number];

const TABLE_MAP: Record<EntityType, string> = {
  event: "events",
  hackathon: "hackathons",
};

const STATUS_MAP: Record<EntityType, Record<ModerationAction, string>> = {
  event: {
    approve: "published",
    reject: "cancelled",
    cancel: "cancelled",
  },
  hackathon: {
    approve: "registration-open",
    reject: "draft",
    cancel: "draft",
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    const roles = (profile?.roles as string[]) || [];
    if (!roles.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const { entityType, entityId, action } = body as {
      entityType: unknown;
      entityId: unknown;
      action: unknown;
    };

    if (
      typeof entityType !== "string" ||
      !VALID_ENTITY_TYPES.includes(entityType as EntityType)
    ) {
      return NextResponse.json(
        { error: 'entityType must be "event" or "hackathon"' },
        { status: 400 }
      );
    }

    if (typeof entityId !== "string" || entityId.trim().length === 0) {
      return NextResponse.json(
        { error: "entityId is required" },
        { status: 400 }
      );
    }

    if (
      typeof action !== "string" ||
      !VALID_ACTIONS.includes(action as ModerationAction)
    ) {
      return NextResponse.json(
        { error: 'action must be "approve", "reject", or "cancel"' },
        { status: 400 }
      );
    }

    const validEntityType = entityType as EntityType;
    const validAction = action as ModerationAction;
    const table = TABLE_MAP[validEntityType];
    const newStatus = STATUS_MAP[validEntityType][validAction];

    // Use admin client to bypass RLS / ownership checks
    const admin = getSupabaseAdminClient();

    // Fetch current status for audit log
    const { data: existing } = await admin
      .from(table)
      .select("status")
      .eq("id", entityId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: `${validEntityType} not found` },
        { status: 404 }
      );
    }

    const oldStatus = existing.status as string;

    const { data: updated, error: updateError } = await admin
      .from(table)
      .update({ status: newStatus })
      .eq("id", entityId)
      .select("id, status")
      .single();

    if (updateError) {
      console.error(
        `Failed to update ${table}.status:`,
        updateError.message
      );
      return NextResponse.json(
        { error: `Failed to update ${validEntityType}` },
        { status: 500 }
      );
    }

    // Write audit log (best-effort)
    await writeAuditLog(
      {
        actorId: user.id,
        action: validAction,
        entityType: validEntityType,
        entityId,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus },
        status: "success",
      },
      request
    );

    return NextResponse.json({
      success: true,
      entityType: validEntityType,
      entityId,
      action: validAction,
      newStatus: updated?.status ?? newStatus,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
