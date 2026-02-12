"use client";

import { useState } from "react";
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
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { TagSelector } from "@/components/forms/tag-selector";
import { mockSubmissions } from "@/lib/mock-data";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submission = mockSubmissions.find((s) => s.id === submissionId);

  const [techStack, setTechStack] = useState<string[]>(
    submission?.techStack || []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      projectName: submission?.projectName || "",
      tagline: submission?.tagline || "",
      description: submission?.description || "",
      coverImage: submission?.coverImage || "",
      demoVideo: submission?.demoVideo || "",
      githubUrl: submission?.githubUrl || "",
      demoUrl: submission?.demoUrl || "",
      readme: submission?.readme || "",
    },
  });

  const coverImage = watch("coverImage");
  const description = watch("description");
  const readme = watch("readme");

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
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    console.log("Updated:", { ...data, techStack });
    toast.success("Submission updated successfully!");
    setIsSubmitting(false);
    router.push(`/dashboard/submissions/${submissionId}`);
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
              <Button type="submit" loading={isSubmitting} className="gap-2">
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
