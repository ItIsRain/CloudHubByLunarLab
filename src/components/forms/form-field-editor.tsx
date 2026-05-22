"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings,
  Copy,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Link as LinkIcon,
  Hash,
  Calendar,
  List,
  ListChecks,
  CircleDot,
  CheckSquare,
  Heading,
  Text,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, slugify } from "@/lib/utils";
import type {
  FormField,
  FormFieldType,
  FormFieldOption,
  FormFieldValidation,
} from "@/lib/types";

// ── Shared constants ───────────────────────────────────────────────

export const fieldEditorSelectClasses =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

export const fieldTypeOptions: {
  value: FormFieldType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "text", label: "Short Text", icon: <Type className="h-3.5 w-3.5" /> },
  { value: "textarea", label: "Long Text", icon: <AlignLeft className="h-3.5 w-3.5" /> },
  { value: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
  { value: "phone", label: "Phone", icon: <Phone className="h-3.5 w-3.5" /> },
  { value: "url", label: "URL", icon: <LinkIcon className="h-3.5 w-3.5" /> },
  { value: "number", label: "Number", icon: <Hash className="h-3.5 w-3.5" /> },
  { value: "date", label: "Date", icon: <Calendar className="h-3.5 w-3.5" /> },
  { value: "select", label: "Dropdown", icon: <List className="h-3.5 w-3.5" /> },
  { value: "multi_select", label: "Multi Select", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { value: "radio", label: "Radio", icon: <CircleDot className="h-3.5 w-3.5" /> },
  { value: "checkbox", label: "Checkbox", icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { value: "file", label: "File Upload", icon: <Upload className="h-3.5 w-3.5" /> },
  { value: "heading", label: "Heading", icon: <Heading className="h-3.5 w-3.5" /> },
  { value: "paragraph", label: "Info Text", icon: <Text className="h-3.5 w-3.5" /> },
];

export const fieldTypeIconMap: Record<FormFieldType, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  textarea: <AlignLeft className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  url: <LinkIcon className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  select: <List className="h-3.5 w-3.5" />,
  multi_select: <ListChecks className="h-3.5 w-3.5" />,
  radio: <CircleDot className="h-3.5 w-3.5" />,
  checkbox: <CheckSquare className="h-3.5 w-3.5" />,
  file: <Upload className="h-3.5 w-3.5" />,
  heading: <Heading className="h-3.5 w-3.5" />,
  paragraph: <Text className="h-3.5 w-3.5" />,
};

export const allowedFileTypePresets = [
  { label: "PDF", value: "application/pdf" },
  { label: "DOCX", value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { label: "PPTX", value: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  { label: "Images", value: "image/*" },
];

export const fileSizeOptions = [
  { label: "1 MB", value: 1_048_576 },
  { label: "2 MB", value: 2_097_152 },
  { label: "5 MB", value: 5_242_880 },
  { label: "10 MB", value: 10_485_760 },
];

// ── Options Editor ─────────────────────────────────────────────────

export function OptionsEditor({
  options,
  onChange,
}: {
  options: FormFieldOption[];
  onChange: (options: FormFieldOption[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Options
      </label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            value={opt.label}
            onChange={(e) => {
              const updated = [...options];
              updated[i] = {
                label: e.target.value,
                value: slugify(e.target.value) || `option_${i + 1}`,
              };
              onChange(updated);
            }}
            placeholder={`Option ${i + 1}`}
            className="text-sm"
          />
          <button
            type="button"
            onClick={() => {
              onChange(options.filter((_, j) => j !== i));
            }}
            className="text-muted-foreground hover:text-destructive shrink-0 p-1"
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
          onChange([
            ...options,
            {
              label: `Option ${options.length + 1}`,
              value: `option_${options.length + 1}`,
            },
          ])
        }
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" /> Add Option
      </Button>
    </div>
  );
}

// ── File Upload Config ─────────────────────────────────────────────

export function FileUploadConfig({
  validation,
  onChange,
}: {
  validation?: FormFieldValidation;
  onChange: (validation: FormFieldValidation) => void;
}) {
  const currentFileTypes = validation?.allowedFileTypes || [];
  const currentMaxSize = validation?.maxFileSize || 5_242_880;

  function toggleFileType(type: string) {
    const updated = currentFileTypes.includes(type)
      ? currentFileTypes.filter((t) => t !== type)
      : [...currentFileTypes, type];
    onChange({
      ...validation,
      allowedFileTypes: updated.length > 0 ? updated : undefined,
    });
  }

  return (
    <div className="space-y-3 rounded-lg bg-muted/50 p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        File Upload Settings
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Allowed File Types
        </label>
        <div className="flex flex-wrap gap-2">
          {allowedFileTypePresets.map((preset) => (
            <label
              key={preset.value}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={currentFileTypes.includes(preset.value)}
                onChange={() => toggleFileType(preset.value)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <span className="text-xs">{preset.label}</span>
            </label>
          ))}
        </div>
        {currentFileTypes.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            All file types allowed when none selected.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Max File Size
        </label>
        <select
          value={currentMaxSize}
          onChange={(e) =>
            onChange({
              ...validation,
              maxFileSize: parseInt(e.target.value),
            })
          }
          className={fieldEditorSelectClasses}
        >
          {fileSizeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Conditional Logic Editor ───────────────────────────────────────

export function ConditionalLogicEditor({
  field,
  availableFields,
  onUpdate,
}: {
  field: FormField;
  availableFields: FormField[];
  onUpdate: (updates: Partial<FormField>) => void;
}) {
  const hasConditional = !!field.conditionalOn;

  function toggleConditional() {
    if (hasConditional) {
      onUpdate({ conditionalOn: undefined });
    } else if (availableFields.length > 0) {
      onUpdate({
        conditionalOn: {
          fieldId: availableFields[0].id,
          operator: "is_not_empty",
        },
      });
    }
  }

  if (availableFields.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={hasConditional}
          onChange={toggleConditional}
          className="h-3.5 w-3.5 rounded border-input accent-primary"
        />
        <span className="text-xs font-medium">Conditional Visibility</span>
      </label>
      <p className="text-[10px] text-muted-foreground">
        Show this field only when another field meets a condition.
      </p>

      {hasConditional && field.conditionalOn && (
        <div className="grid gap-2 sm:grid-cols-3 rounded-lg bg-muted/50 p-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">
              If field
            </label>
            <select
              value={field.conditionalOn.fieldId}
              onChange={(e) =>
                onUpdate({
                  conditionalOn: {
                    ...field.conditionalOn!,
                    fieldId: e.target.value,
                  },
                })
              }
              className={fieldEditorSelectClasses}
            >
              {availableFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label || "(untitled)"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">
              Condition
            </label>
            <select
              value={field.conditionalOn.operator}
              onChange={(e) =>
                onUpdate({
                  conditionalOn: {
                    ...field.conditionalOn!,
                    operator: e.target.value as
                      | "equals"
                      | "not_equals"
                      | "contains"
                      | "is_not_empty",
                  },
                })
              }
              className={fieldEditorSelectClasses}
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="is_not_empty">Is Not Empty</option>
            </select>
          </div>

          {field.conditionalOn.operator !== "is_not_empty" && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">
                Value
              </label>
              <Input
                value={field.conditionalOn.value || ""}
                onChange={(e) =>
                  onUpdate({
                    conditionalOn: {
                      ...field.conditionalOn!,
                      value: e.target.value,
                    },
                  })
                }
                placeholder="Expected value"
                className="text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Field Editor ───────────────────────────────────────────────────

export function FieldEditor({
  field,
  allFields,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: FormField;
  allFields: FormField[];
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = React.useState(!field.label);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const hasOptions =
    field.type === "select" ||
    field.type === "multi_select" ||
    field.type === "radio";
  const isLayout = field.type === "heading" || field.type === "paragraph";
  const isFile = field.type === "file";
  const isInputType = !isLayout && !isFile;

  const conditionalFieldOptions = allFields.filter(
    (f) =>
      f.id !== field.id &&
      f.type !== "heading" &&
      f.type !== "paragraph" &&
      f.type !== "file"
  );

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        expanded
          ? "border-primary/30 bg-primary/[0.02] shadow-sm"
          : "border-border hover:border-border/80"
      )}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-muted-foreground shrink-0">
          {fieldTypeIconMap[field.type]}
        </span>
        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {fieldTypeOptions.find((ft) => ft.value === field.type)?.label ||
            field.type}
        </span>
        <span className="text-sm font-medium truncate flex-1">
          {field.label || "(untitled)"}
        </span>
        {field.required && (
          <span className="text-[10px] font-medium text-primary border border-primary/30 rounded px-1.5 py-0.5">
            Required
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            className={cn(
              "p-1 transition-colors",
              isFirst
                ? "text-muted-foreground/30 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            className={cn(
              "p-1 transition-colors",
              isLast
                ? "text-muted-foreground/30 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Field Type
              </label>
              <select
                value={field.type}
                onChange={(e) => {
                  const newType = e.target.value as FormFieldType;
                  const updates: Partial<FormField> = { type: newType };
                  if (
                    (newType === "select" ||
                      newType === "multi_select" ||
                      newType === "radio") &&
                    !field.options?.length
                  ) {
                    updates.options = [
                      { label: "Option 1", value: "option_1" },
                    ];
                  }
                  if (newType !== "file" && field.type === "file") {
                    updates.validation = undefined;
                  }
                  onUpdate(updates);
                }}
                className={fieldEditorSelectClasses}
              >
                {fieldTypeOptions.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Label *
              </label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder={
                  isLayout
                    ? field.type === "heading"
                      ? "Section heading"
                      : "Informational text"
                    : "e.g. Phone Number"
                }
              />
            </div>
          </div>

          {isInputType && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Placeholder
                </label>
                <Input
                  value={field.placeholder || ""}
                  onChange={(e) => onUpdate({ placeholder: e.target.value })}
                  placeholder="Placeholder text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Help Text
                </label>
                <Input
                  value={field.description || ""}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Help text shown below the field"
                />
              </div>
            </div>
          )}

          {isLayout && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {field.type === "heading" ? "Heading Text" : "Paragraph Text"}
              </label>
              <Input
                value={field.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder={
                  field.type === "heading"
                    ? "Section heading"
                    : "Informational text"
                }
              />
            </div>
          )}

          {isFile && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Help Text
              </label>
              <Input
                value={field.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="e.g. Upload your pitch deck"
              />
            </div>
          )}

          {hasOptions && (
            <OptionsEditor
              options={field.options || []}
              onChange={(options) => onUpdate({ options })}
            />
          )}

          {isFile && (
            <FileUploadConfig
              validation={field.validation}
              onChange={(validation) => onUpdate({ validation })}
            />
          )}

          {!isLayout && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-3 w-3" />
              {showAdvanced ? "Hide Advanced" : "Advanced Settings"}
              {showAdvanced ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}

          {showAdvanced && !isLayout && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-2 border-t border-dashed border-border"
            >
              {(field.type === "text" ||
                field.type === "textarea" ||
                field.type === "url" ||
                field.type === "email") && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Min Length
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={field.validation?.minLength ?? ""}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            minLength: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      placeholder="No minimum"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Max Length
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={field.validation?.maxLength ?? ""}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            maxLength: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      placeholder="No maximum"
                    />
                  </div>
                </div>
              )}

              {field.type === "number" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Min Value
                    </label>
                    <Input
                      type="number"
                      value={field.validation?.min ?? ""}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            min: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      placeholder="No minimum"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Max Value
                    </label>
                    <Input
                      type="number"
                      value={field.validation?.max ?? ""}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            max: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      placeholder="No maximum"
                    />
                  </div>
                </div>
              )}

              <ConditionalLogicEditor
                field={field}
                availableFields={conditionalFieldOptions}
                onUpdate={onUpdate}
              />
            </motion.div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            {!isLayout ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                />
                <span className="text-xs font-medium">Required</span>
              </label>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDuplicate}
                className="text-xs h-7 px-2"
              >
                <Copy className="h-3 w-3 mr-1" /> Duplicate
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-xs text-destructive hover:text-destructive h-7 px-2"
              >
                <Trash2 className="h-3 w-3 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
