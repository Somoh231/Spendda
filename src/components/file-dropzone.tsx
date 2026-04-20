"use client";

import * as React from "react";
import { FileUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type UploadStage = "queued" | "uploading" | "parsing" | "analyzing" | "success" | "error";

type QueueItem = {
  id: string;
  file: File;
  stage: UploadStage;
  progressPct: number;
  message?: string;
  error?: string;
};

type Props = {
  accept?: string;
  title: string;
  subtitle?: string;
  onFile: (file: File) => void | Promise<void>;
  /** When true, allows selecting/dropping multiple files. */
  multiple?: boolean;
  sample?: { label: string; onClick: () => void | Promise<void> };
  disabled?: boolean;
  workflow?: {
    stage:
      | "idle"
      | "selected"
      | "uploading"
      | "parsing"
      | "analyzing"
      | "success"
      | "error";
    progressPct?: number; // 0..100
    message?: string;
    detail?: string;
  };
};

export function FileDropzone({
  accept = ".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
  title,
  subtitle,
  onFile,
  multiple = false,
  sample,
  disabled,
  workflow,
}: Props) {
  const [isOver, setIsOver] = React.useState(false);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const busy = queue.some((q) => q.stage === "uploading" || q.stage === "parsing" || q.stage === "analyzing");

  async function runOne(item: QueueItem) {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, stage: "uploading", progressPct: 18, message: "Uploading…" } : q)),
    );
    await new Promise((r) => setTimeout(r, 180));
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, stage: "parsing", progressPct: 46, message: "Parsing…" } : q)),
    );
    await new Promise((r) => setTimeout(r, 180));
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, stage: "analyzing", progressPct: 74, message: "Analyzing…" } : q)),
    );
    try {
      await onFile(item.file);
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, stage: "success", progressPct: 100, message: "Complete" } : q,
        ),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, stage: "error", progressPct: 100, message: "Failed", error: msg } : q,
        ),
      );
    }
  }

  async function uploadAll() {
    if (busy || disabled) return;
    const pending = queue.filter((q) => q.stage === "queued" || q.stage === "error");
    for (const item of pending) {
      // continue even if one fails
      // eslint-disable-next-line no-await-in-loop
      await runOne(item);
    }
  }

  function addFiles(files: File[]) {
    if (!files.length) return;
    const added: QueueItem[] = files.map((file) => ({
      id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      stage: "queued",
      progressPct: 0,
      message: "Queued",
    }));
    setQueue((prev) => (multiple ? [...added, ...prev].slice(0, 20) : added.slice(0, 1)));
    if (!multiple) {
      // auto-run in single-file mode to preserve current UX
      void (async () => {
        await new Promise((r) => setTimeout(r, 0));
        const first = added[0];
        if (first) await runOne(first);
      })();
    }
  }

  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-center justify-between rounded-2xl border bg-background/60 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.04),0_24px_80px_rgba(2,6,23,0.35)] backdrop-blur transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-px hover:bg-muted/30 hover:shadow-[0_1px_0_rgba(255,255,255,0.05),0_30px_100px_rgba(2,6,23,0.45)]",
        isOver ? "border-primary/40 bg-muted/25 ring-1 ring-primary/20" : "border-border/60",
        disabled ? "pointer-events-none opacity-60" : "",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        const list = Array.from(e.dataTransfer.files || []);
        addFiles(multiple ? list : list.slice(0, 1));
      }}
    >
      <div className="flex items-center gap-3">
        <div className={cn("rounded-xl border bg-card/70 p-2.5", isOver ? "border-primary/30" : "border-border/60")}>
          <FileUp className={cn("h-4 w-4", isOver ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {sample ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void sample.onClick();
            }}
          >
            {sample.label}
          </Button>
        ) : null}
        <div className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
          {multiple ? "Drag & drop or browse (multi-upload)" : "Drag & drop or browse"}
        </div>
      </div>

      {multiple && queue.length > 0 ? (
        <div className="absolute inset-x-4 bottom-3">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold">Upload queue</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled || busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void uploadAll();
                  }}
                >
                  Upload All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  Add files
                </Button>
              </div>
            </div>

            <div className="mt-2 grid max-h-[180px] gap-2 overflow-auto pr-1">
              {queue.map((q) => (
                <div key={q.id} className="rounded-xl border border-border/60 bg-card/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{q.file.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {q.message || q.stage}
                        {q.error ? ` · ${q.error}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-[11px] text-muted-foreground">{Math.round(q.progressPct)}%</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={disabled || busy}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setQueue((prev) => prev.filter((x) => x.id !== q.id));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300",
                        q.stage === "error"
                          ? "bg-destructive/70"
                          : q.stage === "success"
                            ? "bg-emerald-500/70"
                            : "bg-[var(--brand-primary)]/70",
                      )}
                      style={{ width: `${Math.max(0, Math.min(100, q.progressPct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {workflow && workflow.stage !== "idle" ? (
        <div className="absolute inset-x-4 bottom-3">
          <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">
                  {workflow.message ||
                    (workflow.stage === "selected"
                      ? "File selected"
                      : workflow.stage === "uploading"
                        ? "Uploading…"
                        : workflow.stage === "parsing"
                          ? "Parsing…"
                          : workflow.stage === "analyzing"
                            ? "Analyzing…"
                            : workflow.stage === "success"
                              ? "Upload complete"
                              : "Upload failed")}
                </div>
                {workflow.detail ? (
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{workflow.detail}</div>
                ) : null}
              </div>
              <div className="shrink-0 text-[11px] text-muted-foreground">
                {typeof workflow.progressPct === "number" ? `${Math.round(workflow.progressPct)}%` : null}
              </div>
            </div>
            {typeof workflow.progressPct === "number" ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    workflow.stage === "error"
                      ? "bg-destructive/70"
                      : workflow.stage === "success"
                        ? "bg-emerald-500/70"
                        : "bg-[var(--brand-primary)]/70",
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, workflow.progressPct))}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          addFiles(multiple ? list : list.slice(0, 1));
          // allow re-selecting the same file
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}

