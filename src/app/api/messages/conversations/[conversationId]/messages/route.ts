import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToMessage } from "@/lib/supabase/mappers";
import { UUID_RE, PROFILE_PUBLIC_COLS } from "@/lib/constants";

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message too long (max 5000 characters)"),
  type: z.enum(["text", "image", "file", "system"]).default("text"),
  attachments: z.array(z.record(z.string(), z.unknown())).optional(),
});

// =====================================================
// POST /api/messages/conversations/[conversationId]/messages
// Send a message in a conversation
// =====================================================

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid message data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, type, attachments } = parsed.data;

    // Insert the message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        type,
        attachments: attachments || null,
      })
      .select(
        `*, sender:profiles!messages_sender_id_fkey(${PROFILE_PUBLIC_COLS}), message_reactions(*)`
      )
      .single();

    if (msgError) {
      console.error("Failed to send message:", msgError.message);
      return NextResponse.json({ error: "Failed to send message" }, { status: 400 });
    }

    // Update conversation's last_message_at and last_message_preview
    const preview = content.length > 100 ? content.slice(0, 100) + "..." : content;
    await supabase
      .from("conversations")
      .update({
        last_message_at: message.created_at,
        last_message_preview: preview,
      })
      .eq("id", conversationId);

    // Increment unread_count for all other participants
    const { data: otherParticipants } = await supabase
      .from("conversation_participants")
      .select("id, unread_count")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id);

    if (otherParticipants) {
      for (const p of otherParticipants) {
        await supabase
          .from("conversation_participants")
          .update({ unread_count: ((p as Record<string, unknown>).unread_count as number || 0) + 1 })
          .eq("id", (p as Record<string, unknown>).id as string);
      }
    }

    return NextResponse.json({
      data: dbRowToMessage(message as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
