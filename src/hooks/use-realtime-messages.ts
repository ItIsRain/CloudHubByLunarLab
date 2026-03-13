import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribes to Supabase Realtime for new/updated messages in a specific conversation.
 * On INSERT or UPDATE, invalidates the TanStack Query cache so the UI refreshes.
 */
export function useRealtimeMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = getSupabaseBrowserClient();

    // Subscribe to messages table changes for this conversation
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Invalidate messages for this conversation
          queryClient.invalidateQueries({
            queryKey: ["conversations", conversationId, "messages"],
          });
          // Also refresh the conversation list (for last_message_preview, unread counts)
          queryClient.invalidateQueries({
            queryKey: ["conversations"],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Invalidate messages for this conversation (for edits)
          queryClient.invalidateQueries({
            queryKey: ["conversations", conversationId, "messages"],
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, queryClient]);
}

/**
 * Subscribes to Supabase Realtime for conversation-level changes
 * (new conversations, updated last_message_at, etc.)
 * Useful for the conversation list sidebar.
 */
export function useRealtimeConversations(userId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabaseBrowserClient();

    // Subscribe to conversation_participants changes for this user
    // This catches new conversations being created where the user is a participant
    const channel = supabase
      .channel(`conversation_participants:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["conversations"],
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, queryClient]);
}
