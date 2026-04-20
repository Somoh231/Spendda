import type { DateRange } from "@/components/ui/date-range-picker";
import type { OnboardingProfile } from "@/lib/profile/types";
import type { SpendTxn } from "@/lib/upload/dataset-store";
import { industryLensForProfile, roleHint } from "@/lib/ai/industry-nudges";

export function spendDateCoveragePct(rows: SpendTxn[] | undefined): number | undefined {
  if (!rows?.length) return undefined;
  const withDate = rows.filter((r) => r.date && r.date.length >= 10).length;
  return Math.round((100 * withDate) / rows.length);
}

export type CopilotTurn = { role: "user" | "assistant"; content: string };

export type CopilotKpi = { label: string; value: string; hint?: string };

export type LocalEngineAnswer = {
  kind: string;
  text: string;
  /** Long-form markdown / tables — shown in “See details” in AI Workspace, folded into main text elsewhere. */
  detailText?: string;
  viz?: { type: "bar" | "line"; title: string; data: unknown[] } | null;
  kpis?: CopilotKpi[];
  meta: {
    sources: {
      entity?: string;
      range?: { from?: string; to?: string };
      spend?: { filename: string; rows: number } | null;
      payroll?: { filename: string; rows: number } | null;
    };
    confidencePct: number;
    mode: "local";
    trustNote?: string;
    dataGaps?: string[];
    contextLine?: string;
  };
  followUps?: string[];
};

const ANALYTIC_KINDS = new Set([
  "suspicious",
  "suspicious_none",
  "upload_risks",
  "departments",
  "vendors",
  "dept_ranking",
  "dups",
  "no_dups",
  "vendor_review",
  "forecast",
  "forecast_missing",
  "payroll_anoms",
  "payroll_ok",
  "summary_compact",
  "vendor_concentration",
  "vendor_spend_rank",
  "finance_engine",
  "finance_engine_empty",
  "payroll_cost_explainer",
  "fix_first",
  "overspend_locator",
]);

/** Keep trust strip / KPI chrome off for normal chat and light intents. */
const CHAT_SURFACE_KINDS = new Set([
  "chat_conversational",
  "chat_clarification",
  "chat_feedback",
  "intent_greeting",
  "intent_thanks",
  "intent_help",
  "intent_upload",
  "intent_report",
  "intent_ack",
  "intent_readiness",
  "casual_with_scope",
  "clarify",
  "empty",
  "unknown",
]);

function formatRange(r?: { from?: string; to?: string }) {
  if (!r?.from && !r?.to) return "all dates in scope";
  return `${r.from || "…"} → ${r.to || "…"}`;
}

export function buildTrustNote(opts: {
  entity: string;
  range?: DateRange;
  spend?: { filename: string; rows: number } | null;
  payroll?: { filename: string; rows: number } | null;
}): string {
  const bits: string[] = [];
  bits.push(`Scope: **${opts.entity}** · ${formatRange(opts.range)}`);
  if (opts.spend?.rows) bits.push(`Spend file **${opts.spend.filename}** (${opts.spend.rows.toLocaleString()} rows)`);
  if (opts.payroll?.rows) bits.push(`Payroll file **${opts.payroll.filename}** (${opts.payroll.rows.toLocaleString()} rows)`);
  if (!opts.spend?.rows && !opts.payroll?.rows) bits.push("No rows in current merge — upload or widen entity scope.");
  return bits.join(" · ");
}

export function suggestDataGaps(opts: {
  spendRows: number;
  payrollRows: number;
  dateCoverageApprox?: number;
}): string[] {
  const out: string[] = [];
  if (!opts.spendRows && !opts.payrollRows) return ["Upload **spend** or **payroll** CSV/XLSX for this entity."];
  if (opts.spendRows && opts.dateCoverageApprox !== undefined && opts.dateCoverageApprox < 55) {
    out.push("More **dated spend rows** will improve trends and forecasts.");
  }
  if (opts.payrollRows && !opts.spendRows) {
    out.push("Add **spend** to cross-check procurement with payroll signals.");
  }
  if (opts.spendRows && !opts.payrollRows) {
    out.push("Add **payroll** to strengthen workforce risk scoring.");
  }
  return out;
}

export function suggestFollowUps(kind: string, hasSpend: boolean, hasPayroll: boolean): string[] {
  const u = (s: string) => s;
  switch (kind) {
    case "intent_thanks":
    case "intent_help":
    case "intent_upload":
    case "empty":
      return [];
    case "summary_compact":
      return [u("Show departments"), u("Find anomalies"), u("Forecast next quarter")];
    case "suspicious":
    case "suspicious_none":
      return [u("Summarize"), u("Top vendors by spend"), hasPayroll ? u("Payroll anomalies") : u("Upload payroll")];
    case "upload_risks":
      return [u("Open Alerts in app"), u("Summarize"), u("Top vendors")];
    case "dept_ranking":
      return [u("Who overspent most?"), u("What looks suspicious?"), u("Forecast next quarter")];
    case "vendor_review":
    case "vendors":
      return [u("Duplicate payments?"), u("Summarize"), u("Show top risks")];
    case "dups":
    case "no_dups":
      return [u("Which vendors need review?"), u("What looks suspicious?"), u("Summarize")];
    case "forecast":
    case "forecast_missing":
      return [u("Summarize"), u("Payroll anomalies"), u("Top vendors")];
    case "payroll_anoms":
    case "payroll_ok":
      return hasSpend ? [u("Top vendors"), u("What looks suspicious?"), u("Summarize")] : [u("Upload spend"), u("Summarize")];
    case "intent_greeting":
    case "intent_readiness":
    case "intent_ack":
      return hasSpend || hasPayroll ? [u("Summarize"), u("What looks suspicious?")] : [u("How do I upload?")];
    case "chat_conversational":
    case "chat_clarification":
    case "chat_feedback":
      return hasSpend || hasPayroll ? [u("Summarize"), u("Top vendors")] : [u("How do I upload?")];
    case "clarify":
      return [u("Summarize"), u("What looks suspicious?"), u("Forecast next quarter")];
    case "casual_with_scope":
      return [u("Why is payroll high?"), u("Show top vendors"), u("Where are we overspending?")];
    case "finance_engine":
    case "finance_engine_empty":
    case "payroll_cost_explainer":
    case "fix_first":
    case "overspend_locator":
      return [u("What should I fix first?"), u("Show top vendors"), u("Summarize")];
    case "intent_report":
      return [u("Open AI Workspace"), u("Summarize my upload")];
    case "unknown":
      return hasSpend || hasPayroll ? [u("Summarize"), u("What looks suspicious?"), u("Top vendors")] : [u("How do I upload?")];
    case "vendor_spend_rank":
    case "vendor_concentration":
      return [u("Show departments"), u("Find anomalies"), u("Summarize")];
    default:
      return hasSpend || hasPayroll ? [u("Summarize"), u("What looks suspicious?")] : [];
  }
}

export function finishCopilotMessage(
  answer: LocalEngineAnswer,
  opts: {
    profile: OnboardingProfile | null;
    entity: string;
    range?: DateRange;
    pageLabel: string;
    pathname: string;
    recentTurns: CopilotTurn[];
    /** 0–100 rough date fill rate for spend, optional */
    spendDateCoveragePct?: number;
    /** AI Workspace uses concise surface + collapsible metadata. */
    surface?: "workspace" | "inline";
    /** When true, keep industry/role lens in the main answer. */
    wantsDeep?: boolean;
  },
): LocalEngineAnswer {
  const spend = answer.meta.sources.spend;
  const payroll = answer.meta.sources.payroll;
  const hasSpend = Boolean(spend?.rows);
  const hasPayroll = Boolean(payroll?.rows);
  const isWorkspace = opts.surface === "workspace";
  const wantsDeep = Boolean(opts.wantsDeep);

  if (CHAT_SURFACE_KINDS.has(answer.kind)) {
    const followUps = answer.followUps?.length
      ? answer.followUps
      : suggestFollowUps(answer.kind, hasSpend, hasPayroll);
    return {
      ...answer,
      kpis: undefined,
      viz: undefined,
      detailText: isWorkspace ? answer.detailText : undefined,
      meta: {
        ...answer.meta,
        trustNote: undefined,
        dataGaps: [],
        contextLine: undefined,
      },
      followUps: followUps.length ? followUps : undefined,
    };
  }

  const trustNote = buildTrustNote({
    entity: opts.entity,
    range: opts.range,
    spend: spend ?? null,
    payroll: payroll ?? null,
  });

  const dataGaps = suggestDataGaps({
    spendRows: spend?.rows || 0,
    payrollRows: payroll?.rows || 0,
    dateCoverageApprox: opts.spendDateCoveragePct,
  });

  const contextLine =
    !isWorkspace && opts.pageLabel && opts.pathname
      ? `Page **${opts.pageLabel}** — answers follow your analytics scope unless you say otherwise.`
      : undefined;

  const followUps = answer.followUps?.length
    ? answer.followUps
    : suggestFollowUps(answer.kind, hasSpend, hasPayroll);

  const industry =
    ANALYTIC_KINDS.has(answer.kind) ? industryLensForProfile(opts.profile) : null;
  const role = roleHint(opts.profile?.role);

  const lensBlock = [industry, role].filter(Boolean).join("\n\n");

  let text = answer.text;
  let detailText = answer.detailText;

  if (lensBlock && ANALYTIC_KINDS.has(answer.kind)) {
    if (wantsDeep) {
      text = `${answer.text}\n\n${lensBlock}`;
    } else if (isWorkspace) {
      detailText = [answer.detailText, lensBlock].filter(Boolean).join("\n\n");
    } else {
      text = `${answer.text}\n\n${lensBlock}`;
    }
  }

  if (!isWorkspace && detailText) {
    text = `${text}\n\n${detailText}`;
    detailText = undefined;
  }

  return {
    ...answer,
    text,
    detailText,
    meta: {
      ...answer.meta,
      trustNote,
      dataGaps: answer.meta.dataGaps?.length ? answer.meta.dataGaps : dataGaps,
      contextLine,
    },
    followUps: followUps.length ? followUps : undefined,
  };
}
