"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Send,
  Scale,
  UserPlus,
  Star,
  Trophy,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { Hackathon, JudgingCriteria, User } from "@/lib/types";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import { useSendJudgeInvitation } from "@/hooks/use-judge-invitation";
import { toast } from "sonner";

interface JudgingTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const criteriaColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
];

export function JudgingTab({ hackathon, hackathonId }: JudgingTabProps) {
  const updateHackathon = useUpdateHackathon();
  const sendInvitation = useSendJudgeInvitation();
  const { data: submissionsData } = useHackathonSubmissions(hackathonId);

  const submissions = submissionsData?.data ?? [];
  const totalSubmissions = submissions.length;
  const totalScored = submissions.filter(
    (s) => s.scores && s.scores.length > 0
  ).length;
  const allScored = totalSubmissions > 0 && totalScored >= totalSubmissions;

  // Judging criteria state
  const [criteria, setCriteria] = React.useState<JudgingCriteria[]>([]);
  const [newCriteriaName, setNewCriteriaName] = React.useState("");
  const [newCriteriaDescription, setNewCriteriaDescription] =
    React.useState("");
  const [newCriteriaWeight, setNewCriteriaWeight] = React.useState(25);
  const [newCriteriaMaxScore, setNewCriteriaMaxScore] = React.useState(10);

  // Judge invitation state
  const [judgeName, setJudgeName] = React.useState("");
  const [judgeEmail, setJudgeEmail] = React.useState("");

  React.useEffect(() => {
    setCriteria(hackathon.judgingCriteria || []);
  }, [hackathon]);

  const handleAddCriteria = () => {
    if (!newCriteriaName.trim()) {
      toast.error("Criteria name is required.");
      return;
    }
    const newCriteria: JudgingCriteria = {
      id: `criteria-${Date.now()}`,
      name: newCriteriaName.trim(),
      description: newCriteriaDescription.trim(),
      weight: newCriteriaWeight,
      maxScore: newCriteriaMaxScore,
    };
    setCriteria((prev) => [...prev, newCriteria]);
    setNewCriteriaName("");
    setNewCriteriaDescription("");
    setNewCriteriaWeight(25);
    setNewCriteriaMaxScore(10);
  };

  const handleRemoveCriteria = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCriteria = async () => {
    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        judgingCriteria: criteria,
      });
      toast.success("Judging criteria saved!");
    } catch {
      toast.error("Failed to save criteria.");
    }
  };

  const handleAddJudge = async () => {
    if (!judgeName.trim() || !judgeEmail.trim()) {
      toast.error("Please enter both name and email.");
      return;
    }
    try {
      await sendInvitation.mutateAsync({
        hackathonId,
        name: judgeName.trim(),
        email: judgeEmail.trim(),
      });

      // Also add judge to hackathon's judges array
      const newJudge: Partial<User> = {
        id: `judge-${Date.now()}`,
        name: judgeName.trim(),
        email: judgeEmail.trim(),
        avatar: undefined,
      };
      const updatedJudges = [...(hackathon.judges || []), newJudge as User];
      await updateHackathon.mutateAsync({
        id: hackathonId,
        judges: updatedJudges,
      });

      toast.success(`Invitation sent to ${judgeName}!`);
      setJudgeName("");
      setJudgeEmail("");
    } catch {
      toast.error("Failed to send judge invitation.");
    }
  };

  const handlePublishResults = () => {
    toast.success("Results published! Winners have been notified.");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Judging</h2>
          <p className="text-muted-foreground mt-1">
            Manage judging criteria, judges, and scoring
          </p>
        </div>
        <Button
          variant="gradient"
          disabled={!allScored}
          onClick={handlePublishResults}
        >
          <Trophy className="h-4 w-4" />
          Publish Results
        </Button>
      </motion.div>

      {/* Scoring Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Scoring Progress</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                {totalScored}/{totalSubmissions} submissions scored
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width:
                    totalSubmissions > 0
                      ? `${(totalScored / totalSubmissions) * 100}%`
                      : "0%",
                }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              />
            </div>
            {!allScored && totalSubmissions > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                All submissions must be scored before publishing results.
              </p>
            )}
            {totalSubmissions === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                No submissions have been received yet.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Judging Criteria */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Judging Criteria</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveCriteria}
                  disabled={updateHackathon.isPending}
                >
                  <Scale className="h-4 w-4" />
                  {updateHackathon.isPending ? "Saving..." : "Save Criteria"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing criteria */}
              {criteria.length > 0 && (
                <div className="space-y-4">
                  {criteria.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">
                            {c.name}
                          </span>
                          {c.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {c.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-muted-foreground">
                            {c.weight}% (max {c.maxScore})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCriteria(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            criteriaColors[i % criteriaColors.length]
                          )}
                          style={{ width: `${c.weight}%` }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {criteria.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No judging criteria defined yet. Add your first criteria
                  below.
                </p>
              )}

              {/* Add new criteria form */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Add New Criteria</p>
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    placeholder="Criteria name (e.g., Innovation)"
                    value={newCriteriaName}
                    onChange={(e) => setNewCriteriaName(e.target.value)}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newCriteriaDescription}
                    onChange={(e) =>
                      setNewCriteriaDescription(e.target.value)
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Weight (%)
                      </label>
                      <Input
                        type="number"
                        value={newCriteriaWeight}
                        onChange={(e) =>
                          setNewCriteriaWeight(Number(e.target.value))
                        }
                        min={1}
                        max={100}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Max Score
                      </label>
                      <Input
                        type="number"
                        value={newCriteriaMaxScore}
                        onChange={(e) =>
                          setNewCriteriaMaxScore(Number(e.target.value))
                        }
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCriteria}
                  >
                    <Plus className="h-4 w-4" />
                    Add Criteria
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Judges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Judges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing judges */}
              {hackathon.judges && hackathon.judges.length > 0 ? (
                <div className="space-y-3">
                  {hackathon.judges.map((judge, i) => (
                    <motion.div
                      key={judge.id || `judge-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30"
                    >
                      <Avatar size="sm">
                        <AvatarImage
                          src={judge.avatar}
                          alt={judge.name}
                        />
                        <AvatarFallback>
                          {getInitials(judge.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{judge.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {judge.email}
                        </p>
                      </div>
                      <Badge variant="muted" className="text-xs">
                        Judge
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No judges have been added yet. Invite judges below.
                </p>
              )}

              {/* Add judge form */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Invite a Judge</p>
                <Input
                  placeholder="Judge name"
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Judge email"
                  value={judgeEmail}
                  onChange={(e) => setJudgeEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddJudge();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddJudge}
                  disabled={sendInvitation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4" />
                  {sendInvitation.isPending
                    ? "Sending..."
                    : "Send Invitation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
