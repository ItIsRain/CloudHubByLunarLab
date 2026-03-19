import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileToUser } from "@/lib/supabase/mappers";
import { writeAuditLog } from "@/lib/audit";

const VALID_STATUSES = ["active", "suspended", "banned"] as const;
type UserStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(value: unknown): value is UserStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as UserStatus)
  );
}

function isValidRolesArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((r) => typeof r === "string")
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
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
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    const callerRoles = (callerProfile?.roles as string[]) || [];
    if (!callerRoles.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { roles, status } = body as {
      roles?: unknown;
      status?: unknown;
    };

    // At least one field must be provided
    if (roles === undefined && status === undefined) {
      return NextResponse.json(
        { error: "At least one of 'roles' or 'status' must be provided" },
        { status: 400 }
      );
    }

    // Validate individual fields
    if (roles !== undefined && !isValidRolesArray(roles)) {
      return NextResponse.json(
        { error: "'roles' must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    const VALID_ROLES = ["admin", "organizer", "attendee", "judge", "mentor", "moderator"];
    if (roles !== undefined && isValidRolesArray(roles)) {
      const invalidRoles = (roles as string[]).filter((r) => !VALID_ROLES.includes(r));
      if (invalidRoles.length > 0) {
        return NextResponse.json(
          { error: `Invalid roles: ${invalidRoles.join(", ")}. Allowed roles: ${VALID_ROLES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if (status !== undefined && !isValidStatus(status)) {
      return NextResponse.json(
        {
          error: `'status' must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdminClient();

    // Fetch current profile for audit log (old values)
    const { data: currentProfile, error: fetchError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !currentProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build update payload (immutable - create new object)
    const updates: Record<string, unknown> = {};
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (roles !== undefined) {
      oldValues.roles = currentProfile.roles;
      newValues.roles = roles;
      updates.roles = roles;
    }

    if (status !== undefined) {
      oldValues.status = currentProfile.status;
      newValues.status = status;
      updates.status = status;
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("*")
      .single();

    if (updateError) {
      console.error("[admin/users PATCH] Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    // If status changed, update auth user accordingly
    if (status !== undefined) {
      const previousStatus = currentProfile.status as string;
      if (status !== previousStatus) {
        try {
          if (status === "banned") {
            // Ban the auth user (prevents sign-in)
            await admin.auth.admin.updateUserById(userId, { ban_duration: "876600h" });
          } else if (status === "suspended") {
            // Suspend: ban with shorter duration (effectively disabled until admin reactivates)
            await admin.auth.admin.updateUserById(userId, { ban_duration: "876600h" });
          } else if (status === "active") {
            // Reactivate: remove ban by setting ban_duration to "none"
            await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
          }
        } catch (authUpdateErr) {
          // Log but don't fail - the profile was already updated
          console.error(
            "[admin/users PATCH] Auth user update error:",
            authUpdateErr
          );
        }
      }
    }

    // Write audit log
    await writeAuditLog(
      {
        actorId: user.id,
        action: "admin.user.update",
        entityType: "user",
        entityId: userId,
        oldValues,
        newValues,
        status: "success",
      },
      request
    );

    const updatedUser = profileToUser(
      updatedProfile as Record<string, unknown>
    );

    return NextResponse.json({ data: updatedUser });
  } catch (err) {
    console.error("[admin/users PATCH] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
