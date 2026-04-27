"use client";

import * as React from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Image from "next/image";
import { Bot, Loader2, Paperclip, Send, X } from "lucide-react";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useClientSession } from "@/hooks/use-client-session";
import { useProfile } from "@/lib/profile/client";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { parseUploadFile } from "@/lib/upload/parse";
import { describeIngestKind, ingestWorkspaceDataset, ingestWorkspaceUpload } from "@/lib/upload/workspace-ingest";
import { upsertWorkspaceDataset } from "@/lib/upload/dataset-store";
import { answerFromDataset } from "@/lib/ai/local-intelligence";
import { finishCopilotMessage, spendDateCoveragePct, type LocalEngineAnswer } from "@/lib/ai/copilot-finish";
import { wantsDeepDetail } from "@/lib/ai/intent-routing";
import type { SpendTxn } from "@/lib/upload/dataset-store";
import { getUploadedInsights, upsertUploadedInsights } from "@/lib/upload/storage";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { buildUploadPilotSnapshot } from "@/lib/workspace/upload-ai-context";
import { mergeWorkspaceDatasetsForAnalyticsScope } from "@/lib/workspace/merge-scope-datasets";
import { tenantRoleCan } from "@/lib/tenants/permissions";

type ChatKpi = { label: string; value: string; hint?: string };

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  viz?: { type: "bar" | "line"; title: string; data: any[] } | null;
  followUps?: string[];
  kpis?: ChatKpi[];
  meta?: {
    confidencePct?: number;
    trustNote?: string;
    dataGaps?: string[];
    contextLine?: string;
    sources?: {
      entity?: string;
      range?: { from?: string; to?: string };
      spend?: { filename: string; rows: number } | null;
      payroll?: { filename: string; rows: number } | null;
    };
  } | null;
};

const OPEN_KEY = "spendda_global_ai_open_v1";

function openKeyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${OPEN_KEY}:${id}` : OPEN_KEY;
}

function memoryKeyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `spendda_global_ai_mem:${id}` : "spendda_global_ai_mem:anon";
}

function draftKeyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `spendda_global_ai_draft:${id}` : "spendda_global_ai_draft:anon";
}

const THREAD_KEY = "spendda_global_ai_thread_v1";

function threadStorageKey(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${THREAD_KEY}:${id}` : `${THREAD_KEY}:anon`;
}

function buildWelcomeMessage(entityLabel: string): ChatMsg {
  return {
    role: "assistant",
    content:
      "I’m Spendda AI — ask about spend, payroll, risks, duplicates, vendors, departments, or forecasting.\n\nUpload a CSV/XLSX to get data-driven answers.",
    meta: { sources: { entity: entityLabel } },
  };
}

function coercePersistedMsgs(raw: unknown): ChatMsg[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChatMsg[] = [];
  for (const m of raw.slice(-40)) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const role = o.role;
    const content = typeof o.content === "string" ? o.content.slice(0, 12_000) : "";
    if (role !== "user" && role !== "assistant") continue;
    out.push({
      role,
      content,
      viz: (o.viz as ChatMsg["viz"]) ?? null,
      followUps: Array.isArray(o.followUps) ? (o.followUps as string[]) : undefined,
      kpis: Array.isArray(o.kpis) ? (o.kpis as ChatKpi[]) : undefined,
      meta: (o.meta as ChatMsg["meta"]) ?? null,
    });
  }
  return out.length ? out : null;
}

function loadPersistedThread(clientId: string | null): ChatMsg[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(threadStorageKey(clientId));
    if (!raw) return null;
    return coercePersistedMsgs(JSON.parse(raw));
  } catch {
    return null;
  }
}

function savePersistedThread(clientId: string | null, msgs: ChatMsg[]) {
  if (typeof window === "undefined") return;
  try {
    const slim = msgs.slice(-35).map((m) => ({
      ...m,
      streaming: false,
      content: m.content.slice(0, 12_000),
      viz:
        m.viz && Array.isArray((m.viz as { data?: unknown }).data) && (m.viz as { data: unknown[] }).data.length > 80
          ? null
          : m.viz,
    }));
    window.localStorage.setItem(threadStorageKey(clientId), JSON.stringify(slim));
  } catch {
    /* quota / privacy mode */
  }
}

function labelForPath(pathname: string) {
  if (pathname.startsWith("/app/dashboard")) return "Dashboard";
  if (pathname.startsWith("/app/reports")) return "Reports";
  if (pathname.startsWith("/app/documents")) return "Documents";
  if (pathname.startsWith("/app/alerts")) return "Alerts";
  if (pathname.startsWith("/app/transactions")) return "Transactions";
  if (pathname.startsWith("/app/forecasting")) return "Forecasting";
  if (pathname.startsWith("/app/debt")) return "Debt intelligence";
  if (pathname.startsWith("/app/profitability")) return "Profitability";
  if (pathname.startsWith("/app/cashflow")) return "Cash flow";
  if (pathname.startsWith("/app/recommendations")) return "Recommendations";
  if (pathname.startsWith("/app/market-updates")) return "Market updates";
  if (pathname.startsWith("/app/spend-analytics")) return "Spend analytics";
  if (pathname.startsWith("/app/payroll")) return "Payroll";
  if (pathname.startsWith("/app/upload")) return "Uploads";
  if (pathname.startsWith("/app/settings")) return "Settings";
  return "Workspace";
}

const QUICK_ACTIONS = [
  { label: "Analyze latest upload", prompt: "Analyze the latest upload for this entity. Summarize totals, anomalies, duplicates, and what to do next." },
  { label: "Where are we overspending?", prompt: "Who overspent most? Show the top departments and the drivers." },
  { label: "Build monthly report", prompt: "Build a concise monthly executive report: KPI summary, top risks, top savings opportunities, and 5 recommendations." },
  { label: "Forecast next quarter", prompt: "Forecast next quarter and explain the trend and confidence." },
  { label: "Show top risks", prompt: "Show top risks and the evidence behind each (duplicates, unusual amounts, payroll anomalies)." },
];

export function GlobalAiAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const pageLabel = labelForPath(pathname);
  const { client, mounted: sessionMounted } = useClientSession();
  const { profile } = useProfile();
  const { scope } = useAnalyticsScope();
  const workspace = useWorkspaceData();

  const clientId = client?.clientId ?? null;
  const canUpload = Boolean(clientId) && tenantRoleCan(client?.role, "data.upload");
  const targetEntity = scope.entities[0] || profile?.activeEntity || "HQ";
  const merged = React.useMemo(
    () =>
      mergeWorkspaceDatasetsForAnalyticsScope({
        datasets: workspace.datasets,
        scopeEntities: scope.entities,
        profileEntities: profile?.entities,
        primaryEntity: workspace.primaryEntity,
      }),
    [workspace.datasets, workspace.primaryEntity, workspace.revision, scope.entities, profile?.entities],
  );

  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [uploadBusy, setUploadBusy] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [showJump, setShowJump] = React.useState(false);
  const [msgs, setMsgs] = React.useState<ChatMsg[]>([buildWelcomeMessage(workspace.primaryEntity)]);

  React.useEffect(() => {
    if (!sessionMounted) return;
    const loaded = loadPersistedThread(clientId);
    if (loaded?.length) setMsgs(loaded);
    else setMsgs([buildWelcomeMessage(workspace.primaryEntity || "HQ")]);
  }, [sessionMounted, clientId]);

  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const draftLoadedForOpen = React.useRef(false);

  function isNearBottom() {
    const el = scrollViewportRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance < 240;
  }

  function jumpToBottom() {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  // Persist open state per tenant.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(openKeyForClient(clientId));
      if (raw === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, [clientId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(openKeyForClient(clientId), open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, clientId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try {
        if (q.trim()) window.localStorage.setItem(draftKeyForClient(clientId), q);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [q, clientId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!open) {
      draftLoadedForOpen.current = false;
      return;
    }
    if (draftLoadedForOpen.current) return;
    draftLoadedForOpen.current = true;
    try {
      const d = window.localStorage.getItem(draftKeyForClient(clientId));
      if (d) setQ(d);
    } catch {
      /* ignore */
    }
  }, [open, clientId]);

  // Keyboard shortcuts:
  // - Cmd/Ctrl+K toggles
  // - Esc closes
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      const isK = (e.key || "").toLowerCase() === "k";
      const mod = e.metaKey || e.ctrlKey;
      if (mod && isK) {
        const ae = document.activeElement as HTMLElement | null;
        const tag = ae?.tagName?.toLowerCase();
        const typing =
          tag === "input" ||
          tag === "textarea" ||
          ae?.getAttribute?.("contenteditable") === "true";
        if (!typing) {
          e.preventDefault();
          setOpen((v) => !v);
        }
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-scroll: if user is near bottom, keep following messages.
  React.useEffect(() => {
    if (!open) return;
    if (isNearBottom()) jumpToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length, open]);

  React.useEffect(() => {
    if (!sessionMounted || typeof window === "undefined") return;
    if (!msgs.length) return;
    const t = window.setTimeout(() => savePersistedThread(clientId, msgs), 450);
    return () => window.clearTimeout(t);
  }, [msgs, clientId, sessionMounted]);

  // Track scroll position to show "New messages" jump.
  React.useEffect(() => {
    const el = scrollViewportRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowJump(!isNearBottom());
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pushSessionMemory(query: string) {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(memoryKeyForClient(clientId));
      const parsed = raw ? (JSON.parse(raw) as { lastQueries?: string[] }) : {};
      const lastQueries = [...(parsed.lastQueries || []), query].slice(-16);
      window.localStorage.setItem(
        memoryKeyForClient(clientId),
        JSON.stringify({ lastQueries, updatedAt: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
  }

  async function runQuery(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const follow = isNearBottom();
    setBusy(true);
    try {
      const spendDs = merged.spend;
      const payrollDs = merged.payroll;
      const uploadPilot = buildUploadPilotSnapshot({
        dataSource: workspace.dataSource,
        entity: merged.scopeLabel,
        range: scope.range,
        spendDataset: spendDs,
        payrollDataset: payrollDs,
      });
      const recentTurns = msgs.slice(-10).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 2000),
      }));
      const conversationForEngine = [
        ...msgs
          .filter((m) => !(m.role === "assistant" && !String(m.content || "").trim()))
          .slice(-14)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) } as const)),
        { role: "user" as const, content: trimmed },
      ];
      const raw = answerFromDataset({
        question: `${trimmed}\n\nContext: page=${pageLabel} pathname=${pathname}`,
        datasetSpend: spendDs,
        datasetPayroll: payrollDs,
        profile,
        entity: merged.scopeLabel,
        range: scope.range,
        uploadPilot,
        conversationTurns: conversationForEngine,
      }) as LocalEngineAnswer;

      const spendRows = spendDs?.kind === "spend" ? (spendDs.rows as SpendTxn[]) : undefined;
      const enriched = finishCopilotMessage(raw, {
        profile,
        entity: merged.scopeLabel,
        range: scope.range,
        pageLabel,
        pathname,
        recentTurns: [...recentTurns, { role: "user" as const, content: trimmed }],
        spendDateCoveragePct: spendDateCoveragePct(spendRows),
        surface: "inline",
        wantsDeep: wantsDeepDetail(trimmed),
      });

      pushSessionMemory(trimmed);

      setMsgs((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: "", streaming: true, meta: enriched.meta },
      ]);

      const full = enriched.text;
      const step = 18;
      for (let end = 0; end <= full.length; end += step) {
        const slice = full.slice(0, Math.min(full.length, end + step));
        await new Promise((r) => window.setTimeout(r, 11));
        setMsgs((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            next[next.length - 1] = { ...last, content: slice };
          }
          return next;
        });
      }

      setMsgs((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            content: enriched.text,
            streaming: false,
            viz: enriched.viz ?? null,
            meta: enriched.meta,
            followUps: enriched.followUps,
            kpis: enriched.kpis,
          };
        }
        return next;
      });

      setQ("");
      try {
        window.localStorage.removeItem(draftKeyForClient(clientId));
      } catch {
        /* ignore */
      }
      requestAnimationFrame(() => composerRef.current?.focus());
      if (follow) {
        requestAnimationFrame(() => jumpToBottom());
      }
    } catch (e) {
      toast.error("Could not run analysis", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  }

  function onFollowUpChip(label: string) {
    if (label === "Open AI Workspace") {
      router.push("/app/ai-workspace");
      return;
    }
    if (label === "Open Alerts in app") {
      router.push("/app/alerts");
      return;
    }
    setQ(label);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function onFile(file: File) {
    if (!canUpload) {
      toast.message("Upload not available", {
        description: "Your workspace role can view AI answers but cannot ingest new files.",
      });
      return;
    }
    setUploadBusy(true);
    try {
      const ext = (file.name || "").split(".").pop()?.toLowerCase();
      const isTabular = ext === "csv" || ext === "xlsx" || ext === "xls";
      if (!isTabular) {
        setMsgs((prev) => [
          ...prev,
          { role: "user", content: `Attached: ${file.name}` },
          {
            role: "assistant",
            content:
              "Attached. I can fully analyze CSV/XLSX right now. PDFs/images/DOCX are saved as evidence (OCR/LLM extraction can be added later).",
            meta: { sources: { entity: merged.scopeLabel, range: scope.range } },
          },
        ]);
        toast.message("File attached", { description: "Upload a CSV/XLSX to analyze data." });
        return;
      }

      const parsed = await parseUploadFile(file);
      if (!parsed.ok) {
        toast.error("Upload failed", { description: parsed.error });
        return;
      }

      const detected = describeIngestKind(parsed.rows);
      const ingested = ingestWorkspaceUpload(parsed.rows, parsed.filename, targetEntity, undefined, parsed.quality.warnings);
      const ds = ingestWorkspaceDataset(parsed.rows, parsed.filename, targetEntity, undefined, parsed.quality.warnings);
      upsertWorkspaceDataset(ds.dataset, clientId);
      upsertUploadedInsights(ingested.insight, clientId);

      // Best-effort cloud metadata persistence (tenant-scoped).
      try {
        const ext = (parsed.filename || "").split(".").pop()?.toLowerCase();
        const fileType = ext === "csv" ? "CSV" : ext === "xlsx" ? "XLSX" : ext === "xls" ? "XLS" : "OTHER";
        const metaRes = await fetch("/api/uploads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileName: parsed.filename,
            fileKind: detected === "payroll" ? "payroll" : "spend",
            fileType,
            rowCount: parsed.rows.length,
            uploadedAt: new Date().toISOString(),
            status: "Ready",
          }),
        });
        const metaJson = (await metaRes.json().catch(() => ({}))) as { ok?: boolean; id?: string };
        if (metaRes.ok && metaJson.ok && metaJson.id) {
          const chunkSize = 800;
          if (ds.dataset.kind === "spend") {
            const rows = ds.dataset.rows as { date?: string; vendor?: string; amount?: number; department?: string; category?: string; invoiceId?: string }[];
            for (let i = 0; i < rows.length; i += chunkSize) {
              const chunk = rows.slice(i, i + chunkSize);
              // eslint-disable-next-line no-await-in-loop
              await fetch("/api/ingest/spend", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  sourceUploadId: metaJson.id,
                  rows: chunk.map((t) => ({
                    date: (t as any).date,
                    vendor: (t as any).vendor,
                    amount: (t as any).amount,
                    department: (t as any).department,
                    category: (t as any).category,
                    invoiceId: (t as any).invoiceId,
                  })),
                }),
              });
            }
          } else {
            const rows = ds.dataset.rows as { employeeName?: string; salaryCurrent?: number; department?: string }[];
            for (let i = 0; i < rows.length; i += chunkSize) {
              const chunk = rows.slice(i, i + chunkSize);
              // eslint-disable-next-line no-await-in-loop
              await fetch("/api/ingest/payroll", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  sourceUploadId: metaJson.id,
                  rows: chunk.map((p) => ({
                    employee: (p as any).employeeName,
                    wages: (p as any).salaryCurrent,
                    overtime: 0,
                    department: (p as any).department,
                    location: null,
                  })),
                }),
              });
            }
          }
        }
      } catch {
        /* ignore */
      }

      toast.success("Upload ingested", {
        description: `${detected === "payroll" ? "Payroll" : "Spend"} · ${parsed.rows.length.toLocaleString()} rows · ready for summary`,
      });

      await runQuery(`I uploaded ${parsed.filename}. Summarize totals, anomalies, duplicates, trends, and recommended actions.`);
    } catch (e) {
      toast.error("Could not read file", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setUploadBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!canUpload) {
      toast.message("Upload not available", { description: "Ask an Owner or Finance Lead to grant upload access." });
      return;
    }
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((f) => void onFile(f));
  }

  const panel = (
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-background/70 backdrop-blur-[2px] transition-opacity dark:bg-foreground/20 sm:hidden",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      {/* panel */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDrop}
        className={cn(
          "absolute right-4 top-4 bottom-4 w-[min(520px,calc(100vw-2rem))] translate-x-0 transition-transform duration-300",
          "sm:right-4 sm:top-4 sm:bottom-4",
          "max-sm:left-0 max-sm:right-0 max-sm:top-0 max-sm:bottom-0 max-sm:w-auto",
          open ? "translate-x-0" : "translate-x-[calc(100%+2rem)]",
        )}
      >
        <Card className="surface flex h-full flex-col overflow-hidden border-[var(--spendda-blue)]/15 bg-gradient-to-b from-[var(--spendda-navy)]/[0.06] via-card to-background shadow-spendda">
          {/* header */}
          <div className="glass-top flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 text-sm font-semibold">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                  <Image
                    src="/brand/spendda-logo.png"
                    alt="Spendda"
                    width={36}
                    height={36}
                    sizes="36px"
                    className="h-8 w-8 object-contain p-0.5"
                  />
                </span>
                <span className="truncate">Spendda AI</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {pageLabel} • {merged.scopeLabel}
                {scope.range.from || scope.range.to ? ` • ${scope.range.from || "…"}→${scope.range.to || "…"}` : ""}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* quick actions */}
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={busy}
                onClick={() => void runQuery(a.prompt)}
                className={cn(
                  "rounded-full border border-[var(--brand-secondary)]/40 bg-muted/30 px-3 py-1 text-xs font-medium text-foreground transition hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10",
                  busy && "pointer-events-none opacity-50",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* messages */}
          <ScrollArea className="flex-1 px-4" viewportRef={scrollViewportRef}>
            <div className="grid gap-3 py-2 pr-2">
              {msgs.map((m, i) => (
                <div
                  key={`gmsg-${i}-${m.role}-${m.content.slice(0, 18)}`}
                  className={cn(
                    "w-full",
                    m.role === "user" ? "flex justify-end" : "flex justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "bg-gradient-to-br from-[var(--spendda-blue)] to-blue-600 text-white shadow-[0_12px_40px_rgba(59,130,246,0.35)]"
                        : "border border-border/60 bg-card/95 text-foreground backdrop-blur-sm",
                    )}
                  >
                    <div className="whitespace-pre-wrap">
                      {m.content}
                      {m.role === "assistant" && m.streaming ? (
                        <span
                          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-sm bg-primary align-[-2px]"
                          aria-hidden
                        />
                      ) : null}
                    </div>

                    {m.role === "assistant" && m.meta?.contextLine ? (
                      <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                        {m.meta.contextLine}
                      </div>
                    ) : null}

                    {m.role === "assistant" && m.kpis?.length ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {m.kpis.map((k) => (
                          <div
                            key={k.label + k.value}
                            className="rounded-xl border border-border/60 bg-background/80 px-3 py-2 shadow-sm"
                          >
                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {k.label}
                            </div>
                            <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{k.value}</div>
                            {k.hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{k.hint}</div> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* viz */}
                    {m.role === "assistant" && m.viz?.type ? (
                      <div className="mt-3 rounded-xl border border-border/50 bg-background/60 p-3">
                        <div className="mb-2 text-xs font-semibold text-muted-foreground">{m.viz.title}</div>
                        <div className="h-[180px] w-full min-w-0">
                          {m.viz.type === "bar" ? (
                            <SpenddaResponsiveContainer
                              width="100%"
                              height="100%"
                              initialDimension={{ width: 480, height: 180 }}
                            >
                              <BarChart data={m.viz.data} margin={{ left: 8, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip
                                  formatter={(v) => `$${Number(v).toLocaleString()}`}
                                  contentStyle={{
                                    background: "hsl(var(--card) / 0.98)",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: 12,
                                  }}
                                />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                              </BarChart>
                            </SpenddaResponsiveContainer>
                          ) : (
                            <SpenddaResponsiveContainer
                              width="100%"
                              height="100%"
                              initialDimension={{ width: 480, height: 180 }}
                            >
                              <LineChart data={m.viz.data} margin={{ left: 8, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                                <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip
                                  formatter={(v) => `$${Number(v).toLocaleString()}`}
                                  contentStyle={{
                                    background: "hsl(var(--card) / 0.98)",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: 12,
                                  }}
                                />
                                <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                              </LineChart>
                            </SpenddaResponsiveContainer>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {m.role === "assistant" && m.followUps?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.followUps.map((f) => (
                          <button
                            key={f}
                            type="button"
                            disabled={busy}
                            onClick={() => onFollowUpChip(f)}
                            className="rounded-full border border-[var(--spendda-blue)]/25 bg-[var(--spendda-blue)]/8 px-3 py-1 text-[11px] font-medium text-foreground transition hover:bg-[var(--spendda-blue)]/15 disabled:opacity-50"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {m.role === "assistant" && m.meta?.dataGaps?.length ? (
                      <div className="mt-2 text-[11px] text-amber-700/90 dark:text-amber-200/90">
                        <span className="font-semibold">Data needs: </span>
                        {m.meta.dataGaps.join(" · ")}
                      </div>
                    ) : null}

                    {/* compact meta row */}
                    {m.role === "assistant" && m.meta?.sources ? (
                      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                        <div>
                          Confidence {Math.round(m.meta.confidencePct || 0)}% •{" "}
                          {m.meta.sources.entity || merged.scopeLabel}
                          {m.meta.sources.spend?.filename ? ` • ${m.meta.sources.spend.filename}` : ""}
                          {m.meta.sources.payroll?.filename ? ` • ${m.meta.sources.payroll.filename}` : ""}
                        </div>
                        {m.meta.trustNote ? (
                          <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5 text-[10px] leading-snug">
                            <span className="font-semibold text-foreground/80">Sources · </span>
                            {m.meta.trustNote}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {showJump ? (
            <div className="pointer-events-none absolute bottom-[88px] right-6 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="pointer-events-auto rounded-full shadow-md"
                onClick={jumpToBottom}
              >
                New messages
              </Button>
            </div>
          ) : null}

          {/* composer */}
          <div className="border-t border-border/50 bg-background/40 px-4 py-3 backdrop-blur">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  ref={composerRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ask anything…"
                  rows={2}
                  className="min-h-[56px] resize-none bg-background/70"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void runQuery(q);
                    }
                  }}
                />
              </div>

              <input
                id="global-ai-upload"
                type="file"
                className="hidden"
                multiple
                accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.docx"
                onChange={(e) => {
                  const files = Array.from(e.currentTarget.files || []);
                  e.currentTarget.value = "";
                  files.forEach((f) => void onFile(f));
                }}
              />

              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full px-3"
                disabled={busy || uploadBusy || !canUpload}
                title={!canUpload ? "Uploads require Owner, Finance Lead, or Analyst." : undefined}
                onClick={() => document.getElementById("global-ai-upload")?.click()}
              >
                {uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-full bg-gradient-to-r from-[var(--spendda-blue)] to-blue-600 px-4 text-white shadow-[0_14px_40px_rgba(59,130,246,0.4)] hover:opacity-[0.97]"
                disabled={busy || !q.trim()}
                onClick={() => void runQuery(q)}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-2 text-[11px] text-muted-foreground">
              {canUpload
                ? "Tip: drag & drop files • Cmd/Ctrl+K opens AI • Esc closes"
                : "Tip: Cmd/Ctrl+K opens AI • Esc closes • file ingest is limited to your workspace role"}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      {panel}
      {/* floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full",
          "bg-gradient-to-br from-[var(--spendda-blue)] to-blue-600 text-white shadow-[0_18px_60px_rgba(59,130,246,0.45)]",
          "ring-1 ring-white/10 transition hover:-translate-y-0.5 active:translate-y-0",
        )}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <Bot className="h-5 w-5" />
      </button>
    </>
  );
}

