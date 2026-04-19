import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canManage } from "@/lib/check-hackathon-access";

type RouteParams = { params: Promise<{ hackathonId: string }> };

// =====================================================
// GET — List all collaborators for a hackathon
// =====================================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify hackathon exists and user has access (any collaborator role can view)
    const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all collaborators with profile join
    const { data: collaborators, error } = await supabase
      .from("hackathon_collaborators")
      .select(
        "id, hackathon_id, user_id, role, invited_by, invited_at, accepted_at, user:profiles!user_id(id, name, email, avatar)"
      )
      .eq("hackathon_id", hackathonId)
      .order("invited_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch collaborators:", error);
      return NextResponse.json(
        { error: "Failed to fetch collaborators" },
        { status: 400 }
      );
    }

    const mapped = (collaborators ?? []).map((c) => ({
      id: c.id as string,
      hackathonId: c.hackathon_id as string,
      userId: c.user_id as string,
      role: c.role as string,
      invitedBy: c.invited_by as string | null,
      invitedAt: c.invited_at as string,
      acceptedAt: c.accepted_at as string | null,
      user: c.user ?? null,
    }));

    return NextResponse.json({ data: mapped });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST — Invite a collaborator by email
// =====================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Only the owner or admin collaborator can invite
    const postAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!postAccess.hasAccess || !canManage(postAccess.role)) {
      return NextResponse.json(
        { error: "Only the organizer or admin collaborators can invite" },
        { status: 403 }
      );
    }

    // Fetch organizer_id for validation below
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "editor", "viewer"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role must be one of: admin, editor, viewer" },
        { status: 400 }
      );
    }

    // Look up user by email in profiles
    const admin = getSupabaseAdminClient();
    const { data: targetUser } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found. They must have an account first." },
        { status: 404 }
      );
    }

    // Check if user is the organizer
    if (targetUser.id === hackathon.organizer_id) {
      return NextResponse.json(
        { error: "This user is already the organizer of this competition." },
        { status: 409 }
      );
    }

    // Check if user is already a collaborator
    const { data: existing } = await admin
      .from("hackathon_collaborators")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", targetUser.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This user is already a collaborator." },
        { status: 409 }
      );
    }

    // Insert new collaborator
    const { data: newCollab, error: insertError } = await admin
      .from("hackathon_collaborators")
      .insert({
        hackathon_id: hackathonId,
        user_id: targetUser.id,
        role,
        invited_by: auth.userId,
        invited_at: new Date().toISOString(),
      })
      .select(
        "id, hackathon_id, user_id, role, invited_by, invited_at, accepted_at, user:profiles!user_id(id, name, email, avatar)"
      )
      .single();

    if (insertError) {
      console.error("Failed to insert collaborator:", insertError);
      return NextResponse.json(
        { error: "Failed to invite collaborator" },
        { status: 400 }
      );
    }

    const mapped = {
      id: newCollab.id as string,
      hackathonId: newCollab.hackathon_id as string,
      userId: newCollab.user_id as string,
      role: newCollab.role as string,
      invitedBy: newCollab.invited_by as string | null,
      invitedAt: newCollab.invited_at as string,
      acceptedAt: newCollab.accepted_at as string | null,
      user: newCollab.user ?? null,
    };

    return NextResponse.json({ data: mapped }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH — Update a collaborator's role
// =====================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Only the owner or admin can change roles
    const patchAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!patchAccess.hasAccess || !canManage(patchAccess.role)) {
      return NextResponse.json(
        { error: "Only the organizer or admin collaborators can change roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { collaboratorId, role } = body as {
      collaboratorId?: string;
      role?: string;
    };

    if (!collaboratorId || !UUID_RE.test(collaboratorId)) {
      return NextResponse.json(
        { error: "Valid collaboratorId is required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "editor", "viewer"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role must be one of: admin, editor, viewer" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdminClient();
    const { data: updated, error: updateError } = await admin
      .from("hackathon_collaborators")
      .update({ role })
      .eq("id", collaboratorId)
      .eq("hackathon_id", hackathonId)
      .select(
        "id, hackathon_id, user_id, role, invited_by, invited_at, accepted_at, user:profiles!user_id(id, name, email, avatar)"
      )
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      );
    }

    const mapped = {
      id: updated.id as string,
      hackathonId: updated.hackathon_id as string,
      userId: updated.user_id as string,
      role: updated.role as string,
      invitedBy: updated.invited_by as string | null,
      invitedAt: updated.invited_at as string,
      acceptedAt: updated.accepted_at as string | null,
      user: updated.user ?? null,
    };

    return NextResponse.json({ data: mapped });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — Remove a collaborator
// =====================================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const url = new URL(request.url);
    const collaboratorId = url.searchParams.get("collaboratorId");

    if (!collaboratorId || !UUID_RE.test(collaboratorId)) {
      return NextResponse.json(
        { error: "Valid collaboratorId query param is required" },
        { status: 400 }
      );
    }

    // Check access via RBAC
    const delAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);

    const admin = getSupabaseAdminClient();
    const { data: collab } = await admin
      .from("hackathon_collaborators")
      .select("id, user_id")
      .eq("id", collaboratorId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (!collab) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      );
    }

    const isSelf = collab.user_id === auth.userId;
    const isManager = delAccess.hasAccess && canManage(delAccess.role);

    if (!isManager && !isSelf) {
      return NextResponse.json(
        { error: "Only the organizer or admin collaborators can remove collaborators, or you can remove yourself" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await admin
      .from("hackathon_collaborators")
      .delete()
      .eq("id", collaboratorId)
      .eq("hackathon_id", hackathonId);

    if (deleteError) {
      console.error("Failed to delete collaborator:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove collaborator" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
