import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

/**
 * DELETE — remove an availability block. The mentor (owner) or organizer can
 * delete it, but only if no pending/confirmed session is held inside the block.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string; blockId: string }> }
) {
  try {
    const { hackathonId, blockId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(blockId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();

    const { data: blockRow } = await admin
      .from("mentor_availability_blocks")
      .select("id, hackathon_id, mentor_user_id")
      .eq("id", blockId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!blockRow) {
      return NextResponse.json({ error: "Availability block not found" }, { status: 404 });
    }

    const isOwner = blockRow.mentor_user_id === auth.userId;
    let isOrganizer = false;
    if (!isOwner) {
      const { data: hackathon } = await admin
        .from("hackathons")
        .select("organizer_id")
        .eq("id", hackathonId)
        .single();
      isOrganizer = hackathon?.organizer_id === auth.userId;
    }
    if (!isOwner && !isOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Block any delete that would strand a held booking — authoritative check
    // by the booking's source block (availability_block_id), not reconstructed
    // slot instants.
    const { count: heldCount } = await admin
      .from("mentor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("availability_block_id", blockId)
      .in("status", ["pending", "confirmed"]);

    if ((heldCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "This block has active bookings. Cancel them before removing it." },
        { status: 409 }
      );
    }

    const { error } = await admin
      .from("mentor_availability_blocks")
      .delete()
      .eq("id", blockId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete availability" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
