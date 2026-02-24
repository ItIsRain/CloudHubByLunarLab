"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/forms/image-upload";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("@/components/forms/rich-text-editor").then(m => m.RichTextEditor), { ssr: false, loading: () => <div className="shimmer rounded-xl h-[200px]" /> });
import { TagSelector } from "@/components/forms/tag-selector";
import { useSubmission, useUpdateSubmission } from "@/hooks/use-submissions";

const editSchema = z.object({
  projectName: z.string().min(2, "Project name is required"),
  tagline: z.string().min(5, "Tagline is required").max(120),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  demoVideo: z.string().optional(),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readme: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

export default function EditSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  const { data: submissionData, isLoading } = useSubmission(submissionId);
  const updateMutation = useUpdateSubmission();

  const submission = submissionData?.data;

  const [techStack, setTechStack] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (submission) {
      reset({
        projectName: submission.projectName || "",
        tagline: submission.tagline || "",
        description: submission.description || "",
        coverImage: submission.coverImage || "",
        demoVideo: submission.demoVideo || "",
        githubUrl: submission.githubUrl || "",
        demoUrl: submission.demoUrl || "",
        readme: submission.readme || "",
      });
      setTechStack(submission.techStack || []);
    }
  }, [submission, reset]);

  const coverImage = watch("coverImage");
  const description = watch("description");
  const readme = watch("readme");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="h-4 w-40 rounded bg-muted shimmer" />
          <div className="h-8 w-2/3 rounded bg-muted shimmer" />
          <div className="h-5 w-1/3 rounded bg-muted shimmer" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 text-center py-20">
          <h1 className="font-display text-2xl font-bold">Submission not found</h1>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: EditForm) => {
    try {
      await updateMutation.mutateAsync({ id: submissionId, ...data, techStack });
      toast.success("Submission updated successfully!");
      router.push(`/dashboard/submissions/${submissionId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update submission"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href={`/dashboard/submissions/${submissionId}`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to submission
            </Link>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            Edit Submission
          </h1>
          <p className="text-muted-foreground mb-8">
            Update your project details.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Project Name *</label>
                  <Input {...register("projectName")} className="text-lg font-display" />
                  {errors.projectName && (
                    <p className="text-xs text-destructive">{errors.projectName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tagline *</label>
                  <Input {...register("tagline")} />
                  {errors.tagline && (
                    <p className="text-xs text-destructive">{errors.tagline.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <RichTextEditor
                    value={description}
                    onChange={(val) => setValue("description", val)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Media</CardTitle>
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
                  <Input {...register("demoVideo")} placeholder="https://youtube.com/..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">GitHub</label>
                  <Input {...register("githubUrl")} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Demo URL</label>
                  <Input {...register("demoUrl")} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <TagSelector value={techStack} onChange={setTechStack} maxTags={15} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">README</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={readme}
                  onChange={(val) => setValue("readme", val)}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={updateMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
