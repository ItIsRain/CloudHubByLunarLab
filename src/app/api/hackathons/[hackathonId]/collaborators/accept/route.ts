import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/constants";

type RouteParams = { params: Promise<{ hackathonId: string }> };

/**
 * GET — Look up invitation details by token (read-only, no side effects).
 * Used by the /co-organizer/accept page to render the invitation summary
 * before the user clicks Accept.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: invitation, error } = await admin
      .from("hackathon_collaborators")
      .select(
        "id, role, accepted_at, user_id, hackathon_id, inviter:profiles!invited_by(name)"
      )
      .eq("hackathon_id", hackathonId)
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    const { data: hackathon } = await admin
      .from("hackathons")
      .select("name, slug")
      .eq("id", hackathonId)
      .single();

    const inviter = invitation.inviter as { name?: string } | null;

    return NextResponse.json({
      data: {
        id: invitation.id,
        role: invitation.role,
        alreadyAccepted: !!invitation.accepted_at,
        hackathonId: invitation.hackathon_id,
        hackathonName: hackathon?.name || "Unknown Competition",
        hackathonSlug: hackathon?.slug || null,
        inviterName: inviter?.name || null,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST — Accept the invitation. Validates that the current user matches
 * the user_id stored on the collaborator row, then sets accepted_at = now.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const { token } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    const { data: invitation, error: invErr } = await admin
      .from("hackathon_collaborators")
      .select("id, user_id, accepted_at, role")
      .eq("hackathon_id", hackathonId)
      .eq("token", token)
      .single();

    if (invErr || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // The invitation was issued to a specific user_id (looked up by email at
    // invite time). Require the accepting user to match — prevents anyone with
    // the link from claiming the role.
    if (invitation.user_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "This invitation was issued to a different account. Sign in with the email the invite was sent to.",
        },
        { status: 403 }
      );
    }

    if (invitation.accepted_at) {
      // Idempotent: already accepted is fine, just succeed.
      return NextResponse.json({
        data: { alreadyAccepted: true, role: invitation.role, hackathonId },
      });
    }

    const { error: updateErr } = await admin
      .from("hackathon_collaborators")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateErr) {
      console.error("Failed to mark collaborator accepted:", updateErr);
      return NextResponse.json(
        { error: "Failed to accept invitation" },
        { status: 500 }
      );
    }

    // Notify the inviter (best-effort)
    const { data: collabRow } = await admin
      .from("hackathon_collaborators")
      .select("invited_by")
      .eq("id", invitation.id)
      .single();
    const { data: hackForNotif } = await admin
      .from("hackathons")
      .select("name")
      .eq("id", hackathonId)
      .single();
    const { data: acceptingProfile } = await admin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    if (collabRow?.invited_by) {
      admin
        .from("notifications")
        .insert({
          user_id: collabRow.invited_by as string,
          type: "hackathon-update",
          title: `${acceptingProfile?.name || "Your invitee"} accepted the co-organizer invitation`,
          message: `They can now help administrate ${hackForNotif?.name || "this competition"} as a ${invitation.role}.`,
          link: `/dashboard/hackathons/${hackathonId}?tab=co-organizers`,
        })
        .then(() => {}, () => {});
    }

    return NextResponse.json({
      data: { accepted: true, role: invitation.role, hackathonId },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
