"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import {
  useConversations,
  useConversation,
  useSendMessage,
  useEditMessage,
  useMarkAsRead,
  useCreateConversation,
} from "@/hooks/use-messages";
import {
  useRealtimeMessages,
  useRealtimeConversations,
} from "@/hooks/use-realtime-messages";
import type { Conversation, Message } from "@/lib/types";

// =====================================================
// New Conversation Dialog
// =====================================================

function NewConversationDialog({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [userId, setUserId] = React.useState("");
  const createConversation = useCreateConversation();

  const handleCreate = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    try {
      const result = await createConversation.mutateAsync({
        type: "direct",
        participantIds: [userId.trim()],
      });
      if (result.existing) {
        toast.info("Conversation already exists");
      } else {
        toast.success("Conversation created");
      }
      onCreated(result.data.id);
      setUserId("");
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create conversation"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="new-conv-user-id"
              className="text-sm font-medium mb-1.5 block"
            >
              User ID
            </label>
            <Input
              id="new-conv-user-id"
              placeholder="Enter user ID to start a conversation..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the UUID of the user you want to message.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createConversation.isPending || !userId.trim()}
            >
              {createConversation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Conversation List Item
// =====================================================

function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const displayName =
    conversation.type === "direct"
      ? conversation.otherParticipant?.name || "Unknown User"
      : conversation.name || "Group Chat";
  const avatar =
    conversation.type === "direct"
      ? conversation.otherParticipant?.avatar
      : undefined;
  const headline =
    conversation.type === "direct"
      ? conversation.otherParticipant?.headline
      : undefined;
  const unread = conversation.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b",
        isSelected && "bg-muted"
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
            {unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium truncate">{displayName}</p>
          {conversation.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {headline || conversation.lastMessagePreview || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

// =====================================================
// Message Bubble
// =====================================================

function MessageBubble({
  message,
  isMe,
  onEdit,
}: {
  message: Message;
  isMe: boolean;
  onEdit: (messageId: string, currentContent: string) => void;
}) {
  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div className="flex items-end gap-2 max-w-[75%]">
        {!isMe && message.sender && (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={message.sender.avatar} />
            <AvatarFallback className="text-[10px]">
              {getInitials(message.sender.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 group relative",
            isMe
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          {message.deletedAt ? (
            <p className="text-sm italic opacity-60">Message deleted</p>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.editedAt && (
                <span
                  className={cn(
                    "text-[9px] italic",
                    isMe
                      ? "text-primary-foreground/50"
                      : "text-muted-foreground/70"
                  )}
                >
                  (edited)
                </span>
              )}
            </>
          )}
          <p
            className={cn(
              "text-[10px] mt-1",
              isMe ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {new Date(message.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {isMe && !message.deletedAt && (
            <button
              type="button"
              className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit(message.id, message.content)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Loading Skeleton
// =====================================================

function ConversationSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b">
          <div className="h-10 w-10 rounded-full bg-muted shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-muted rounded shimmer" />
            <div className="h-2.5 w-40 bg-muted rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
        >
          <div
            className={cn(
              "rounded-2xl px-4 py-3 shimmer",
              i % 2 === 0 ? "bg-muted" : "bg-primary/20",
              i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-64" : "w-36"
            )}
          >
            <div className="h-3 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// Main Messages Page
// =====================================================

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = React.useState("");
  const [newMessage, setNewMessage] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [editingMessage, setEditingMessage] = React.useState<{
    id: string;
    content: string;
  } | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? "";

  // Data hooks
  const { data: conversationsData, isLoading: convLoading } =
    useConversations();
  const { data: conversationData, isLoading: msgLoading } =
    useConversation(selectedConv || undefined);

  // Mutation hooks
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const markAsRead = useMarkAsRead();

  // Realtime subscriptions
  useRealtimeMessages(selectedConv || undefined);
  useRealtimeConversations(currentUserId || undefined);

  const conversations = conversationsData?.data ?? [];
  const messages = conversationData?.data?.messages ?? [];
  const selectedConversation = conversationData?.data?.conversation;

  // Auto-select first conversation
  React.useEffect(() => {
    if (!selectedConv && conversations.length > 0) {
      setSelectedConv(conversations[0].id);
    }
  }, [conversations, selectedConv]);

  // Filter conversations by search
  const filteredConversations = React.useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((conv) => {
      const name =
        conv.type === "direct"
          ? conv.otherParticipant?.name
          : conv.name;
      return name?.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read when selecting a conversation
  React.useEffect(() => {
    if (selectedConv) {
      const conv = conversations.find((c) => c.id === selectedConv);
      if (conv && (conv.unreadCount ?? 0) > 0) {
        markAsRead.mutate(selectedConv);
      }
    }
  }, [selectedConv]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    const content = newMessage.trim();
    setNewMessage("");
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConv,
        content,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message"
      );
      setNewMessage(content); // Restore message on failure
    }
  };

  const handleStartEdit = (messageId: string, currentContent: string) => {
    setEditingMessage({ id: messageId, content: currentContent });
    setEditContent(currentContent);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim() || !selectedConv) return;
    try {
      await editMessage.mutateAsync({
        conversationId: selectedConv,
        messageId: editingMessage.id,
        content: editContent.trim(),
      });
      setEditingMessage(null);
      setEditContent("");
      toast.success("Message edited");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to edit message"
      );
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConv(id);
  };

  // Get the display info for the selected conversation header
  const headerName =
    selectedConversation?.type === "direct"
      ? selectedConversation?.otherParticipant?.name || "Unknown User"
      : selectedConversation?.name || "Group Chat";
  const headerAvatar =
    selectedConversation?.type === "direct"
      ? selectedConversation?.otherParticipant?.avatar
      : undefined;
  const headerSubtext =
    selectedConversation?.type === "direct"
      ? selectedConversation?.otherParticipant?.headline
      : `${selectedConversation?.participants?.length ?? 0} participants`;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between"
          >
            <h1 className="font-display text-3xl font-bold">Messages</h1>
            <NewConversationDialog onCreated={handleConversationCreated} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] h-[600px]">
                {/* Conversation List */}
                <div className="border-r flex flex-col">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search conversations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {convLoading ? (
                      <ConversationSkeleton />
                    ) : filteredConversations.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {conversations.length === 0
                            ? "No conversations yet"
                            : "No conversations found"}
                        </p>
                        {conversations.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Start a new conversation using the + button above.
                          </p>
                        )}
                      </div>
                    ) : (
                      filteredConversations.map((conv) => (
                        <ConversationListItem
                          key={conv.id}
                          conversation={conv}
                          isSelected={selectedConv === conv.id}
                          onSelect={() => setSelectedConv(conv.id)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Message Thread */}
                <div className="flex flex-col">
                  {!selectedConv ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Select a conversation to start messaging
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      {selectedConversation && (
                        <div className="p-4 border-b flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={headerAvatar} />
                            <AvatarFallback>
                              {getInitials(headerName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{headerName}</p>
                            {headerSubtext && (
                              <p className="text-xs text-muted-foreground">
                                {headerSubtext}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {msgLoading ? (
                          <MessageSkeleton />
                        ) : messages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center h-full">
                            <div className="text-center">
                              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                No messages yet. Say hello!
                              </p>
                            </div>
                          </div>
                        ) : (
                          messages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            return (
                              <MessageBubble
                                key={msg.id}
                                message={msg}
                                isMe={isMe}
                                onEdit={handleStartEdit}
                              />
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Edit bar */}
                      {editingMessage && (
                        <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-2">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            Editing message
                          </span>
                          <div className="flex-1" />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Input */}
                      <div className="p-4 border-t">
                        {editingMessage ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Edit message..."
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              onClick={handleSaveEdit}
                              disabled={
                                editMessage.isPending || !editContent.trim()
                              }
                            >
                              {editMessage.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type a message..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleSend()
                              }
                            />
                            <Button
                              size="icon"
                              onClick={handleSend}
                              disabled={
                                sendMessage.isPending || !newMessage.trim()
                              }
                            >
                              {sendMessage.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
