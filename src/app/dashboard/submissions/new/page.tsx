"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Upload,
  Github,
  Globe,
  FileText,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/forms/image-upload";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(
  () => import("@/components/forms/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="shimmer rounded-xl h-[200px]" /> }
);
import { TagSelector } from "@/components/forms/tag-selector";
import { CustomFormFields } from "@/components/forms/custom-form-field";
import { useHackathons, useHackathon } from "@/hooks/use-hackathons";
import { useCreateSubmission } from "@/hooks/use-submissions";
import { useMyTeams } from "@/hooks/use-teams";
import { usePhases } from "@/hooks/use-phases";
import { useAuthStore } from "@/store/auth-store";
import {
  getCurrentSubmissionTarget,
  type SubmissionTarget,
} from "@/lib/submission-window";
import { deriveSubmissionCore } from "@/lib/submission-fields";
import { formatDateTime } from "@/lib/utils";
import { Settings2 } from "lucide-react";

// projectName / tagline / trackId are only required in the legacy (no custom
// form) path — when the organizer configured a submission form we validate and
// derive those from the custom fields instead, so they're optional here.
const submissionSchema = z.object({
  hackathonId: z.string().min(1, "Select a competition"),
  teamId: z.string().min(1, "Select a team"),
  trackId: z.string().optional(),
  projectName: z.string().optional(),
  tagline: z.string().max(120).optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  demoVideo: z.string().optional(),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readme: z.string().optional(),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

function NewSubmissionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledHackathonId = searchParams.get("hackathonId") || "";
  const prefilledTeamId = searchParams.get("teamId") || "";
  const prefilledPhaseId = searchParams.get("phaseId") || "";

  const { data: hackathonsData } = useHackathons();
  const hackathons = hackathonsData?.data || [];
  const { data: teamsData } = useMyTeams();
  const myTeams = teamsData?.data || [];

  // Load the prefilled hackathon (covers cases where it's not in the
  // user's general list — e.g. private competitions).
  const { data: prefilledHackathonData } = useHackathon(
    prefilledHackathonId || undefined
  );
  const { data: phasesData } = usePhases(prefilledHackathonId || undefined);

  const createMutation = useCreateSubmission();
  const [techStack, setTechStack] = useState<string[]>([]);
  // Values for the active submission target's custom fields — pulled from
  // the phase when phases own submissions, otherwise from the hackathon's
  // global submission_fields. Sent through as `formData` on create.
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      hackathonId: prefilledHackathonId,
      teamId: prefilledTeamId,
    },
  });

  const selectedHackathonId = watch("hackathonId");
  const selectedHackathon =
    hackathons.find((h) => h.id === selectedHackathonId) ??
    (prefilledHackathonData?.data ?? null);
  const hackathonTeams = myTeams.filter(
    (t) => t.hackathonId === selectedHackathonId
  );
  const coverImage = watch("coverImage");
  const description = watch("description");
  const readme = watch("readme");

  // Only the team LEADER may submit. Detect whether the current user leads the
  // selected team so we can gate the form (backend enforces this too).
  const currentUser = useAuthStore((s) => s.user);
  const selectedTeamId = watch("teamId");
  const selectedTeam = myTeams.find((t) => t.id === selectedTeamId);
  const isLeaderOfSelectedTeam =
    !!currentUser &&
    !!selectedTeam &&
    selectedTeam.members.some((m) => m.user.id === currentUser.id && m.isLeader);
  const blockedNonLeader = !!selectedTeam && !isLeaderOfSelectedTeam;

  // Compute the active submission target so we know which custom fields
  // to render and which phase to pin the submission to.
  const submissionTarget: SubmissionTarget | null = useMemo(() => {
    if (!selectedHackathon) return null;
    return getCurrentSubmissionTarget(
      selectedHackathon,
      phasesData?.data ?? []
    );
  }, [selectedHackathon, phasesData]);

  // Lock down the URL-pinned phase: if it doesn't match the currently
  // active one (e.g. the user opened an old link after the phase rolled
  // over) we still let them submit, but the submission will be pinned
  // by the server to the active phase.
  const phaseMismatch =
    prefilledPhaseId &&
    submissionTarget?.kind === "phase" &&
    submissionTarget.phaseId !== prefilledPhaseId;

  const customFields = submissionTarget?.kind !== "none" ? submissionTarget?.fields ?? [] : [];
  // When the organizer configured a submission form, it BECOMES the form —
  // we render exactly those fields and hide the built-in default sections so
  // there's no duplication (and multi-select / every field type works).
  const customMode = customFields.length > 0;

  // Reset hackathon-scoped form state when the hackathon changes.
  useEffect(() => {
    setFormData({});
    setFormErrors({});
  }, [selectedHackathonId]);

  // Default the track to the active phase's track when there's a single
  // choice, so the form passes validation without the user picking one
  // they can't change anyway.
  useEffect(() => {
    if (selectedHackathon && selectedHackathon.tracks.length === 1) {
      setValue("trackId", selectedHackathon.tracks[0].id);
    }
  }, [selectedHackathon, setValue]);

  const onSubmit = async (data: SubmissionForm) => {
    if (blockedNonLeader) {
      toast.error("Only the team leader can submit the team's project.");
      return;
    }
    if (submissionTarget?.kind === "none") {
      toast.error("This competition does not accept submissions.");
      return;
    }
    if (submissionTarget && submissionTarget.status !== "active") {
      toast.error(
        submissionTarget.status === "upcoming"
          ? "Submissions have not opened yet."
          : "Submissions are closed."
      );
      return;
    }

    // Required-field check on custom fields (active target — phase-aware).
    const missing: Record<string, string> = {};
    for (const f of customFields) {
      if (f.required) {
        const v = formData[f.id];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
          missing[f.id] = "This field is required";
        }
      }
    }
    if (Object.keys(missing).length > 0) {
      setFormErrors(missing);
      toast.error("Please answer all required questions.");
      return;
    }

    // Legacy (no custom form) path keeps the built-in required fields.
    if (!customMode) {
      if (!data.projectName || data.projectName.trim().length < 2) {
        toast.error("Project name is required.");
        return;
      }
      if (!data.tagline || data.tagline.trim().length < 5) {
        toast.error("A tagline is required.");
        return;
      }
      if ((selectedHackathon?.tracks.length ?? 0) > 0 && !data.trackId) {
        toast.error("Please select a track.");
        return;
      }
    }

    // In custom-form mode, derive the NOT NULL columns (project_name, tagline,
    // description) and a couple of useful links from the answers. Everything is
    // still saved verbatim in formData.
    const core = customMode
      ? deriveSubmissionCore(customFields, formData)
      : null;
    const payload = {
      ...data,
      projectName: customMode
        ? core?.projectName || selectedTeam?.name || "Untitled Project"
        : data.projectName,
      tagline: customMode ? core?.tagline || "" : data.tagline,
      description: customMode ? core?.description || data.description || "" : data.description,
      githubUrl: customMode ? core?.githubUrl || data.githubUrl || "" : data.githubUrl,
      demoUrl: customMode ? core?.demoUrl || data.demoUrl || "" : data.demoUrl,
    };

    try {
      const result = await createMutation.mutateAsync({
        ...payload,
        techStack,
        formData,
        phaseId:
          submissionTarget?.kind === "phase" ? submissionTarget.phaseId : null,
      });
      toast.success("Project submitted successfully!");
      router.push(`/dashboard/submissions/${result.data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create submission"
      );
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const { [fieldId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Submit Project
            </h1>
            <p className="text-muted-foreground mt-2">
              Share what you&apos;ve built during the hackathon.
            </p>
          </div>

          {/* Active target banner */}
          {submissionTarget && submissionTarget.kind !== "none" && (
            <Card
              className={
                submissionTarget.status === "active"
                  ? "mb-6 border-success/30 bg-success/5"
                  : "mb-6 border-warning/30 bg-warning/5"
              }
            >
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {submissionTarget.kind === "phase"
                    ? submissionTarget.phase.name
                    : "Project submission"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {submissionTarget.status === "active"
                    ? submissionTarget.deadline
                      ? `Closes ${formatDateTime(submissionTarget.deadline)}`
                      : "Open"
                    : submissionTarget.status === "upcoming"
                    ? `Opens ${
                        submissionTarget.opensAt
                          ? formatDateTime(submissionTarget.opensAt)
                          : "soon"
                      }`
                    : "Submissions closed"}
                </span>
                <Badge
                  variant={
                    submissionTarget.kind === "phase" ? "secondary" : "outline"
                  }
                  className="text-[10px]"
                >
                  {submissionTarget.kind === "phase"
                    ? "Phase submission"
                    : "Overall hackathon"}
                </Badge>
                {phaseMismatch && (
                  <span className="text-xs text-warning inline-flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Your link points to a different phase. Submitting will use
                    the currently active phase instead.
                  </span>
                )}
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Hackathon & Track */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Competition & Track</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Competition *</label>
                  {prefilledHackathonId && selectedHackathon ? (
                    <div className="rounded-xl border border-input bg-muted/30 px-4 py-2.5 text-sm">
                      {selectedHackathon.name}
                      <input type="hidden" {...register("hackathonId")} />
                    </div>
                  ) : (
                    <select
                      {...register("hackathonId")}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select competition</option>
                      {hackathons
                        .filter((h) => h.status !== "completed" && h.status !== "draft")
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                    </select>
                  )}
                  {errors.hackathonId && (
                    <p className="text-xs text-destructive">{errors.hackathonId.message}</p>
                  )}
                </div>

                {selectedHackathonId && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Team *</label>
                    {prefilledTeamId ? (
                      <div className="rounded-xl border border-input bg-muted/30 px-4 py-2.5 text-sm">
                        {hackathonTeams.find((t) => t.id === prefilledTeamId)
                          ?.name ?? "Your team"}
                        <input type="hidden" {...register("teamId")} />
                      </div>
                    ) : (
                      <select
                        {...register("teamId")}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select your team</option>
                        {hackathonTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {hackathonTeams.length === 0 && !prefilledTeamId && (
                      <p className="text-xs text-muted-foreground">
                        You are not a member of any team in this hackathon.
                      </p>
                    )}
                    {errors.teamId && (
                      <p className="text-xs text-destructive">{errors.teamId.message}</p>
                    )}
                  </div>
                )}

                {!customMode && selectedHackathon && selectedHackathon.tracks.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Track *</label>
                    <select
                      {...register("trackId")}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select track</option>
                      {selectedHackathon.tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {errors.trackId && (
                      <p className="text-xs text-destructive">{errors.trackId.message}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Built-in default form — only when the organizer has NOT
                configured a custom submission form. */}
            {!customMode && (
              <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Project Name *</label>
                  <Input
                    {...register("projectName")}
                    placeholder="My Awesome Project"
                    className="text-lg font-display"
                  />
                  {errors.projectName && (
                    <p className="text-xs text-destructive">{errors.projectName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Tagline *</label>
                  <Input
                    {...register("tagline")}
                    placeholder="One line that describes your project"
                  />
                  {errors.tagline && (
                    <p className="text-xs text-destructive">{errors.tagline.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <RichTextEditor
                    value={description}
                    onChange={(val) => setValue("description", val)}
                    placeholder="Describe your project in detail..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  value={coverImage}
                  onChange={(url) => setValue("coverImage", url)}
                  label="Cover Image"
                  aspectRatio="video"
                />

                <div className="space-y-1">
                  <label className="text-sm font-medium">Demo Video URL</label>
                  <Input
                    {...register("demoVideo")}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">GitHub Repository</label>
                  <Input
                    {...register("githubUrl")}
                    placeholder="https://github.com/..."
                    icon={<Github className="h-4 w-4" />}
                  />
                  {errors.githubUrl && (
                    <p className="text-xs text-destructive">{errors.githubUrl.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Live Demo URL</label>
                  <Input
                    {...register("demoUrl")}
                    placeholder="https://your-demo.com"
                    icon={<Globe className="h-4 w-4" />}
                  />
                  {errors.demoUrl && (
                    <p className="text-xs text-destructive">{errors.demoUrl.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <TagSelector
                  value={techStack}
                  onChange={setTechStack}
                  placeholder="Add technologies..."
                  maxTags={15}
                />
              </CardContent>
            </Card>

            {/* README */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">README</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={readme}
                  onChange={(val) => setValue("readme", val)}
                  placeholder="Write your project README..."
                />
              </CardContent>
            </Card>
              </>
            )}

            {/* Organizer-defined questions from the active submission target.
                Uses the per-phase fields when the phase has them; otherwise
                falls back to the hackathon-level submission_fields. File
                uploads route through Cloudinary; URLs surface to judges as
                clickable links. */}
            {customFields.length > 0 && selectedHackathon && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    {customMode ? "Project Submission" : "Additional Questions"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomFormFields
                    fields={customFields}
                    values={formData}
                    errors={formErrors}
                    onChange={handleCustomFieldChange}
                    uploadFolder={`cloudhub/submissions/${selectedHackathon.id}`}
                  />
                </CardContent>
              </Card>
            )}

            {/* Leader-only notice */}
            {blockedNonLeader && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                  Only the team leader can submit the project. Ask your team
                  leader to submit on behalf of the team.
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending}
                disabled={
                  blockedNonLeader ||
                  submissionTarget?.kind === "none" ||
                  (submissionTarget !== null && submissionTarget.status !== "active")
                }
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Submit Project
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function NewSubmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-3xl px-4">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </div>
      }
    >
      <NewSubmissionPageInner />
    </Suspense>
  );
}
