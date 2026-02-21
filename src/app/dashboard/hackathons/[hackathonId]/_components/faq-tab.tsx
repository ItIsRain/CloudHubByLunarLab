"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, HelpCircle, GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Hackathon, FAQItem } from "@/lib/types";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";

interface FAQTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const categoryOptions = ["General", "Registration", "Teams", "Submissions", "Prizes"];

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]";

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

export function FAQTab({ hackathon, hackathonId }: FAQTabProps) {
  const updateHackathon = useUpdateHackathon();
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    question: "",
    answer: "",
    category: "General",
  });

  const faqs: FAQItem[] = hackathon.faqs ?? [];

  const resetForm = () => {
    setFormData({ question: "", answer: "", category: "General" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Question and answer are required.");
      return;
    }

    let updatedFaqs: FAQItem[];

    if (editingId) {
      updatedFaqs = faqs.map((f) =>
        f.id === editingId
          ? { ...f, question: formData.question.trim(), answer: formData.answer.trim(), category: formData.category }
          : f
      );
    } else {
      const newFaq: FAQItem = {
        id: crypto.randomUUID(),
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        category: formData.category,
      };
      updatedFaqs = [...faqs, newFaq];
    }

    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        faqs: updatedFaqs,
      });
      toast.success(editingId ? "FAQ updated!" : "FAQ added!");
      resetForm();
    } catch {
      toast.error("Failed to save FAQ.");
    }
  };

  const handleEdit = (faq: FAQItem) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "General",
    });
    setEditingId(faq.id);
    setShowForm(true);
  };

  const handleRemove = async (faqId: string) => {
    const updatedFaqs = faqs.filter((f) => f.id !== faqId);
    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        faqs: updatedFaqs,
      });
      toast.success("FAQ removed.");
    } catch {
      toast.error("Failed to remove FAQ.");
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
          <h2 className="font-display text-2xl font-bold">FAQ</h2>
          <p className="text-sm text-muted-foreground">
            Manage frequently asked questions for participants
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </motion.div>

      {/* Add/Edit Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? "Edit Question" : "Add New Question"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question</label>
                  <Input
                    value={formData.question}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, question: e.target.value }))
                    }
                    placeholder="e.g. Who can participate in this hackathon?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Answer</label>
                  <textarea
                    value={formData.answer}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, answer: e.target.value }))
                    }
                    placeholder="Write a detailed answer..."
                    className={textareaClasses}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className={selectClasses}
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={updateHackathon.isPending}
                  >
                    {updateHackathon.isPending
                      ? "Saving..."
                      : editingId
                        ? "Update"
                        : "Add FAQ"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* FAQ List */}
      {faqs.length > 0 ? (
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group hover:shadow-md transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <HelpCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{faq.question}</p>
                          {faq.category && (
                            <Badge variant="outline" className="text-[10px] mt-1.5">
                              {faq.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(faq)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(faq.id)}
                            disabled={updateHackathon.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
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
                <HelpCircle className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                No FAQs Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add frequently asked questions to help participants find answers
                quickly.
              </p>
              <Button
                variant="gradient"
                onClick={() => setShowForm(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Question
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
