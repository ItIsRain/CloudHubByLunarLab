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
  Plus,
  ChevronDown,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;
const PHONE_RE = /^[\d+\-().\s]{7,20}$/;
const DATE_RE = /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

function detectFieldType(
  header: string,
  values: string[]
): { type: FormFieldType; options?: FormFieldOption[] } {
  const nonEmpty = values.filter((v) => v.trim().length > 0);
  if (nonEmpty.length === 0) return { type: "text" };

  const h = header.toLowerCase();
  if (h.includes("email")) return { type: "email" };
  if (h.includes("phone") || h.includes("mobile")) return { type: "phone" };
  if (h.includes("url") || h.includes("website") || h.includes("github") || h.includes("linkedin") || h.includes("link"))
    return { type: "url" };
  if (h.includes("date") || h.includes("dob") || h.includes("birth")) return { type: "date" };

  const sample = nonEmpty.slice(0, 50);
  if (sample.every((v) => EMAIL_RE.test(v.trim()))) return { type: "email" };
  if (sample.every((v) => URL_RE.test(v.trim()))) return { type: "url" };
  if (sample.every((v) => PHONE_RE.test(v.trim()))) return { type: "phone" };
  if (sample.every((v) => DATE_RE.test(v.trim()))) return { type: "date" };
  if (sample.every((v) => NUMBER_RE.test(v.trim()))) return { type: "number" };

  const unique = new Set(nonEmpty.map((v) => v.trim()));
  if (unique.size <= 15 && unique.size < nonEmpty.length * 0.5) {
    const options: FormFieldOption[] = [...unique]
      .sort()
      .map((v) => ({ label: v, value: v.toLowerCase().replace(/\s+/g, "_") }));
    return { type: "select", options };
  }

  const avgLen = nonEmpty.reduce((sum, v) => sum + v.length, 0) / nonEmpty.length;
  if (avgLen > 120) return { type: "textarea" };

  return { type: "text" };
}

function isNameHeader(h: string): boolean {
  const l = h.toLowerCase().trim();
  return l === "name" || l === "full name" || l === "fullname" || l === "applicant name" || l === "participant name";
}

function isEmailHeader(h: string): boolean {
  const l = h.toLowerCase().trim();
  return l === "email" || l === "email address" || l === "e-mail" || l === "applicant email";
}

function slugify(header: string): string {
  return header.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
}

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
  const isFixed = target.kind === "name" || target.kind === "email";
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
      <Badge
        variant="muted"
        className="text-[10px] shrink-0 hidden sm:inline-flex"
      >
        {FIELD_TYPE_LABELS[mapping.detectedType]}
      </Badge>
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
            const { type, options } = detectFieldType(h, colValues);
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
  const canImport = hasName && hasEmail;

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

      const validRows = rows.filter((r) => r.name && r.email);
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
                          The file must include <strong>Name</strong> and{" "}
                          <strong>Email</strong> columns (used to identify each
                          applicant).
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
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Email not mapped
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {mappedFieldCount} field{mappedFieldCount !== 1 ? "s" : ""} mapped
                  </Badge>
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
                  Map both Name and Email before importing
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
