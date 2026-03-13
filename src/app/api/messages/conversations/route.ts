import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToConversation } from "@/lib/supabase/mappers";
import { UUID_RE, PROFILE_PUBLIC_COLS } from "@/lib/constants";

// =====================================================
// GET /api/messages/conversations — List user's conversations
// =====================================================

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get conversation IDs where user is a participant
    const { data: participantRows, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (partError) {
      console.error("Failed to fetch participant rows:", partError.message);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 400 });
    }

    const conversationIds = (participantRows || []).map(
      (r: Record<string, unknown>) => r.conversation_id as string
    );

    if (conversationIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch conversations with participants and their profiles
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `*, conversation_participants(*, user:profiles!conversation_participants_user_id_fkey(${PROFILE_PUBLIC_COLS}))`
      )
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Failed to fetch conversations:", error.message);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 400 });
    }

    const conversations = (data || []).map((row: Record<string, unknown>) =>
      dbRowToConversation(row, user.id)
    );

    return NextResponse.json({ data: conversations });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/messages/conversations — Create a new conversation
// =====================================================

const createConversationSchema = z.object({
  type: z.enum(["direct", "group", "team"]).default("direct"),
  name: z.string().min(1).max(100).optional(),
  participantIds: z.array(z.string().regex(UUID_RE, "Invalid user ID format")).min(1).max(50),
  hackathonId: z.string().regex(UUID_RE).optional(),
  teamId: z.string().regex(UUID_RE).optional(),
});

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

    const body = await request.json();
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, name, participantIds, hackathonId, teamId } = parsed.data;

    // Ensure current user is not in the participant list (they are added automatically)
    const otherIds = participantIds.filter((id) => id !== user.id);

    if (otherIds.length === 0) {
      return NextResponse.json(
        { error: "At least one other participant is required" },
        { status: 400 }
      );
    }

    // Validate all participant IDs exist in profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .in("id", otherIds);

    if (profilesError) {
      console.error("Failed to validate participants:", profilesError.message);
      return NextResponse.json({ error: "Failed to validate participants" }, { status: 400 });
    }

    const foundIds = new Set((profiles || []).map((p: Record<string, unknown>) => p.id as string));
    const missingIds = otherIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Users not found: ${missingIds.join(", ")}` },
        { status: 400 }
      );
    }

    // For direct conversations, check if one already exists between these two users
    if (type === "direct" && otherIds.length === 1) {
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select(
          `id, type, conversation_participants!inner(user_id)`
        )
        .eq("type", "direct");

      if (existingConvs) {
        const existingConv = existingConvs.find((conv: Record<string, unknown>) => {
          const parts = conv.conversation_participants as { user_id: string }[];
          const partIds = parts.map((p) => p.user_id);
          return partIds.includes(user.id) && partIds.includes(otherIds[0]);
        });

        if (existingConv) {
          return NextResponse.json({ data: { id: (existingConv as Record<string, unknown>).id }, existing: true });
        }
      }
    }

    // Create the conversation
    const { data: conversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        type,
        name: name || null,
        hackathon_id: hackathonId || null,
        team_id: teamId || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (createError) {
      console.error("Failed to create conversation:", createError.message);
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 400 });
    }

    // Add all participants (including the creator)
    const allParticipantIds = [user.id, ...otherIds];
    const participantInserts = allParticipantIds.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === user.id ? "admin" : "member",
    }));

    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .insert(participantInserts);

    if (participantsError) {
      console.error("Failed to add participants:", participantsError.message);
      // Clean up the conversation if participants fail
      await supabase.from("conversations").delete().eq("id", conversation.id);
      return NextResponse.json({ error: "Failed to add participants" }, { status: 400 });
    }

    // Fetch the complete conversation with participants
    const { data: fullConversation, error: fetchError } = await supabase
      .from("conversations")
      .select(
        `*, conversation_participants(*, user:profiles!conversation_participants_user_id_fkey(${PROFILE_PUBLIC_COLS}))`
      )
      .eq("id", conversation.id)
      .single();

    if (fetchError) {
      console.error("Failed to fetch created conversation:", fetchError.message);
      return NextResponse.json({ error: "Failed to fetch created conversation" }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToConversation(fullConversation as Record<string, unknown>, user.id),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
