"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: string[][]) => void;
}

const COLUMN_OPTIONS = [
  "Skip",
  "Name",
  "Email",
  "Phone",
  "Role",
  "Organization",
  "Ticket Type",
  "Notes",
];

export function ImportCsvDialog({
  open,
  onOpenChange,
  onImport,
}: ImportCsvDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): string[][] => {
    return text
      .trim()
      .split("\n")
      .map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      );
  };

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setColumnMappings(
        new Array(parsed[0]?.length || 0).fill("Skip")
      );
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    await new Promise((r) => setTimeout(r, 1500));
    onImport(rows);
    setIsImporting(false);
    toast.success(`Imported ${rows.length} rows successfully!`);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFile(null);
    setRows([]);
    setColumnMappings([]);
  };

  const previewRows = rows.slice(0, 5);
  const totalRows = rows.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload area */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .csv files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalRows} rows, {rows[0]?.length || 0} columns
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Preview table */}
          {previewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Preview</h4>
                <Badge variant="secondary">
                  Showing {previewRows.length} of {totalRows} rows
                </Badge>
              </div>
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {previewRows[0]?.map((_, colIndex) => (
                        <th key={colIndex} className="px-3 py-2 text-left">
                          <select
                            className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                            value={columnMappings[colIndex] || "Skip"}
                            onChange={(e) => {
                              const newMappings = [...columnMappings];
                              newMappings[colIndex] = e.target.value;
                              setColumnMappings(newMappings);
                            }}
                          >
                            {COLUMN_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-b border-border last:border-0"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-3 py-2 text-muted-foreground truncate max-w-[150px]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import button */}
          {rows.length > 0 && (
            <Button
              className="w-full"
              disabled={isImporting}
              onClick={handleImport}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import {totalRows} Row{totalRows !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
