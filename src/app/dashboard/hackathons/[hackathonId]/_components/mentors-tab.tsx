"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, GraduationCap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { Hackathon, Mentor } from "@/lib/types";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";

interface MentorsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

export function MentorsTab({ hackathon, hackathonId }: MentorsTabProps) {
  const updateHackathon = useUpdateHackathon();
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    expertise: "",
  });

  const mentors: Mentor[] = hackathon.mentors ?? [];

  const handleAddMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }

    const newMentor: Mentor = {
      id: crypto.randomUUID(),
      user: {
        id: crypto.randomUUID(),
        email: formData.email.trim(),
        name: formData.name.trim(),
        username: formData.name.trim().toLowerCase().replace(/\s+/g, "-"),
        headline: "",
        skills: [],
        interests: [],
        roles: ["mentor"],
        eventsAttended: 0,
        hackathonsParticipated: 0,
        projectsSubmitted: 0,
        wins: 0,
        subscriptionTier: "free",
        subscriptionStatus: "inactive",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expertise: formData.expertise
        ? formData.expertise.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      availability: [],
    };

    const updatedMentors = [...mentors, newMentor];

    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        mentors: updatedMentors,
      });
      toast.success(`${formData.name} added as a mentor!`);
      setFormData({ name: "", email: "", expertise: "" });
      setShowForm(false);
    } catch {
      toast.error("Failed to add mentor.");
    }
  };

  const handleRemoveMentor = async (mentorId: string) => {
    const updatedMentors = mentors.filter((m) => m.id !== mentorId);
    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        mentors: updatedMentors,
      });
      toast.success("Mentor removed.");
    } catch {
      toast.error("Failed to remove mentor.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Mentors</h2>
          <p className="text-sm text-muted-foreground">
            {mentors.length} mentor{mentors.length !== 1 ? "s" : ""} assigned
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Mentor
        </Button>
      </motion.div>

      {/* Add Mentor Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Mentor</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMentor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="mentor@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Expertise (comma-separated)
                  </label>
                  <Input
                    value={formData.expertise}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expertise: e.target.value,
                      }))
                    }
                    placeholder="React, Machine Learning, System Design"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={updateHackathon.isPending}
                  >
                    {updateHackathon.isPending ? "Adding..." : "Add Mentor"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Mentors Grid */}
      {mentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.map((mentor, i) => (
            <motion.div
              key={mentor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group hover:shadow-md transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={mentor.user.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(mentor.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {mentor.user.name}
                      </h3>
                      {mentor.user.headline && (
                        <p className="text-xs text-muted-foreground truncate">
                          {mentor.user.headline}
                        </p>
                      )}
                      {mentor.expertise.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mentor.expertise.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {mentor.expertise.length > 3 && (
                            <Badge
                              variant="muted"
                              className="text-[10px] px-1.5 py-0"
                            >
                              +{mentor.expertise.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      {mentor.availability.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {mentor.availability.length} slot
                          {mentor.availability.length !== 1 ? "s" : ""} available
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => handleRemoveMentor(mentor.id)}
                      disabled={updateHackathon.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                No Mentors Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add mentors to help participants with guidance, code reviews, and
                technical support during the hackathon.
              </p>
              <Button
                variant="gradient"
                onClick={() => setShowForm(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Mentor
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
