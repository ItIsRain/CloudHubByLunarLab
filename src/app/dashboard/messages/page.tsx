"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Search } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import {
  mockConversations,
  getMessagesForConversation,
} from "@/lib/mock-data";

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = React.useState(mockConversations[0]?.id || "");
  const [newMessage, setNewMessage] = React.useState("");
  const [search, setSearch] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? "";

  const filteredConversations = mockConversations.filter((conv) => {
    const other = conv.participants.find((p) => p.id !== currentUserId);
    return other?.name.toLowerCase().includes(search.toLowerCase());
  });

  const messages = getMessagesForConversation(selectedConv);
  const selectedConversation = mockConversations.find((c) => c.id === selectedConv);
  const otherParticipant = selectedConversation?.participants.find((p) => p.id !== currentUserId);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    toast.success("Message sent! (mock)");
    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="font-display text-3xl font-bold">Messages</h1>
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
                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No conversations found</p>
                      </div>
                    ) : (
                      filteredConversations.map((conv) => {
                        const other = conv.participants.find((p) => p.id !== currentUserId);
                        if (!other) return null;

                        return (
                          <button
                            key={conv.id}
                            type="button"
                            onClick={() => setSelectedConv(conv.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b",
                              selectedConv === conv.id && "bg-muted"
                            )}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={other.avatar} />
                                <AvatarFallback>{other.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {conv.unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium truncate">{other.name}</p>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                  {formatRelativeTime(conv.updatedAt)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.lastMessage?.content}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Message Thread */}
                <div className="flex flex-col">
                  {/* Header */}
                  {otherParticipant && (
                    <div className="p-4 border-b flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={otherParticipant.avatar} />
                        <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{otherParticipant.name}</p>
                        <p className="text-xs text-muted-foreground">{otherParticipant.headline}</p>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", isMe ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-2.5",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      />
                      <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
