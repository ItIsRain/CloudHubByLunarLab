"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  FileText,
  ChevronUp,
  ChevronDown,
  Layers,
  Mail,
  GripVertical,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FieldEditor,
  fieldEditorSelectClasses as selectClasses,
  allowedFileTypePresets,
  fileSizeOptions,
} from "@/components/forms/form-field-editor";
import type {
  Hackathon,
  FormField,
  FormFieldType,
  FormSection,
} from "@/lib/types";

// â”€â”€ Types & Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FormBuilderTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateFieldId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateSectionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultField(sectionId: string, order: number): FormField {
  return {
    id: generateFieldId(),
    type: "text",
    label: "",
    placeholder: "",
    required: false,
    sectionId,
    order,
  };
}

function createDefaultSection(order: number): FormSection {
  return {
    id: generateSectionId(),
    title: order === 0 ? "Basic Information" : `Section ${order + 1}`,
    description: "",
    order,
  };
}

// â”€â”€ Quick-add presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getContactInfoFields(sectionId: string, startOrder: number): FormField[] {
  return [
    {
      id: generateFieldId(),
      type: "text",
      label: "Full Name",
      placeholder: "Enter your full name",
      required: true,
      sectionId,
      order: startOrder,
    },
    {
      id: generateFieldId(),
      type: "email",
      label: "Email Address",
      placeholder: "you@example.com",
      required: true,
      sectionId,
      order: startOrder + 1,
    },
    {
      id: generateFieldId(),
      type: "phone",
      label: "Phone Number",
      placeholder: "+971 50 123 4567",
      required: false,
      sectionId,
      order: startOrder + 2,
    },
  ];
}

function getStartupDetailsFields(sectionId: string, startOrder: number): FormField[] {
  return [
    {
      id: generateFieldId(),
      type: "text",
      label: "Startup Name",
      placeholder: "Enter your startup name",
      required: true,
      sectionId,
      order: startOrder,
    },
    {
      id: generateFieldId(),
      type: "select",
      label: "Sector",
      placeholder: "Select your sector",
      required: true,
      sectionId,
      order: startOrder + 1,
      options: [
        { label: "FinTech", value: "fintech" },
        { label: "HealthTech", value: "healthtech" },
        { label: "EdTech", value: "edtech" },
        { label: "CleanTech", value: "cleantech" },
        { label: "E-Commerce", value: "ecommerce" },
        { label: "AI / ML", value: "ai-ml" },
        { label: "SaaS", value: "saas" },
        { label: "Other", value: "other" },
      ],
    },
    {
      id: generateFieldId(),
      type: "select",
      label: "Campus",
      placeholder: "Select your campus",
      required: true,
      sectionId,
      order: startOrder + 2,
      options: [
        { label: "Abu Dhabi", value: "abu_dhabi" },
        { label: "Al Ain", value: "al_ain" },
        { label: "Al Dhafra", value: "al_dhafra" },
      ],
    },
  ];
}

function getTeamInfoFields(sectionId: string, startOrder: number): FormField[] {
  return [
    {
      id: generateFieldId(),
      type: "text",
      label: "Team Name",
      placeholder: "Enter your team name",
      required: true,
      sectionId,
      order: startOrder,
    },
    {
      id: generateFieldId(),
      type: "number",
      label: "Team Size",
      placeholder: "Number of team members",
      required: true,
      sectionId,
      order: startOrder + 1,
      validation: { min: 1, max: 10 },
    },
    {
      id: generateFieldId(),
      type: "select",
      label: "Experience Level",
      required: false,
      sectionId,
      order: startOrder + 2,
      options: [
        { label: "Beginner", value: "beginner" },
        { label: "Intermediate", value: "intermediate" },
        { label: "Advanced", value: "advanced" },
        { label: "Expert", value: "expert" },
      ],
    },
  ];
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function FormBuilderTab({ hackathon, hackathonId }: FormBuilderTabProps) {
  const updateHackathon = useUpdateHackathon();

  // Initialize sections from existing fields or create default
  const [sections, setSections] = React.useState<FormSection[]>(() => {
    const existingFields = hackathon.registrationFields || [];
    const savedSections = hackathon.registrationSections || [];

    // Prefer persisted section metadata (titles, descriptions, order) when present.
    if (savedSections.length > 0) {
      // Ensure every field-referenced sectionId exists in the section list; append
      // defaults for any orphans so we don't lose fields whose section was deleted upstream.
      const knownIds = new Set(savedSections.map((s) => s.id));
      const orphanIds = new Set<string>();
      existingFields.forEach((f) => {
        if (f.sectionId && !knownIds.has(f.sectionId)) orphanIds.add(f.sectionId);
      });
      const orphanSections: FormSection[] = Array.from(orphanIds).map((sid, i) => ({
        id: sid,
        title: `Section ${savedSections.length + i + 1}`,
        description: "",
        order: savedSections.length + i,
      }));
      return [...savedSections, ...orphanSections].sort((a, b) => a.order - b.order);
    }

    if (existingFields.length === 0) return [];

    // Legacy fallback: no persisted sections, reconstruct from unique sectionIds.
    const sectionIds = new Set<string>();
    existingFields.forEach((f) => {
      if (f.sectionId) sectionIds.add(f.sectionId);
    });

    if (sectionIds.size === 0) {
      const defaultSection = createDefaultSection(0);
      return [defaultSection];
    }

    return Array.from(sectionIds).map((sid, i) => ({
      id: sid,
      title: i === 0 ? "Basic Information" : `Section ${i + 1}`,
      description: "",
      order: i,
    }));
  });

  const [fields, setFields] = React.useState<FormField[]>(() => {
    const existingFields = hackathon.registrationFields || [];
    if (existingFields.length === 0) return [];

    // If fields have no sectionId, assign them to the first section
    if (sections.length > 0 && existingFields.some((f) => !f.sectionId)) {
      return existingFields.map((f) => ({
        ...f,
        sectionId: f.sectionId || sections[0]?.id,
      }));
    }
    return existingFields;
  });

  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(
    sections[0]?.id || null
  );
  const [showPreview, setShowPreview] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Previous fields snapshot for detecting new required fields
  const prevFieldsRef = React.useRef<FormField[]>(hackathon.registrationFields || []);

  // Fields for the active section
  const activeFields = React.useMemo(
    () =>
      fields
        .filter((f) => f.sectionId === activeSectionId)
        .sort((a, b) => a.order - b.order),
    [fields, activeSectionId]
  );

  // Total field count (excluding layout types)
  const inputFieldCount = fields.filter(
    (f) => f.type !== "heading" && f.type !== "paragraph"
  ).length;

  // â”€â”€ Section management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function addSection() {
    const newSection = createDefaultSection(sections.length);
    setSections((prev) => [...prev, newSection]);
    setActiveSectionId(newSection.id);
  }

  function updateSection(sectionId: string, updates: Partial<FormSection>) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  }

  function removeSection(sectionId: string) {
    if (sections.length <= 1) {
      toast.error("You must have at least one page.");
      return;
    }
    const sectionFields = fields.filter((f) => f.sectionId === sectionId);
    if (sectionFields.length > 0) {
      const confirmRemove = window.confirm(
        `This page has ${sectionFields.length} field(s). Deleting the page will also remove all its fields. Continue?`
      );
      if (!confirmRemove) return;
    }
    setFields((prev) => prev.filter((f) => f.sectionId !== sectionId));
    setSections((prev) => {
      const remaining = prev
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i }));
      // Switch active section if the deleted one was active
      if (activeSectionId === sectionId && remaining.length > 0) {
        setActiveSectionId(remaining[0].id);
      }
      return remaining;
    });
  }

  function moveSectionUp(index: number) {
    if (index === 0) return;
    setSections((prev) => {
      const updated = [...prev];
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }

  function moveSectionDown(index: number) {
    if (index >= sections.length - 1) return;
    setSections((prev) => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }

  // â”€â”€ Field management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function addField() {
    if (!activeSectionId) return;
    const sectionFieldCount = fields.filter(
      (f) => f.sectionId === activeSectionId
    ).length;
    const newField = createDefaultField(activeSectionId, sectionFieldCount);
    setFields((prev) => [...prev, newField]);
  }

  function updateField(fieldId: string, updates: Partial<FormField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  }

  function removeField(fieldId: string) {
    setFields((prev) => {
      const field = prev.find((f) => f.id === fieldId);
      if (!field) return prev;
      return prev
        .filter((f) => f.id !== fieldId)
        .map((f) => {
          if (f.sectionId === field.sectionId && f.order > field.order) {
            return { ...f, order: f.order - 1 };
          }
          return f;
        });
    });
  }

  function duplicateField(fieldId: string) {
    const original = fields.find((f) => f.id === fieldId);
    if (!original) return;
    const newField: FormField = {
      ...original,
      id: generateFieldId(),
      label: `${original.label} (copy)`,
      order: original.order + 1,
    };
    setFields((prev) => {
      // Shift orders for fields after the original in the same section
      const updated = prev.map((f) => {
        if (f.sectionId === original.sectionId && f.order > original.order) {
          return { ...f, order: f.order + 1 };
        }
        return f;
      });
      return [...updated, newField];
    });
  }

  function moveFieldUp(fieldId: string) {
    setFields((prev) => {
      const field = prev.find((f) => f.id === fieldId);
      if (!field || field.order === 0) return prev;
      return prev.map((f) => {
        if (f.id === fieldId) return { ...f, order: f.order - 1 };
        if (
          f.sectionId === field.sectionId &&
          f.order === field.order - 1
        ) {
          return { ...f, order: f.order + 1 };
        }
        return f;
      });
    });
  }

  function moveFieldDown(fieldId: string) {
    setFields((prev) => {
      const field = prev.find((f) => f.id === fieldId);
      if (!field) return prev;
      const maxOrder = prev.filter(
        (f) => f.sectionId === field.sectionId
      ).length - 1;
      if (field.order >= maxOrder) return prev;
      return prev.map((f) => {
        if (f.id === fieldId) return { ...f, order: f.order + 1 };
        if (
          f.sectionId === field.sectionId &&
          f.order === field.order + 1
        ) {
          return { ...f, order: f.order - 1 };
        }
        return f;
      });
    });
  }

  // â”€â”€ Quick-add presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function addPreset(
    presetFn: (sectionId: string, startOrder: number) => FormField[]
  ) {
    let targetSectionId = activeSectionId;

    // If no sections exist, create the first one
    if (!targetSectionId || sections.length === 0) {
      const newSection = createDefaultSection(0);
      setSections([newSection]);
      targetSectionId = newSection.id;
      setActiveSectionId(newSection.id);
    }

    const existingCount = fields.filter(
      (f) => f.sectionId === targetSectionId
    ).length;
    const presetFields = presetFn(targetSectionId!, existingCount);
    setFields((prev) => [...prev, ...presetFields]);
    toast.success(`Added ${presetFields.length} fields`);
  }

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleSave() {
    // Validate that all fields have labels
    const unlabeled = fields.filter(
      (f) => !f.label.trim() && f.type !== "heading" && f.type !== "paragraph"
    );
    if (unlabeled.length > 0) {
      toast.error(
        `${unlabeled.length} field(s) are missing labels. Please fill them in before saving.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        registrationFields: fields,
        registrationSections: sections,
      });

      // Detect new required fields
      const prevRequiredIds = new Set(
        prevFieldsRef.current
          .filter((f) => f.required)
          .map((f) => f.id)
      );
      const newRequiredFields = fields.filter(
        (f) => f.required && !prevRequiredIds.has(f.id)
      );
      if (
        newRequiredFields.length > 0 &&
        hackathon.participantCount > 0
      ) {
        toast.info(
          "New required fields added. Existing registrants will be notified.",
          { duration: 5000 }
        );
      }

      prevFieldsRef.current = fields;
      toast.success("Application form saved successfully");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save form. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const isEmpty = fields.length === 0 && sections.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Application Form Builder</h2>
            <p className="text-sm text-muted-foreground">
              Design the registration form for participants
            </p>
          </div>
          {inputFieldCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {inputFieldCount} field{inputFieldCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4 mr-1.5" />
            ) : (
              <Eye className="h-4 w-4 mr-1.5" />
            )}
            {showPreview ? "Edit" : "Preview"}
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isEmpty}
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? "Saving..." : "Save Form"}
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && !showPreview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center text-center max-w-md mx-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Layers className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Start Building Your Application Form
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Create a multi-page form to collect information from
                  hackathon applicants. Use presets to get started quickly
                  or build from scratch.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addPreset(getContactInfoFields)}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Add Contact Info
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addPreset(getStartupDetailsFields)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Add Startup Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addPreset(getTeamInfoFields)}
                  >
                    <Layers className="h-3.5 w-3.5 mr-1.5" />
                    Add Team Info
                  </Button>
                </div>
                <div className="mt-4">
                  <Button variant="ghost" size="sm" onClick={addSection}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Start from Scratch
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Preview Mode */}
      {showPreview && !isEmpty && (
        <FormPreview sections={sections} fields={fields} />
      )}

      {/* Builder Mode */}
      {!showPreview && !isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar: Pages/Sections */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Pages</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addSection}
                    className="h-7 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Page
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {sections
                    .sort((a, b) => a.order - b.order)
                    .map((section, idx) => {
                      const sectionFieldCount = fields.filter(
                        (f) => f.sectionId === section.id
                      ).length;
                      const isActive = activeSectionId === section.id;
                      return (
                        <motion.div
                          key={section.id}
                          layout
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all",
                            isActive
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                          onClick={() => setActiveSectionId(section.id)}
                        >
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium truncate",
                                isActive && "text-primary"
                              )}
                            >
                              {section.title || "(Untitled)"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {sectionFieldCount} field
                              {sectionFieldCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSectionUp(idx);
                              }}
                              className="p-0.5 text-muted-foreground hover:text-foreground"
                              title="Move up"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSectionDown(idx);
                              }}
                              className="p-0.5 text-muted-foreground hover:text-foreground"
                              title="Move down"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSection(section.id);
                              }}
                              className="p-0.5 text-muted-foreground hover:text-destructive"
                              title="Delete page"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Quick-add Presets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Quick Add
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => addPreset(getContactInfoFields)}
                >
                  <Mail className="h-3 w-3 mr-2" /> Contact Info
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => addPreset(getStartupDetailsFields)}
                >
                  <FileText className="h-3 w-3 mr-2" /> Startup Details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => addPreset(getTeamInfoFields)}
                >
                  <Layers className="h-3 w-3 mr-2" /> Team Info
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main: Active Section Fields */}
          <div className="space-y-4">
            {/* Active section header */}
            {activeSectionId && (
              <ActiveSectionHeader
                section={sections.find((s) => s.id === activeSectionId)!}
                onUpdate={(updates) =>
                  updateSection(activeSectionId, updates)
                }
              />
            )}

            {/* Fields list */}
            {activeFields.length === 0 && activeSectionId && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">
                      No fields on this page yet
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add fields to collect information from applicants.
                    </p>
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <AnimatePresence mode="popLayout">
              {activeFields.map((field) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <FieldEditor
                    field={field}
                    allFields={fields}
                    onUpdate={(updates) => updateField(field.id, updates)}
                    onRemove={() => removeField(field.id)}
                    onDuplicate={() => duplicateField(field.id)}
                    onMoveUp={() => moveFieldUp(field.id)}
                    onMoveDown={() => moveFieldDown(field.id)}
                    isFirst={field.order === 0}
                    isLast={
                      field.order ===
                      fields.filter(
                        (f) => f.sectionId === field.sectionId
                      ).length - 1
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Field Button */}
            {activeSectionId && activeFields.length > 0 && (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={addField}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Field
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// â”€â”€ Active Section Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ActiveSectionHeader({
  section,
  onUpdate,
}: {
  section: FormSection;
  onUpdate: (updates: Partial<FormSection>) => void;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Page Title
            </label>
            <Input
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Page title"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Input
              value={section.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Brief description for this page"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// â”€â”€ Form Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FormPreview({
  sections,
  fields,
}: {
  sections: FormSection[];
  fields: FormField[];
}) {
  const [activePageIndex, setActivePageIndex] = React.useState(0);
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const activeSection = sortedSections[activePageIndex];

  const pageFields = activeSection
    ? fields
        .filter((f) => f.sectionId === activeSection.id)
        .sort((a, b) => a.order - b.order)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Form Preview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                This is how the form will appear to applicants.
              </p>
            </div>
            <Badge variant="outline">
              Page {activePageIndex + 1} of {sortedSections.length}
            </Badge>
          </div>
          {/* Page tabs */}
          {sortedSections.length > 1 && (
            <div className="flex gap-1 mt-3 overflow-x-auto">
              {sortedSections.map((section, idx) => (
                <Button
                  key={section.id}
                  variant={idx === activePageIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePageIndex(idx)}
                  className="text-xs whitespace-nowrap"
                >
                  {section.title || `Page ${idx + 1}`}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {activeSection && (
            <div className="space-y-1 pb-3 border-b border-border">
              <h3 className="font-semibold text-base">
                {activeSection.title}
              </h3>
              {activeSection.description && (
                <p className="text-sm text-muted-foreground">
                  {activeSection.description}
                </p>
              )}
            </div>
          )}

          {pageFields.map((field) => (
            <PreviewField key={field.id} field={field} />
          ))}

          {pageFields.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No fields on this page.
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={activePageIndex === 0}
              onClick={() =>
                setActivePageIndex((prev) => Math.max(0, prev - 1))
              }
            >
              Previous
            </Button>
            <Button
              variant={
                activePageIndex === sortedSections.length - 1
                  ? "gradient"
                  : "default"
              }
              size="sm"
              onClick={() => {
                if (activePageIndex < sortedSections.length - 1) {
                  setActivePageIndex((prev) => prev + 1);
                }
              }}
              disabled={activePageIndex === sortedSections.length - 1}
            >
              {activePageIndex === sortedSections.length - 1
                ? "Submit"
                : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// â”€â”€ Preview Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PreviewField({ field }: { field: FormField }) {
  switch (field.type) {
    case "heading":
      return (
        <h4 className="text-base font-semibold pt-2">
          {field.label || field.description || "Heading"}
        </h4>
      );
    case "paragraph":
      return (
        <p className="text-sm text-muted-foreground">
          {field.description || field.label || "Paragraph text"}
        </p>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <PreviewLabel field={field} />
          <textarea
            disabled
            placeholder={field.placeholder || ""}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground disabled:cursor-default disabled:opacity-70"
            rows={3}
          />
          <PreviewHelpText description={field.description} />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <PreviewLabel field={field} />
          <select disabled className={cn(selectClasses, "opacity-70 cursor-default")}>
            <option>{field.placeholder || "Select an option"}</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value}>{opt.label}</option>
            ))}
          </select>
          <PreviewHelpText description={field.description} />
        </div>
      );
    case "multi_select":
      return (
        <div className="space-y-1.5">
          <PreviewLabel field={field} />
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  disabled
                  className="h-3.5 w-3.5 rounded"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <PreviewHelpText description={field.description} />
        </div>
      );
    case "radio":
      return (
        <div className="space-y-1.5">
          <PreviewLabel field={field} />
          <div className="space-y-1.5">
            {(field.options || []).map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name={field.id}
                  disabled
                  className="h-3.5 w-3.5"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <PreviewHelpText description={field.description} />
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled
              className="h-3.5 w-3.5 rounded"
            />
            <span>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-0.5">*</span>
              )}
            </span>
          </label>
          <PreviewHelpText description={field.description} />
        </div>
      );
    case "file":
      return (
        <div className="space-y-1.5">
          <PreviewLabel field={field} />
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-background/50 p-6">
            <div className="text-center">
              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Click to upload or drag and drop
              </p>
              {field.validation?.allowedFileTypes && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Accepted:{" "}
                  {field.validation.allowedFileTypes
                    .map((t) => {
                      const preset = allowedFileTypePresets.find(
                        (p) => p.value === t
                      );
                      return preset?.label || t;
                    })
                    .join(", ")}
                </p>
              )}
              {field.validation?.maxFileSize && (
                <p className="text-[10px] text-muted-foreground">
                  Max size:{" "}
                  {fileSizeOptions.find(
                    (o) => o.value === field.validation!.maxFileSize
                  )?.label ||
                    `${Math.round(
                      field.validation.maxFileSize / 1_048_576
                    )} MB`}
                </p>
              )}
            </div>
          </div>
          <PreviewHelpText description={field.description} />
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          <PreviewLabel field={field} />
          <Input
            disabled
            type={
              field.type === "email"
                ? "email"
                : field.type === "number"
                  ? "number"
                  : field.type === "date"
                    ? "date"
                    : field.type === "url"
                      ? "url"
                      : field.type === "phone"
                        ? "tel"
                        : "text"
            }
            placeholder={field.placeholder || ""}
            className="opacity-70 cursor-default"
          />
          <PreviewHelpText description={field.description} />
        </div>
      );
  }
}

function PreviewLabel({ field }: { field: FormField }) {
  return (
    <label className="text-sm font-medium">
      {field.label || "(untitled)"}
      {field.required && (
        <span className="text-destructive ml-0.5">*</span>
      )}
    </label>
  );
}

function PreviewHelpText({ description }: { description?: string }) {
  if (!description) return null;
  return (
    <p className="text-[11px] text-muted-foreground">{description}</p>
  );
}