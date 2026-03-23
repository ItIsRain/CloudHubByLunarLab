import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limit token lookups to prevent brute-force enumeration
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, { namespace: "invitation-accept", limit: 20, windowMs: 15 * 60 * 1000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const supabase = await getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const { data: invitation, error } = await supabase
      .from("entity_invitations")
      .select("id, email, name, status, entity_type, entity_id")
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    // Fetch entity name
    let entityName = "Unknown";
    let entitySlug = "";

    if (invitation.entity_type === "event") {
      const { data: entity } = await supabase
        .from("events")
        .select("title, slug")
        .eq("id", invitation.entity_id)
        .single();
      entityName = entity?.title || "Unknown";
      entitySlug = entity?.slug || "";
    } else {
      const { data: entity } = await supabase
        .from("hackathons")
        .select("name, slug")
        .eq("id", invitation.entity_id)
        .single();
      entityName = entity?.name || "Unknown";
      entitySlug = entity?.slug || "";
    }

    // Only return minimal info needed for the accept page — do NOT expose
    // the invitee's email/name to unauthenticated callers (prevents enumeration)
    return NextResponse.json({
      data: {
        id: invitation.id,
        status: invitation.status,
        entityType: invitation.entity_type,
        entityName,
        entitySlug,
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const { data: invitation, error: fetchError } = await supabase
      .from("entity_invitations")
      .select("id, email, entity_type, entity_id, status")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    // Fetch entity slug once — needed for both already-accepted and fresh-accept paths
    const table = invitation.entity_type === "event" ? "events" : "hackathons";
    const { data: entity } = await supabase
      .from(table)
      .select("slug")
      .eq("id", invitation.entity_id)
      .single();
    const entitySlug = entity?.slug || "";

    if (invitation.status === "accepted") {
      return NextResponse.json({
        data: {
          entityType: invitation.entity_type,
          entitySlug,
          alreadyAccepted: true,
        },
      });
    }

    // Verify email matches (explicit null check to prevent bypass)
    if (!user.email || !invitation.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address. Please sign in with the correct account." },
        { status: 403 }
      );
    }

    // Accept invitation atomically (only if still pending — prevents race condition)
    const { data: updatedInv, error: updateError } = await supabase
      .from("entity_invitations")
      .update({ status: "accepted", accepted_by: user.id })
      .eq("id", invitation.id)
      .eq("status", "pending")
      .select("id")
      .single();

    if (updateError || !updatedInv) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      data: {
        entityType: invitation.entity_type,
        entitySlug,
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
