"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useKPIs,
  useCreateKPI,
  useUpdateKPI,
  useDeleteKPI,
  type CompetitionKPI,
} from "@/hooks/use-kpis";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────

interface KPISectionProps {
  hackathonId: string;
}

interface KPIFormData {
  name: string;
  description: string;
  targetValue: string;
  actualValue: string;
  unit: string;
  category: string;
}

// ── Constants ────────────────────────────────────────────

const UNITS = [
  { value: "count", label: "Count" },
  { value: "%", label: "Percentage (%)" },
  { value: "currency", label: "Currency" },
  { value: "custom", label: "Custom" },
] as const;

const CATEGORIES = [
  { value: "engagement", label: "Engagement" },
  { value: "quality", label: "Quality" },
  { value: "impact", label: "Impact" },
  { value: "operations", label: "Operations" },
  { value: "custom", label: "Custom" },
] as const;

const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  engagement: { text: "text-blue-500", bg: "bg-blue-500/10" },
  quality: { text: "text-green-500", bg: "bg-green-500/10" },
  impact: { text: "text-purple-500", bg: "bg-purple-500/10" },
  operations: { text: "text-yellow-500", bg: "bg-yellow-500/10" },
  custom: { text: "text-zinc-400", bg: "bg-zinc-400/10" },
};

const QUICK_PRESETS = [
  { name: "Total Applications", targetValue: 500, unit: "count", category: "engagement" },
  { name: "Teams Formed", targetValue: 50, unit: "count", category: "engagement" },
  { name: "Average Score", targetValue: 7.5, unit: "count", category: "quality" },
  { name: "Completion Rate", targetValue: 80, unit: "%", category: "quality" },
  { name: "Winner Satisfaction", targetValue: 90, unit: "%", category: "impact" },
] as const;

const EMPTY_FORM: KPIFormData = {
  name: "",
  description: "",
  targetValue: "",
  actualValue: "",
  unit: "count",
  category: "engagement",
};

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]";

// ── Animation variants ──────────────────────────────────

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// ── Helpers ──────────────────────────────────────────────

function getProgressPercent(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((actual / target) * 100), 100);
}

function getProgressColor(percent: number): string {
  if (percent >= 80) return "bg-green-500";
  if (percent >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getProgressTextColor(percent: number): string {
  if (percent >= 80) return "text-green-500";
  if (percent >= 50) return "text-yellow-500";
  return "text-red-500";
}

function getUnitLabel(unit: string): string {
  if (unit === "%") return "%";
  if (unit === "currency") return "currency";
  if (unit === "custom") return "";
  return "";
}

function formatKPIValue(value: number, unit: string): string {
  if (unit === "%") return `${value}%`;
  if (unit === "currency") return `$${value.toLocaleString()}`;
  return value.toLocaleString();
}

// ── KPI Card ─────────────────────────────────────────────

function KPICard({
  kpi,
  index,
  onEdit,
  onDelete,
  isDeleting,
}: {
  kpi: CompetitionKPI;
  index: number;
  onEdit: (kpi: CompetitionKPI) => void;
  onDelete: (kpiId: string) => void;
  isDeleting: boolean;
}) {
  const percent = getProgressPercent(kpi.actual_value, kpi.target_value);
  const catColor = CATEGORY_COLORS[kpi.category] ?? CATEGORY_COLORS.custom;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={cardVariant}
      layout
    >
      <Card className="group hover:shadow-md transition-all duration-200 h-full">
        <CardContent className="p-5">
          {/* Header: name + category + actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  catColor.bg
                )}
              >
                <Target className={cn("h-4 w-4", catColor.text)} />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate">{kpi.name}</h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 mt-0.5">
                  {kpi.category}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(kpi)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(kpi.id)}
                disabled={isDeleting}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Big number */}
          <div className="mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-display">
                {formatKPIValue(kpi.actual_value, kpi.unit)}
              </span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground font-medium">
                {formatKPIValue(kpi.target_value, kpi.unit)}
              </span>
            </div>
            {kpi.unit !== "%" && kpi.unit !== "currency" && kpi.unit !== "custom" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {kpi.unit === "count" ? "total" : kpi.unit}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className={cn("font-bold font-display", getProgressTextColor(percent))}>
                {percent}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, delay: 0.2 + index * 0.08, ease: "easeOut" }}
                className={cn("h-full rounded-full", getProgressColor(percent))}
              />
            </div>
          </div>

          {/* Description */}
          {kpi.description && (
            <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
              {kpi.description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main KPI Section ─────────────────────────────────────

export function KPISection({ hackathonId }: KPISectionProps) {
  const { data: kpisData, isLoading } = useKPIs(hackathonId);
  const createKPI = useCreateKPI(hackathonId);
  const updateKPI = useUpdateKPI(hackathonId);
  const deleteKPI = useDeleteKPI(hackathonId);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingKPI, setEditingKPI] = React.useState<CompetitionKPI | null>(null);
  const [formData, setFormData] = React.useState<KPIFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const kpis = kpisData?.data ?? [];
  const isMutating = createKPI.isPending || updateKPI.isPending;

  // ── Handlers ────────────────────────────────────────────

  function openCreateDialog() {
    setEditingKPI(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(kpi: CompetitionKPI) {
    setEditingKPI(kpi);
    setFormData({
      name: kpi.name,
      description: kpi.description ?? "",
      targetValue: String(kpi.target_value),
      actualValue: String(kpi.actual_value),
      unit: kpi.unit,
      category: kpi.category,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingKPI(null);
    setFormData(EMPTY_FORM);
  }

  function updateField<K extends keyof KPIFormData>(field: K, value: KPIFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      toast.error("KPI name is required.");
      return;
    }

    const targetValue = Number(formData.targetValue);
    if (isNaN(targetValue) || targetValue < 0) {
      toast.error("Target value must be a non-negative number.");
      return;
    }

    const actualValue = formData.actualValue ? Number(formData.actualValue) : 0;
    if (isNaN(actualValue) || actualValue < 0) {
      toast.error("Actual value must be a non-negative number.");
      return;
    }

    try {
      if (editingKPI) {
        await updateKPI.mutateAsync({
          kpiId: editingKPI.id,
          name,
          description: formData.description.trim() || null,
          targetValue,
          actualValue,
          unit: formData.unit,
          category: formData.category,
        });
        toast.success(`KPI "${name}" updated.`);
      } else {
        await createKPI.mutateAsync({
          name,
          description: formData.description.trim() || null,
          targetValue,
          actualValue,
          unit: formData.unit,
          category: formData.category,
          sortOrder: kpis.length,
        });
        toast.success(`KPI "${name}" created.`);
      }
      closeDialog();
    } catch {
      toast.error(editingKPI ? "Failed to update KPI." : "Failed to create KPI.");
    }
  }

  async function handleDelete(kpiId: string) {
    try {
      await deleteKPI.mutateAsync(kpiId);
      toast.success("KPI deleted.");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete KPI.");
    }
  }

  async function handleAddPresets() {
    const existingNames = new Set(kpis.map((k) => k.name.toLowerCase()));
    const newPresets = QUICK_PRESETS.filter(
      (p) => !existingNames.has(p.name.toLowerCase())
    );

    if (newPresets.length === 0) {
      toast.info("All preset KPIs already exist.");
      return;
    }

    try {
      await createKPI.mutateAsync(
        newPresets.map((p, i) => ({
          name: p.name,
          targetValue: p.targetValue,
          unit: p.unit,
          category: p.category,
          sortOrder: kpis.length + i,
        }))
      );
      toast.success(`Added ${newPresets.length} preset KPI${newPresets.length > 1 ? "s" : ""}.`);
    } catch {
      toast.error("Failed to add preset KPIs.");
    }
  }

  // ── Loading state ───────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="shimmer h-7 w-64 rounded-lg" />
          <div className="shimmer h-10 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer rounded-xl h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold">
            Key Performance Indicators
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddPresets}
            disabled={createKPI.isPending}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Quick Presets
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={openCreateDialog}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add KPI
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid or Empty State */}
      {kpis.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {kpis.map((kpi, i) => (
              <KPICard
                key={kpi.id}
                kpi={kpi}
                index={i}
                onEdit={openEditDialog}
                onDelete={(id) => setDeleteConfirmId(id)}
                isDeleting={deleteKPI.isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                No KPIs Configured
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add key performance indicators to track competition goals.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleAddPresets}
                  disabled={createKPI.isPending}
                  className="gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Quick Presets
                </Button>
                <Button
                  variant="gradient"
                  onClick={openCreateDialog}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add First KPI
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingKPI ? "Edit KPI" : "Add KPI"}
            </DialogTitle>
            <DialogDescription>
              {editingKPI
                ? "Update the KPI details below."
                : "Define a new key performance indicator to track."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Total Applications"
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="What does this KPI measure?"
                className={textareaClasses}
                maxLength={2000}
              />
            </div>

            {/* Target + Actual */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Value *</label>
                <Input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => updateField("targetValue", e.target.value)}
                  placeholder="500"
                  min={0}
                  step="any"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Actual Value</label>
                <Input
                  type="number"
                  value={formData.actualValue}
                  onChange={(e) => updateField("actualValue", e.target.value)}
                  placeholder="0"
                  min={0}
                  step="any"
                />
              </div>
            </div>

            {/* Unit + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => updateField("unit", e.target.value)}
                  className={selectClasses}
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className={selectClasses}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={isMutating}
                className="gap-1.5"
              >
                {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingKPI ? "Save Changes" : "Create KPI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete KPI</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this KPI? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteKPI.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteKPI.isPending}
              className="gap-1.5"
            >
              {deleteKPI.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
