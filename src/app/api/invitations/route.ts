import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToEntityInvitation } from "@/lib/supabase/mappers";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";

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

    const { entityType, entityId, email, name } = await request.json();

    if (!entityType || !entityId || !email || !name) {
      return NextResponse.json(
        { error: "entityType, entityId, email, and name are required" },
        { status: 400 }
      );
    }

    if (!["event", "hackathon"].includes(entityType)) {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Verify caller is organizer and entity is private
    let organizerId: string | null = null;
    let entityVisibility: string | null = null;
    let entityName = "Event";

    if (entityType === "event") {
      const { data: entity } = await supabase
        .from("events")
        .select("organizer_id, visibility, title")
        .eq("id", entityId)
        .single();
      if (!entity) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
      organizerId = entity.organizer_id;
      entityVisibility = entity.visibility;
      entityName = entity.title || "Event";
    } else {
      const { data: entity } = await supabase
        .from("hackathons")
        .select("organizer_id, visibility, name")
        .eq("id", entityId)
        .single();
      if (!entity) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
      organizerId = entity.organizer_id;
      entityVisibility = entity.visibility;
      entityName = entity.name || "Hackathon";
    }

    if (organizerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (entityVisibility !== "private") {
      return NextResponse.json(
        { error: "Invitations can only be sent for private events/hackathons" },
        { status: 400 }
      );
    }

    // Upsert invitation — regenerate token on re-invite
    const { data: invitation, error: insertError } = await supabase
      .from("entity_invitations")
      .upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          email: email.toLowerCase().trim(),
          name,
          token: crypto.randomUUID(),
          status: "pending",
          invited_by: user.id,
        },
        { onConflict: "entity_type,entity_id,email" }
      )
      .select("token")
      .single();

    if (insertError || !invitation) {
      return NextResponse.json(
        { error: insertError?.message || "Failed to create invitation" },
        { status: 500 }
      );
    }

    const token = invitation.token as string;
    const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/invite/accept?token=${token}`;

    await sendEmail({
      to: email,
      subject: `You're Invited to ${entityName}`,
      html: emailWrapper(`
        <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">
          You're Invited!
        </h1>
        <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
          Hi <strong style="color:#fff;">${escapeHtml(name)}</strong>,
        </p>
        <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
          You've been invited to join
          <strong style="color:#e8440a;">${escapeHtml(entityName)}</strong>.
          Click the button below to accept your invitation.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${acceptUrl}"
             style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#e8440a,#d946a8);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
            Accept Invitation
          </a>
        </div>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          Click the button above or copy this link into your browser:<br/>
          <a href="${acceptUrl}" style="color:#e8440a;text-decoration:underline;word-break:break-all;">${acceptUrl}</a>
        </p>
      `),
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    // Verify caller is organizer
    const table = entityType === "event" ? "events" : "hackathons";
    const { data: entity } = await supabase
      .from(table)
      .select("organizer_id")
      .eq("id", entityId)
      .single();

    if (!entity || entity.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("entity_invitations")
      .select("id, entity_type, entity_id, email, name, status, invited_by, accepted_by, created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const invitations = (data || []).map((row: Record<string, unknown>) =>
      dbRowToEntityInvitation(row)
    );

    return NextResponse.json({ data: invitations });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "invitationId is required" },
        { status: 400 }
      );
    }

    // Look up invitation to verify organizer ownership
    const { data: invitation } = await supabase
      .from("entity_invitations")
      .select("entity_type, entity_id")
      .eq("id", invitationId)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const table = invitation.entity_type === "event" ? "events" : "hackathons";
    const { data: entity } = await supabase
      .from(table)
      .select("organizer_id")
      .eq("id", invitation.entity_id)
      .single();

    if (!entity || entity.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("entity_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Invitation revoked" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
