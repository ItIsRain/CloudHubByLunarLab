"use client";

import * as React from "react";
import { Loader2, Link2, Phone, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUpdateMentor } from "@/hooks/use-mentorship";

export function MentorDefaultsCard({
  hackathonId,
  mentorshipId,
  initialUrl,
  initialPhone,
}: {
  hackathonId: string;
  mentorshipId: string;
  initialUrl: string;
  initialPhone: string;
}) {
  const update = useUpdateMentor(hackathonId);
  const [url, setUrl] = React.useState(initialUrl);
  const [phone, setPhone] = React.useState(initialPhone);

  // Re-sync local state when the server values change (e.g. after a save +
  // refetch), so the dirty flag and inputs reflect the persisted values.
  React.useEffect(() => {
    setUrl(initialUrl);
    setPhone(initialPhone);
  }, [initialUrl, initialPhone]);

  const dirty = url !== initialUrl || phone !== initialPhone;

  async function save() {
    try {
      await update.mutateAsync({
        mentorId: mentorshipId,
        defaultMeetingUrl: url.trim() || null,
        defaultMeetingPhone: phone.trim() || null,
      });
      toast.success("Default meeting details saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">General meeting details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Applied to all your confirmed sessions unless you set a link or phone on an
          individual booking.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Default meeting link
          </label>
          <Input
            type="url"
            placeholder="https://meet.google.com/your-room"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> Default phone (optional)
          </label>
          <Input
            type="tel"
            placeholder="+971 …"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <Button onClick={save} disabled={update.isPending || !dirty} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save defaults
        </Button>
      </CardContent>
    </Card>
  );
}
