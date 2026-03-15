"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Loader2,
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

// ── Types ────────────────────────────────────────────────

interface RulesResponse {
  data: {
    rules: ScreeningRule[];
    config: {
      quotaFieldId?: string;
      quotas?: { campus: string; quota: number }[];
      detectDuplicates?: boolean;
      quotaEnforcement?: string;
    };
    fields: FormField[];
    quotaCounts: Record<string, number>;
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
  const quotaFieldId = rulesData?.data?.config?.quotaFieldId ?? "";
  const quotaCounts = rulesData?.data?.quotaCounts ?? {};
  const quotaEnforcement = rulesData?.data?.config?.quotaEnforcement || "screening";

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
          quotaFieldId={quotaFieldId}
          quotaCounts={quotaCounts}
          registrationFields={hackathon.registrationFields}
          remoteQuotaEnforcement={quotaEnforcement}
          isLoading={rulesLoading}
          isOpen={quotasOpen}
          onToggle={() => setQuotasOpen((v) => !v)}
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
                                <span className={cn(
                                  "font-semibold mr-1",
                                  rule.ruleType === "hard" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
                                )}>
                                  {rule.ruleType === "hard" ? "Reject" : "Flag"} when
                                </span>
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
                                Hard (Auto-Reject)
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
                                Soft (Flag for Review)
                              </button>
                            </div>
                          </div>

                          {/* Live Preview */}
                          {form.fieldId && form.operator && (
                            <div className={cn(
                              "rounded-lg border px-3 py-2 text-xs",
                              form.ruleType === "hard"
                                ? "border-red-200 bg-red-50/50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
                                : "border-yellow-200 bg-yellow-50/50 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-950/20 dark:text-yellow-400"
                            )}>
                              <span className="font-semibold">
                                {form.ruleType === "hard" ? "Reject" : "Flag"}
                              </span>
                              {" applicant when "}
                              <span className="font-medium">
                                {fieldMap.get(form.fieldId)?.label ?? form.fieldId}
                              </span>
                              {" "}
                              {operatorLabels[form.operator]}
                              {form.value && !valuelessOperators.includes(form.operator) && (
                                <>
                                  {" "}
                                  <span className="font-mono bg-white/50 dark:bg-black/20 px-1 rounded">
                                    {form.value}
                                  </span>
                                </>
                              )}
                            </div>
                          )}

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
  quotaFieldId: remoteQuotaFieldId,
  quotaCounts,
  registrationFields,
  remoteQuotaEnforcement,
  isLoading,
  isOpen,
  onToggle,
  queryClient,
}: {
  hackathonId: string;
  quotas: { campus: string; quota: number; rejected?: boolean; rejectionMessage?: string; softFlagged?: boolean; softFlagMessage?: string }[];
  quotaFieldId: string;
  quotaCounts: Record<string, number>;
  registrationFields: FormField[];
  remoteQuotaEnforcement: string;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [localQuotas, setLocalQuotas] = React.useState<
    { campus: string; quota: number; rejected?: boolean; rejectionMessage?: string; softFlagged?: boolean; softFlagMessage?: string }[]
  >([]);
  const [selectedFieldId, setSelectedFieldId] = React.useState("");
  const [editingQuota, setEditingQuota] = React.useState<{ campus: string; value: string } | null>(null);
  const [initialized, setInitialized] = React.useState(false);
  const [quotaEnforcement, setQuotaEnforcement] = React.useState<"registration" | "screening">("screening");

  // Fields that can be used for quotas (radio or select with options)
  const quotaFields = React.useMemo(
    () =>
      registrationFields.filter(
        (f) =>
          (f.type === "radio" || f.type === "select") &&
          f.options &&
          f.options.length > 0
      ),
    [registrationFields]
  );

  // Sync remote state into local state
  React.useEffect(() => {
    if (!isLoading && !initialized) {
      setLocalQuotas(quotas.length > 0 ? quotas : []);
      setSelectedFieldId(remoteQuotaFieldId || "");
      setInitialized(true);
    }
  }, [isLoading, quotas, remoteQuotaFieldId, initialized]);

  React.useEffect(() => {
    if (initialized && quotas.length > 0) {
      setLocalQuotas(quotas);
    }
  }, [quotas, initialized]);

  React.useEffect(() => {
    if (initialized && remoteQuotaFieldId) {
      setSelectedFieldId(remoteQuotaFieldId);
    }
  }, [remoteQuotaFieldId, initialized]);

  React.useEffect(() => {
    if (initialized && remoteQuotaEnforcement) {
      setQuotaEnforcement(remoteQuotaEnforcement as "registration" | "screening");
    }
  }, [remoteQuotaEnforcement, initialized]);

  const activeQuotas = localQuotas.filter((q) => !q.rejected);
  const totalCapacity = activeQuotas.reduce((sum, q) => sum + q.quota, 0);
  const totalFilled = activeQuotas.reduce(
    (sum, q) => sum + (quotaCounts[q.campus] || 0),
    0
  );
  const rejectedCount = localQuotas.filter((q) => q.rejected).length;
  const softFlaggedCount = localQuotas.filter((q) => q.softFlagged && !q.rejected).length;

  const saveConfig = useMutation({
    mutationFn: async ({
      updatedQuotas,
      fieldId,
      quotaEnforcement: enforcement,
    }: {
      updatedQuotas: { campus: string; quota: number }[];
      fieldId: string;
      quotaEnforcement?: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/screening-rules`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: {
              quotas: updatedQuotas,
              quotaFieldId: fieldId || undefined,
              quotaEnforcement: enforcement || undefined,
            },
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

  const handleFieldChange = (fieldId: string) => {
    setSelectedFieldId(fieldId);

    if (!fieldId) {
      // Unlink field — clear quotas
      setLocalQuotas([]);
      saveConfig.mutate({ updatedQuotas: [], fieldId: "", quotaEnforcement });
      return;
    }

    const field = registrationFields.find((f) => f.id === fieldId);
    if (!field?.options) return;

    // Build quotas from field options, preserving existing values
    const existingMap = new Map(localQuotas.map((q) => [q.campus, q]));
    const newQuotas = field.options.map((opt) => ({
      campus: opt.value,
      quota: existingMap.get(opt.value)?.quota ?? 50,
      rejected: existingMap.get(opt.value)?.rejected ?? false,
      rejectionMessage: existingMap.get(opt.value)?.rejectionMessage,
      softFlagged: existingMap.get(opt.value)?.softFlagged ?? false,
      softFlagMessage: existingMap.get(opt.value)?.softFlagMessage,
    }));

    setLocalQuotas(newQuotas);
    saveConfig.mutate({ updatedQuotas: newQuotas, fieldId, quotaEnforcement });
  };

  const handleQuotaUpdate = (campus: string, newQuota: number) => {
    if (isNaN(newQuota) || newQuota < 1) return;
    const updated = localQuotas.map((q) =>
      q.campus === campus ? { ...q, quota: newQuota } : q
    );
    setLocalQuotas(updated);
    setEditingQuota(null);
    saveConfig.mutate({ updatedQuotas: updated, fieldId: selectedFieldId, quotaEnforcement });
  };

  const handleSetQuotaStatus = (campus: string, status: "applicable" | "soft_flag" | "not_applicable") => {
    const updated = localQuotas.map((q) => {
      if (q.campus !== campus) return q;
      switch (status) {
        case "applicable":
          return { ...q, rejected: false, softFlagged: false };
        case "soft_flag":
          return { ...q, rejected: false, softFlagged: true };
        case "not_applicable":
          return { ...q, rejected: true, softFlagged: false };
        default:
          return q;
      }
    });
    setLocalQuotas(updated);
    saveConfig.mutate({ updatedQuotas: updated, fieldId: selectedFieldId, quotaEnforcement });
  };

  // Only update local state on change; save on blur
  const handleMessageChange = (campus: string, field: "rejectionMessage" | "softFlagMessage", message: string) => {
    setLocalQuotas((prev) =>
      prev.map((q) =>
        q.campus === campus ? { ...q, [field]: message || undefined } : q
      )
    );
  };

  const handleMessageSave = () => {
    saveConfig.mutate({ updatedQuotas: localQuotas, fieldId: selectedFieldId, quotaEnforcement });
  };

  // Get the label for a quota campus value (option label from the linked field)
  const selectedField = quotaFields.find((f) => f.id === selectedFieldId);
  const optionLabelMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (selectedField?.options) {
      for (const opt of selectedField.options) {
        map.set(opt.value, opt.label);
      }
    }
    return map;
  }, [selectedField]);

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
              {totalCapacity > 0 || rejectedCount > 0 || softFlaggedCount > 0 ? (
                <>
                  <span className="font-mono font-medium text-foreground">
                    {totalFilled}/{totalCapacity}
                  </span>{" "}
                  registered &middot; {activeQuotas.length} active
                  {softFlaggedCount > 0 && (
                    <> &middot; {softFlaggedCount} flagged</>
                  )}
                  {rejectedCount > 0 && (
                    <> &middot; {rejectedCount} N/A</>
                  )}
                </>
              ) : (
                "No quotas configured"
              )}
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
                  {/* Field Selector */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Linked Form Field
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Select a radio or dropdown field from your registration form. Each option becomes a campus with its own quota.
                    </p>
                    <select
                      value={selectedFieldId}
                      onChange={(e) => handleFieldChange(e.target.value)}
                      disabled={saveConfig.isPending}
                      className={selectClasses}
                    >
                      <option value="">-- Select a field --</option>
                      {quotaFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label} ({f.type}, {f.options?.length} options)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quota Enforcement Mode */}
                  {selectedFieldId && (
                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">Quota Enforcement</h4>
                          <p className="text-xs text-muted-foreground">
                            When should campus quotas be enforced?
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQuotaEnforcement("screening");
                            saveConfig.mutate({
                              updatedQuotas: localQuotas,
                              fieldId: selectedFieldId,
                              quotaEnforcement: "screening",
                            });
                          }}
                          className={cn(
                            "rounded-lg border p-3 text-left transition-colors",
                            quotaEnforcement === "screening"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <p className="text-sm font-medium">During Screening</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Everyone registers freely. When you run screening, quotas are applied first-come-first-serve to accept or waitlist applicants.
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuotaEnforcement("registration");
                            saveConfig.mutate({
                              updatedQuotas: localQuotas,
                              fieldId: selectedFieldId,
                              quotaEnforcement: "registration",
                            });
                          }}
                          className={cn(
                            "rounded-lg border p-3 text-left transition-colors",
                            quotaEnforcement === "registration"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <p className="text-sm font-medium">During Registration</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Show fill counts on the registration form. Full campuses show a waitlist warning to applicants.
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Total Capacity Banner */}
                  {localQuotas.length > 0 && (
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Total Capacity</p>
                        <p className="text-xs text-muted-foreground">
                          Sum of all campus quotas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl font-bold">
                          <span className={cn(
                            totalFilled >= totalCapacity && "text-destructive"
                          )}>
                            {totalFilled}
                          </span>
                          <span className="text-muted-foreground font-normal">
                            /{totalCapacity}
                          </span>
                        </p>
                        {totalCapacity > 0 && (
                          <div className="w-32 h-2 bg-muted rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                totalFilled >= totalCapacity
                                  ? "bg-destructive"
                                  : totalFilled >= totalCapacity * 0.8
                                    ? "bg-yellow-500"
                                    : "bg-primary"
                              )}
                              style={{
                                width: `${Math.min(100, (totalFilled / totalCapacity) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                              Registered
                            </th>
                            <th className="text-left font-medium px-4 py-3 text-muted-foreground">
                              Quota
                            </th>
                            <th className="text-left font-medium px-4 py-3 text-muted-foreground">
                              Fill
                            </th>
                            <th className="text-center font-medium px-4 py-3 text-muted-foreground">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {localQuotas.map((q, i) => {
                            const isRejected = !!q.rejected;
                            const isSoftFlagged = !!q.softFlagged && !isRejected;
                            const filled = quotaCounts[q.campus] || 0;
                            const pct = !isRejected && q.quota > 0 ? Math.round((filled / q.quota) * 100) : 0;
                            const isFull = !isRejected && filled >= q.quota;
                            const displayLabel = optionLabelMap.get(q.campus) || q.campus;

                            return (
                              <React.Fragment key={q.campus}>
                                <motion.tr
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className={cn(
                                    "border-b hover:bg-muted/30 transition-colors",
                                    isRejected && "bg-destructive/5",
                                    isSoftFlagged && "bg-yellow-50/30 dark:bg-yellow-950/10"
                                  )}
                                >
                                  <td className="px-4 py-3 font-medium">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(isRejected && "line-through text-muted-foreground")}>
                                        {displayLabel}
                                      </span>
                                      {isRejected && (
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                          N/A
                                        </Badge>
                                      )}
                                      {isSoftFlagged && (
                                        <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                          Soft Flag
                                        </Badge>
                                      )}
                                      {!isRejected && isFull && (
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                          FULL
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={cn(
                                      "font-mono",
                                      isRejected ? "text-muted-foreground" : isFull && "text-destructive font-medium"
                                    )}>
                                      {isRejected ? "—" : filled}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {isRejected ? (
                                      <span className="text-muted-foreground text-xs">N/A</span>
                                    ) : editingQuota?.campus === q.campus ? (
                                      <Input
                                        type="number"
                                        min={1}
                                        autoFocus
                                        className="w-20 h-8 text-sm"
                                        value={editingQuota.value}
                                        onChange={(e) =>
                                          setEditingQuota({
                                            campus: q.campus,
                                            value: e.target.value,
                                          })
                                        }
                                        onBlur={() =>
                                          handleQuotaUpdate(
                                            q.campus,
                                            parseInt(editingQuota.value, 10)
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            handleQuotaUpdate(
                                              q.campus,
                                              parseInt(editingQuota.value, 10)
                                            );
                                          }
                                          if (e.key === "Escape") {
                                            setEditingQuota(null);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setEditingQuota({
                                            campus: q.campus,
                                            value: String(q.quota),
                                          })
                                        }
                                        className="font-mono hover:text-primary transition-colors flex items-center gap-1.5 group/edit"
                                        title="Click to edit quota"
                                      >
                                        {q.quota}
                                        <Pencil className="h-3 w-3 text-muted-foreground group-hover/edit:text-primary transition-colors" />
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {isRejected ? (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={cn(
                                              "h-full rounded-full transition-all",
                                              isFull
                                                ? "bg-destructive"
                                                : pct >= 80
                                                  ? "bg-yellow-500"
                                                  : "bg-primary"
                                            )}
                                            style={{ width: `${Math.min(100, pct)}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {pct}%
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => handleSetQuotaStatus(q.campus, "applicable")}
                                        disabled={saveConfig.isPending}
                                        className={cn(
                                          "h-7 px-2 text-[10px] font-medium transition-colors flex items-center gap-1",
                                          !isRejected && !isSoftFlagged
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                            : "hover:bg-muted text-muted-foreground"
                                        )}
                                        title="Applicable"
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetQuotaStatus(q.campus, "soft_flag")}
                                        disabled={saveConfig.isPending}
                                        className={cn(
                                          "h-7 px-2 text-[10px] font-medium transition-colors flex items-center gap-1 border-x border-border",
                                          isSoftFlagged
                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                            : "hover:bg-muted text-muted-foreground"
                                        )}
                                        title="Soft Flag"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetQuotaStatus(q.campus, "not_applicable")}
                                        disabled={saveConfig.isPending}
                                        className={cn(
                                          "h-7 px-2 text-[10px] font-medium transition-colors flex items-center gap-1",
                                          isRejected
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                            : "hover:bg-muted text-muted-foreground"
                                        )}
                                        title="Not Applicable"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </td>
                                </motion.tr>
                                {/* Message row (shown when N/A or Soft Flag) */}
                                {(isRejected || isSoftFlagged) && (
                                  <motion.tr
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className={cn(
                                      "border-b last:border-b-0",
                                      isRejected ? "bg-destructive/5" : "bg-yellow-50/50 dark:bg-yellow-950/10"
                                    )}
                                  >
                                    <td colSpan={5} className="px-4 py-2">
                                      <div className="flex items-start gap-2">
                                        <AlertTriangle className={cn(
                                          "h-3.5 w-3.5 mt-0.5 shrink-0",
                                          isRejected ? "text-destructive" : "text-yellow-600"
                                        )} />
                                        <div className="flex-1">
                                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {isRejected
                                              ? "Rejection message shown to applicants"
                                              : "Soft flag note (visible to organizers in applications)"}
                                          </label>
                                          <Input
                                            placeholder={isRejected
                                              ? "e.g., This campus is not accepting applications at this time."
                                              : "e.g., This campus requires additional review before acceptance."}
                                            value={isRejected ? (q.rejectionMessage || "") : (q.softFlagMessage || "")}
                                            onChange={(e) =>
                                              handleMessageChange(
                                                q.campus,
                                                isRejected ? "rejectionMessage" : "softFlagMessage",
                                                e.target.value
                                              )
                                            }
                                            onBlur={handleMessageSave}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") handleMessageSave();
                                            }}
                                            className="h-8 text-xs mt-1"
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </motion.tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : selectedFieldId ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Loading quotas from field options...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <BarChart3 className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h4 className="font-display text-lg font-bold mb-1">
                        No campus quotas
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                        Link a radio or dropdown field from your registration form to set capacity limits per option.
                      </p>
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

