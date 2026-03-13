import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/constants";

// =====================================================
// POST /api/messages/conversations/[conversationId]/read
// Mark conversation as read for the current user
// =====================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    if (!UUID_RE.test(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation ID format" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Update unread_count to 0 and set last_read_at for the user's participant record
    const { data: updated, error: updateError } = await supabase
      .from("conversation_participants")
      .update({
        unread_count: 0,
        last_read_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Failed to mark as read:", updateError.message);
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 400 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
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
