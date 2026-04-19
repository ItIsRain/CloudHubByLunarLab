"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories as PRESET_CATEGORIES } from "@/lib/constants";
import {
  MAX_CATEGORIES_PER_HACKATHON,
  MAX_CATEGORY_LENGTH,
  categoryLabel,
  normalizeCategory,
  sanitizeCategories,
} from "@/lib/hackathon-categories";

interface CategoryMultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Cap on how many categories can be selected. Defaults to the platform-wide limit. */
  maxCategories?: number;
  /** Max length for a single custom entry. Defaults to the platform-wide cap. */
  maxLength?: number;
  className?: string;
  /** Heading / hint text rendered above the preset grid. */
  helperText?: string;
  /** When true, the whole control is read-only (no toggles, no customs). */
  disabled?: boolean;
  /** Optional id for the hidden input the helper label associates with. */
  id?: string;
}

export function CategoryMultiSelect({
  value,
  onChange,
  maxCategories = MAX_CATEGORIES_PER_HACKATHON,
  maxLength = MAX_CATEGORY_LENGTH,
  className,
  helperText,
  disabled,
  id,
}: CategoryMultiSelectProps) {
  const [customDraft, setCustomDraft] = React.useState("");
  const [addingCustom, setAddingCustom] = React.useState(false);
  const customInputRef = React.useRef<HTMLInputElement | null>(null);

  // Keep internal state normalized so parent state shape matches what we
  // persist to the DB (lowercased, deduped). Rebuilding on every `value`
  // change keeps dedupe predictable even when the caller passes in raw
  // strings.
  const normalized = React.useMemo(() => sanitizeCategories(value), [value]);
  const selectedSet = React.useMemo(() => new Set(normalized), [normalized]);

  const atLimit = normalized.length >= maxCategories;

  const presetKeys = React.useMemo(
    () => PRESET_CATEGORIES.map((c) => c.value),
    []
  );

  // Custom entries = anything in the selection that isn't one of the
  // built-in preset keys. Rendered in their own row below the preset grid.
  const customEntries = React.useMemo(
    () => normalized.filter((k) => !presetKeys.includes(k)),
    [normalized, presetKeys]
  );

  const toggle = React.useCallback(
    (key: string) => {
      if (disabled) return;
      const norm = normalizeCategory(key);
      if (!norm) return;
      if (selectedSet.has(norm)) {
        onChange(normalized.filter((k) => k !== norm));
        return;
      }
      if (atLimit) return;
      onChange(sanitizeCategories([...normalized, norm]));
    },
    [atLimit, disabled, normalized, onChange, selectedSet]
  );

  const commitCustom = React.useCallback(() => {
    if (disabled) return;
    const norm = normalizeCategory(customDraft);
    if (!norm) {
      setAddingCustom(false);
      setCustomDraft("");
      return;
    }
    if (norm.length > maxLength) return;
    if (selectedSet.has(norm)) {
      // Already selected (either as preset or custom) — just clear the input.
      setCustomDraft("");
      setAddingCustom(false);
      return;
    }
    if (atLimit) return;
    onChange(sanitizeCategories([...normalized, norm]));
    setCustomDraft("");
    setAddingCustom(false);
  }, [atLimit, customDraft, disabled, maxLength, normalized, onChange, selectedSet]);

  const remove = React.useCallback(
    (key: string) => {
      if (disabled) return;
      onChange(normalized.filter((k) => k !== key));
    },
    [disabled, normalized, onChange]
  );

  // Auto-focus the custom input when the user opens the entry UI.
  React.useEffect(() => {
    if (addingCustom) {
      customInputRef.current?.focus();
    }
  }, [addingCustom]);

  return (
    <div className={cn("space-y-3", className)} data-testid="category-multi-select" id={id}>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {/* Preset chip grid — tap to toggle */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {PRESET_CATEGORIES.map((cat) => {
          const selected = selectedSet.has(cat.value);
          const lockedOut = !selected && atLimit;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggle(cat.value)}
              disabled={disabled || lockedOut}
              aria-pressed={selected}
              className={cn(
                "rounded-xl border-2 p-2.5 text-center text-xs font-medium transition-all",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/30",
                (disabled || lockedOut) && "opacity-50 cursor-not-allowed hover:border-border"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Custom entries row — each removable with an X */}
      {customEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customEntries.map((key) => (
            <Badge
              key={key}
              variant="outline"
              className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs"
            >
              <span>{categoryLabel(key)}</span>
              <button
                type="button"
                onClick={() => remove(key)}
                disabled={disabled}
                aria-label={`Remove ${categoryLabel(key)}`}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* "Add custom" entry row */}
      {addingCustom ? (
        <div className="flex items-center gap-2">
          <Input
            ref={customInputRef}
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            placeholder="e.g. Fintech, EdTech, Climate"
            maxLength={maxLength}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustom();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setAddingCustom(false);
                setCustomDraft("");
              }
            }}
            className="h-9 text-sm"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={commitCustom}
            disabled={disabled || !customDraft.trim() || atLimit}
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAddingCustom(false);
              setCustomDraft("");
            }}
            disabled={disabled}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAddingCustom(true)}
          disabled={disabled || atLimit}
          className="h-8 text-xs gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {atLimit ? "Category limit reached" : "Add custom category"}
        </Button>
      )}

      {/* Footer: count / at-limit hint */}
      <p className="text-[11px] text-muted-foreground">
        {normalized.length === 0
          ? "Pick at least one category to help people discover your competition."
          : `${normalized.length} / ${maxCategories} selected`}
      </p>
    </div>
  );
}
