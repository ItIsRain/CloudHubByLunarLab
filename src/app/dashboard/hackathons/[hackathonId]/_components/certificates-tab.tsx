"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Plus,
  Trash2,
  Pencil,
  Send,
  UploadCloud,
  FileText,
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  Search,
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
  useCertificateTemplates,
  useCreateCertificateTemplate,
  useUpdateCertificateTemplate,
  useDeleteCertificateTemplate,
  useSendCertificates,
  type CertificateTemplate,
  type CertNameBox,
  type CertType,
  type CertAudience,
} from "@/hooks/use-certificate-templates";
import { useUpload, formatFileSize } from "@/hooks/use-upload";
import { useHackathonParticipants } from "@/hooks/use-hackathon-participants";
import { useHackathonTeams } from "@/hooks/use-teams";
import { PdfNameBoxEditor } from "@/components/special/pdf-name-box-editor";
import { toast } from "sonner";

const CERT_TYPE_OPTIONS: Array<{ value: CertType; label: string }> = [
  { value: "participation", label: "Participation" },
  { value: "winner", label: "Winner" },
  { value: "runner_up", label: "Runner-up" },
  { value: "mentor", label: "Mentor" },
  { value: "judge", label: "Judge" },
  { value: "organizer", label: "Organizer" },
  { value: "speaker", label: "Speaker" },
  { value: "volunteer", label: "Volunteer" },
];

const STATUS_OPTIONS = [
  { value: "accepted", label: "Accepted" },
  { value: "approved", label: "Approved (screened-in)" },
  { value: "confirmed", label: "Confirmed" },
  { value: "eligible", label: "Eligible" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "pending", label: "Pending" },
];

const defaultNameBox = (
  pageWidth: number,
  pageHeight: number
): CertNameBox => ({
  // Centered horizontally, roughly 45% down the page (typical "Name" position
  // on most certificate designs).
  x: pageWidth * 0.2,
  y: pageHeight * 0.42,
  width: pageWidth * 0.6,
  height: 60,
  fontSize: 32,
  fontColor: "#111111",
  fontWeight: "bold",
  alignment: "center",
  fontFamily: "Helvetica",
});

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[120px] font-mono";

// ── Upload Dialog ─────────────────────────────────────────

function UploadDialog({
  open,
  onOpenChange,
  hackathonId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
}) {
  const create = useCreateCertificateTemplate(hackathonId);
  const { upload, isUploading, progress, error: uploadError } = useUpload({
    folder: "cloudhub/certificates",
  });

  const [step, setStep] = React.useState<"pick" | "configure">("pick");
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfPublicId, setPdfPublicId] = React.useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = React.useState<number | undefined>();
  const [pageSize, setPageSize] = React.useState<{ width: number; height: number } | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [certType, setCertType] = React.useState<CertType>("participation");
  const [nameBox, setNameBox] = React.useState<CertNameBox | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep("pick");
      setPdfUrl(null);
      setPdfPublicId(null);
      setPdfBytes(undefined);
      setPageSize(null);
      setName("");
      setDescription("");
      setCertType("participation");
      setNameBox(null);
    }
  }, [open]);

  const onFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please pick a PDF file.");
      return;
    }
    const res = await upload(file);
    if (!res) return;
    setPdfUrl(res.url);
    setPdfPublicId(res.publicId);
    setPdfBytes(res.bytes);
    setName(file.name.replace(/\.pdf$/i, "").slice(0, 200));
    setStep("configure");
  };

  const onPageSize = React.useCallback((size: { width: number; height: number }) => {
    setPageSize(size);
    setNameBox((prev) => prev ?? defaultNameBox(size.width, size.height));
  }, []);

  const handleSave = async () => {
    if (!pdfUrl || !pageSize || !nameBox) {
      toast.error("Template not ready yet.");
      return;
    }
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        pdf_url: pdfUrl,
        pdf_public_id: pdfPublicId,
        pdf_bytes: pdfBytes,
        page_width: pageSize.width,
        page_height: pageSize.height,
        name_box: nameBox,
        cert_type: certType,
      });
      toast.success("Template saved.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "pick" ? "Upload Certificate Template" : "Position the Name"}
          </DialogTitle>
          <DialogDescription>
            {step === "pick"
              ? "Pick the PDF design you want to use as the template."
              : "Drag the box to where the recipient's name should appear."}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-4">
            <label
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-input bg-muted/30 px-6 py-12 transition-colors hover:border-primary/40 hover:bg-muted/50 cursor-pointer",
                isUploading && "pointer-events-none opacity-60"
              )}
            >
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
              {isUploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Uploading… {progress}%</p>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-primary/10 p-3">
                    <UploadCloud className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Click to upload a PDF</p>
                  <p className="text-xs text-muted-foreground">Max 10 MB</p>
                </>
              )}
            </label>
            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}
          </div>
        )}

        {step === "configure" && pdfUrl && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Template name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Participation Certificate"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Certificate type</label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as CertType)}
                  className={selectClasses}
                >
                  {CERT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note shown next to the template"
                maxLength={1000}
              />
            </div>

            {nameBox && (
              <NameBoxStyleControls
                nameBox={nameBox}
                onChange={setNameBox}
              />
            )}

            <PdfNameBoxEditor
              pdfUrl={pdfUrl}
              value={nameBox ?? defaultNameBox(595, 842)}
              onChange={setNameBox}
              onPageSize={onPageSize}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending || isUploading}
          >
            Cancel
          </Button>
          {step === "configure" && (
            <Button
              variant="gradient"
              onClick={handleSave}
              disabled={create.isPending || !name.trim() || !nameBox || !pageSize}
            >
              {create.isPending ? "Saving…" : "Save Template"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Style controls for the name box ───────────────────────

function NameBoxStyleControls({
  nameBox,
  onChange,
}: {
  nameBox: CertNameBox;
  onChange: (next: CertNameBox) => void;
}) {
  const set = <K extends keyof CertNameBox>(k: K, v: CertNameBox[K]) =>
    onChange({ ...nameBox, [k]: v });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-input bg-muted/30 p-3">
      <div className="space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Font
        </label>
        <select
          value={nameBox.fontFamily}
          onChange={(e) =>
            set("fontFamily", e.target.value as CertNameBox["fontFamily"])
          }
          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="Helvetica">Helvetica</option>
          <option value="TimesRoman">Times Roman</option>
          <option value="Courier">Courier</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Size (pt)
        </label>
        <Input
          type="number"
          min={6}
          max={200}
          value={nameBox.fontSize}
          onChange={(e) =>
            set("fontSize", Math.max(6, Math.min(200, Number(e.target.value) || 28)))
          }
          className="h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Color
        </label>
        <input
          type="color"
          value={nameBox.fontColor}
          onChange={(e) => set("fontColor", e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Weight
        </label>
        <select
          value={nameBox.fontWeight}
          onChange={(e) =>
            set("fontWeight", e.target.value as CertNameBox["fontWeight"])
          }
          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>
      <div className="space-y-1 col-span-2 sm:col-span-4">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Alignment
        </label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((al) => (
            <button
              key={al}
              type="button"
              onClick={() => set("alignment", al)}
              className={cn(
                "flex-1 h-9 rounded-lg border text-sm capitalize transition-colors",
                nameBox.alignment === al
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-muted/50"
              )}
            >
              {al}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Edit Dialog ───────────────────────────────────────────

function EditTemplateDialog({
  open,
  onOpenChange,
  hackathonId,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  template: CertificateTemplate;
}) {
  const update = useUpdateCertificateTemplate(hackathonId);
  const [name, setName] = React.useState(template.name);
  const [description, setDescription] = React.useState(template.description ?? "");
  const [certType, setCertType] = React.useState<CertType>(template.cert_type);
  const [nameBox, setNameBox] = React.useState<CertNameBox>(template.name_box);

  React.useEffect(() => {
    if (open) {
      setName(template.name);
      setDescription(template.description ?? "");
      setCertType(template.cert_type);
      setNameBox(template.name_box);
    }
  }, [open, template]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    try {
      await update.mutateAsync({
        templateId: template.id,
        name: name.trim(),
        description: description.trim() || null,
        cert_type: certType,
        name_box: nameBox,
      });
      toast.success("Template updated.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Reposition the name, change styling, or update the metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Template name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Certificate type</label>
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value as CertType)}
                className={selectClasses}
              >
                {CERT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>

          <NameBoxStyleControls nameBox={nameBox} onChange={setNameBox} />

          <PdfNameBoxEditor
            pdfUrl={template.pdf_url}
            value={nameBox}
            onChange={setNameBox}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Send Dialog ───────────────────────────────────────────

function SendDialog({
  open,
  onOpenChange,
  hackathonId,
  hackathon,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  hackathon: Hackathon;
  template: CertificateTemplate;
}) {
  const send = useSendCertificates(hackathonId);
  const { data: participantsData } = useHackathonParticipants(
    open ? hackathonId : undefined
  );
  const { data: teamsData } = useHackathonTeams(open ? hackathonId : undefined);

  type AudienceMode = "all" | "status" | "winners" | "specific";
  const [audience, setAudience] = React.useState<AudienceMode>("all");
  const [statuses, setStatuses] = React.useState<string[]>(["accepted", "approved", "confirmed"]);
  const [selectedRegIds, setSelectedRegIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAudience("all");
      setStatuses(["accepted", "approved", "confirmed"]);
      setSelectedRegIds([]);
      setSearch("");
      setSubject(`Your certificate from ${hackathon.name}`);
      setBody(
        `Hi {{recipient_name}},\n\n` +
          `Thank you for being part of ${hackathon.name}! Your certificate is attached to this email.\n\n` +
          `You can also view a verifiable copy at any time:\n{{verification_url}}\n\n` +
          `Best,\n{{organizer_name}}`
      );
      setConfirm(false);
    }
  }, [open, hackathon.name]);

  const participants = participantsData?.data ?? [];
  const teams = teamsData?.data ?? [];

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return participants.filter((p) => {
      if (!p.user?.email) return false;
      if (!q) return true;
      const n = (p.user.name || "").toLowerCase();
      const e = (p.user.email || "").toLowerCase();
      const t = (p.teamName || "").toLowerCase();
      return n.includes(q) || e.includes(q) || t.includes(q);
    });
  }, [participants, search]);

  const recipientEstimate = React.useMemo(() => {
    if (audience === "all") {
      return participants.filter((p) =>
        ["accepted", "approved", "confirmed", "eligible"].includes(p.status)
      ).length;
    }
    if (audience === "status") {
      return participants.filter((p) => statuses.includes(p.status)).length;
    }
    if (audience === "specific") {
      return selectedRegIds.length;
    }
    // winners — best-effort: unknown without an API call. Show "all winners".
    return null;
  }, [audience, statuses, selectedRegIds, participants]);

  const toggleRegId = (id: string) => {
    setSelectedRegIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const buildPayload = (): CertAudience | null => {
    if (audience === "all") return { audience: "all", subject, body };
    if (audience === "status") {
      if (statuses.length === 0) {
        toast.error("Pick at least one status.");
        return null;
      }
      return { audience: "status", statuses, subject, body };
    }
    if (audience === "winners") return { audience: "winners", subject, body };
    if (audience === "specific") {
      if (selectedRegIds.length === 0) {
        toast.error("Select at least one participant.");
        return null;
      }
      return {
        audience: "registration_ids",
        registrationIds: selectedRegIds,
        subject,
        body,
      };
    }
    return null;
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    const payload = buildPayload();
    if (!payload) return;
    try {
      const res = await send.mutateAsync({
        templateId: template.id,
        payload,
      });
      const { sent, failed, total, message } = res.data;
      if (message && total === 0) {
        toast.info(message);
      } else if (failed > 0) {
        toast.warning(`Sent ${sent} of ${total} certificates. ${failed} failed.`);
      } else {
        toast.success(`Sent ${sent} certificate${sent !== 1 ? "s" : ""}.`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Certificate</DialogTitle>
          <DialogDescription>
            Using template <span className="font-medium text-foreground">{template.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Audience */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { v: "all", label: "Everyone" },
                  { v: "status", label: "By status" },
                  { v: "winners", label: "Winners" },
                  { v: "specific", label: "Pick specific" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setAudience(opt.v)}
                  className={cn(
                    "h-10 rounded-lg border text-sm transition-colors",
                    audience === opt.v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background hover:bg-muted/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {recipientEstimate !== null && (
              <p className="text-xs text-muted-foreground">
                Approximately <span className="font-medium">{recipientEstimate}</span>{" "}
                recipient{recipientEstimate === 1 ? "" : "s"} match the current selection.
                {recipientEstimate > 500 && (
                  <span className="text-amber-600">
                    {" "}
                    Cap is 500 per blast — split into multiple sends.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Status sub-picker */}
          {audience === "status" && (
            <div className="rounded-xl border border-input bg-muted/20 p-3">
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => {
                  const on = statuses.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() =>
                        setStatuses((prev) =>
                          prev.includes(s.value)
                            ? prev.filter((x) => x !== s.value)
                            : [...prev, s.value]
                        )
                      }
                      className={cn(
                        "px-3 h-8 rounded-full text-xs border transition-colors",
                        on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input bg-background hover:bg-muted/50"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Specific participants */}
          {audience === "specific" && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or team…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-input divide-y">
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No participants match.
                  </div>
                ) : (
                  filtered.map((p) => {
                    const on = selectedRegIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleRegId(p.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30",
                          on && "bg-primary/5"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          readOnly
                          className="rounded border-input"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {p.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.user?.email}
                            {p.teamName ? ` · ${p.teamName}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.status}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: <strong>{selectedRegIds.length}</strong>
                {teams.length > 0 && " · Tip: search by team name to bulk-select"}
              </p>
            </div>
          )}

          {/* Email subject/body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={textareaClasses}
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                "{{recipient_name}}",
                "{{team_name}}",
                "{{award_label}}",
                "{{hackathon_name}}",
                "{{organizer_name}}",
                "{{hackathon_url}}",
                "{{verification_url}}",
                "{{verification_code}}",
                "{{issued_date}}",
              ].map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="text-[10px] font-mono"
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="rounded border-input"
            />
            I confirm that the certificate template is ready and I want to email it
            to the selected recipients.
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={send.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSend}
            disabled={
              send.isPending ||
              !confirm ||
              !subject.trim() ||
              !body.trim() ||
              (audience === "specific" && selectedRegIds.length === 0)
            }
            className="gap-2"
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {send.isPending ? "Sending…" : "Send Certificates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Template card ─────────────────────────────────────────

function TemplateCard({
  template,
  hackathonId,
  hackathon,
}: {
  template: CertificateTemplate;
  hackathonId: string;
  hackathon: Hackathon;
}) {
  const remove = useDeleteCertificateTemplate(hackathonId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${template.name}"? This can't be undone. (Already-sent certificates stay valid.)`)) return;
    try {
      await remove.mutateAsync(template.id);
      toast.success("Template deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        layout
      >
        <Card className="group hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center border-b border-border/50">
            <div className="text-center">
              <FileText className="h-10 w-10 text-primary/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono">
                {Math.round(template.page_width)} × {Math.round(template.page_height)} pt
              </p>
            </div>
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-base truncate">{template.name}</h3>
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {template.description}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                {template.cert_type.replace("_", " ")}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {template.pdf_bytes && <span>{formatFileSize(template.pdf_bytes)}</span>}
              {(template.sentCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Sent to {template.sentCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <Button
                size="sm"
                variant="gradient"
                className="flex-1 gap-1.5"
                onClick={() => setSendOpen(true)}
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
                title="Edit template"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={remove.isPending}
                title="Delete template"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <EditTemplateDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        hackathonId={hackathonId}
        template={template}
      />
      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        hackathonId={hackathonId}
        hackathon={hackathon}
        template={template}
      />
    </>
  );
}

// ── Main tab ──────────────────────────────────────────────

export function CertificatesTab({
  hackathon,
  hackathonId,
}: {
  hackathon: Hackathon;
  hackathonId: string;
}) {
  const { data: templatesData, isLoading } = useCertificateTemplates(hackathonId);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const templates = templatesData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="shimmer rounded-xl h-12 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="shimmer rounded-xl h-64" />
          <div className="shimmer rounded-xl h-64" />
          <div className="shimmer rounded-xl h-64" />
        </div>
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
            <Award className="h-6 w-6 text-primary" />
            Certificates
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload PDF templates, position the name, then email personalized certificates in bulk.
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setUploadOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Upload Template
        </Button>
      </motion.div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Award className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1">
              No certificate templates yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Design a PDF certificate, upload it, drag a box where the recipient&apos;s
              name should appear, then send personalized copies to everyone or a
              subset.
            </p>
            <Button
              variant="gradient"
              onClick={() => setUploadOpen(true)}
              className="gap-2"
            >
              <UploadCloud className="h-4 w-4" />
              Upload First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                hackathonId={hackathonId}
                hackathon={hackathon}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        hackathonId={hackathonId}
      />

      {/* Tiny stats footer for cumulative sent counts */}
      {templates.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <Users className="h-3.5 w-3.5" />
          <span>
            <strong>
              {templates.reduce((acc, t) => acc + (t.sentCount ?? 0), 0)}
            </strong>{" "}
            certificate{templates.reduce((acc, t) => acc + (t.sentCount ?? 0), 0) === 1 ? "" : "s"}{" "}
            sent across {templates.length} template{templates.length === 1 ? "" : "s"}.
          </span>
        </div>
      )}
    </div>
  );
}
