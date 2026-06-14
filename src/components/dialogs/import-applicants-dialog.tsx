"use client";

import * as React from "react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Download,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Info,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  detectFieldType as smartDetect,
  isNameHeader as smartIsNameHeader,
  isEmailHeader as smartIsEmailHeader,
  slugifyHeader,
  type DetectResult,
} from "@/lib/csv-detect";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FormField, FormFieldType, FormFieldOption } from "@/lib/types";

// ── Types ───────────────────────────────────────────────────────────

/** How a single CSV column is mapped for import. */
interface ColumnMapping {
  csvHeader: string;
  csvIndex: number;
  sampleValues: string[];
  /** What this column maps to. */
  target:
    | { kind: "skip" }
    | { kind: "name" }     // maps to applicant name
    | { kind: "email" }    // maps to applicant email
    | { kind: "existing"; fieldId: string }
    | { kind: "new"; fieldId: string; label: string; type: FormFieldType; options?: FormFieldOption[] };
  /** Auto-detected type (for the "new" preset). */
  detectedType: FormFieldType;
  detectedOptions?: FormFieldOption[];
  /** 0..1 — surfaced as a tooltip/badge for uncertain columns. */
  detectionConfidence: number;
  /** Human-readable explanation of why this type was chosen. */
  detectionReason: string;
  /** Set true after an AI pass changes the type/options. */
  aiAssisted?: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface ImportApplicantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  existingFields: FormField[];
  onImportComplete: (result: ImportResult) => void;
}

// ── Constants ───────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Short Text",
  textarea: "Long Text",
  email: "Email",
  phone: "Phone",
  url: "URL",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  multi_select: "Multi Select",
  radio: "Radio",
  checkbox: "Checkbox",
  file: "File",
  heading: "Heading",
  paragraph: "Paragraph",
};

const IMPORTABLE_TYPES: FormFieldType[] = [
  "text", "textarea", "email", "phone", "url", "number", "date",
  "select", "multi_select", "radio", "checkbox",
];

// ── Field Type Detection ────────────────────────────────────────────
// The heavy logic lives in `@/lib/csv-detect` so the dialog stays focused on
// UI. Aliases preserve the existing identifiers used below.

const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const detectFieldType = (header: string, values: string[]): DetectResult =>
  smartDetect(header, values);
const isNameHeader = smartIsNameHeader;
const isEmailHeader = smartIsEmailHeader;
const slugify = slugifyHeader;

// ── Example CSV ─────────────────────────────────────────────────────

const EXAMPLE_CSV = `Name,Email,Age,University,Major,Experience Level,GitHub URL,Why do you want to participate?
John Doe,john@example.com,22,MIT,Computer Science,Beginner,https://github.com/johndoe,"I want to learn AI and meet like-minded builders."
Jane Smith,jane@example.com,24,Stanford,Data Science,Intermediate,https://github.com/janesmith,"Excited to build a real product in 48 hours."
Ahmed Ali,ahmed@example.com,21,NYU Abu Dhabi,Engineering,Advanced,https://github.com/ahmedali,"Looking to connect with startups and showcase my skills."`;

function downloadExampleCsv() {
  const blob = new Blob([EXAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "import-applicants-example.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Sub-components ──────────────────────────────────────────────────

/** A single row in the mapping table. */
function MappingRow({
  mapping,
  existingFields,
  onChange,
}: {
  mapping: ColumnMapping;
  existingFields: FormField[];
  onChange: (updated: ColumnMapping) => void;
}) {
  const { target } = mapping;
  const isNew = target.kind === "new";

  // Current selection value for the dropdown
  const selectValue =
    target.kind === "skip" ? "__skip__"
    : target.kind === "name" ? "__name__"
    : target.kind === "email" ? "__email__"
    : target.kind === "existing" ? `existing:${target.fieldId}`
    : "__new__";

  const handleSelect = (val: string) => {
    if (val === "__skip__") {
      onChange({ ...mapping, target: { kind: "skip" } });
    } else if (val === "__name__") {
      onChange({ ...mapping, target: { kind: "name" } });
    } else if (val === "__email__") {
      onChange({ ...mapping, target: { kind: "email" } });
    } else if (val.startsWith("existing:")) {
      const fieldId = val.replace("existing:", "");
      onChange({ ...mapping, target: { kind: "existing", fieldId } });
    } else if (val === "__new__") {
      onChange({
        ...mapping,
        target: {
          kind: "new",
          fieldId: slugify(mapping.csvHeader),
          label: mapping.csvHeader.trim(),
          type: mapping.detectedType,
          options: mapping.detectedOptions,
        },
      });
    }
  };

  return (
    <div
      className={cn(
        "grid gap-3 px-4 py-3 items-center border-b last:border-b-0 transition-colors",
        target.kind === "skip" ? "opacity-50 bg-muted/20" : "bg-background",
        "grid-cols-[1fr,auto,1fr]  sm:grid-cols-[1fr,32px,1fr,auto]"
      )}
    >
      {/* Left: CSV column */}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{mapping.csvHeader}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          e.g. {mapping.sampleValues[0] || "—"}
        </p>
      </div>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mx-auto" />

      {/* Right: Mapping target */}
      <div className="min-w-0 space-y-1.5">
        <select
          value={selectValue}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
        >
          <optgroup label="Special">
            <option value="__name__">Applicant Name</option>
            <option value="__email__">Applicant Email</option>
          </optgroup>
          <optgroup label="Action">
            <option value="__new__">Create New Field</option>
            <option value="__skip__">Skip This Column</option>
          </optgroup>
          {existingFields.length > 0 && (
            <optgroup label="Map to Existing Field">
              {existingFields.map((f) => (
                <option key={f.id} value={`existing:${f.id}`}>
                  {f.label} ({FIELD_TYPE_LABELS[f.type]})
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Inline editing for new fields */}
        {isNew && (
          <div className="flex items-center gap-2">
            <Input
              value={target.label}
              onChange={(e) =>
                onChange({
                  ...mapping,
                  target: { ...target, label: e.target.value, fieldId: slugify(e.target.value || mapping.csvHeader) },
                })
              }
              placeholder="Field label"
              className="h-8 text-xs flex-1"
            />
            <select
              value={target.type}
              onChange={(e) =>
                onChange({
                  ...mapping,
                  target: { ...target, type: e.target.value as FormFieldType },
                })
              }
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs shrink-0"
            >
              {IMPORTABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Detected badge (desktop only) */}
      <div
        className="shrink-0 hidden sm:flex flex-col items-end gap-0.5"
        title={mapping.detectionReason}
      >
        <Badge
          variant={mapping.aiAssisted ? "default" : "muted"}
          className="text-[10px] gap-1"
        >
          {mapping.aiAssisted && <Sparkles className="h-2.5 w-2.5" />}
          {FIELD_TYPE_LABELS[mapping.detectedType]}
        </Badge>
        {mapping.detectionConfidence < 0.7 && !mapping.aiAssisted && (
          <span className="text-[9px] text-amber-600 leading-none">uncertain</span>
        )}
      </div>
    </div>
  );
}

// ── Main Dialog ─────────────────────────────────────────────────────

type Step = "upload" | "mapping" | "importing" | "done";

export function ImportApplicantsDialog({
  open,
  onOpenChange,
  hackathonId,
  existingFields,
  onImportComplete,
}: ImportApplicantsDialogProps) {
  const [step, setStep] = React.useState<Step>("upload");
  const [csvData, setCsvData] = React.useState<string[][]>([]);
  const [mappings, setMappings] = React.useState<ColumnMapping[]>([]);
  const [importStatus, setImportStatus] = React.useState("");
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [aiAssistRunning, setAiAssistRunning] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset on open/close
  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setCsvData([]);
      setMappings([]);
      setImportStatus("");
      setResult(null);
      setError(null);
      setShowPreview(false);
    }
  }, [open]);

  // ── CSV Parsing ──────────────────────────────────────────────────

  const handleFile = React.useCallback(
    (file: File) => {
      setError(null);
      if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        setError("Please upload a CSV file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum size is 10MB.");
        return;
      }

      Papa.parse<string[]>(file, {
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message} (row ${results.errors[0].row})`);
            return;
          }
          const rows = results.data;
          if (rows.length < 2) {
            setError("CSV must have at least a header row and one data row.");
            return;
          }

          const headerRow = rows[0];
          const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));
          if (dataRows.length === 0) {
            setError("CSV contains no data rows.");
            return;
          }

          // Build initial mappings with auto-detection
          const initialMappings: ColumnMapping[] = headerRow.map((h, colIdx) => {
            const colValues = dataRows.map((r) => r[colIdx] ?? "");
            const detection = detectFieldType(h, colValues);
            const { type, options, confidence, reason } = detection;
            const nameMatch = isNameHeader(h);
            const emailMatch = isEmailHeader(h);

            const target: ColumnMapping["target"] = nameMatch
              ? { kind: "name" }
              : emailMatch
                ? { kind: "email" }
                : {
                    kind: "new",
                    fieldId: slugify(h),
                    label: h.trim(),
                    type,
                    options,
                  };

            return {
              csvHeader: h,
              csvIndex: colIdx,
              sampleValues: colValues.slice(0, 5),
              target,
              detectedType: type,
              detectedOptions: options,
              detectionConfidence: confidence,
              detectionReason: reason,
            };
          });

          setCsvData(dataRows);
          setMappings(initialMappings);
          setStep("mapping");
        },
        error: (err: Error) => {
          setError(`Failed to read CSV: ${err.message}`);
        },
      });
    },
    []
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const updateMapping = (idx: number, updated: ColumnMapping) => {
    setMappings((prev) => prev.map((m, i) => (i === idx ? updated : m)));
  };

  // ── Validation ───────────────────────────────────────────────────

  const hasName = mappings.some((m) => m.target.kind === "name");
  const hasEmail = mappings.some((m) => m.target.kind === "email");
  const mappedFieldCount = mappings.filter(
    (m) => m.target.kind === "new" || m.target.kind === "existing"
  ).length;
  // Only a Name mapping is required. Email is optional — rows without an
  // email are imported under a non-deliverable placeholder address so the
  // applicant still gets a profile + registration keyed by their name.
  const canImport = hasName;

  // ── AI Assist ────────────────────────────────────────────────────
  // Sends every column that's still mapped to a new field to Claude Haiku
  // for a second-opinion classification. Only columns whose target is still
  // `kind: "new"` are sent — name/email and existing-field mappings are
  // assumed already-correct from the local detector + user edits.

  const handleAiAssist = React.useCallback(async () => {
    const targets = mappings.filter(
      (m): m is ColumnMapping & { target: { kind: "new"; fieldId: string; label: string; type: FormFieldType; options?: FormFieldOption[] } } =>
        m.target.kind === "new"
    );
    if (targets.length === 0) {
      toast.info("Nothing to classify — every column is already mapped.");
      return;
    }

    setAiAssistRunning(true);
    try {
      const res = await fetch("/api/csv/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columns: targets.map((m) => ({
            header: m.csvHeader,
            samples: m.sampleValues,
            localGuess: m.detectedType,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "AI assist failed");
      }
      const list = (json.classifications as Array<{
        header: string;
        type: FormFieldType;
        options?: string[];
        reason?: string;
      }>) || [];
      const byHeader = new Map(list.map((c) => [c.header, c]));

      let changed = 0;
      setMappings((prev) =>
        prev.map((m) => {
          if (m.target.kind !== "new") return m;
          const ai = byHeader.get(m.csvHeader);
          if (!ai || !IMPORTABLE_TYPES.includes(ai.type)) return m;

          const sameType = ai.type === m.target.type;
          const optionsFromAi = ai.options?.length
            ? ai.options.map((v) => ({
                label: v,
                value: v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
              }))
            : undefined;

          if (sameType && !optionsFromAi) return m;
          changed += 1;
          return {
            ...m,
            target: {
              ...m.target,
              type: ai.type,
              options: optionsFromAi ?? m.target.options,
            },
            detectedType: ai.type,
            detectedOptions: optionsFromAi ?? m.detectedOptions,
            detectionConfidence: 0.95,
            detectionReason: ai.reason || "Refined by Claude Haiku",
            aiAssisted: true,
          };
        })
      );

      if (changed === 0) {
        toast.success("AI agrees with the local detector — no changes.");
      } else {
        toast.success(`AI refined ${changed} column${changed === 1 ? "" : "s"}.`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "AI assist failed"
      );
    } finally {
      setAiAssistRunning(false);
    }
  }, [mappings]);

  const lowConfidenceCount = React.useMemo(
    () =>
      mappings.filter(
        (m) => m.target.kind === "new" && m.detectionConfidence < 0.7
      ).length,
    [mappings]
  );

  // ── Import ───────────────────────────────────────────────────────

  const handleImport = async () => {
    setStep("importing");
    setImportStatus("Preparing import...");
    setError(null);

    try {
      // Build new form fields
      const newFields: FormField[] = mappings
        .filter((m): m is ColumnMapping & { target: { kind: "new" } } => m.target.kind === "new")
        .map((m, idx) => ({
          id: m.target.fieldId,
          type: m.target.type,
          label: m.target.label,
          required: false,
          order: (existingFields.length ?? 0) + idx,
          ...(m.target.options ? { options: m.target.options } : {}),
        }));

      // Build row data
      const rows = csvData.map((row) => {
        const formData: Record<string, unknown> = {};
        let name = "";
        let email = "";

        for (const mapping of mappings) {
          const value = (row[mapping.csvIndex] ?? "").trim();
          const { target } = mapping;

          if (target.kind === "name") { name = value; continue; }
          if (target.kind === "email") { email = value; continue; }
          if (target.kind === "skip") continue;

          const fieldId = target.kind === "existing" ? target.fieldId : target.fieldId;
          const fieldType = target.kind === "existing"
            ? (existingFields.find((f) => f.id === target.fieldId)?.type ?? "text")
            : target.type;

          if (fieldType === "number" && NUMBER_RE.test(value)) {
            formData[fieldId] = parseFloat(value);
          } else if (fieldType === "checkbox") {
            formData[fieldId] = ["true", "yes", "1"].includes(value.toLowerCase());
          } else {
            formData[fieldId] = value;
          }
        }

        return { name, email, formData };
      });

      // Email is optional; only a name is required to import an applicant.
      const validRows = rows.filter((r) => r.name);
      const skippedCount = rows.length - validRows.length;

      setImportStatus(`Importing ${validRows.length} applicants...`);

      const res = await fetch(`/api/hackathons/${hackathonId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newFields, rows: validRows }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");

      const importResult: ImportResult = {
        imported: json.imported ?? 0,
        skipped: skippedCount + (json.skipped ?? 0),
        errors: json.errors ?? [],
      };

      setResult(importResult);
      setStep("done");
      onImportComplete(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("mapping");
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={step === "importing" ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Applicants from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Upload ───────────────────────────────── */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* Instructions */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        Export your responses from <strong>M365 Forms</strong> (or
                        any spreadsheet) as a <strong>.csv</strong> file.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-xs">
                        <li>
                          The file must include a <strong>Name</strong> column.
                          An <strong>Email</strong> column is optional — rows
                          without an email are still imported under the
                          applicant&apos;s name.
                        </li>
                        <li>
                          All other columns (Age, University, etc.) will be
                          auto-detected as form fields. You can adjust the
                          mapping in the next step.
                        </li>
                        <li>
                          Field types (text, number, dropdown, etc.) are
                          detected automatically from the data but you can
                          override them.
                        </li>
                      </ul>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={downloadExampleCsv}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download example CSV
                  </Button>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-16 flex flex-col items-center justify-center gap-3",
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      dragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {dragActive ? "Drop your CSV here" : "Click or drag a CSV file here"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .csv files up to 10 MB
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 2: Field Mapping ───────────────────────── */}
            {step === "mapping" && (
              <motion.div
                key="mapping"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Stats bar */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="muted">{csvData.length} rows</Badge>
                  <Badge variant="muted">{mappings.length} columns</Badge>
                  {hasName && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Name mapped
                    </Badge>
                  )}
                  {hasEmail && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Email mapped
                    </Badge>
                  )}
                  {!hasName && (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Name not mapped
                    </Badge>
                  )}
                  {!hasEmail && (
                    <Badge variant="muted" className="gap-1">
                      <Info className="h-3 w-3" /> Email optional
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {mappedFieldCount} field{mappedFieldCount !== 1 ? "s" : ""} mapped
                  </Badge>
                  {lowConfidenceCount > 0 && (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {lowConfidenceCount} uncertain
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      onClick={handleAiAssist}
                      disabled={aiAssistRunning}
                    >
                      {aiAssistRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {aiAssistRunning ? "Asking Claude…" : "Refine with AI"}
                    </Button>
                  </div>
                </div>

                {/* Mapping description */}
                <p className="text-xs text-muted-foreground">
                  Map each CSV column to its target. For each column you can:
                  map it to <strong>Applicant Name / Email</strong>, map to an{" "}
                  <strong>existing form field</strong>, <strong>create a new field</strong>{" "}
                  (with custom name and type), or <strong>skip</strong> it.
                </p>

                {/* Mapping table */}
                <div className="rounded-xl border overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-3 px-4 py-2 bg-muted/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    <span>CSV Column</span>
                    <span />
                    <span>Maps To</span>
                    <span className="hidden sm:block">Detected</span>
                  </div>
                  {/* Rows */}
                  {mappings.map((m, idx) => (
                    <MappingRow
                      key={idx}
                      mapping={m}
                      existingFields={existingFields}
                      onChange={(updated) => updateMapping(idx, updated)}
                    />
                  ))}
                </div>

                {/* Data preview toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        showPreview && "rotate-180"
                      )}
                    />
                    {showPreview ? "Hide" : "Show"} data preview (first 5 rows)
                  </button>

                  {showPreview && (
                    <div className="rounded-xl border overflow-x-auto mt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            {mappings
                              .filter((m) => m.target.kind !== "skip")
                              .map((m, i) => (
                                <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                  {m.csvHeader}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 5).map((row, rIdx) => (
                            <tr key={rIdx} className="border-t hover:bg-muted/20">
                              {mappings
                                .filter((m) => m.target.kind !== "skip")
                                .map((m, fIdx) => (
                                  <td key={fIdx} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                                    {row[m.csvIndex] ?? ""}
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 3: Importing ───────────────────────────── */}
            {step === "importing" && (
              <motion.div
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">{importStatus}</p>
                <p className="text-xs text-muted-foreground">
                  Please don&apos;t close this dialog...
                </p>
              </motion.div>
            )}

            {/* ── Step 4: Done ────────────────────────────────── */}
            {step === "done" && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-5"
              >
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-500" />
                </div>
                <div className="text-center">
                  <h3 className="font-display text-lg font-bold mb-1">Import Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    {result.imported} applicant{result.imported !== 1 ? "s" : ""} imported
                    {result.skipped > 0 && `, ${result.skipped} skipped`}
                  </p>
                </div>
                {result.errors.length > 0 && (
                  <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-3 max-h-[120px] overflow-y-auto">
                    <p className="text-xs font-medium text-destructive mb-1">
                      {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                    </p>
                    <ul className="text-xs text-destructive/80 space-y-0.5">
                      {result.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>- {e}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>...and {result.errors.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <Button variant="gradient" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer for mapping step */}
        {step === "mapping" && (
          <div className="border-t px-6 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStep("upload"); setError(null); }}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {!canImport && (
                <p className="text-xs text-destructive">
                  Map a Name column before importing
                </p>
              )}
              <Button
                variant="gradient"
                size="sm"
                onClick={handleImport}
                disabled={!canImport}
                className="gap-1.5"
              >
                Import {csvData.length} Applicant{csvData.length !== 1 ? "s" : ""}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
