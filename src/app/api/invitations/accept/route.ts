import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      data: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        status: invitation.status,
        entityType: invitation.entity_type,
        entityId: invitation.entity_id,
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

    // Verify email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address. Please sign in with the correct account." },
        { status: 403 }
      );
    }

    // Accept invitation
    const { error: updateError } = await supabase
      .from("entity_invitations")
      .update({ status: "accepted", accepted_by: user.id })
      .eq("id", invitation.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
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
