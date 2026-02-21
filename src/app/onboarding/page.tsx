"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Sparkles,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Camera,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { mockCommunities } from "@/lib/mock-data";
import { popularTags } from "@/lib/constants";

const steps = [
  { id: 1, label: "Profile", icon: User },
  { id: 2, label: "Skills & Interests", icon: Sparkles },
  { id: 3, label: "Communities", icon: Users },
];

const skillOptions = [
  "React", "TypeScript", "Node.js", "Python", "Go", "Rust",
  "AWS", "Docker", "Kubernetes", "Machine Learning", "AI",
  "UI/UX", "Figma", "Design Systems", "Solidity", "Web3",
  "Mobile", "iOS", "Android", "Flutter", "Data Science",
  "DevOps", "GraphQL", "PostgreSQL", "MongoDB",
];

const interestOptions = [
  "AI/ML", "Web3", "DevOps", "Cloud", "Design", "Startups",
  "Open Source", "Mobile", "Gaming", "Cybersecurity",
  "Data Science", "Blockchain", "IoT", "AR/VR",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [bio, setBio] = React.useState(user?.bio || "");
  const [headline, setHeadline] = React.useState(user?.headline || "");
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>(user?.skills || []);
  const [selectedInterests, setSelectedInterests] = React.useState<string[]>(user?.interests || []);
  const [followedCommunities, setFollowedCommunities] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const toggleCommunity = (id: string) => {
    setFollowedCommunities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    updateUser({
      bio,
      headline,
      skills: selectedSkills,
      interests: selectedInterests,
    });
    setIsSubmitting(false);
    toast.success("Welcome to CloudHub! 🎉");
    router.push("/dashboard");
  };

  const canProceed = () => {
    if (currentStep === 1) return true;
    if (currentStep === 2) return selectedSkills.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {/* Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, i) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                        currentStep > step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-4",
                        currentStep > step.id ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="text-center">
                      <h2 className="font-display text-2xl font-bold mb-1">Complete your profile</h2>
                      <p className="text-muted-foreground">Tell us a bit about yourself</p>
                    </div>

                    <div className="flex justify-center">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback className="text-2xl">
                            {user?.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                          onClick={() => toast.info("Avatar upload coming soon!")}
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">Headline</label>
                      <Input
                        placeholder="e.g., Full-Stack Developer @ TechCo"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">Bio</label>
                      <textarea
                        className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={300}
                      />
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        {bio.length}/300
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="text-center">
                      <h2 className="font-display text-2xl font-bold mb-1">Skills & Interests</h2>
                      <p className="text-muted-foreground">Help us personalize your experience</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Your Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {skillOptions.map((skill) => (
                          <Badge
                            key={skill}
                            variant={selectedSkills.includes(skill) ? "default" : "outline"}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleSkill(skill)}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Your Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {interestOptions.map((interest) => (
                          <Badge
                            key={interest}
                            variant={selectedInterests.includes(interest) ? "default" : "outline"}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleInterest(interest)}
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="text-center">
                      <h2 className="font-display text-2xl font-bold mb-1">Follow Communities</h2>
                      <p className="text-muted-foreground">Get notified about events from these communities</p>
                    </div>

                    <div className="space-y-3">
                      {mockCommunities.map((community, i) => (
                        <motion.div
                          key={community.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                            followedCommunities.includes(community.id)
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          )}
                          onClick={() => toggleCommunity(community.id)}
                        >
                          <Avatar>
                            <AvatarImage src={community.logo} />
                            <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{community.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {community.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {community.memberCount.toLocaleString()} members · {community.eventCount} events
                            </p>
                          </div>
                          {followedCommunities.includes(community.id) && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <p className="w-full text-sm font-medium mb-1">Suggested tags to follow</p>
                      {popularTags.slice(0, 12).map((tag) => (
                        <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-primary/10">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
