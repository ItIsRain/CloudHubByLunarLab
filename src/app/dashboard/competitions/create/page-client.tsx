"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  ListChecks,
  Layers,
  Shield,
  MapPin,
  Eye,
  Plus,
  Trash2,
  Check,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Settings2,
  ArrowLeft,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, slugify } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  useCreateCompetitionForm,
  useUpdateCompetitionForm,
} from "@/hooks/use-competitions";
import type {
  FormField,
  FormSection,
  FormFieldType,
  CompetitionType,
  CompetitionForm,
  ScreeningOperator,
  ScreeningRuleType,
} from "@/lib/types";
import { ImageUpload } from "@/components/forms/image-upload";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/forms/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="shimmer rounded-xl h-[200px]" /> }
);

// ── Types ────────────────────────────────────────────────

interface ScreeningRuleLocal {
  id?: string;
  name: string;
  description: string;
  ruleType: ScreeningRuleType;
  fieldId: string;
  operator: ScreeningOperator;
  value: string;
  enabled: boolean;
}

interface QuotaLocal {
  campus: string;
  quota: number;
}

// ── Sections ─────────────────────────────────────────────

const builderSections = [
  { id: "basic", title: "Basic Info", icon: <FileText className="h-4 w-4" /> },
  { id: "timeline", title: "Timeline & Settings", icon: <Calendar className="h-4 w-4" /> },
  { id: "fields", title: "Form Fields", icon: <ListChecks className="h-4 w-4" /> },
  { id: "sections", title: "Form Sections", icon: <Layers className="h-4 w-4" /> },
  { id: "screening", title: "Screening Rules", icon: <Shield className="h-4 w-4" /> },
  { id: "quotas", title: "Campus Quotas", icon: <MapPin className="h-4 w-4" /> },
  { id: "review", title: "Review & Publish", icon: <Eye className="h-4 w-4" /> },
];

const fieldTypes: { value: FormFieldType; label: string; icon: string }[] = [
  { value: "text", label: "Short Text", icon: "Aa" },
  { value: "textarea", label: "Long Text", icon: "T" },
  { value: "email", label: "Email", icon: "@" },
  { value: "phone", label: "Phone", icon: "#" },
  { value: "url", label: "URL", icon: "/" },
  { value: "number", label: "Number", icon: "1" },
  { value: "date", label: "Date", icon: "D" },
  { value: "select", label: "Dropdown", icon: "v" },
  { value: "multi_select", label: "Multi Select", icon: "+" },
  { value: "radio", label: "Radio", icon: "o" },
  { value: "checkbox", label: "Checkbox", icon: "x" },
  { value: "file", label: "File Upload", icon: "F" },
  { value: "heading", label: "Heading", icon: "H" },
  { value: "paragraph", label: "Paragraph", icon: "P" },
];

const competitionTypes: { value: CompetitionType; label: string }[] = [
  { value: "startup", label: "Startup Competition" },
  { value: "hackathon", label: "Hackathon" },
  { value: "pitch", label: "Pitch Competition" },
  { value: "innovation", label: "Innovation Challenge" },
  { value: "other", label: "Other" },
];

const operatorLabels: Record<ScreeningOperator, string> = {
  equals: "Equals",
  not_equals: "Not Equals",
  contains: "Contains",
  not_contains: "Does Not Contain",
  greater_than: "Greater Than",
  less_than: "Less Than",
  greater_equal: "Greater or Equal",
  less_equal: "Less or Equal",
  in: "In List",
  not_in: "Not In List",
  is_empty: "Is Empty",
  is_not_empty: "Is Not Empty",
  is_true: "Is True",
  is_false: "Is False",
};

const mappingKeys = [
  { value: "", label: "None" },
  { value: "applicant_name", label: "Applicant Name" },
  { value: "applicant_email", label: "Applicant Email" },
  { value: "applicant_phone", label: "Applicant Phone" },
  { value: "startup_name", label: "Startup Name" },
  { value: "campus", label: "Campus" },
  { value: "sector", label: "Sector" },
];

// ── Helper ───────────────────────────────────────────────

function generateId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Main Component ───────────────────────────────────────

interface CompetitionFormBuilderProps {
  initialData?: CompetitionForm;
  mode?: "create" | "edit";
}

export default function CreateCompetitionPage({ initialData, mode = "create" }: CompetitionFormBuilderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const createForm = useCreateCompetitionForm();
  const updateForm = useUpdateCompetitionForm();

  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Form State ──────────────────────────────────────
  const [title, setTitle] = useState(initialData?.title || "");
  const [competitionName, setCompetitionName] = useState(initialData?.competitionName || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [logo, setLogo] = useState(initialData?.logo || "");
  const [competitionType, setCompetitionType] = useState<CompetitionType>(initialData?.competitionType || "startup");
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || "#ff4400");

  // Timeline
  const [opensAt, setOpensAt] = useState(initialData?.opensAt || "");
  const [closesAt, setClosesAt] = useState(initialData?.closesAt || "");
  const [maxApplications, setMaxApplications] = useState(initialData?.maxApplications?.toString() || "");
  const [allowEditAfterSubmit, setAllowEditAfterSubmit] = useState(initialData?.allowEditAfterSubmit || false);
  const [confirmationEmailTemplate, setConfirmationEmailTemplate] = useState(initialData?.confirmationEmailTemplate || "");

  // Fields
  const [fields, setFields] = useState<FormField[]>(initialData?.fields || []);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  // Sections
  const [formSections, setFormSections] = useState<FormSection[]>(initialData?.sections || []);

  // Screening Rules (local state, synced on save)
  const [screeningRules, setScreeningRules] = useState<ScreeningRuleLocal[]>([]);

  // Campus Quotas
  const [quotas, setQuotas] = useState<QuotaLocal[]>([
    { campus: "Abu Dhabi", quota: 75 },
    { campus: "Al Ain", quota: 50 },
    { campus: "Al Dhafra", quota: 25 },
  ]);

  // ── Field Operations ────────────────────────────────

  const addField = useCallback((type: FormFieldType) => {
    const newField: FormField = {
      id: generateId(),
      type,
      label: "",
      placeholder: "",
      description: "",
      required: false,
      options: type === "select" || type === "multi_select" || type === "radio" ? [{ label: "Option 1", value: "option_1" }] : undefined,
      order: fields.length,
    };
    setFields((prev) => [...prev, newField]);
    setExpandedField(newField.id);
  }, [fields.length]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId).map((f, i) => ({ ...f, order: i })));
    setExpandedField(null);
  }, []);

  const duplicateField = useCallback((field: FormField) => {
    const newField: FormField = {
      ...field,
      id: generateId(),
      label: `${field.label} (copy)`,
      order: fields.length,
    };
    setFields((prev) => [...prev, newField]);
    setExpandedField(newField.id);
  }, [fields.length]);

  const moveField = useCallback((fieldId: string, direction: "up" | "down") => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldId);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  }, []);

  // ── Section Operations ──────────────────────────────

  const addSection = useCallback(() => {
    const newSection: FormSection = {
      id: generateId(),
      title: `Section ${formSections.length + 1}`,
      description: "",
      order: formSections.length,
    };
    setFormSections((prev) => [...prev, newSection]);
  }, [formSections.length]);

  const updateSection = useCallback((sectionId: string, updates: Partial<FormSection>) => {
    setFormSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)));
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setFormSections((prev) => prev.filter((s) => s.id !== sectionId).map((s, i) => ({ ...s, order: i })));
    // Clear sectionId from any fields
    setFields((prev) => prev.map((f) => (f.sectionId === sectionId ? { ...f, sectionId: undefined } : f)));
  }, []);

  // ── Screening Rule Operations ───────────────────────

  const addScreeningRule = useCallback(() => {
    setScreeningRules((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        ruleType: "hard",
        fieldId: "",
        operator: "equals",
        value: "",
        enabled: true,
      },
    ]);
  }, []);

  const updateScreeningRule = useCallback((index: number, updates: Partial<ScreeningRuleLocal>) => {
    setScreeningRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }, []);

  const removeScreeningRule = useCallback((index: number) => {
    setScreeningRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Save / Publish ──────────────────────────────────

  const buildPayload = () => ({
    title: title.trim(),
    competitionName: competitionName.trim(),
    description: description || undefined,
    coverImage: coverImage || undefined,
    logo: logo || undefined,
    competitionType,
    primaryColor,
    opensAt: opensAt || undefined,
    closesAt: closesAt || undefined,
    maxApplications: maxApplications ? Number(maxApplications) : undefined,
    allowEditAfterSubmit,
    confirmationEmailTemplate: confirmationEmailTemplate || undefined,
    fields,
    sections: formSections,
  });

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      setCurrentSection(0);
      return;
    }
    if (!competitionName.trim()) {
      toast.error("Competition name is required");
      setCurrentSection(0);
      return;
    }
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "edit" && initialData) {
        await updateForm.mutateAsync({
          formId: initialData.id,
          ...buildPayload(),
        });
        toast.success("Form updated!");
      } else {
        const result = await createForm.mutateAsync(buildPayload());
        toast.success("Form saved as draft!");
        router.push(`/dashboard/competitions/${result.data.id}/edit`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !competitionName.trim()) {
      toast.error("Title and competition name are required");
      setCurrentSection(0);
      return;
    }
    if (fields.length === 0) {
      toast.error("Add at least one form field");
      setCurrentSection(2);
      return;
    }
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setIsSubmitting(true);
    try {
      let formId = initialData?.id;

      if (mode === "edit" && initialData) {
        await updateForm.mutateAsync({
          formId: initialData.id,
          ...buildPayload(),
          status: "published",
        });
      } else {
        const result = await createForm.mutateAsync(buildPayload());
        formId = result.data.id;
        // Now publish it
        await updateForm.mutateAsync({
          formId: result.data.id,
          status: "published",
        });
      }

      // Save screening rules
      if (formId && screeningRules.length > 0) {
        for (const rule of screeningRules) {
          if (rule.name && rule.fieldId) {
            try {
              await fetch(`/api/competitions/${formId}/rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: rule.name,
                  description: rule.description || undefined,
                  ruleType: rule.ruleType,
                  fieldId: rule.fieldId,
                  operator: rule.operator,
                  value: rule.value || undefined,
                  enabled: rule.enabled,
                }),
              });
            } catch { /* continue */ }
          }
        }
      }

      // Save quotas
      if (formId && quotas.some((q) => q.quota > 0)) {
        try {
          await fetch(`/api/competitions/${formId}/quotas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quotas }),
          });
        } catch { /* continue */ }
      }

      toast.success("Competition form published!");
      router.push("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {mode === "edit" ? "Edit Competition Form" : "Create Competition Form"}
              </h1>
              <p className="text-muted-foreground">
                Build your application form, configure screening rules, and publish.
              </p>
            </div>
          </div>

          <div className="flex gap-8 mt-8">
            {/* Sidebar */}
            <nav className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-28 space-y-1">
                {builderSections.map((section, i) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setCurrentSection(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      currentSection === i
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {section.icon}
                    {section.title}
                    {i < currentSection && <Check className="ml-auto h-3.5 w-3.5 text-success" />}
                  </button>
                ))}

                <div className="pt-4 mt-4 border-t border-border space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                  >
                    Save Draft
                  </Button>
                  <Button
                    className="w-full"
                    onClick={handlePublish}
                    disabled={isSubmitting}
                  >
                    Publish Form
                  </Button>
                </div>
              </div>
            </nav>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Mobile section selector */}
              <div className="lg:hidden mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {builderSections.map((section, i) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setCurrentSection(i)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                      currentSection === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {section.icon}
                    {section.title}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* ── Section 0: Basic Info ────────────────── */}
                  {currentSection === 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <ImageUpload
                            value={coverImage}
                            onChange={setCoverImage}
                            label="Cover Image"
                            aspectRatio="video"
                          />
                          <ImageUpload
                            value={logo}
                            onChange={setLogo}
                            label="Logo"
                            aspectRatio="square"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Form Title *</label>
                          <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Startup Competition Application"
                            className="text-lg font-display"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Competition Name *</label>
                          <Input
                            value={competitionName}
                            onChange={(e) => setCompetitionName(e.target.value)}
                            placeholder="e.g. Khalifa Fund Tri-Campus Entrepreneurship Competition"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Describe the competition and what applicants should expect..."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Competition Type</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {competitionTypes.map((ct) => (
                              <button
                                key={ct.value}
                                type="button"
                                onClick={() => setCompetitionType(ct.value)}
                                className={cn(
                                  "rounded-xl border-2 p-2.5 text-center text-xs font-medium transition-all",
                                  competitionType === ct.value
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border hover:border-primary/30"
                                )}
                              >
                                {ct.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Brand Color
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="h-10 w-14 rounded-lg border border-border cursor-pointer"
                            />
                            <Input
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              placeholder="#ff4400"
                              className="max-w-[140px] font-mono text-sm"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Section 1: Timeline & Settings ───────── */}
                  {currentSection === 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Timeline & Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Applications Open</label>
                            <DateTimePicker value={opensAt} onChange={setOpensAt} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Applications Close</label>
                            <DateTimePicker value={closesAt} onChange={setClosesAt} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Max Applications (optional)</label>
                          <Input
                            type="number"
                            value={maxApplications}
                            onChange={(e) => setMaxApplications(e.target.value)}
                            placeholder="Leave blank for unlimited"
                            min={1}
                          />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowEditAfterSubmit}
                            onChange={(e) => setAllowEditAfterSubmit(e.target.checked)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div>
                            <span className="text-sm font-medium">Allow editing after submission</span>
                            <p className="text-xs text-muted-foreground">
                              Applicants can edit their submission until the deadline
                            </p>
                          </div>
                        </label>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Confirmation Email Template (optional)</label>
                          <RichTextEditor
                            value={confirmationEmailTemplate}
                            onChange={setConfirmationEmailTemplate}
                            placeholder="Custom message sent when application is submitted..."
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Section 2: Form Fields ───────────────── */}
                  {currentSection === 2 && (
                    <>
                      <Card>
                        <CardHeader className="flex-row items-center justify-between">
                          <div>
                            <CardTitle>Form Fields</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Build the fields applicants will fill out. {fields.length} field{fields.length !== 1 ? "s" : ""} added.
                            </p>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Field type picker */}
                          <div className="mb-6">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                              Add a field
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                              {fieldTypes.map((ft) => (
                                <button
                                  key={ft.value}
                                  type="button"
                                  onClick={() => addField(ft.value)}
                                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-2.5 text-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                  <span className="text-xs font-mono font-bold text-muted-foreground">
                                    {ft.icon}
                                  </span>
                                  <span className="text-[11px] font-medium leading-tight">{ft.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Field list */}
                          {fields.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-border rounded-xl">
                              <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                              <p className="text-sm font-medium">No fields yet</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Click a field type above to add your first field
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {fields.map((field) => (
                                <FieldEditor
                                  key={field.id}
                                  field={field}
                                  allFields={fields}
                                  sections={formSections}
                                  expanded={expandedField === field.id}
                                  onToggle={() =>
                                    setExpandedField(expandedField === field.id ? null : field.id)
                                  }
                                  onUpdate={(updates) => updateField(field.id, updates)}
                                  onRemove={() => removeField(field.id)}
                                  onDuplicate={() => duplicateField(field)}
                                  onMove={(dir) => moveField(field.id, dir)}
                                />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* ── Section 3: Form Sections ─────────────── */}
                  {currentSection === 3 && (
                    <Card>
                      <CardHeader className="flex-row items-center justify-between">
                        <div>
                          <CardTitle>Form Sections</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Organize fields into multi-step sections. Leave empty for a single-page form.
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addSection} className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Add Section
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {formSections.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-border rounded-xl">
                            <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm font-medium">No sections yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add sections to create a multi-step form wizard
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {formSections.map((section) => {
                              const sectionFields = fields.filter((f) => f.sectionId === section.id);
                              return (
                                <div
                                  key={section.id}
                                  className="rounded-xl border border-border p-4 space-y-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                      <Input
                                        value={section.title}
                                        onChange={(e) =>
                                          updateSection(section.id, { title: e.target.value })
                                        }
                                        placeholder="Section title"
                                        className="font-semibold"
                                      />
                                      <Input
                                        value={section.description || ""}
                                        onChange={(e) =>
                                          updateSection(section.id, { description: e.target.value })
                                        }
                                        placeholder="Section description (optional)"
                                        className="text-sm"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeSection(section.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {sectionFields.length} field{sectionFields.length !== 1 ? "s" : ""} in
                                    this section
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Section 4: Screening Rules ───────────── */}
                  {currentSection === 4 && (
                    <Card>
                      <CardHeader className="flex-row items-center justify-between">
                        <div>
                          <CardTitle>Screening Rules</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Define automated eligibility checks. Hard rules reject; soft rules flag for review.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addScreeningRule}
                          className="gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Rule
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {screeningRules.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-border rounded-xl">
                            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm font-medium">No screening rules yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add rules to automatically screen applications for eligibility
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {screeningRules.map((rule, index) => (
                              <div
                                key={index}
                                className="rounded-xl border border-border p-4 space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 grid gap-3 sm:grid-cols-2">
                                    <Input
                                      value={rule.name}
                                      onChange={(e) =>
                                        updateScreeningRule(index, { name: e.target.value })
                                      }
                                      placeholder="Rule name (e.g. Age Check)"
                                    />
                                    <Input
                                      value={rule.description}
                                      onChange={(e) =>
                                        updateScreeningRule(index, { description: e.target.value })
                                      }
                                      placeholder="Description (optional)"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeScreeningRule(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-4">
                                  <select
                                    value={rule.ruleType}
                                    onChange={(e) =>
                                      updateScreeningRule(index, {
                                        ruleType: e.target.value as ScreeningRuleType,
                                      })
                                    }
                                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                  >
                                    <option value="hard">Hard (reject)</option>
                                    <option value="soft">Soft (flag)</option>
                                  </select>

                                  <select
                                    value={rule.fieldId}
                                    onChange={(e) =>
                                      updateScreeningRule(index, { fieldId: e.target.value })
                                    }
                                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                  >
                                    <option value="">Select field...</option>
                                    {fields.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.label || f.id}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={rule.operator}
                                    onChange={(e) =>
                                      updateScreeningRule(index, {
                                        operator: e.target.value as ScreeningOperator,
                                      })
                                    }
                                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                  >
                                    {(Object.keys(operatorLabels) as ScreeningOperator[]).map((op) => (
                                      <option key={op} value={op}>
                                        {operatorLabels[op]}
                                      </option>
                                    ))}
                                  </select>

                                  <Input
                                    value={rule.value}
                                    onChange={(e) =>
                                      updateScreeningRule(index, { value: e.target.value })
                                    }
                                    placeholder="Value"
                                  />
                                </div>

                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={rule.enabled}
                                    onChange={(e) =>
                                      updateScreeningRule(index, { enabled: e.target.checked })
                                    }
                                    className="h-3.5 w-3.5 rounded border-input"
                                  />
                                  <span className="text-xs">Enabled</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Section 5: Campus Quotas ─────────────── */}
                  {currentSection === 5 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Campus Quotas</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Set the maximum number of accepted applicants per campus.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {quotas.map((q, i) => (
                            <div key={q.campus} className="flex items-center gap-4">
                              <div className="flex-1">
                                <label className="text-sm font-medium">{q.campus}</label>
                              </div>
                              <Input
                                type="number"
                                value={q.quota}
                                onChange={(e) => {
                                  const updated = [...quotas];
                                  updated[i] = { ...q, quota: Number(e.target.value) };
                                  setQuotas(updated);
                                }}
                                min={0}
                                className="max-w-[120px] text-center"
                              />
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-4 border-t border-border">
                            <span className="text-sm text-muted-foreground">Total Quota</span>
                            <span className="font-mono font-bold">
                              {quotas.reduce((s, q) => s + q.quota, 0)}
                            </span>
                          </div>

                          {/* Add custom campus */}
                          <div className="pt-2">
                            <AddCampusQuota
                              existingCampuses={quotas.map((q) => q.campus)}
                              onAdd={(campus) =>
                                setQuotas((prev) => [...prev, { campus, quota: 0 }])
                              }
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Section 6: Review & Publish ──────────── */}
                  {currentSection === 6 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Review & Publish</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Form Title
                            </p>
                            <p className="font-semibold">{title || "Untitled"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Competition Name
                            </p>
                            <p className="font-semibold">{competitionName || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Type
                            </p>
                            <p className="font-semibold capitalize">{competitionType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Opens
                            </p>
                            <p className="font-semibold">
                              {opensAt ? new Date(opensAt).toLocaleDateString() : "Not set"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Closes
                            </p>
                            <p className="font-semibold">
                              {closesAt ? new Date(closesAt).toLocaleDateString() : "Not set"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Brand Color
                            </p>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-5 w-5 rounded-full border border-border"
                                style={{ backgroundColor: primaryColor }}
                              />
                              <span className="font-mono text-sm">{primaryColor}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-4 pt-4 border-t border-border">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{fields.length}</p>
                            <p className="text-xs text-muted-foreground">Fields</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{formSections.length}</p>
                            <p className="text-xs text-muted-foreground">Sections</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{screeningRules.length}</p>
                            <p className="text-xs text-muted-foreground">Rules</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {quotas.reduce((s, q) => s + q.quota, 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total Quota</p>
                          </div>
                        </div>

                        {/* Field summary */}
                        {fields.length > 0 && (
                          <div className="pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                              Form Fields
                            </p>
                            <div className="space-y-1.5">
                              {fields.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="muted" className="text-[10px] font-mono">
                                      {f.type}
                                    </Badge>
                                    <span>{f.label || "(untitled)"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {f.required && (
                                      <Badge variant="outline" className="text-[10px]">
                                        Required
                                      </Badge>
                                    )}
                                    {f.mappingKey && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        {f.mappingKey}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={isSubmitting}
                          >
                            Save as Draft
                          </Button>
                          <Button
                            type="button"
                            onClick={handlePublish}
                            disabled={isSubmitting}
                            size="lg"
                            className="gap-2"
                          >
                            Publish Competition Form
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              {currentSection < builderSections.length - 1 && (
                <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                    disabled={currentSection === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Section {currentSection + 1} of {builderSections.length}
                  </span>
                  <Button
                    type="button"
                    onClick={() =>
                      setCurrentSection(
                        Math.min(builderSections.length - 1, currentSection + 1)
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Field Editor ─────────────────────────────────────────

function FieldEditor({
  field,
  allFields,
  sections,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
}: {
  field: FormField;
  allFields: FormField[];
  sections: FormSection[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const hasOptions = field.type === "select" || field.type === "multi_select" || field.type === "radio";
  const isLayout = field.type === "heading" || field.type === "paragraph";

  return (
    <div className={cn("rounded-xl border transition-all", expanded ? "border-primary/40 bg-primary/[0.02]" : "border-border")}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <Badge variant="muted" className="text-[10px] font-mono shrink-0">
          {field.type}
        </Badge>
        <span className="text-sm font-medium truncate flex-1">
          {field.label || "(untitled field)"}
        </span>
        {field.required && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            Required
          </Badge>
        )}
        {field.mappingKey && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {field.mappingKey}
          </Badge>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMove("up"); }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMove("down"); }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Label *</label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Field label"
              />
            </div>
            {!isLayout && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Placeholder</label>
                <Input
                  value={field.placeholder || ""}
                  onChange={(e) => onUpdate({ placeholder: e.target.value })}
                  placeholder="Placeholder text"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Help Text</label>
            <Input
              value={field.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Help text shown below the field"
            />
          </div>

          {!isLayout && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-input"
                />
                <span className="text-sm">Required</span>
              </label>

              {sections.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Section</label>
                  <select
                    value={field.sectionId || ""}
                    onChange={(e) => onUpdate({ sectionId: e.target.value || undefined })}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="">No section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mapping Key</label>
                <select
                  value={field.mappingKey || ""}
                  onChange={(e) =>
                    onUpdate({
                      mappingKey: (e.target.value || undefined) as FormField["mappingKey"],
                    })
                  }
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                >
                  {mappingKeys.map((mk) => (
                    <option key={mk.value} value={mk.value}>
                      {mk.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Options for select/radio/multi_select */}
          {hasOptions && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Options</label>
              {(field.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const updated = [...(field.options || [])];
                      updated[i] = {
                        label: e.target.value,
                        value: slugify(e.target.value) || `option_${i + 1}`,
                      };
                      onUpdate({ options: updated });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (field.options || []).filter((_, j) => j !== i);
                      onUpdate({ options: updated });
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onUpdate({
                    options: [
                      ...(field.options || []),
                      {
                        label: `Option ${(field.options?.length || 0) + 1}`,
                        value: `option_${(field.options?.length || 0) + 1}`,
                      },
                    ],
                  })
                }
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            </div>
          )}

          {/* Validation */}
          {!isLayout && field.type !== "checkbox" && field.type !== "file" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Validation
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(field.type === "text" || field.type === "textarea" || field.type === "email" || field.type === "phone" || field.type === "url") && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Min Length</label>
                      <Input
                        type="number"
                        value={field.validation?.minLength ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              minLength: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        min={0}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Max Length</label>
                      <Input
                        type="number"
                        value={field.validation?.maxLength ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              maxLength: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        min={0}
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
                {field.type === "number" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Min Value</label>
                      <Input
                        type="number"
                        value={field.validation?.min ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              min: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Max Value</label>
                      <Input
                        type="number"
                        value={field.validation?.max ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              max: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Conditional Logic */}
          {!isLayout && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!field.conditionalOn}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUpdate({
                        conditionalOn: {
                          fieldId: "",
                          operator: "equals",
                          value: "",
                        },
                      });
                    } else {
                      onUpdate({ conditionalOn: undefined });
                    }
                  }}
                  className="h-3.5 w-3.5 rounded border-input"
                />
                <span className="text-xs font-medium">Conditional visibility</span>
              </label>
              {field.conditionalOn && (
                <div className="grid gap-2 sm:grid-cols-3 pl-6">
                  <select
                    value={field.conditionalOn.fieldId}
                    onChange={(e) =>
                      onUpdate({
                        conditionalOn: { ...field.conditionalOn!, fieldId: e.target.value },
                      })
                    }
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="">Select field...</option>
                    {allFields
                      .filter((f) => f.id !== field.id)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label || f.id}
                        </option>
                      ))}
                  </select>
                  <select
                    value={field.conditionalOn.operator}
                    onChange={(e) =>
                      onUpdate({
                        conditionalOn: {
                          ...field.conditionalOn!,
                          operator: e.target.value as "equals" | "not_equals" | "contains" | "is_not_empty",
                        },
                      })
                    }
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="is_not_empty">Is Not Empty</option>
                  </select>
                  {field.conditionalOn.operator !== "is_not_empty" && (
                    <Input
                      value={field.conditionalOn.value || ""}
                      onChange={(e) =>
                        onUpdate({
                          conditionalOn: { ...field.conditionalOn!, value: e.target.value },
                        })
                      }
                      placeholder="Value"
                      className="text-sm"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onDuplicate} className="text-xs gap-1">
              <Copy className="h-3 w-3" /> Duplicate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-xs gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Campus Quota ─────────────────────────────────────

function AddCampusQuota({
  existingCampuses,
  onAdd,
}: {
  existingCampuses: string[];
  onAdd: (campus: string) => void;
}) {
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingCampuses.includes(trimmed)) {
      toast.error("Campus already exists");
      return;
    }
    onAdd(trimmed);
    setName("");
  };

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add custom campus..."
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
        className="text-sm"
      />
      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
