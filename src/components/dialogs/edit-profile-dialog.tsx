"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    headline?: string;
    bio?: string;
    avatar?: string;
  };
}

export function EditProfileDialog({
  open,
  onOpenChange,
  user,
}: EditProfileDialogProps) {
  const [name, setName] = useState(user.name);
  const [headline, setHeadline] = useState(user.headline || "");
  const [bio, setBio] = useState(user.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const isValid = name.trim().length >= 2;

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    toast.success("Profile updated!", {
      description: "Your changes have been saved.",
    });
    onOpenChange(false);
  };

  // Reset form when user prop changes or dialog opens
  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (v) {
      setName(user.name);
      setHeadline(user.headline || "");
      setBio(user.bio || "");
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your personal information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar preview */}
          <div className="flex justify-center">
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-border">
                  <span className="text-xl font-display font-bold text-white">
                    {initials}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Headline</label>
            <Input
              placeholder="e.g. Full-Stack Developer at Acme"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground text-right">
              {headline.length}/120
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/500
            </p>
          </div>

          {/* Save button */}
          <Button
            className="w-full"
            disabled={!isValid || isSaving}
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
