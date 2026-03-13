import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToConversation, dbRowToMessage } from "@/lib/supabase/mappers";
import { UUID_RE, PROFILE_PUBLIC_COLS } from "@/lib/constants";

// =====================================================
// GET /api/messages/conversations/[conversationId]
// Get a single conversation with recent messages
// =====================================================

export async function GET(
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

    // Verify user is a participant
    const { data: participant, error: partError } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (partError) {
      console.error("Failed to verify participant:", partError.message);
      return NextResponse.json({ error: "Failed to verify access" }, { status: 400 });
    }

    if (!participant) {
      return NextResponse.json({ error: "Not a participant of this conversation" }, { status: 403 });
    }

    // Fetch conversation with participants
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(
        `*, conversation_participants(*, user:profiles!conversation_participants_user_id_fkey(${PROFILE_PUBLIC_COLS}))`
      )
      .eq("id", conversationId)
      .single();

    if (convError) {
      console.error("Failed to fetch conversation:", convError.message);
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Fetch last 50 messages with sender profiles
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select(
        `*, sender:profiles!messages_sender_id_fkey(${PROFILE_PUBLIC_COLS}), message_reactions(*)`
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (msgError) {
      console.error("Failed to fetch messages:", msgError.message);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 400 });
    }

    const mappedConversation = dbRowToConversation(
      conversation as Record<string, unknown>,
      user.id
    );
    const mappedMessages = (messages || []).map((row: Record<string, unknown>) =>
      dbRowToMessage(row)
    );

    return NextResponse.json({
      data: {
        conversation: mappedConversation,
        messages: mappedMessages,
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
