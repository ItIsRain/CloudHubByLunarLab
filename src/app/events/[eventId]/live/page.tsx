"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Send,
  Eye,
  Radio,
  Video,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";
import { useEvent } from "@/hooks/use-events";

const mockChatMessages = [
  { id: "chat-1", user: mockUsers[0], message: "Excited to be here! This keynote is amazing.", time: "2 min ago" },
  { id: "chat-2", user: mockUsers[1], message: "The demo was really impressive. Great work!", time: "3 min ago" },
  { id: "chat-3", user: mockUsers[2], message: "Does anyone know when the Q&A session starts?", time: "4 min ago" },
  { id: "chat-4", user: mockUsers[3], message: "I love the production quality of this stream.", time: "5 min ago" },
  { id: "chat-5", user: mockUsers[4], message: "Can we get the slides shared after the event?", time: "6 min ago" },
  { id: "chat-6", user: mockUsers[5], message: "Joining from Tokyo! Great to see global participation.", time: "8 min ago" },
  { id: "chat-7", user: mockUsers[6], message: "The speaker is really knowledgeable. Learned so much!", time: "10 min ago" },
  { id: "chat-8", user: mockUsers[7], message: "Anyone want to connect after the event? Drop your LinkedIn!", time: "12 min ago" },
  { id: "chat-9", user: mockUsers[8], message: "This is my first CloudHub event. Really impressed!", time: "15 min ago" },
  { id: "chat-10", user: mockUsers[9], message: "The networking features on this platform are next level.", time: "18 min ago" },
];

export default function LivePage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { data: eventData, isLoading } = useEvent(eventId);
  const event = eventData?.data;

  const [chatInput, setChatInput] = React.useState("");
  const [messages, setMessages] = React.useState(mockChatMessages);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="h-8 w-48 rounded shimmer" />
            <div className="h-10 w-96 rounded shimmer" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 aspect-video rounded-2xl shimmer" />
              <div className="h-[500px] rounded-2xl shimmer" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <Video className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-4">Event Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/explore">Browse Events</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMessage = {
      id: `chat-${Date.now()}`,
      user: mockUsers[0],
      message: chatInput,
      time: "Just now",
    };
    setMessages((prev) => [...prev, newMessage]);
    setChatInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {event.title}
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
          >
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">
                {event.title}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Live Stream</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="destructive" dot pulse>
                LIVE
              </Badge>
              <Badge variant="secondary">
                <Eye className="h-3 w-3 mr-1" />
                1,247 watching
              </Badge>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border">
                {/* Video placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="relative">
                    {/* Pulsing background */}
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <button
                      onClick={() =>
                        toast.info("Video playback is a mock for now.")
                      }
                      className="relative h-20 w-20 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-colors"
                    >
                      <Play className="h-8 w-8 text-white ml-1" />
                    </button>
                  </div>
                  <p className="text-white/60 text-sm mt-6">
                    Click to play stream
                  </p>
                </div>

                {/* Live indicator overlay */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs" dot pulse>
                    LIVE
                  </Badge>
                </div>

                {/* Viewer count overlay */}
                <div className="absolute bottom-4 right-4">
                  <Badge
                    variant="secondary"
                    className="bg-black/50 text-white border-0 backdrop-blur-sm"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    1,247
                  </Badge>
                </div>
              </div>

              {/* Stream Info */}
              <div className="mt-4 p-4 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <Radio className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">
                      Currently streaming: Opening Keynote
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started 45 minutes ago
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Chat Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-1"
            >
              <div className="rounded-2xl border bg-card flex flex-col h-[500px] lg:h-[calc(56.25vw*0.6)] lg:min-h-[500px] lg:max-h-[600px]">
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <h3 className="font-display font-bold text-sm">Live Chat</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {messages.length} messages
                  </Badge>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-start gap-3"
                    >
                      <Avatar size="sm">
                        <AvatarImage src={msg.user.avatar} alt={msg.user.name} />
                        <AvatarFallback>
                          {getInitials(msg.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium truncate">
                            {msg.user.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {msg.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Send a message..."
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
