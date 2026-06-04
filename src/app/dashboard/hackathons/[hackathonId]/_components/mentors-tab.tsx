"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GraduationCap, Mail, Send, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { Hackathon, HackathonMentor } from "@/lib/types";
import { useHackathonMentors, useInviteMentor, useRemoveMentor } from "@/hooks/use-mentorship";
import { toast } from "sonner";

interface MentorsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const statusConfig: Record<HackathonMentor["status"], { label: string; variant: "warning" | "success" | "muted" }> = {
  invited: { label: "Invited", variant: "warning" },
  accepted: { label: "Accepted", variant: "success" },
  declined: { label: "Declined", variant: "muted" },
};

export function MentorsTab({ hackathonId }: MentorsTabProps) {
  const { data, isLoading } = useHackathonMentors(hackathonId);
  const inviteMentor = useInviteMentor(hackathonId);
  const removeMentor = useRemoveMentor(hackathonId);

  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", name: "", expertise: "" });

  const mentors = data?.data ?? [];

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    try {
      await inviteMentor.mutateAsync({
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        expertise: form.expertise
          ? form.expertise.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      toast.success(`Invitation sent to ${form.email.trim()}.`);
      setForm({ email: "", name: "", expertise: "" });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite mentor.");
    }
  }

  function handleResend(mentor: HackathonMentor) {
    inviteMentor.mutate(
      { email: mentor.email ?? "", name: mentor.name, expertise: mentor.expertise },
      {
        onSuccess: () => toast.success(`Invitation resent to ${mentor.email}.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to resend."),
      }
    );
  }

  function handleRemove(mentor: HackathonMentor) {
    removeMentor.mutate(mentor.id, {
      onSuccess: () => toast.success("Mentor removed."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove."),
    });
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Mentors</h2>
          <p className="text-sm text-muted-foreground">
            {mentors.length} mentor{mentors.length !== 1 ? "s" : ""} ·{" "}
            {mentors.filter((m) => m.status === "accepted").length} accepted
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" />
          Invite Mentor
        </Button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invite a Mentor</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="mentor@example.com"
                        icon={<Mail className="h-4 w-4" />}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name (optional)</label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Full name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expertise (comma-separated, optional)</label>
                    <Input
                      value={form.expertise}
                      onChange={(e) => setForm((p) => ({ ...p, expertise: e.target.value }))}
                      placeholder="React, Machine Learning, System Design"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="submit" variant="gradient" disabled={inviteMentor.isPending} className="gap-2">
                      {inviteMentor.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send Invite
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer rounded-xl h-32 w-full" />
          ))}
        </div>
      ) : mentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {mentors.map((mentor, i) => {
              const conf = statusConfig[mentor.status];
              const name = mentor.user?.name || mentor.name;
              return (
                <motion.div
                  key={mentor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="group hover:shadow-md transition-all duration-200">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={mentor.user?.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{name}</h3>
                            <Badge variant={conf.variant} className="text-[10px] shrink-0">
                              {conf.label}
                            </Badge>
                          </div>
                          {mentor.email && (
                            <p className="text-xs text-muted-foreground truncate">{mentor.email}</p>
                          )}
                          {mentor.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {mentor.expertise.slice(0, 3).map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                        {mentor.status !== "accepted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleResend(mentor)}
                            disabled={inviteMentor.isPending}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Resend
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive ml-auto"
                          onClick={() => handleRemove(mentor)}
                          disabled={removeMentor.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">No Mentors Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Invite mentors by email. Once they accept, they can set their availability and
                participants can book sessions with them.
              </p>
              <Button variant="gradient" onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Invite First Mentor
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
