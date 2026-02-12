"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, UserPlus, X, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockUsers } from "@/lib/mock-data";
import { getInitials, cn } from "@/lib/utils";

type MemberRole = "Owner" | "Admin" | "Editor" | "Viewer";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: MemberRole;
}

interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  sentAt: string;
}

const roleBadgeVariant: Record<MemberRole, "default" | "secondary" | "outline" | "muted"> = {
  Owner: "default",
  Admin: "secondary",
  Editor: "outline",
  Viewer: "muted",
};

const initialMembers: TeamMember[] = [
  {
    id: mockUsers[0].id,
    name: mockUsers[0].name,
    email: mockUsers[0].email,
    avatar: mockUsers[0].avatar,
    role: "Owner",
  },
  {
    id: mockUsers[1].id,
    name: mockUsers[1].name,
    email: mockUsers[1].email,
    avatar: mockUsers[1].avatar,
    role: "Admin",
  },
  {
    id: mockUsers[2].id,
    name: mockUsers[2].name,
    email: mockUsers[2].email,
    avatar: mockUsers[2].avatar,
    role: "Editor",
  },
  {
    id: mockUsers[3].id,
    name: mockUsers[3].name,
    email: mockUsers[3].email,
    avatar: mockUsers[3].avatar,
    role: "Viewer",
  },
];

const initialPending: PendingInvite[] = [
  {
    id: "invite-1",
    email: "jordan.lee@example.com",
    role: "Editor",
    sentAt: "2026-02-10",
  },
  {
    id: "invite-2",
    email: "taylor.nguyen@example.com",
    role: "Viewer",
    sentAt: "2026-02-11",
  },
];

export default function TeamMembersPage() {
  const [members, setMembers] = React.useState<TeamMember[]>(initialMembers);
  const [pending, setPending] = React.useState<PendingInvite[]>(initialPending);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<MemberRole>("Viewer");
  const [showInvite, setShowInvite] = React.useState(false);

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const alreadyMember = members.some(
      (m) => m.email.toLowerCase() === inviteEmail.toLowerCase()
    );
    const alreadyInvited = pending.some(
      (p) => p.email.toLowerCase() === inviteEmail.toLowerCase()
    );

    if (alreadyMember) {
      toast.error("This person is already a team member");
      return;
    }
    if (alreadyInvited) {
      toast.error("An invitation has already been sent to this email");
      return;
    }

    const newInvite: PendingInvite = {
      id: `invite-${Date.now()}`,
      email: inviteEmail.trim(),
      role: inviteRole,
      sentAt: new Date().toISOString().split("T")[0],
    };

    setPending((prev) => [...prev, newInvite]);
    setInviteEmail("");
    setInviteRole("Viewer");
    setShowInvite(false);
    toast.success(`Invitation sent to ${newInvite.email}`);
  };

  const handleRemove = (member: TeamMember) => {
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    toast.success(`${member.name} removed from team`);
  };

  const handleCancelInvite = (invite: PendingInvite) => {
    setPending((prev) => prev.filter((p) => p.id !== invite.id));
    toast.success(`Invitation to ${invite.email} cancelled`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold mb-1">Team Members</h1>
                <p className="text-muted-foreground">
                  Manage who has access to your organization.
                </p>
              </div>
              <Button onClick={() => setShowInvite(!showInvite)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Invite Member
              </Button>
            </div>
          </motion.div>

          {/* Invite Form */}
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invite a Team Member</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Email address"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        icon={<Mail className="h-4 w-4" />}
                      />
                    </div>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                      className="rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-11"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    <div className="flex gap-2">
                      <Button onClick={handleInvite}>Send Invite</Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowInvite(false);
                          setInviteEmail("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Current Members */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Members ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {members.map((member, i) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      <Avatar size="md">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>

                      <Badge variant={roleBadgeVariant[member.role]}>
                        {member.role}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={member.role === "Owner"}
                        onClick={() => handleRemove(member)}
                        className={cn(
                          member.role === "Owner" && "invisible"
                        )}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Invitations */}
          {pending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Invitations ({pending.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {pending.map((invite, i) => (
                      <motion.div
                        key={invite.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 px-6 py-4"
                      >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Invited on {invite.sentAt}
                          </p>
                        </div>

                        <Badge variant="warning">{invite.role}</Badge>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvite(invite)}
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
