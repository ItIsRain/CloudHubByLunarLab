import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation, Message } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";


interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}

export function useConversations() {
  const user = useAuthStore((s) => s.user);
  return useQuery<{ data: Conversation[] }>({
    queryKey: ["conversations", user?.id],
    queryFn: () =>
      fetchJson<{ data: Conversation[] }>("/api/messages/conversations"),
    enabled: !!user?.id,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}

export function useConversation(id: string | undefined) {
  const user = useAuthStore((s) => s.user);
  return useQuery<{ data: ConversationWithMessages }>({
    queryKey: ["conversations", id, "messages"],
    queryFn: () =>
      fetchJson<{ data: ConversationWithMessages }>(
        `/api/messages/conversations/${id}`
      ),
    enabled: !!id && !!user?.id,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      type = "text",
      attachments,
    }: {
      conversationId: string;
      content: string;
      type?: "text" | "image" | "file" | "system";
      attachments?: Record<string, unknown>[];
    }) => {
      const res = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, type, attachments }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to send message");
      }
      return res.json() as Promise<{ data: Message }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", variables.conversationId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
      content,
    }: {
      conversationId: string;
      messageId: string;
      content: string;
    }) => {
      const res = await fetch(
        `/api/messages/conversations/${conversationId}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to edit message");
      }
      return res.json() as Promise<{ data: Message }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", variables.conversationId, "messages"],
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(
        `/api/messages/conversations/${conversationId}/read`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to mark as read");
      }
      return res.json();
    },
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["conversations", conversationId, "messages"],
      });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      type?: "direct" | "group" | "team";
      name?: string;
      participantIds: string[];
      hackathonId?: string;
      teamId?: string;
    }) => {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create conversation");
      }
      return res.json() as Promise<{ data: Conversation; existing?: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
