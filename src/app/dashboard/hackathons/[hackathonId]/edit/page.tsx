"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, X } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { mockHackathons } from "@/lib/mock-data";
import { toast } from "sonner";

const hackathonStatuses = [
  { value: "draft", label: "Draft" },
  { value: "registration-open", label: "Registration Open" },
  { value: "registration-closed", label: "Registration Closed" },
  { value: "hacking", label: "Hacking" },
  { value: "submission", label: "Submission" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
];

const categoryOptions = [
  { value: "tech", label: "Technology" },
  { value: "ai-ml", label: "AI / Machine Learning" },
  { value: "web3", label: "Web3 / Blockchain" },
  { value: "design", label: "Design" },
  { value: "business", label: "Business" },
  { value: "health", label: "Health" },
  { value: "music", label: "Music" },
  { value: "social", label: "Social" },
];

function toDateInputValue(isoString: string) {
  return isoString ? isoString.slice(0, 10) : "";
}

export default function EditHackathonPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  const [formData, setFormData] = React.useState({
    name: hackathon?.name || "",
    tagline: hackathon?.tagline || "",
    description: hackathon?.description || "",
    category: hackathon?.category || "tech",
    status: hackathon?.status || "draft",
    registrationEnd: toDateInputValue(hackathon?.registrationEnd || ""),
    hackingStart: toDateInputValue(hackathon?.hackingStart || ""),
    hackingEnd: toDateInputValue(hackathon?.hackingEnd || ""),
    maxTeamSize: hackathon?.maxTeamSize || 4,
    totalPrizePool: hackathon?.totalPrizePool || 0,
  });

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">
              Hackathon Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              The hackathon you are trying to edit does not exist.
            </p>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to My Hackathons
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Hackathon updated successfully!");
  };

  const selectClasses =
    "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

  const textareaClasses =
    "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[120px]";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href={`/dashboard/hackathons/${hackathonId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold">Edit Hackathon</h1>
          <p className="text-muted-foreground mt-1">
            Update the details for {hackathon.name}
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hackathon Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Hackathon name"
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tagline</label>
                  <Input
                    name="tagline"
                    value={formData.tagline}
                    onChange={handleChange}
                    placeholder="A short catchy tagline"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your hackathon..."
                    rows={6}
                    className={textareaClasses}
                  />
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={selectClasses}
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={selectClasses}
                    >
                      {hackathonStatuses.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Registration Deadline
                    </label>
                    <Input
                      type="date"
                      name="registrationEnd"
                      value={formData.registrationEnd}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      name="hackingStart"
                      value={formData.hackingStart}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      name="hackingEnd"
                      value={formData.hackingEnd}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Max Team Size & Prize Pool */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Team Size</label>
                    <Input
                      type="number"
                      name="maxTeamSize"
                      value={formData.maxTeamSize}
                      onChange={handleChange}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Prize Pool ($)
                    </label>
                    <Input
                      type="number"
                      name="totalPrizePool"
                      value={formData.totalPrizePool}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button type="submit" variant="gradient">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Link href={`/dashboard/hackathons/${hackathonId}`}>
                    <Button type="button" variant="outline">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </form>
        </motion.div>
      </main>
    </>
  );
}
