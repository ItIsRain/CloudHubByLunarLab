import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToMessage } from "@/lib/supabase/mappers";
import { UUID_RE, PROFILE_PUBLIC_COLS } from "@/lib/constants";

const editMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message too long (max 5000 characters)"),
});

// =====================================================
// PATCH /api/messages/conversations/[conversationId]/messages/[messageId]
// Edit a message (only the sender can edit)
// =====================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const { conversationId, messageId } = await params;

    if (!UUID_RE.test(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation ID format" }, { status: 400 });
    }

    if (!UUID_RE.test(messageId)) {
      return NextResponse.json({ error: "Invalid message ID format" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user is a participant of the conversation
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

    // Verify the message exists and belongs to this user
    const { data: existingMessage, error: msgFetchError } = await supabase
      .from("messages")
      .select("id, sender_id, conversation_id")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (msgFetchError) {
      console.error("Failed to fetch message:", msgFetchError.message);
      return NextResponse.json({ error: "Failed to fetch message" }, { status: 400 });
    }

    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if ((existingMessage as Record<string, unknown>).sender_id !== user.id) {
      return NextResponse.json({ error: "Only the sender can edit a message" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = editMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid message data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content } = parsed.data;

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from("messages")
      .update({
        content,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select(
        `*, sender:profiles!messages_sender_id_fkey(${PROFILE_PUBLIC_COLS}), message_reactions(*)`
      )
      .single();

    if (updateError) {
      console.error("Failed to update message:", updateError.message);
      return NextResponse.json({ error: "Failed to update message" }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToMessage(updatedMessage as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
