"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  FileDown,
  FileText,
  FileUp,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { CsvRow } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { parseUploadFile } from "@/lib/upload/parse";
import {
  getDefaultUploadMaps,
  ingestWorkspaceDataset,
  ingestWorkspaceUpload,
  type PayrollMapping,
  type SpendMapping,
} from "@/lib/upload/workspace-ingest";
import { removeWorkspaceDataset, upsertWorkspaceDataset } from "@/lib/upload/dataset-store";
import {
  appendUploadHistory,
  getUploadedInsights,
  getUploadHistory,
  removeUploadedInsight,
  upsertUploadedInsights,
  type UploadedInsights,
  type UploadHistoryEntry,
} from "@/lib/upload/storage";
import { WORKSPACE_DATA_CHANGED } from "@/lib/workspace/workspace-events";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HydrationSafeDate } from "@/components/app/hydration-safe-date";

const ACCEPT =
  ".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

const FORMAT_LABELS = [".csv (UTF-8)", ".xlsx", ".xls"] as const;

const SPEND_FIELDS: { key: keyof SpendMapping; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "vendor", label: "Vendor" },
  { key: "amount", label: "Amount" },
  { key: "category", label: "Category" },
  { key: "department", label: "Department" },
  { key: "invoiceId", label: "Invoice / ref" },
];

const PAYROLL_FIELDS: { key: keyof PayrollMapping; label: string }[] = [
  { key: "name", label: "Employee name" },
  { key: "employeeId", label: "Employee ID" },
  { key: "department", label: "Department" },
  { key: "bankAccount", label: "Bank account" },
  { key: "status", label: "Status" },
  { key: "salary", label: "Salary" },
  { key: "salaryPrevious", label: "Prior salary" },
];

const AUTO_VALUE = "__spendda_auto__";

function newId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type PremiumUploadExperienceProps = {
  entity: string;
  clientId?: string | null;
  className?: string;
};

export function PremiumUploadExperience({ entity, clientId, className }: PremiumUploadExperienceProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);
  const queueReplaceInputRef = React.useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = React.useState(false);

  type Prepared = {
    id: string;
    file: File;
    status: "queued" | "parsing" | "parsed" | "error" | "imported";
    error?: string;
    parsed?: { rows: CsvRow[]; filename: string };
    kind?: "spend" | "payroll";
    rowCount?: number;
    columnCount?: number;
  };

  const [queue, setQueue] = React.useState<Prepared[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [readProgress, setReadProgress] = React.useState(0);
  const [readPhase, setReadPhase] = React.useState<"idle" | "upload" | "parse" | "done">("idle");
  const [commitProgress, setCommitProgress] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [spendOverrides, setSpendOverrides] = React.useState<Partial<SpendMapping>>({});
  const [payrollOverrides, setPayrollOverrides] = React.useState<Partial<PayrollMapping>>({});
  const [insights, setInsights] = React.useState<UploadedInsights[]>([]);
  const [replaceKind, setReplaceKind] = React.useState<UploadedInsights["kind"] | null>(null);
  const [replaceQueueId, setReplaceQueueId] = React.useState<string | null>(null);
  const [parsingFileId, setParsingFileId] = React.useState<string | null>(null);
  const [historyLog, setHistoryLog] = React.useState<UploadHistoryEntry[]>([]);
  const [lastSuccess, setLastSuccess] = React.useState<{
    filename: string;
    kind: "spend" | "payroll";
    rows: number;
    columns: number;
  } | null>(null);

  const active = queue.find((q) => q.id === activeId) || null;

  const refreshInsights = React.useCallback(() => {
    setInsights(getUploadedInsights(clientId));
    setHistoryLog(getUploadHistory(clientId));
  }, [clientId]);

  React.useEffect(() => {
    refreshInsights();
    const on = () => refreshInsights();
    window.addEventListener(WORKSPACE_DATA_CHANGED, on);
    return () => window.removeEventListener(WORKSPACE_DATA_CHANGED, on);
  }, [refreshInsights]);

  React.useEffect(() => {
    if (!active?.parsed) return;
    setSpendOverrides({});
    setPayrollOverrides({});
  }, [activeId, active?.parsed]);

  function addFiles(files: File[]) {
    if (!files.length) return;
    const next: Prepared[] = files.slice(0, 12).map((file) => ({
      id: newId(),
      file,
      status: "queued" as const,
    }));
    setQueue((q) => [...q, ...next].slice(0, 20));
    setLastSuccess(null);
  }

  function removeQueued(id: string) {
    setQueue((q) => q.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function parseOne(p: Prepared) {
    setParsingFileId(p.id);
    setQueue((q) => q.map((x) => (x.id === p.id ? { ...x, status: "parsing" as const } : x)));
    setReadPhase("upload");
    setReadProgress(8);
    const progressTimer = window.setInterval(() => {
      setReadProgress((pct) => Math.min(92, pct + (pct < 40 ? 6 : 3)));
    }, 120);
    try {
      const parsed = await parseUploadFile(p.file);
      setReadProgress(100);
      setReadPhase("parse");
      await sleep(200);
      if (!parsed.ok) {
        setQueue((q) =>
          q.map((x) => (x.id === p.id ? { ...x, status: "error" as const, error: parsed.error } : x)),
        );
        toast.error("Could not read file", { description: parsed.error });
        return;
      }
      const maps = getDefaultUploadMaps(parsed.rows);
      setQueue((q) =>
        q.map((x) =>
          x.id === p.id
            ? {
                ...x,
                status: "parsed" as const,
                parsed: { rows: parsed.rows, filename: parsed.filename },
                kind: maps.kind,
                rowCount: parsed.rows.length,
                columnCount: maps.headers.length,
              }
            : x,
        ),
      );
      setSpendOverrides({});
      setPayrollOverrides({});
      setActiveId(p.id);
      toast.message("Ready to map", { description: `${parsed.filename} · ${maps.kind === "payroll" ? "Payroll" : "Spend"}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setQueue((q) => q.map((x) => (x.id === p.id ? { ...x, status: "error" as const, error: msg } : x)));
      toast.error("Parse failed", { description: msg });
    } finally {
      window.clearInterval(progressTimer);
      setReadPhase("done");
      setReadProgress(0);
      setParsingFileId(null);
    }
  }

  async function prepareAll() {
    const pending = queue.filter((x) => x.status === "queued");
    if (!pending.length) {
      toast.message("Add files first", { description: "Drop CSV or Excel files, or click to browse." });
      return;
    }
    setBusy(true);
    try {
      for (const p of pending) {
        // eslint-disable-next-line no-await-in-loop
        await parseOne(p);
      }
    } finally {
      setBusy(false);
    }
  }

  async function commitActive() {
    if (!active?.parsed || !active.kind) return;
    setBusy(true);
    setCommitProgress(12);
    const t = window.setInterval(() => {
      setCommitProgress((c) => Math.min(88, c + 8));
    }, 100);
    try {
      await sleep(150);
      const overrides =
        active.kind === "payroll"
          ? { payrollOverrides }
          : { spendOverrides };
      const insight = ingestWorkspaceUpload(active.parsed.rows, active.parsed.filename, entity, overrides);
      const dataset = ingestWorkspaceDataset(active.parsed.rows, active.parsed.filename, entity, overrides);
      upsertWorkspaceDataset(dataset, clientId);
      upsertUploadedInsights(insight, clientId);
      const columnCount = getDefaultUploadMaps(active.parsed.rows).headers.length;
      appendUploadHistory(
        {
          id: newId(),
          entity,
          kind: active.kind,
          filename: active.parsed.filename,
          rowCount: active.parsed.rows.length,
          columnCount,
          uploadedAt: new Date().toISOString(),
        },
        clientId,
      );
      setHistoryLog(getUploadHistory(clientId));
      setCommitProgress(100);
      await sleep(200);
      setLastSuccess({
        filename: active.parsed.filename,
        kind: active.kind,
        rows: active.parsed.rows.length,
        columns: columnCount,
      });
      const updatedQueue = queue.map((x) =>
        x.id === active.id ? { ...x, status: "imported" as const } : x,
      );
      setQueue(updatedQueue);
      toast.success("Import complete", {
        description: `${active.kind === "payroll" ? "Payroll" : "Spend"} · ${active.parsed.rows.length.toLocaleString()} rows · ${columnCount} columns`,
      });
      const nextParsed = updatedQueue.find((x) => x.status === "parsed" && x.id !== active.id);
      const nextQueued = updatedQueue.find((x) => x.status === "queued");
      if (nextParsed) {
        setActiveId(nextParsed.id);
        setSpendOverrides({});
        setPayrollOverrides({});
      } else if (nextQueued) {
        setActiveId(null);
        await parseOne(nextQueued);
      } else {
        setActiveId(null);
      }
    } catch (e) {
      toast.error("Import failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      window.clearInterval(t);
      setCommitProgress(0);
      setBusy(false);
    }
  }

  function deleteInsightRow(row: UploadedInsights) {
    removeUploadedInsight({ clientId, entity: row.entity, kind: row.kind });
    removeWorkspaceDataset({ clientId, entity: row.entity, kind: row.kind });
    toast.message("Removed", { description: `${row.kind} data cleared for ${row.entity}.` });
  }

  function startReplace(kind: UploadedInsights["kind"]) {
    setReplaceKind(kind);
    replaceInputRef.current?.click();
  }

  function onQueueReplacePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = replaceQueueId;
    e.target.value = "";
    setReplaceQueueId(null);
    if (!file || !id) return;
    setQueue((q) =>
      q.map((x) => (x.id === id ? { id: x.id, file, status: "queued" as const } : x)),
    );
    if (activeId === id) setActiveId(null);
    toast.message("File replaced", { description: file.name });
  }

  function onReplacePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const kind = replaceKind;
    e.target.value = "";
    setReplaceKind(null);
    if (!file || !kind) return;
    const row = insights.find((x) => x.entity === entity && x.kind === kind);
    if (row) {
      removeUploadedInsight({ clientId, entity: row.entity, kind: row.kind });
      removeWorkspaceDataset({ clientId, entity: row.entity, kind: row.kind });
    }
    void prepareAllForFiles([file]);
  }

  async function prepareAllForFiles(files: File[]) {
    const prepared: Prepared[] = files.map((file) => ({
      id: newId(),
      file,
      status: "queued" as const,
    }));
    setQueue(prepared);
    setLastSuccess(null);
    setBusy(true);
    try {
      for (const p of prepared) {
        // eslint-disable-next-line no-await-in-loop
        await parseOne(p);
      }
    } finally {
      setBusy(false);
    }
  }

  const defaultMaps = active?.parsed ? getDefaultUploadMaps(active.parsed.rows) : null;

  function selectValue<K extends keyof SpendMapping>(key: K): string {
    if (!defaultMaps) return AUTO_VALUE;
    const o = spendOverrides[key];
    if (o !== undefined) {
      if (o === "") return AUTO_VALUE;
      return o;
    }
    const b = defaultMaps.spend[key];
    return b ?? AUTO_VALUE;
  }

  function setSpendField(key: keyof SpendMapping, value: string) {
    setSpendOverrides((prev) => {
      const next = { ...prev };
      if (value === AUTO_VALUE) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function payrollSelectValue<K extends keyof PayrollMapping>(key: K): string {
    if (!defaultMaps) return AUTO_VALUE;
    const o = payrollOverrides[key];
    if (o !== undefined) {
      if (o === "") return AUTO_VALUE;
      return o;
    }
    const b = defaultMaps.payroll[key];
    return b ?? AUTO_VALUE;
  }

  function setPayrollField(key: keyof PayrollMapping, value: string) {
    setPayrollOverrides((prev) => {
      const next = { ...prev };
      if (value === AUTO_VALUE) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  const previewRows = active?.parsed?.rows.slice(0, 5) ?? [];
  const mappedPreview =
    active?.parsed && active.kind && defaultMaps
      ? ingestWorkspaceDataset(active.parsed.rows, active.parsed.filename, entity, {
          spendOverrides: active.kind === "spend" ? spendOverrides : undefined,
          payrollOverrides: active.kind === "payroll" ? payrollOverrides : undefined,
        })
      : null;

  const entityInsights = insights.filter((x) => x.entity === entity);
  const entityHistory = React.useMemo(
    () => historyLog.filter((h) => h.entity === entity).slice(0, 15),
    [historyLog, entity],
  );

  function rowLabelForInsight(row: UploadedInsights) {
    return row.kind === "spend" ? row.totalTransactions : row.totalEmployees;
  }

  return (
    <div className={cn("grid gap-5", className)}>
      <input
        ref={queueReplaceInputRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        onChange={onQueueReplacePicked}
      />
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        onChange={onReplacePicked}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Accepted formats</span>
        {FORMAT_LABELS.map((f) => (
          <Badge key={f} variant="secondary" className="rounded-md font-normal">
            {f}
          </Badge>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative rounded-3xl border border-dashed p-6 transition-[border-color,box-shadow,background-color]",
          isOver ? "border-primary/50 bg-primary/[0.04] shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]" : "border-border/70 bg-muted/10",
          busy ? "pointer-events-none opacity-70" : "cursor-pointer",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          addFiles(Array.from(e.dataTransfer.files || []));
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <div className={cn("rounded-2xl border bg-card/80 p-4", isOver ? "border-primary/30" : "border-border/60")}>
            <FileUp className={cn("h-6 w-6", isOver ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold tracking-tight">Drag & drop files here</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Or click anywhere in this zone to browse. Multi-file: prepare each file, confirm mapping, then import.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Browse files
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                disabled={busy || !queue.some((x) => x.status === "queued")}
                onClick={(e) => {
                  e.stopPropagation();
                  void prepareAll();
                }}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Prepare files
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {(readPhase !== "idle" && readPhase !== "done") || readProgress > 0 ? (
          <div className="mt-5 rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-foreground">
                {readPhase === "upload" ? "Reading file…" : readPhase === "parse" ? "Parsing…" : "Processing…"}
              </span>
              <span className="text-muted-foreground">{Math.round(readProgress)}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-[var(--brand-primary)]/80 transition-[width] duration-300"
                style={{ width: `${readProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        {commitProgress > 0 ? (
          <div className="mt-5 rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-foreground">Saving workspace…</span>
              <span className="text-muted-foreground">{Math.round(commitProgress)}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-emerald-600/80 transition-[width] duration-300"
                style={{ width: `${commitProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {queue.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Import queue</div>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setQueue([])}>
              Clear list
            </Button>
          </div>
          <div className="mt-3 grid gap-2">
            {queue.map((q) => (
              <div
                key={q.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border px-3 py-2 text-sm",
                  activeId === q.id ? "border-primary/40 bg-primary/[0.04]" : "border-border/60 bg-background/60",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{q.file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(q.file.size / 1024).toFixed(1)} KB
                      {q.rowCount != null ? ` · ${q.rowCount.toLocaleString()} rows` : ""}
                      {q.columnCount != null ? ` · ${q.columnCount} columns` : ""}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {q.status === "queued" && "Queued — click Parse or Prepare files"}
                      {q.status === "parsing" && "Parsing file…"}
                      {q.status === "parsed" && `${q.kind === "payroll" ? "Payroll" : "Spend"} · ready to map`}
                      {q.status === "imported" && "Imported to workspace"}
                      {q.status === "error" ? <span className="text-destructive">{q.error}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    {q.status === "parsed" ? (
                      <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setActiveId(q.id)}>
                        {activeId === q.id ? "Active" : "Review"}
                      </Button>
                    ) : null}
                    {q.status === "queued" ? (
                      <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => void parseOne(q)}>
                        Parse
                      </Button>
                    ) : null}
                    {q.status === "error" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={() => {
                          setQueue((qq) =>
                            qq.map((x) =>
                              x.id === q.id
                                ? { id: x.id, file: x.file, status: "queued" as const }
                                : x,
                            ),
                          );
                          void parseOne({ id: q.id, file: q.file, status: "queued" });
                        }}
                      >
                        Retry
                      </Button>
                    ) : null}
                    {q.status === "queued" ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Replace file"
                        onClick={() => {
                          setReplaceQueueId(q.id);
                          queueReplaceInputRef.current?.click();
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeQueued(q.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {q.status === "parsing" && parsingFileId === q.id ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-[var(--brand-primary)]/70 transition-[width] duration-300"
                      style={{ width: `${Math.round(readProgress)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {lastSuccess ? (
        <div className="grid gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-sm">
          <div className="flex flex-wrap items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground">Import successful</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {lastSuccess.filename} · {lastSuccess.kind} · {lastSuccess.rows.toLocaleString()} rows ·{" "}
                {lastSuccess.columns} columns detected
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Suggested next steps</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-xl no-underline")}
                href={`/app/ai-workspace?afterUpload=1&kind=${encodeURIComponent(lastSuccess.kind)}&prompt=${encodeURIComponent(
                  `I just imported ${lastSuccess.kind} data from "${lastSuccess.filename}" (${lastSuccess.rows.toLocaleString()} rows). Write an executive summary: KPI highlights, notable patterns, material risks, and 3 concrete next actions.`,
                )}`}
              >
                <FileText className="mr-2 h-4 w-4" />
                Summarize
              </Link>
              <Link
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-xl no-underline")}
                href={`/app/ai-workspace?afterUpload=1&kind=${encodeURIComponent(lastSuccess.kind)}&prompt=${encodeURIComponent(
                  `Using my latest ${lastSuccess.kind} upload ("${lastSuccess.filename}"), list anomalies, suspicious duplicates, and outliers worth investigation. Be specific and prioritize by impact.`,
                )}`}
              >
                <Activity className="mr-2 h-4 w-4" />
                Find anomalies
              </Link>
              <Link className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-xl no-underline")} href="/app/reports">
                <FileDown className="mr-2 h-4 w-4" />
                Build report
              </Link>
              <Link className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-xl no-underline")} href="/app/forecasting">
                <Gauge className="mr-2 h-4 w-4" />
                Forecast
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {active?.parsed && defaultMaps ? (
        <div className="grid gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Column mapping</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Detected <span className="font-medium text-foreground">{active.kind === "payroll" ? "payroll" : "spend"}</span>{" "}
                · {active.parsed.rows.length.toLocaleString()} rows · {defaultMaps.headers.length} columns · Entity {entity}
              </p>
            </div>
            <Badge variant="outline">{active.parsed.filename}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(active.kind === "spend" ? SPEND_FIELDS : PAYROLL_FIELDS).map((field) => (
              <div key={String(field.key)} className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                {active.kind === "spend" ? (
                  <Select
                    value={selectValue(field.key as keyof SpendMapping)}
                    onValueChange={(v) => v && setSpendField(field.key as keyof SpendMapping, v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_VALUE}>Auto-detect</SelectItem>
                      {defaultMaps.headers.map((h, hi) => (
                        <SelectItem key={`${hi}-${h || "∅"}`} value={h}>
                          {h || "(empty header)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={payrollSelectValue(field.key as keyof PayrollMapping)}
                    onValueChange={(v) => v && setPayrollField(field.key as keyof PayrollMapping, v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_VALUE}>Auto-detect</SelectItem>
                      {defaultMaps.headers.map((h, hi) => (
                        <SelectItem key={`${hi}-${h || "∅"}`} value={h}>
                          {h || "(empty header)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          <Separator />

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Raw preview</div>
            <ScrollArea className="mt-2 h-[140px] rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {defaultMaps.headers.slice(0, 8).map((h) => (
                      <TableHead key={h} className="whitespace-nowrap text-[11px]">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {defaultMaps.headers.slice(0, 8).map((h) => (
                        <TableCell key={h} className="max-w-[140px] truncate text-xs text-muted-foreground">
                          {row[h] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {mappedPreview ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mapped preview</div>
              <ScrollArea className="mt-2 h-[160px] rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {mappedPreview.kind === "spend" ? (
                        <>
                          <TableHead className="text-[11px]">Date</TableHead>
                          <TableHead className="text-[11px]">Vendor</TableHead>
                          <TableHead className="text-[11px]">Amount</TableHead>
                          <TableHead className="text-[11px]">Dept</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-[11px]">Name</TableHead>
                          <TableHead className="text-[11px]">Salary</TableHead>
                          <TableHead className="text-[11px]">Risk</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedPreview.kind === "spend"
                      ? mappedPreview.rows.slice(0, 5).map((r) => (
                          <TableRow key={r.idx}>
                            <TableCell className="text-xs">{r.date}</TableCell>
                            <TableCell className="max-w-[160px] truncate text-xs">{r.vendor}</TableCell>
                            <TableCell className="text-xs">{r.amount}</TableCell>
                            <TableCell className="text-xs">{r.department}</TableCell>
                          </TableRow>
                        ))
                      : mappedPreview.rows.slice(0, 5).map((r) => (
                          <TableRow key={r.idx}>
                            <TableCell className="max-w-[180px] truncate text-xs">{r.employeeName}</TableCell>
                            <TableCell className="text-xs">{r.salaryCurrent}</TableCell>
                            <TableCell className="text-xs">{r.risk}</TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-xl" disabled={busy} onClick={() => void commitActive()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Import to workspace
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={() => removeQueued(active.id)}>
              Discard file
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Workspace files</div>
          <Badge variant="outline" className="text-[11px]">
            {entity}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Current imports powering analytics for this entity. Replace or remove to change what&apos;s loaded.
        </p>
        {entityInsights.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No files stored for this entity yet. Imports appear here.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border bg-background/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Uploaded</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityInsights.map((row) => (
                  <TableRow key={`${row.kind}-${row.filename}`}>
                    <TableCell className="font-medium">{row.kind}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{row.filename}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {rowLabelForInsight(row).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      <HydrationSafeDate iso={row.uploadedAt} mode="date" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Replace file"
                          onClick={() => startReplace(row.kind)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          title="Delete"
                          onClick={() => deleteInsightRow(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Upload history</div>
          <Badge variant="outline" className="text-[11px]">
            Last 15 · this browser
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Recent successful imports for {entity} (including replaced files). Cleared only if you clear site data.
        </p>
        {entityHistory.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No completed imports logged yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border bg-background/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Cols</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityHistory.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.kind}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{row.filename}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {row.rowCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{row.columnCount}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      <HydrationSafeDate iso={row.uploadedAt} mode="datetime" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
