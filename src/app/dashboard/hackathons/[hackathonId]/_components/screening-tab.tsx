"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Trash2,
  Play,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Loader2,
  Clock,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Hackathon,
  ScreeningRule,
  ScreeningOperator,
  ScreeningRuleType,
  FormField,
} from "@/lib/types";

// ── Props ────────────────────────────────────────────────

interface ScreeningTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

// ── Operator Labels ──────────────────────────────────────

const operatorLabels: Record<ScreeningOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  greater_than: "greater than",
  less_than: "less than",
  greater_equal: "\u2265",
  less_equal: "\u2264",
  in: "is one of",
  not_in: "is not one of",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  is_true: "is true/yes",
  is_false: "is false/no",
};

const allOperators: ScreeningOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "greater_equal",
  "less_equal",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
];

// Operators that don't need a value input
const valuelessOperators: ScreeningOperator[] = [
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
];

const selectClasses =
  "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

const DEFAULT_CAMPUS_QUOTAS = [
  { campus: "Abu Dhabi", quota: 75 },
  { campus: "Al Ain", quota: 50 },
  { campus: "Al Dhafra", quota: 25 },
];

// ── Types ────────────────────────────────────────────────

interface RulesResponse {
  data: {
    rules: ScreeningRule[];
    config: {
      quotas?: { campus: string; quota: number }[];
      detectDuplicates?: boolean;
    };
    fields: FormField[];
  };
}

interface ScreeningResultSummary {
  data: {
    screened: number;
    eligible: number;
    ineligible: number;
    flagged: number;
    lastRunAt: string;
  };
}

interface RuleFormState {
  name: string;
  fieldId: string;
  operator: ScreeningOperator;
  value: string;
  ruleType: ScreeningRuleType;
}

const emptyRuleForm: RuleFormState = {
  name: "",
  fieldId: "",
  operator: "equals",
  value: "",
  ruleType: "hard",
};

// ── Main Component ───────────────────────────────────────

export function ScreeningTab({ hackathon, hackathonId }: ScreeningTabProps) {
  const queryClient = useQueryClient();

  // Collapsible sections
  const [rulesOpen, setRulesOpen] = React.useState(true);
  const [quotasOpen, setQuotasOpen] = React.useState(true);
  const [dashboardOpen, setDashboardOpen] = React.useState(true);

  // ── Data Fetching ──

  const { data: rulesData, isLoading: rulesLoading } = useQuery<RulesResponse>({
    queryKey: ["hackathon-screening-rules", hackathonId],
    queryFn: () =>
      fetchJson<RulesResponse>(
        `/api/hackathons/${hackathonId}/screening-rules`
      ),
  });

  const rules = rulesData?.data?.rules ?? [];
  const campusQuotas = rulesData?.data?.config?.quotas ?? [];

  // Filterable registration fields (exclude heading/paragraph)
  const screenableFields = React.useMemo(
    () =>
      hackathon.registrationFields.filter(
        (f) => f.type !== "heading" && f.type !== "paragraph"
      ),
    [hackathon.registrationFields]
  );

  const fieldMap = React.useMemo(() => {
    const map = new Map<string, FormField>();
    hackathon.registrationFields.forEach((f) => map.set(f.id, f));
    return map;
  }, [hackathon.registrationFields]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">
              Screening &amp; Selection
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure automated screening rules and campus quotas
            </p>
          </div>
        </div>
      </motion.div>

      {/* Section 1: Screening Rules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <ScreeningRulesSection
          hackathonId={hackathonId}
          rules={rules}
          isLoading={rulesLoading}
          screenableFields={screenableFields}
          fieldMap={fieldMap}
          isOpen={rulesOpen}
          onToggle={() => setRulesOpen((v) => !v)}
          queryClient={queryClient}
        />
      </motion.div>

      {/* Section 2: Campus Quotas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CampusQuotasSection
          hackathonId={hackathonId}
          quotas={campusQuotas}
          isLoading={rulesLoading}
          isOpen={quotasOpen}
          onToggle={() => setQuotasOpen((v) => !v)}
          queryClient={queryClient}
        />
      </motion.div>

      {/* Section 3: Screening Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <ScreeningDashboardSection
          hackathonId={hackathonId}
          isOpen={dashboardOpen}
          onToggle={() => setDashboardOpen((v) => !v)}
          queryClient={queryClient}
        />
      </motion.div>
    </div>
  );
}

// ── Section 1: Screening Rules ───────────────────────────

function ScreeningRulesSection({
  hackathonId,
  rules,
  isLoading,
  screenableFields,
  fieldMap,
  isOpen,
  onToggle,
  queryClient,
}: {
  hackathonId: string;
  rules: ScreeningRule[];
  isLoading: boolean;
  screenableFields: FormField[];
  fieldMap: Map<string, FormField>;
  isOpen: boolean;
  onToggle: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<RuleFormState>(emptyRuleForm);

  // ── Mutations ──

  // Helper: POST the full rules array to the API
  const postRules = async (updatedRules: ScreeningRule[]) => {
    const res = await fetch(
      `/api/hackathons/${hackathonId}/screening-rules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: updatedRules }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save screening rules");
    }
    return res.json();
  };

  const saveRule = useMutation({
    mutationFn: async (rule: Partial<ScreeningRule>) => {
      let updatedRules: ScreeningRule[];
      if (editingId) {
        // Update existing rule in the array
        updatedRules = rules.map((r) =>
          r.id === editingId ? { ...r, ...rule } as ScreeningRule : r
        );
      } else {
        // Add new rule to the array
        const newRule: ScreeningRule = {
          id: rule.id || crypto.randomUUID(),
          formId: hackathonId,
          name: rule.name || "Unnamed Rule",
          description: rule.description,
          ruleType: rule.ruleType || "hard",
          fieldId: rule.fieldId || "",
          operator: rule.operator || "equals",
          value: rule.value,
          sortOrder: rules.length,
          enabled: rule.enabled ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedRules = [...rules, newRule];
      }
      return postRules(updatedRules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-screening-rules", hackathonId],
      });
      toast.success(editingId ? "Rule updated" : "Rule created");
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const updatedRules = rules.filter((r) => r.id !== ruleId);
      return postRules(updatedRules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-screening-rules", hackathonId],
      });
      toast.success("Rule deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({
      ruleId,
      enabled,
    }: {
      ruleId: string;
      enabled: boolean;
    }) => {
      const updatedRules = rules.map((r) =>
        r.id === ruleId ? { ...r, enabled } : r
      );
      return postRules(updatedRules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-screening-rules", hackathonId],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Handlers ──

  const resetForm = () => {
    setForm(emptyRuleForm);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (rule: ScreeningRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      fieldId: rule.fieldId,
      operator: rule.operator,
      value:
        rule.value !== undefined && rule.value !== null
          ? Array.isArray(rule.value)
            ? (rule.value as string[]).join(", ")
            : String(rule.value)
          : "",
      ruleType: rule.ruleType,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!form.fieldId) {
      toast.error("Please select a field");
      return;
    }

    const needsValue = !valuelessOperators.includes(form.operator);
    if (needsValue && !form.value.trim()) {
      toast.error("Please enter a value");
      return;
    }

    let parsedValue: unknown = form.value;
    if (form.operator === "in" || form.operator === "not_in") {
      parsedValue = form.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }

    const rulePayload: Partial<ScreeningRule> = {
      id: editingId ?? crypto.randomUUID(),
      formId: hackathonId,
      name: form.name.trim(),
      ruleType: form.ruleType,
      fieldId: form.fieldId,
      operator: form.operator,
      value: needsValue ? parsedValue : undefined,
      sortOrder: editingId
        ? rules.find((r) => r.id === editingId)?.sortOrder ?? rules.length
        : rules.length,
      enabled: editingId
        ? rules.find((r) => r.id === editingId)?.enabled ?? true
        : true,
    };

    saveRule.mutate(rulePayload);
  };

  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-display font-bold text-lg">Screening Rules</h3>
            <p className="text-sm text-muted-foreground">
              {rules.length} rule{rules.length !== 1 ? "s" : ""} configured
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-5 px-5 space-y-4">
              {/* Loading State */}
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="shimmer rounded-lg h-14 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Rules List */}
                  {rules.length === 0 && !showForm && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <Shield className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h4 className="font-display text-lg font-bold mb-1">
                        No screening rules
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add rules to automatically screen registrations against
                        form fields.
                      </p>
                    </div>
                  )}

                  {rules.length > 0 && (
                    <div className="space-y-2">
                      {rules.map((rule, i) => {
                        const field = fieldMap.get(rule.fieldId);
                        return (
                          <motion.div
                            key={rule.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={cn(
                              "flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors",
                              !rule.enabled && "opacity-50",
                              rule.ruleType === "hard"
                                ? "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20"
                                : "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/30 dark:bg-yellow-950/20"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-sm truncate">
                                  {rule.name}
                                </span>
                                <Badge
                                  variant={
                                    rule.ruleType === "hard"
                                      ? "destructive"
                                      : "warning"
                                  }
                                  className="text-xs"
                                >
                                  {rule.ruleType === "hard"
                                    ? "Hard"
                                    : "Soft"}
                                </Badge>
                                {!rule.enabled && (
                                  <Badge variant="muted" className="text-xs">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">
                                  {field?.label ?? rule.fieldId}
                                </span>{" "}
                                {operatorLabels[rule.operator]}
                                {rule.value !== undefined &&
                                  rule.value !== null &&
                                  !valuelessOperators.includes(
                                    rule.operator
                                  ) && (
                                    <>
                                      {" "}
                                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                                        {Array.isArray(rule.value)
                                          ? (rule.value as string[]).join(", ")
                                          : String(rule.value)}
                                      </span>
                                    </>
                                  )}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  toggleRule.mutate({
                                    ruleId: rule.id,
                                    enabled: !rule.enabled,
                                  })
                                }
                                disabled={toggleRule.isPending}
                                title={
                                  rule.enabled ? "Disable rule" : "Enable rule"
                                }
                              >
                                <div
                                  className={cn(
                                    "w-8 h-5 rounded-full relative transition-colors",
                                    rule.enabled
                                      ? "bg-primary"
                                      : "bg-muted-foreground/30"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                                      rule.enabled
                                        ? "translate-x-3.5"
                                        : "translate-x-0.5"
                                    )}
                                  />
                                </div>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(rule)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteRule.mutate(rule.id)}
                                disabled={deleteRule.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add/Edit Rule Form */}
                  <AnimatePresence>
                    {showForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                          <h4 className="font-display font-bold text-sm">
                            {editingId ? "Edit Rule" : "New Screening Rule"}
                          </h4>

                          {/* Name */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Rule Name
                            </label>
                            <Input
                              placeholder="e.g., Must be UAEU student"
                              value={form.name}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </div>

                          {/* Field + Operator + Value row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Field */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                Field
                              </label>
                              <select
                                value={form.fieldId}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    fieldId: e.target.value,
                                  }))
                                }
                                className={cn(selectClasses, "w-full")}
                              >
                                <option value="">Select field...</option>
                                {screenableFields.map((field) => (
                                  <option key={field.id} value={field.id}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Operator */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                Operator
                              </label>
                              <select
                                value={form.operator}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    operator: e.target.value as ScreeningOperator,
                                  }))
                                }
                                className={cn(selectClasses, "w-full")}
                              >
                                {allOperators.map((op) => (
                                  <option key={op} value={op}>
                                    {operatorLabels[op]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Value */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                Value
                              </label>
                              {valuelessOperators.includes(form.operator) ? (
                                <div className="flex items-center h-11 px-4 text-sm text-muted-foreground italic">
                                  No value needed
                                </div>
                              ) : (() => {
                                const selectedField = form.fieldId ? fieldMap.get(form.fieldId) : undefined;
                                const hasOptions = selectedField && selectedField.options && selectedField.options.length > 0;
                                const isCheckbox = selectedField?.type === "checkbox";

                                if (isCheckbox) {
                                  return (
                                    <select
                                      value={form.value}
                                      onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                                      className={cn(selectClasses, "w-full")}
                                    >
                                      <option value="">Select...</option>
                                      <option value="true">Yes / Checked</option>
                                      <option value="false">No / Unchecked</option>
                                    </select>
                                  );
                                }

                                if (hasOptions && (form.operator === "in" || form.operator === "not_in")) {
                                  // Multi-select: show checkboxes for picking multiple values
                                  const selectedValues = form.value ? form.value.split(",").map((v) => v.trim()).filter(Boolean) : [];
                                  return (
                                    <div className="border rounded-xl p-2 max-h-32 overflow-y-auto space-y-1">
                                      {selectedField.options!.map((opt) => (
                                        <label key={opt.value} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                                          <input
                                            type="checkbox"
                                            checked={selectedValues.includes(opt.value)}
                                            onChange={(e) => {
                                              const next = e.target.checked
                                                ? [...selectedValues, opt.value]
                                                : selectedValues.filter((v) => v !== opt.value);
                                              setForm((f) => ({ ...f, value: next.join(", ") }));
                                            }}
                                            className="h-3.5 w-3.5 rounded border-input"
                                          />
                                          {opt.label}
                                        </label>
                                      ))}
                                    </div>
                                  );
                                }

                                if (hasOptions) {
                                  // Single-select: show dropdown
                                  return (
                                    <select
                                      value={form.value}
                                      onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                                      className={cn(selectClasses, "w-full")}
                                    >
                                      <option value="">Select value...</option>
                                      {selectedField.options!.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  );
                                }

                                // Default: text input
                                return (
                                  <Input
                                    placeholder="Enter value..."
                                    value={form.value}
                                    onChange={(e) =>
                                      setForm((f) => ({
                                        ...f,
                                        value: e.target.value,
                                      }))
                                    }
                                  />
                                );
                              })()}
                            </div>
                          </div>

                          {/* Rule Type Toggle */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Rule Type
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({ ...f, ruleType: "hard" }))
                                }
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                                  form.ruleType === "hard"
                                    ? "border-red-400 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                                    : "border-border text-muted-foreground hover:bg-muted"
                                )}
                              >
                                <XCircle className="h-4 w-4" />
                                Hard (Pass/Fail)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({ ...f, ruleType: "soft" }))
                                }
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                                  form.ruleType === "soft"
                                    ? "border-yellow-400 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400"
                                    : "border-border text-muted-foreground hover:bg-muted"
                                )}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                Soft (Flag Only)
                              </button>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetForm}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={saveRule.isPending}
                            >
                              {saveRule.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              {editingId ? "Update Rule" : "Save Rule"}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Add Rule Button */}
                  {!showForm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm(emptyRuleForm);
                        setEditingId(null);
                        setShowForm(true);
                      }}
                      className="w-full border-dashed"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rule
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Section 2: Campus Quotas ─────────────────────────────

function CampusQuotasSection({
  hackathonId,
  quotas,
  isLoading,
  isOpen,
  onToggle,
  queryClient,
}: {
  hackathonId: string;
  quotas: { campus: string; quota: number }[];
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [newCampus, setNewCampus] = React.useState("");
  const [newQuota, setNewQuota] = React.useState("");
  const [localQuotas, setLocalQuotas] = React.useState<
    { campus: string; quota: number }[]
  >([]);
  const [initialized, setInitialized] = React.useState(false);

  // Sync remote quotas into local state
  React.useEffect(() => {
    if (!isLoading && !initialized) {
      setLocalQuotas(quotas.length > 0 ? quotas : []);
      setInitialized(true);
    }
  }, [isLoading, quotas, initialized]);

  // Keep in sync when remote data updates (but only if user hasn't made local edits)
  React.useEffect(() => {
    if (initialized && quotas.length > 0) {
      setLocalQuotas(quotas);
    }
  }, [quotas, initialized]);

  const saveQuotas = useMutation({
    mutationFn: async (updatedQuotas: { campus: string; quota: number }[]) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/screening-rules`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: { quotas: updatedQuotas },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save quotas");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-screening-rules", hackathonId],
      });
      toast.success("Campus quotas saved");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleAdd = () => {
    const campus = newCampus.trim();
    const quota = parseInt(newQuota, 10);

    if (!campus) {
      toast.error("Please enter a campus name");
      return;
    }
    if (isNaN(quota) || quota < 1) {
      toast.error("Please enter a valid quota number");
      return;
    }
    if (localQuotas.some((q) => q.campus.toLowerCase() === campus.toLowerCase())) {
      toast.error("This campus already has a quota");
      return;
    }

    const updated = [...localQuotas, { campus, quota }];
    setLocalQuotas(updated);
    setNewCampus("");
    setNewQuota("");
    saveQuotas.mutate(updated);
  };

  const handleDelete = (campus: string) => {
    const updated = localQuotas.filter((q) => q.campus !== campus);
    setLocalQuotas(updated);
    saveQuotas.mutate(updated);
  };

  const handleLoadDefaults = () => {
    setLocalQuotas(DEFAULT_CAMPUS_QUOTAS);
    saveQuotas.mutate(DEFAULT_CAMPUS_QUOTAS);
  };

  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-display font-bold text-lg">Campus Quotas</h3>
            <p className="text-sm text-muted-foreground">
              {localQuotas.length} campus
              {localQuotas.length !== 1 ? "es" : ""} configured
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-5 px-5 space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="shimmer rounded-lg h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Quotas Table */}
                  {localQuotas.length > 0 ? (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left font-medium px-4 py-3 text-muted-foreground">
                              Campus
                            </th>
                            <th className="text-left font-medium px-4 py-3 text-muted-foreground">
                              Quota
                            </th>
                            <th className="text-right font-medium px-4 py-3 text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {localQuotas.map((q, i) => (
                            <motion.tr
                              key={q.campus}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3 font-medium">
                                {q.campus}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono">{q.quota}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(q.campus)}
                                  disabled={saveQuotas.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <BarChart3 className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h4 className="font-display text-lg font-bold mb-1">
                        No campus quotas
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Set quotas to limit accepted participants per campus.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadDefaults}
                      >
                        Load Default Quotas
                      </Button>
                    </div>
                  )}

                  {/* Add Quota Row */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Campus Name
                      </label>
                      <Input
                        placeholder="e.g., Abu Dhabi"
                        value={newCampus}
                        onChange={(e) => setNewCampus(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Quota
                      </label>
                      <Input
                        type="number"
                        placeholder="50"
                        min={1}
                        value={newQuota}
                        onChange={(e) => setNewQuota(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={saveQuotas.isPending}
                      className="h-11"
                    >
                      {saveQuotas.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Load defaults if there are quotas already */}
                  {localQuotas.length > 0 && (
                    <div className="text-right">
                      <button
                        onClick={handleLoadDefaults}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Reset to default quotas
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Section 3: Screening Dashboard ───────────────────────

function ScreeningDashboardSection({
  hackathonId,
  isOpen,
  onToggle,
  queryClient,
}: {
  hackathonId: string;
  isOpen: boolean;
  onToggle: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [lastResult, setLastResult] =
    React.useState<ScreeningResultSummary["data"] | null>(null);

  const runScreening = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hackathons/${hackathonId}/screen`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Screening failed");
      }
      return res.json() as Promise<ScreeningResultSummary>;
    },
    onSuccess: (data) => {
      setLastResult(data.data);
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-screening-rules", hackathonId],
      });
      toast.success("Screening completed successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const summaryStats = lastResult
    ? [
        {
          icon: CheckCircle2,
          label: "Screened",
          value: lastResult.screened,
          color: undefined as "green" | "red" | "orange" | undefined,
        },
        {
          icon: CheckCircle2,
          label: "Eligible",
          value: lastResult.eligible,
          color: "green" as const,
        },
        {
          icon: XCircle,
          label: "Ineligible",
          value: lastResult.ineligible,
          color: "red" as const,
        },
        {
          icon: AlertTriangle,
          label: "Flagged",
          value: lastResult.flagged,
          color: "orange" as const,
        },
      ]
    : [];

  const colorClasses = {
    green: "text-green-600 bg-green-100 dark:bg-green-900/30",
    red: "text-red-600 bg-red-100 dark:bg-red-900/30",
    orange: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  };

  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <Play className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-display font-bold text-lg">
              Screening Dashboard
            </h3>
            <p className="text-sm text-muted-foreground">
              Run screening and view results
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-5 px-5 space-y-5">
              {/* Run Button */}
              <div className="flex items-center justify-between">
                <div>
                  {lastResult?.lastRunAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Last run:{" "}
                      {new Date(lastResult.lastRunAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => runScreening.mutate()}
                  disabled={runScreening.isPending}
                >
                  {runScreening.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {runScreening.isPending
                    ? "Running..."
                    : "Run Screening"}
                </Button>
              </div>

              {/* Results */}
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Summary Banner */}
                  <div className="rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Screening complete: {lastResult.screened} screened,{" "}
                      {lastResult.eligible} eligible,{" "}
                      {lastResult.ineligible} ineligible,{" "}
                      {lastResult.flagged} flagged
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {summaryStats.map((stat) => (
                      <Card key={stat.label}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center",
                              stat.color
                                ? colorClasses[stat.color]
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            <stat.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-display text-2xl font-bold">
                              {stat.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {stat.label}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Status Breakdown */}
                  <Card>
                    <CardContent className="p-5">
                      <h4 className="font-display font-bold mb-4">
                        Status Breakdown
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          {
                            label: "Eligible",
                            value: lastResult.eligible,
                            className:
                              "text-green-600 dark:text-green-400",
                          },
                          {
                            label: "Ineligible",
                            value: lastResult.ineligible,
                            className:
                              "text-red-600 dark:text-red-400",
                          },
                          {
                            label: "Flagged",
                            value: lastResult.flagged,
                            className:
                              "text-orange-600 dark:text-orange-400",
                          },
                          {
                            label: "Total Screened",
                            value: lastResult.screened,
                            className: "",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between rounded-lg border border-border p-3"
                          >
                            <span className="text-xs">{item.label}</span>
                            <span
                              className={cn(
                                "font-mono font-bold text-sm",
                                item.className
                              )}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Empty state when no screening has been run */}
              {!lastResult && !runScreening.isPending && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h4 className="font-display text-lg font-bold mb-1">
                    No screening results yet
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Configure your screening rules above, then run screening to
                    see results.
                  </p>
                </div>
              )}

              {/* Loading state */}
              {runScreening.isPending && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Running screening against all registrations...
                  </p>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
