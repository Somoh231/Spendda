"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import {
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { ExternalIntelligenceWorkspaceStrip } from "@/components/app/external-intelligence-workspace-strip";
import { FileDropzone } from "@/components/file-dropzone";
import { WorkspaceMarkdown } from "@/components/app/workspace-markdown";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appendIntelligenceAudit } from "@/lib/intelligence/audit-log";
import { buildIntelligenceBrief } from "@/lib/intelligence/brief";
import { parseUploadFile } from "@/lib/upload/parse";
import { describeIngestKind, ingestWorkspaceDataset, ingestWorkspaceUpload } from "@/lib/upload/workspace-ingest";
import { getUploadedInsights, upsertUploadedInsights } from "@/lib/upload/storage";
import { upsertWorkspaceDataset, type WorkspaceDataset } from "@/lib/upload/dataset-store";
import { answerFromDataset } from "@/lib/ai/local-intelligence";
import { finishCopilotMessage, spendDateCoveragePct, type LocalEngineAnswer } from "@/lib/ai/copilot-finish";
import { wantsDeepDetail } from "@/lib/ai/intent-routing";
import type { PayrollRow, SpendTxn } from "@/lib/upload/dataset-store";
import { buildUploadPilotSnapshot } from "@/lib/workspace/upload-ai-context";
import { mergeWorkspaceDatasetsForAnalyticsScope } from "@/lib/workspace/merge-scope-datasets";
import { stripMarkdownForClipboard } from "@/lib/ai/workspace-copy";
import { useProfile } from "@/lib/profile/client";
import { useClientSession } from "@/hooks/use-client-session";
import { cn } from "@/lib/utils";
import {
  downloadAiWorkspaceReportPdf,
  parseReportExportIntent,
  type AiWorkspaceReportKind,
} from "@/lib/reports/ai-workspace-reports";

const SESSION_KEY = "spendda_ai_workspace_v3";

function sessionKeyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${SESSION_KEY}:${id}` : SESSION_KEY;
}

function genMsgId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

const SUGGESTED = [
  "What looks suspicious?",
  "Summarize",
  "Top vendors by spend",
  "Payroll anomalies",
  "Forecast next quarter",
];

const AFTER_UPLOAD = ["Why did payroll rise?", "Show duplicate payments", "Build monthly report"];

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Long-form tables / engine dump — expandable in workspace */
  detailText?: string;
  streaming?: boolean;
  /** True while model is “thinking” before first streamed token */
  typing?: boolean;
  viz?: { type: "bar" | "line"; title: string; data: unknown[] } | null;
  followUps?: string[];
  kpis?: Array<{ label: string; value: string; hint?: string }>;
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
    mode?: "local" | "openai";
  } | null;
};

type SessionPersist = {
  msgs: Omit<ChatMsg, "streaming" | "typing">[];
  memory?: {
    lastUploadName?: string;
    entity?: string;
    rangeFrom?: string;
    rangeTo?: string;
  };
  savedAt?: string;
};

type CloudChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  detailText?: string;
  meta?: ChatMsg["meta"];
  createdAt: string;
};

function detectedFieldsFromDataset(ds: WorkspaceDataset | null) {
  if (!ds) return "—";
  if (ds.kind === "spend") {
    const rows = ds.rows as SpendTxn[];
    const has = (k: keyof SpendTxn) => rows.some((r) => Boolean((r as any)[k]));
    const out: string[] = [];
    if (has("date")) out.push("date");
    if (has("vendor")) out.push("vendor");
    if (rows.some((r) => (r.amount || 0) > 0)) out.push("amount");
    if (has("department")) out.push("department");
    if (has("category")) out.push("category");
    if (has("invoiceId")) out.push("invoice");
    return out.length ? out.join(", ") : "—";
  }
  const rows = ds.rows as PayrollRow[];
  const has = (k: keyof PayrollRow) => rows.some((r) => Boolean((r as any)[k]));
  const out: string[] = [];
  if (has("employeeName")) out.push("employee");
  if (rows.some((r) => (r.salaryCurrent || 0) > 0)) out.push("wages");
  if (has("department")) out.push("department");
  if (has("status")) out.push("status");
  if (has("bankAccount")) out.push("bank");
  return out.length ? out.join(", ") : "—";
}

type InsightsSummaryResp = {
  ok?: boolean;
  summary?: {
    spend?: { rowCount: number; positiveRowCount: number; totalPositive: number };
    payroll?: { rowCount: number; positiveRowCount: number; totalWages: number; overtimeTotal: number };
  };
};

type InsightsVendorsResp = { ok?: boolean; vendors?: Array<{ name: string; spend: number; pct: number }> };
type InsightsDeptsResp = { ok?: boolean; departments?: Array<{ name: string; spend: number; pct: number }> };
type InsightsAnomsResp = {
  ok?: boolean;
  anomalies?: {
    outliers?: { p95: number; aboveP95: number; top: Array<{ date: string | null; vendor: string; amount: number; department: string; invoiceId: string }> };
    duplicates?: { count: number; samples: Array<{ date: string | null; vendor: string; amount: number; department: string; invoiceId: string }> };
  };
};
type InsightsForecastResp = { ok?: boolean; forecast?: { monthly: Array<{ month: string; total: number }>; forecastNext3: { next: number[]; avg: number } | null } };

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${Math.round(v).toLocaleString()}`;
}

async function tryInsightsAnswer(questionLower: string, range: { from?: string; to?: string }) {
  const wantsSummary = /\b(summarize|summarise|summary|executive summary|quick summary|this month)\b/i.test(questionLower);
  const wantsVendors = /\b(top vendors?|vendor ranking|show vendors?)\b/i.test(questionLower);
  const wantsDepts = /\b(department|departments)\b.*\b(overspend|spent|ranking|top)\b|\bwhich department\b/i.test(questionLower);
  const wantsAnoms = /\b(suspicious|anomal|red flag|duplicate|duplicates|looks?\s+off|fishy)\b/i.test(questionLower);
  const wantsForecast = /\b(forecast|next quarter|projection|projected)\b/i.test(questionLower);
  const wantsPayroll = /\bpayroll|wages|salary|overtime\b/i.test(questionLower);

  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString() ? `?${params.toString()}` : "";

  // Always fetch summary for analytics-style queries (lightweight, used for grounding).
  const sRes = await fetch(`/api/insights/summary${qs}`, { cache: "no-store" });
  if (!sRes.ok) return null;
  const sJson = (await sRes.json().catch(() => ({}))) as InsightsSummaryResp;
  if (!sJson.ok || !sJson.summary) return null;

  const spendTotal = sJson.summary.spend?.totalPositive ?? 0;
  const spendRows = sJson.summary.spend?.rowCount ?? 0;
  const payrollTotal = sJson.summary.payroll?.totalWages ?? 0;
  const payrollRows = sJson.summary.payroll?.rowCount ?? 0;

  let lines: string[] = [];
  if (wantsSummary || (!wantsVendors && !wantsDepts && !wantsAnoms && !wantsForecast)) {
    lines.push(`### Quick summary`);
    if (spendRows) lines.push(`• Spend: **${money(spendTotal)}** across **${spendRows.toLocaleString()}** rows`);
    if (payrollRows) lines.push(`• Payroll: **${money(payrollTotal)}** across **${payrollRows.toLocaleString()}** rows`);
    if (!spendRows && !payrollRows) lines.push(`• No tenant rows in this range yet`);
  }

  if (wantsVendors) {
    const vRes = await fetch(`/api/insights/vendors${qs}`, { cache: "no-store" });
    if (vRes.ok) {
      const vJson = (await vRes.json().catch(() => ({}))) as InsightsVendorsResp;
      const top = vJson.vendors?.slice(0, 5) || [];
      if (top.length) {
        lines.push(`\n### Top vendors`);
        top.forEach((v) => lines.push(`• **${v.name}** — ${money(v.spend)} (${v.pct.toFixed(1)}%)`));
      }
    }
  }

  if (wantsDepts) {
    const dRes = await fetch(`/api/insights/departments${qs}`, { cache: "no-store" });
    if (dRes.ok) {
      const dJson = (await dRes.json().catch(() => ({}))) as InsightsDeptsResp;
      const top = dJson.departments?.slice(0, 5) || [];
      if (top.length) {
        lines.push(`\n### Departments`);
        top.forEach((d) => lines.push(`• **${d.name}** — ${money(d.spend)} (${d.pct.toFixed(1)}%)`));
      }
    }
  }

  if (wantsAnoms) {
    const aRes = await fetch(`/api/insights/anomalies${qs}`, { cache: "no-store" });
    if (aRes.ok) {
      const aJson = (await aRes.json().catch(() => ({}))) as InsightsAnomsResp;
      const p95 = aJson.anomalies?.outliers?.p95 ?? 0;
      const dupC = aJson.anomalies?.duplicates?.count ?? 0;
      lines.push(`\n### Suspicious signals`);
      lines.push(`• Duplicate candidates: **${dupC.toLocaleString()}**`);
      if (p95) lines.push(`• Large-ticket threshold (p95): **${money(p95)}**`);
    }
  }

  if (wantsForecast) {
    const fRes = await fetch(`/api/insights/forecast${qs}`, { cache: "no-store" });
    if (fRes.ok) {
      const fJson = (await fRes.json().catch(() => ({}))) as InsightsForecastResp;
      const fc = fJson.forecast?.forecastNext3;
      if (fc) {
        lines.push(`\n### Forecast`);
        lines.push(`• Next 3 months (trend): **${money(fc.next[0])}** · **${money(fc.next[1])}** · **${money(fc.next[2])}** (avg **${money(fc.avg)}**)`);
      } else {
        lines.push(`\n### Forecast`);
        lines.push(`• Not enough dated spend history to forecast yet`);
      }
    }
  }

  if (wantsPayroll && payrollRows) {
    lines.push(`\n_Note: payroll “high” is relative — if you tell me your revenue or budget target, I can compute ratios._`);
  }

  return lines.join("\n");
}

function fileTypeFromFilename(filename: string): "CSV" | "XLSX" | "XLS" | "OTHER" {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  if (ext === "csv") return "CSV";
  if (ext === "xlsx") return "XLSX";
  if (ext === "xls") return "XLS";
  return "OTHER";
}

async function ingestSpendRowsToCloud(opts: { sourceUploadId: string; rows: SpendTxn[] }) {
  const chunkSize = 800;
  for (let i = 0; i < opts.rows.length; i += chunkSize) {
    const chunk = opts.rows.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    await fetch("/api/ingest/spend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceUploadId: opts.sourceUploadId,
        rows: chunk.map((t) => ({
          date: t.date,
          vendor: t.vendor,
          amount: t.amount,
          department: t.department,
          category: t.category,
          invoiceId: t.invoiceId,
        })),
      }),
    });
  }
}

async function ingestPayrollRowsToCloud(opts: { sourceUploadId: string; rows: PayrollRow[] }) {
  const chunkSize = 800;
  for (let i = 0; i < opts.rows.length; i += chunkSize) {
    const chunk = opts.rows.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    await fetch("/api/ingest/payroll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceUploadId: opts.sourceUploadId,
        rows: chunk.map((p) => ({
          employee: p.employeeName,
          wages: p.salaryCurrent,
          overtime: 0,
          department: p.department,
          location: null,
        })),
      }),
    });
  }
}

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

async function sleep(ms: number) {
  await new Promise((r) => window.setTimeout(r, ms));
}

export function AiWorkspaceApp() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { profile } = useProfile();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const workspace = useWorkspaceData();
  const { scope, hydrated } = useAnalyticsScope();

  const entity = workspace.primaryEntity;
  const hasDataset = workspace.dataSource === "upload";
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
  const rangeLabel = `${scope.range.from || "…"} → ${scope.range.to || "…"}`;

  const [msgs, setMsgs] = React.useState<ChatMsg[]>([
    {
      id: genMsgId(),
      role: "assistant",
      content:
        "I’ll keep replies tight unless you ask to go deeper. **Hello** is fine; for numbers, try **summarize** or **what looks suspicious** — or drop **CSV / XLSX** on the composer (drag works anywhere in the chat).",
    },
  ]);
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [uploadBusy, setUploadBusy] = React.useState(false);
  const [pendingAttachments, setPendingAttachments] = React.useState<File[]>([]);
  const [composerDrag, setComposerDrag] = React.useState(false);
  const [uploadWorkflow, setUploadWorkflow] = React.useState<
    | {
        stage: "idle" | "selected" | "uploading" | "parsing" | "analyzing" | "success" | "error";
        progressPct?: number;
        message?: string;
        detail?: string;
      }
    | undefined
  >(undefined);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const cloudThreadId = React.useMemo(() => {
    const t = clientId?.trim();
    return t ? `workspace:${t}` : "default";
  }, [clientId]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(sessionKeyForClient(clientId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as SessionPersist;
      if (Array.isArray(parsed.msgs) && parsed.msgs.length > 0) {
        setMsgs(
          parsed.msgs.map((m, i) => ({
            ...m,
            id: (m as { id?: string }).id ?? `legacy-${i}`,
            streaming: false,
            typing: false,
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }, [clientId]);

  // Optional cloud thread hydrate. Keeps UI identical; falls back silently to localStorage.
  React.useEffect(() => {
    if (!workspace.ready || !hydrated) return;
    if (!clientId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/chat/messages?threadId=${encodeURIComponent(cloudThreadId)}&limit=160`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; msgs?: CloudChatMsg[] };
        if (!alive) return;
        if (!json.ok || !Array.isArray(json.msgs) || !json.msgs.length) return;
        setMsgs(
          json.msgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            detailText: m.detailText,
            meta: m.meta ?? null,
            streaming: false,
            typing: false,
          })),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [workspace.ready, hydrated, clientId, cloudThreadId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const after = search.get("afterUpload");
    if (after !== "1") return;
    const prompt = search.get("prompt");
    toast.success("Upload ready", { description: "Your prompt is in the composer." });
    if (prompt?.trim()) setQ(prompt);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("afterUpload");
      url.searchParams.delete("prompt");
      url.searchParams.delete("kind");
      window.history.replaceState({}, "", `${url.pathname}${url.search ? url.search : ""}`);
    } catch {
      /* ignore */
    }
  }, [search]);

  function persistSession(next: ChatMsg[]) {
    try {
      const serial: SessionPersist["msgs"] = next.map(({ streaming: _s, typing: _t, ...rest }) => rest);
      const payload: SessionPersist = {
        msgs: serial,
        memory: {
          lastUploadName: next.filter((m) => m.role === "user").at(-1)?.content,
          entity,
          rangeFrom: scope.range.from,
          rangeTo: scope.range.to,
        },
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(sessionKeyForClient(clientId), JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  async function tryPersistCloudMessage(m: Pick<ChatMsg, "role" | "content" | "detailText" | "meta">) {
    if (!clientId) return;
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadId: cloudThreadId,
          role: m.role,
          content: m.content,
          detailText: m.detailText,
          meta: m.meta,
        }),
      });
    } catch {
      /* ignore */
    }
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  }

  React.useLayoutEffect(() => {
    scrollToBottom(msgs.length < 3 ? "auto" : "smooth");
  }, [msgs, busy, uploadBusy]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(200, Math.max(44, el.scrollHeight))}px`;
  }, [q]);

  function addPendingFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const tabular = list.filter((f) => {
      const ext = (f.name || "").split(".").pop()?.toLowerCase();
      return ext === "csv" || ext === "xlsx" || ext === "xls";
    });
    const skipped = list.length - tabular.length;
    if (skipped) toast.message("Some files skipped", { description: "Only CSV / XLSX / XLS attach here." });
    if (!tabular.length) return;
    setPendingAttachments((prev) => [...prev, ...tabular].slice(0, 6));
  }

  async function ingestSpreadsheetCore(file: File): Promise<
    | {
        ok: true;
        filename: string;
        detected: string;
        spendDs: WorkspaceDataset | null;
        payrollDs: WorkspaceDataset | null;
        rowCount: number;
      }
    | { ok: false; error: string }
  > {
    const ext = (file.name || "").split(".").pop()?.toLowerCase();
    const isTabular = ext === "csv" || ext === "xlsx" || ext === "xls";
    if (!isTabular) return { ok: false, error: "Only CSV/XLSX/XLS are supported for analysis." };
    const parsed = await parseUploadFile(file);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const detected = describeIngestKind(parsed.rows);
    const insight = ingestWorkspaceUpload(parsed.rows, parsed.filename, entity);
    const dataset = ingestWorkspaceDataset(parsed.rows, parsed.filename, entity);
    upsertWorkspaceDataset(dataset, clientId);
    upsertUploadedInsights(insight, clientId);

    // Best-effort cloud metadata persistence (multi-tenant, no UI changes).
    try {
      const metaRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: parsed.filename,
          fileKind: detected === "payroll" ? "payroll" : "spend",
          fileType: fileTypeFromFilename(parsed.filename),
          rowCount: parsed.rows.length,
          uploadedAt: new Date().toISOString(),
          status: "Ready",
        }),
      });
      const metaJson = (await metaRes.json().catch(() => ({}))) as { ok?: boolean; id?: string };
      if (metaRes.ok && metaJson.ok && metaJson.id) {
        if (dataset.kind === "spend") {
          await ingestSpendRowsToCloud({
            sourceUploadId: metaJson.id,
            rows: dataset.rows as SpendTxn[],
          });
        } else {
          await ingestPayrollRowsToCloud({
            sourceUploadId: metaJson.id,
            rows: dataset.rows as PayrollRow[],
          });
        }
      }
    } catch {
      /* ignore */
    }
    return {
      ok: true,
      filename: parsed.filename,
      detected,
      spendDs: dataset.kind === "spend" ? dataset : null,
      payrollDs: dataset.kind === "payroll" ? dataset : null,
      rowCount: parsed.rows.length,
    };
  }

  async function exportWorkspaceReport(kind: AiWorkspaceReportKind) {
    await downloadAiWorkspaceReportPdf({
      kind,
      profile,
      entity,
      range: scope.range,
      spendDs: workspace.spendForEntity,
      payrollDs: workspace.payrollForEntity,
    });
    const label =
      kind === "owner_monthly"
        ? "Owner Monthly Report"
        : kind === "payroll_summary"
          ? "Payroll Summary"
          : kind === "expense_trends"
            ? "Expense Trends"
            : "Risk & Action Report";
    toast.success("Report downloaded", { description: `${label} · PDF` });
  }

  async function exportSessionCsv() {
    const lines: string[] = ["role,content"];
    msgs.forEach((m) => lines.push(`${m.role},"${m.content.replaceAll('"', '""')}"`));
    downloadText("spendda-ai-session.csv", lines.join("\n"), "text/csv");
    toast.success("Session exported (CSV)");
  }

  async function exportSessionPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    let y = 56;
    const margin = 48;
    const maxW = 612 - margin * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Spendda AI — session export", margin, y);
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Entity: ${entity} · Range: ${rangeLabel}`, margin, y);
    y += 18;
    for (const m of msgs) {
      const prefix = m.role === "user" ? "You: " : "Spendda: ";
      const chunk = doc.splitTextToSize(prefix + m.content.replace(/\*\*/g, ""), maxW);
      doc.text(chunk, margin, y);
      y += chunk.length * 13 + 10;
      if (y > 720) {
        doc.addPage();
        y = 48;
      }
    }
    doc.save("spendda-ai-session.pdf");
    toast.success("Session exported (PDF)");
  }

  async function streamAssistantContent(assistantId: string, full: string) {
    const n = full.length;
    const step = n < 420 ? Math.max(3, Math.floor(n / 48)) : n < 1600 ? 10 : 18;
    const tickMs = n < 420 ? 12 : n < 1600 ? 9 : 6;
    for (let end = 0; end <= n; end += step) {
      const slice = full.slice(0, Math.min(n, end + step));
      await sleep(tickMs);
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: slice, streaming: true, typing: false } : m,
        ),
      );
      scrollToBottom("auto");
    }
  }

  async function runQuery(
    text: string,
    datasetOverride?: { spend: WorkspaceDataset | null; payroll: WorkspaceDataset | null },
    options?: { skipUserMessage?: boolean; attachmentsNote?: string },
  ) {
    const trimmed = (options?.attachmentsNote ? `${options.attachmentsNote}\n\n` : "") + text.trim();
    const userVisible = text.trim() || options?.attachmentsNote || "Uploaded files";
    if (!trimmed.replace(/\n/g, "").trim() && !options?.skipUserMessage) return;

    setBusy(true);
    const userId = genMsgId();
    const assistantId = genMsgId();

    try {
      if (!options?.skipUserMessage) {
        setMsgs((prev) => [
          ...prev,
          { id: userId, role: "user" as const, content: userVisible },
          {
            id: assistantId,
            role: "assistant" as const,
            content: "",
            streaming: true,
            typing: true,
          },
        ]);
      } else {
        setMsgs((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant" as const,
            content: "",
            streaming: true,
            typing: true,
          },
        ]);
      }

      await sleep(320);

      if (!options?.skipUserMessage) {
        void tryPersistCloudMessage({ role: "user", content: userVisible, meta: null });
      }

      const reportKind = parseReportExportIntent(trimmed);
      if (reportKind) {
        if (!hasDataset && !datasetOverride) {
          setMsgs((prev) => {
            const next = prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      "Upload a dataset first — then use **Reports** in the product menu or ask me to export a named report (e.g. *owner monthly report PDF*).",
                    streaming: false,
                    typing: false,
                  }
                : m,
            );
            persistSession(next);
            return next;
          });
          toast.message("No upload yet");
          return;
        }
        await exportWorkspaceReport(reportKind);
        const title =
          reportKind === "owner_monthly"
            ? "Owner Monthly Report"
            : reportKind === "payroll_summary"
              ? "Payroll Summary"
              : reportKind === "expense_trends"
                ? "Expense Trends"
                : "Risk & Action Report";
        const msg = `Generated **${title}** for **${entity}** (scoped to your date range when dates exist). Check your downloads folder.`;
        await streamAssistantContent(assistantId, msg);
        setMsgs((prev) => {
          const next = prev.map((m) =>
            m.id === assistantId ? { ...m, content: msg, streaming: false, typing: false } : m,
          );
          persistSession(next);
          return next;
        });
        setQ("");
        return;
      }

      const uploads = getUploadedInsights(clientId);
      const spendDs = datasetOverride?.spend ?? merged.spend;
      const payrollDs = datasetOverride?.payroll ?? merged.payroll;
      const entityForAi = datasetOverride ? entity : merged.scopeLabel;
      const uploadPilot = buildUploadPilotSnapshot({
        dataSource: workspace.dataSource,
        entity: entityForAi,
        range: scope.range,
        spendDataset: spendDs,
        payrollDataset: payrollDs,
      });
      const conversationForEngine = [
        ...msgs
          .filter((m) => !(m.role === "assistant" && !String(m.content || "").trim()))
          .slice(-14)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) } as const)),
        { role: "user" as const, content: trimmed },
      ];

      // Phase 2: Code calculates, AI explains (tenant-scoped insights endpoints).
      // Only attempt this for analytics-like asks; fall back to local engine if unavailable.
      const qLower = trimmed.toLowerCase();
      const wantsEndpoint =
        /\b(summarize|summary|executive summary|what looks suspicious|suspicious|anomal|top vendors?|vendor|department|overspend|payroll|wages|salary|forecast|next quarter|duplicate)\b/i.test(
          qLower,
        );
      if (wantsEndpoint && workspace.dataSource !== "demo") {
        try {
          const insightText = await tryInsightsAnswer(qLower, scope.range);
          if (insightText) {
            await streamAssistantContent(assistantId, insightText);
            setMsgs((prev) => {
              const next = prev.map((m) =>
                m.id === assistantId ? { ...m, content: insightText, streaming: false, typing: false } : m,
              );
              persistSession(next);
              return next;
            });
            void tryPersistCloudMessage({ role: "assistant", content: insightText, meta: null });
            setQ("");
            requestAnimationFrame(() => textareaRef.current?.focus());
            return;
          }
        } catch {
          /* ignore */
        }
      }

      const localRaw = answerFromDataset({
        question: trimmed,
        datasetSpend: spendDs,
        datasetPayroll: payrollDs,
        profile,
        entity: entityForAi,
        range: scope.range,
        uploadPilot,
        conversationTurns: conversationForEngine,
      }) as LocalEngineAnswer;
      const spendRows = spendDs?.kind === "spend" ? (spendDs.rows as SpendTxn[]) : undefined;
      const recentTurns = msgs.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
      const wantsDeep = wantsDeepDetail(trimmed);
      const local = finishCopilotMessage(localRaw, {
        profile,
        entity: entityForAi,
        range: scope.range,
        pageLabel: "AI Workspace",
        pathname,
        recentTurns: [...recentTurns, { role: "user" as const, content: trimmed }],
        spendDateCoveragePct: spendDateCoveragePct(spendRows),
        surface: "workspace",
        wantsDeep,
      });
      const nextBrief =
        local.kind === "empty"
          ? buildIntelligenceBrief({
              question: trimmed,
              entity,
              profile,
              uploads,
              datasetAnalytics: uploadPilot?.analytics ?? null,
            })
          : null;

      await streamAssistantContent(assistantId, local.text);

      setMsgs((prev) => {
        let briefAppend = "";
        if (nextBrief) {
          briefAppend =
            `### Structured brief (${nextBrief.confidencePct}% confidence)\n\n` +
            `**Risks**\n${nextBrief.riskSummary.slice(0, 5).map((t) => `- ${t}`).join("\n")}\n\n` +
            `**Actions**\n${nextBrief.recommendedActions.slice(0, 4).map((t) => `- ${t}`).join("\n")}`;
        }
        const mergedDetail = [local.detailText, briefAppend].filter(Boolean).join("\n\n");
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: local.text,
                detailText: mergedDetail || undefined,
                streaming: false,
                typing: false,
                viz: local.viz || null,
                meta: local.meta || null,
                followUps: local.followUps,
                kpis: local.kpis,
              }
            : m,
        );
        persistSession(next);
        return next;
      });

      void tryPersistCloudMessage({
        role: "assistant",
        content: local.text,
        detailText: local.detailText,
        meta: local.meta || null,
      });

      await appendIntelligenceAudit(
        {
          ts: new Date().toISOString(),
          query: trimmed,
          snapshotId: nextBrief?.snapshotId || "local_engine",
          signalsUsed: nextBrief?.signalsUsed || 0,
          confidencePct: nextBrief?.confidencePct || 0,
        },
        { clientId },
      );
      setQ("");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (e) {
      const err = e instanceof Error ? e.message : "Try again.";
      setMsgs((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Something went wrong: **${err}**`,
                streaming: false,
                typing: false,
              }
            : m,
        );
        persistSession(next);
        return next;
      });
      toast.error("Could not complete request", { description: err });
    } finally {
      setBusy(false);
    }
  }

  async function onWorkspaceFile(file: File, opts?: { silent?: boolean }) {
    if (!opts?.silent) setUploadBusy(true);
    try {
      setUploadWorkflow({ stage: "uploading", progressPct: 12, message: "Uploading…", detail: file.name });
      const ext = (file.name || "").split(".").pop()?.toLowerCase();
      const isTabular = ext === "csv" || ext === "xlsx" || ext === "xls";
      if (!isTabular) {
        toast.message("Evidence file", { description: "CSV/XLSX unlocks full analysis." });
        if (!opts?.silent) {
          setMsgs((prev) => {
            const next = [
              ...prev,
              { id: genMsgId(), role: "user" as const, content: `Attached: ${file.name}` },
              {
                id: genMsgId(),
                role: "assistant" as const,
                content:
                  "I can fully analyze **CSV/XLSX** here. Other formats can be stored as evidence; upload a spreadsheet to drive KPIs and risk checks.",
              },
            ];
            persistSession(next);
            return next;
          });
        }
        return;
      }
      setUploadWorkflow({
        stage: "parsing",
        progressPct: 40,
        message: "Reading file…",
        detail: "Mapping columns",
      });
      const ingested = await ingestSpreadsheetCore(file);
      if (!ingested.ok) {
        setUploadWorkflow({ stage: "error", progressPct: 100, message: "Error", detail: ingested.error });
        toast.error("Could not read file", { description: ingested.error });
        return;
      }
      setUploadWorkflow({
        stage: "analyzing",
        progressPct: 78,
        message: "Building workspace…",
        detail: `${ingested.rowCount.toLocaleString()} rows`,
      });
      if (!opts?.silent) {
        setMsgs((prev) => {
          const next = [...prev, { id: genMsgId(), role: "user" as const, content: `Uploaded: **${ingested.filename}**` }];
          persistSession(next);
          return next;
        });
      }
      const spendDs = ingested.spendDs ?? workspace.spendForEntity;
      const payrollDs = ingested.payrollDs ?? workspace.payrollForEntity;
      setUploadWorkflow({ stage: "success", progressPct: 100, message: "Ready", detail: "Workspace updated." });
      toast.success("Dataset ingested", {
        description:
          `${ingested.detected === "payroll" ? "Payroll" : "Spend"} · ${ingested.rowCount.toLocaleString()} rows · ` +
          `fields detected: ${detectedFieldsFromDataset(ingested.detected === "payroll" ? payrollDs : spendDs)}`,
      });
      if (!opts?.silent) {
        await runQuery(
          `Uploaded **${ingested.filename}** (${ingested.detected}). Give a **quick summary** and top risks.`,
          { spend: spendDs, payroll: payrollDs },
          { skipUserMessage: true },
        );
      }
    } catch (e) {
      setUploadWorkflow({
        stage: "error",
        progressPct: 100,
        message: "Error",
        detail: e instanceof Error ? e.message : "Unknown error",
      });
      toast.error("Upload failed");
    } finally {
      if (!opts?.silent) setUploadBusy(false);
      window.setTimeout(() => setUploadWorkflow(undefined), 1200);
    }
  }

  async function sendComposer() {
    const files = [...pendingAttachments];
    setPendingAttachments([]);
    if (files.length) {
      setUploadBusy(true);
      const names: string[] = [];
      let spendDs: WorkspaceDataset | null = merged.spend;
      let payrollDs: WorkspaceDataset | null = merged.payroll;
      try {
        for (const f of files) {
          const r = await ingestSpreadsheetCore(f);
          if (!r.ok) {
            toast.error(r.error);
            continue;
          }
          names.push(r.filename);
          if (r.spendDs) spendDs = r.spendDs;
          if (r.payrollDs) payrollDs = r.payrollDs;
        }
        if (names.length) {
          toast.success("Files attached", { description: names.join(", ") });
        }
        const note = names.length ? `**Attached files:** ${names.join(", ")}` : "";
        const question = q.trim() || "Summarize what changed and what I should review first.";
        await runQuery(question, { spend: spendDs, payroll: payrollDs }, { attachmentsNote: note });
      } finally {
        setUploadBusy(false);
      }
      return;
    }
    await runQuery(q);
  }

  function clearChat() {
    setMsgs([
      {
        id: genMsgId(),
        role: "assistant",
        content: "Fresh thread — ask anything or attach **CSV / XLSX**.",
      },
    ]);
    setPendingAttachments([]);
    try {
      window.localStorage.removeItem(sessionKeyForClient(clientId));
    } catch {
      /* ignore */
    }
    toast.info("Conversation cleared");
  }

  async function copyMessage(content: string) {
    try {
      await navigator.clipboard.writeText(stripMarkdownForClipboard(content));
      toast.success("Copied", { description: "Plain text — tables preserved as text." });
    } catch {
      toast.error("Could not copy");
    }
  }

  function retryFromAssistantIndex(index: number) {
    for (let i = index - 1; i >= 0; i--) {
      if (msgs[i]?.role === "user") {
        void runQuery(msgs[i].content);
        return;
      }
    }
    toast.message("Nothing to retry", { description: "Send a new message first." });
  }

  if (!workspace.ready || !hydrated) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <Sparkles className="absolute inset-0 m-auto h-4 w-4 text-primary/80" />
        </div>
        Preparing workspace…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border/55 bg-card shadow-ds-card",
        composerDrag && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
      )}
    >
      <header className="shrink-0 border-b border-border/55 bg-gradient-to-r from-[var(--spendda-navy)]/[0.08] to-transparent px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">AI Workspace</h2>
              <Badge variant="outline" className="font-normal text-[10px] sm:text-xs">
                {workspace.dataSource === "upload" ? "Live data" : workspace.dataSource === "demo" ? "Demo" : "No upload"}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground sm:text-xs">
              <span className="truncate" title={workspace.activeDatasetLabel || undefined}>
                <span className="font-medium text-foreground/85">Data:</span> {workspace.activeDatasetLabel || "—"}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="truncate">
                <span className="font-medium text-foreground/85">Scope:</span> {merged.scopeLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={clearChat}>
              <Trash2 className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => void exportSessionCsv()}>
              <Download className="mr-1 h-3 w-3" />
              CSV
            </Button>
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => void exportSessionPdf()}>
              <Download className="mr-1 h-3 w-3" />
              PDF
            </Button>
          </div>
        </div>
      </header>

      <ExternalIntelligenceWorkspaceStrip />

      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setComposerDrag(true);
        }}
        onDragLeave={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && e.currentTarget.contains(next)) return;
          setComposerDrag(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setComposerDrag(false);
          if (e.dataTransfer.files?.length) addPendingFiles(e.dataTransfer.files);
        }}
      >
        {/* Messages — scrolls; composer stays pinned below */}
        <div
          ref={scrollRef}
          className="ai-workspace-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-4 sm:px-5 sm:py-5"
        >
          {!hasDataset ? (
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-6 text-center">
              <p className="text-base font-semibold tracking-tight">Upload to unlock full analysis</p>
              <p className="text-sm text-muted-foreground">
                CSV, Excel, or QuickBooks-style exports. You can also attach from the composer below.
              </p>
              <div className="w-full rounded-2xl border border-dashed border-primary/25 bg-muted/10 p-4">
                <FileDropzone
                  title={uploadBusy ? "Working…" : "Drop a spreadsheet"}
                  subtitle=".csv · .xlsx · .xls"
                  disabled={uploadBusy}
                  onFile={(f) => void onWorkspaceFile(f)}
                  accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  workflow={uploadWorkflow}
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {AFTER_UPLOAD.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={busy}
                      onClick={() => void runQuery(p)}
                      className={cn(
                        "rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-muted/30",
                        busy && "pointer-events-none opacity-50",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Button type="button" variant="link" className="mt-2 h-auto px-0 text-xs" onClick={() => router.push("/app/upload-data")}>
                  Open upload hub →
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mx-auto flex w-full min-w-0 max-w-[min(100%,720px)] flex-col gap-4 pb-2 pt-0">
            {msgs.map((m, i) => (
              <div key={m.id} className={cn("flex w-full min-w-0", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "group/msg relative min-w-0 max-w-[min(100%,680px)] overflow-x-auto rounded-2xl px-4 py-2.5 shadow-ds-xs sm:px-4 sm:py-3",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/50 bg-muted/20 text-foreground shadow-[inset_3px_0_0_0_hsl(var(--primary)/0.35)] backdrop-blur-[2px] dark:bg-muted/15",
                  )}
                >
                  {m.role === "assistant" && m.typing && !m.content ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TypingDots />
                      <span>Thinking</span>
                    </div>
                  ) : m.role === "assistant" ? (
                    <div
                      className={cn(
                        "min-w-0 space-y-2 break-words",
                        m.streaming && m.content.length === 0 && !m.typing && "opacity-70",
                      )}
                    >
                      <WorkspaceMarkdown content={m.content || (m.streaming ? "…" : "")} />
                    </div>
                  ) : (
                    <div className="min-w-0 max-w-full whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</div>
                  )}

                  {m.role === "assistant" && m.kpis?.length && m.content ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {m.kpis.map((k) => (
                        <div
                          key={k.label + k.value}
                          className="rounded-xl border border-border/50 bg-background/40 px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                        >
                          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
                          <div className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight">{k.value}</div>
                          {k.hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{k.hint}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {m.role === "assistant" && m.viz?.type && m.content ? (
                    <div className="mt-3 rounded-xl border border-border/50 bg-background/25 p-2">
                      <div className="mb-1.5 px-1 text-[11px] font-semibold text-muted-foreground">{m.viz.title}</div>
                      <div className="h-[160px] w-full min-w-0 sm:h-[180px]">
                        {m.viz.type === "bar" ? (
                          <SpenddaResponsiveContainer width="100%" height="100%">
                            <BarChart data={m.viz.data as { name?: string; value?: number }[]} margin={{ left: 4, right: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          </SpenddaResponsiveContainer>
                        ) : (
                          <SpenddaResponsiveContainer width="100%" height="100%">
                            <LineChart data={m.viz.data as { x?: string; y?: number }[]} margin={{ left: 4, right: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis dataKey="x" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                              <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                          </SpenddaResponsiveContainer>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {m.role === "assistant" && m.detailText && m.content && !m.streaming ? (
                    <details className="mt-2 rounded-xl border border-border/50 bg-background/20 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
                      <summary className="px-2.5 py-2 text-xs font-medium text-foreground/90 transition hover:bg-muted/30">
                        See details
                      </summary>
                      <div className="max-h-[min(50vh,28rem)] overflow-y-auto overflow-x-auto border-t border-border/40 px-2 py-2">
                        <WorkspaceMarkdown content={m.detailText} />
                      </div>
                    </details>
                  ) : null}

                  {m.role === "assistant" && m.followUps?.length && m.content ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.followUps.map((f) => (
                        <button
                          key={f}
                          type="button"
                          disabled={busy}
                          onClick={() => void runQuery(f)}
                          className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-left text-xs font-medium text-foreground/90 shadow-ds-xs transition hover:border-primary/30 hover:bg-muted/50 disabled:opacity-50"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {m.role === "assistant" && m.content && !m.streaming && (m.meta?.sources || m.meta?.trustNote) ? (
                    <details className="mt-2 rounded-lg border border-border/40 bg-muted/10 text-muted-foreground [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
                      <summary className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/90">
                        Context &amp; sources
                      </summary>
                      <div className="max-h-[min(40vh,20rem)] space-y-2 overflow-y-auto border-t border-border/30 px-2.5 py-2 text-[11px] leading-relaxed">
                        {m.meta?.confidencePct !== undefined && m.meta.confidencePct > 0 ? (
                          <div>
                            <span className="font-medium text-foreground/80">Confidence · </span>
                            {Math.round(m.meta.confidencePct)}%
                          </div>
                        ) : null}
                        {m.meta?.trustNote ? (
                          <div>
                            <span className="font-medium text-foreground/80">Scope · </span>
                            <WorkspaceMarkdown content={m.meta.trustNote} />
                          </div>
                        ) : null}
                        {m.meta?.sources?.spend ? (
                          <div>
                            Spend file · {m.meta.sources.spend.rows.toLocaleString()} rows ({m.meta.sources.spend.filename})
                          </div>
                        ) : null}
                        {m.meta?.sources?.payroll ? (
                          <div>
                            Payroll file · {m.meta.sources.payroll.rows.toLocaleString()} rows ({m.meta.sources.payroll.filename})
                          </div>
                        ) : null}
                        {m.meta?.dataGaps?.length ? (
                          <div className="text-amber-900/90 dark:text-amber-200/90">
                            <span className="font-medium">Data gaps · </span>
                            {m.meta.dataGaps.join(" · ")}
                          </div>
                        ) : null}
                      </div>
                    </details>
                  ) : null}

                  {m.role === "assistant" && m.content && !m.streaming ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          void copyMessage(`${m.content}${m.detailText ? `\n\n---\n\n${m.detailText}` : ""}`)
                        }
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        disabled={busy}
                        onClick={() => retryFromAssistantIndex(i)}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Retry
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {busy && msgs.at(-1)?.role !== "assistant" ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Working…
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Composer — fixed to bottom of workspace panel (flex sibling of scroll region) */}
        <div
          className={cn(
            "z-10 shrink-0 border-t border-border/55 bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_32px_-8px_hsl(var(--foreground)/0.06)] backdrop-blur-md dark:bg-background/92 dark:shadow-[0_-8px_36px_-10px_rgba(0,0,0,0.45)]",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setComposerDrag(true);
          }}
          onDragLeave={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && e.currentTarget.contains(next)) return;
            setComposerDrag(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setComposerDrag(false);
            if (e.dataTransfer.files?.length) addPendingFiles(e.dataTransfer.files);
          }}
        >
          <div className="mx-auto w-full max-w-[min(100%,720px)] px-3 sm:px-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Suggestions</p>
            <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {SUGGESTED.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy}
                  onClick={() => void runQuery(p)}
                  className="shrink-0 rounded-full border border-border/55 bg-muted/25 px-3.5 py-1.5 text-left text-xs font-medium text-muted-foreground transition hover:border-primary/28 hover:bg-muted/45 hover:text-foreground disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {pendingAttachments.length ? (
            <div className="mx-auto mb-2 flex w-full max-w-[min(100%,720px)] flex-wrap gap-2 px-3 sm:px-5">
              {pendingAttachments.map((f, idx) => (
                <span
                  key={`${f.name}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/25 py-1 pl-2.5 pr-1 text-[11px] text-foreground"
                >
                  <FileSpreadsheet className="h-3 w-3 text-primary" />
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== idx))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="mx-auto flex w-full max-w-[min(100%,720px)] items-end gap-2 px-3 sm:px-5">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={(e) => {
                const fl = e.currentTarget.files;
                e.currentTarget.value = "";
                if (fl?.length) addPendingFiles(fl);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={uploadBusy || busy}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                hasDataset
                  ? "Ask about spend, payroll, vendors, risks… (Shift+Enter for new line)"
                  : "Ask a question, or attach CSV / Excel below…"
              }
              className="max-h-[200px] min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-background/90 px-3 py-2.5 text-sm shadow-ds-xs outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendComposer();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-md"
              disabled={busy || (!q.trim() && !pendingAttachments.length)}
              onClick={() => void sendComposer()}
              aria-label="Send"
            >
              {busy || uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mx-auto mt-1.5 flex w-full max-w-[min(100%,720px)] items-center gap-1.5 px-3 pb-1 text-[10px] leading-snug text-muted-foreground sm:px-5 sm:text-[11px]">
            <FileSpreadsheet className="h-3 w-3 shrink-0 text-primary/70" aria-hidden />
            <span>Drop files on the chat or here — the paperclip queues files for your next send.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
