"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  Trash2,
  Ban,
  RotateCcw,
  Clock,
  Mail,
  Tag,
  CalendarClock,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import {
  useLateInvites,
  useCreateLateInvite,
  useUpdateLateInvite,
  useDeleteLateInvite,
  type LateInvite,
} from "@/hooks/use-late-invites";
import { toast } from "sonner";

interface LateInvitesTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

function buildInviteUrl(slug: string, token: string): string {
  if (typeof window === "undefined") {
    return `/invite/late/${token}`;
  }
  return `${window.location.origin}/hackathons/${slug}?invite=${encodeURIComponent(token)}`;
}

function formatRelative(date: string | null): string {
  if (!date) return "never";
  const ms = new Date(date).getTime() - Date.now();
  const sign = ms < 0 ? "ago" : "from now";
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  if (mins < 60) return `${mins}m ${sign}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ${sign}`;
  const days = Math.round(hours / 24);
  return `${days}d ${sign}`;
}

function inviteStatus(i: LateInvite): {
  label: string;
  variant: "success" | "muted" | "warning" | "destructive" | "secondary";
} {
  if (i.revoked_at) return { label: "Revoked", variant: "destructive" };
  if (i.expires_at && new Date(i.expires_at).getTime() < Date.now()) {
    return { label: "Expired", variant: "muted" };
  }
  if (i.uses >= i.max_uses) return { label: "Used up", variant: "muted" };
  if (i.uses > 0) return { label: "Active · partly used", variant: "secondary" };
  return { label: "Active", variant: "success" };
}

// ── Create dialog ─────────────────────────────────────────

function CreateInviteDialog({
  open,
  onOpenChange,
  hackathonId,
  hackathon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  hackathon: Hackathon;
}) {
  const create = useCreateLateInvite(hackathonId);
  const [label, setLabel] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [maxUses, setMaxUses] = React.useState(1);
  const [expiresInDays, setExpiresInDays] = React.useState<number | "never">(7);
  const [created, setCreated] = React.useState<LateInvite | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLabel("");
      setEmail("");
      setMaxUses(1);
      setExpiresInDays(7);
      setCreated(null);
      setCopied(false);
    }
  }, [open]);

  const handleCreate = async () => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("That doesn't look like a valid email.");
      return;
    }
    try {
      const expires_at =
        expiresInDays === "never"
          ? null
          : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
      const res = await create.mutateAsync({
        label: label.trim() || null,
        email: trimmedEmail || null,
        max_uses: maxUses,
        expires_at,
      });
      setCreated(res.data);
      toast.success("Invite link created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create.");
    }
  };

  const inviteUrl = created
    ? buildInviteUrl(hackathon.slug, created.token)
    : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {created ? "Invite link ready" : "Create late-registration link"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "Share this link with the person who needs to register. They can register even though registration is closed."
              : "Anyone with this link can register past the deadline — restrict it to a single email or set an expiry to keep it safe."}
          </DialogDescription>
        </DialogHeader>

        {!created ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Label (optional)</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Jane Doe — ACME"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Just for your reference — never shown to the recipient.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Lock to email (optional)
              </label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                type="email"
                maxLength={320}
              />
              <p className="text-xs text-muted-foreground">
                When set, only this signed-in account can use the link.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Max uses</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={maxUses}
                  onChange={(e) =>
                    setMaxUses(
                      Math.max(1, Math.min(1000, Number(e.target.value) || 1))
                    )
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  1 = single-use (recommended)
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Expires</label>
                <select
                  value={String(expiresInDays)}
                  onChange={(e) =>
                    setExpiresInDays(
                      e.target.value === "never" ? "never" : Number(e.target.value)
                    )
                  }
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
                >
                  <option value="1">In 1 day</option>
                  <option value="3">In 3 days</option>
                  <option value="7">In 7 days</option>
                  <option value="14">In 14 days</option>
                  <option value="30">In 30 days</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Invite URL
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background border border-input rounded-lg px-3 py-2 truncate font-mono">
                  {inviteUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-input p-3 text-xs space-y-1.5 text-muted-foreground">
              <p>
                <strong className="text-foreground">Max uses:</strong> {created.max_uses}
              </p>
              {created.email && (
                <p>
                  <strong className="text-foreground">Locked to:</strong> {created.email}
                </p>
              )}
              <p>
                <strong className="text-foreground">Expires:</strong>{" "}
                {created.expires_at
                  ? new Date(created.expires_at).toLocaleString()
                  : "Never"}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!created ? (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={create.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleCreate}
                disabled={create.isPending}
              >
                {create.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                {create.isPending ? "Creating…" : "Create Link"}
              </Button>
            </>
          ) : (
            <Button variant="gradient" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Invite row ────────────────────────────────────────────

function InviteRow({
  invite,
  hackathon,
  hackathonId,
}: {
  invite: LateInvite;
  hackathon: Hackathon;
  hackathonId: string;
}) {
  const update = useUpdateLateInvite(hackathonId);
  const remove = useDeleteLateInvite(hackathonId);
  const [copied, setCopied] = React.useState(false);

  const inviteUrl = buildInviteUrl(hackathon.slug, invite.token);
  const status = inviteStatus(invite);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm("Revoke this link? Nobody else will be able to use it.")) return;
    try {
      await update.mutateAsync({ inviteId: invite.id, revoke: true });
      toast.success("Invite revoked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke.");
    }
  };

  const handleUnrevoke = async () => {
    try {
      await update.mutateAsync({ inviteId: invite.id, revoke: false });
      toast.success("Invite re-enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this invite permanently?")) return;
    try {
      await remove.mutateAsync(invite.id);
      toast.success("Invite deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      layout
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-semibold truncate">
                  {invite.label || "Untitled invite"}
                </h3>
                <Badge variant={status.variant} className="text-[10px]">
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {invite.uses} / {invite.max_uses}
                </span>
                {invite.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {invite.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Expires {formatRelative(invite.expires_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" /> Created{" "}
                  {formatRelative(invite.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted/40 border border-input rounded-lg px-3 py-1.5 truncate font-mono">
              {inviteUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            {invite.revoked_at ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnrevoke}
                disabled={update.isPending}
                title="Un-revoke"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRevoke}
                disabled={update.isPending}
                title="Revoke"
              >
                <Ban className="h-3.5 w-3.5 text-amber-600" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={remove.isPending}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>

          {invite.claims.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Claimed by
              </p>
              <ul className="space-y-0.5">
                {invite.claims.map((c) => (
                  <li key={c.id} className="text-xs flex items-center gap-2">
                    <span className="font-medium">{c.user?.name || "Unknown"}</span>
                    {c.user?.email && (
                      <span className="text-muted-foreground">· {c.user.email}</span>
                    )}
                    <span className="text-muted-foreground ml-auto">
                      {formatRelative(c.claimed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main tab ──────────────────────────────────────────────

export function LateInvitesTab({ hackathon, hackathonId }: LateInvitesTabProps) {
  const { data, isLoading } = useLateInvites(hackathonId);
  const [createOpen, setCreateOpen] = React.useState(false);

  const invites = data?.data ?? [];
  const activeCount = invites.filter((i) => !i.revoked_at).length;
  const totalClaimed = invites.reduce((acc, i) => acc + i.uses, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="shimmer rounded-xl h-12 w-64" />
        <div className="shimmer rounded-xl h-32" />
        <div className="shimmer rounded-xl h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-primary" />
            Late-registration Links
          </h2>
          <p className="text-sm text-muted-foreground">
            Give a specific person a link that lets them register past the
            deadline — without reopening registration for everyone.
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setCreateOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Invite Link
        </Button>
      </motion.div>

      {invites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <LinkIcon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1">
              No late-registration links yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Generate a one-off link, optionally lock it to a specific email,
              and send it to anyone who missed your registration deadline.
              The link bypasses the close date for that person only.
            </p>
            <Button
              variant="gradient"
              onClick={() => setCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold font-display text-primary">
                  {invites.length}
                </p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/5 to-background">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold font-display text-green-600">
                  {activeCount}
                </p>
                <p className="text-[11px] text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-accent/5 to-background">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold font-display text-accent">
                  {totalClaimed}
                </p>
                <p className="text-[11px] text-muted-foreground">Claimed</p>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {invites.map((i) => (
                <InviteRow
                  key={i.id}
                  invite={i}
                  hackathon={hackathon}
                  hackathonId={hackathonId}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <CreateInviteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        hackathonId={hackathonId}
        hackathon={hackathon}
      />

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">How recipients use the link:</strong>{" "}
                they open it → if they aren&apos;t signed in they&apos;ll be prompted to
                sign up / log in → the registration form opens with the deadline
                gate bypassed for that user only.
              </p>
              <p>
                <strong className="text-foreground">Email lock:</strong> when set, the
                signed-in account&apos;s email must match exactly. Stops the link
                from being forwarded.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
