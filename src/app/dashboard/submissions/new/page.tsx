"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/forms/image-upload";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { TagSelector } from "@/components/forms/tag-selector";
import { mockHackathons } from "@/lib/mock-data";

const submissionSchema = z.object({
  hackathonId: z.string().min(1, "Select a hackathon"),
  trackId: z.string().min(1, "Select a track"),
  projectName: z.string().min(2, "Project name is required"),
  tagline: z.string().min(5, "Tagline is required").max(120),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  demoVideo: z.string().optional(),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readme: z.string().optional(),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

export default function NewSubmissionPage() {
  const router = useRouter();
  const [techStack, setTechStack] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
  });

  const selectedHackathonId = watch("hackathonId");
  const selectedHackathon = mockHackathons.find((h) => h.id === selectedHackathonId);
  const coverImage = watch("coverImage");
  const description = watch("description");
  const readme = watch("readme");

  const onSubmit = async (data: SubmissionForm) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    console.log("Submission:", { ...data, techStack });
    toast.success("Project submitted successfully!");
    setIsSubmitting(false);
    router.push("/dashboard/submissions/sub-1");
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Hackathon & Track */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hackathon & Track</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Hackathon *</label>
                  <select
                    {...register("hackathonId")}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select hackathon</option>
                    {mockHackathons
                      .filter((h) => h.status !== "completed" && h.status !== "draft")
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                  </select>
                  {errors.hackathonId && (
                    <p className="text-xs text-destructive">{errors.hackathonId.message}</p>
                  )}
                </div>

                {selectedHackathon && (
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

            {/* Project Details */}
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

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} className="gap-2">
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
