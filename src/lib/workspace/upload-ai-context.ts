import type { DateRange } from "@/components/ui/date-range-picker";
import type { WorkspaceDataset } from "@/lib/upload/dataset-store";
import { buildUploadForecastPayload } from "@/lib/workspace/upload-forecast";
import { buildUploadInvestigationFlags } from "@/lib/workspace/upload-flags";
import { buildUploadAnalyticsSnapshot, type UploadAnalyticsSnapshot } from "@/lib/workspace/upload-analytics-engine";

export type UploadPilotSnapshot = {
  dataFingerprint: {
    totalSpend: number;
    totalPayroll: number;
    rowCount: number;
    dateRange: { from: string | null; to: string | null };
    topVendor: { name: string; amount: number } | null;
  };
  forecastCards: {
    budgetShortfall: number;
    retirementWavePct: number;
    payrollGrowthPct: number;
    overspendRiskScore: number;
  } | null;
  alerts: Array<{ severity: string; title: string }>;
  /** Row-level analytics from uploaded datasets (same scope as workspace). */
  analytics: UploadAnalyticsSnapshot | null;
};

/**
 * Compact snapshot so local intelligence can align narrative with Forecasting + Alerts (upload mode).
 */
export function buildUploadPilotSnapshot(opts: {
  dataSource: "upload" | "demo" | "none";
  entity: string;
  range: DateRange;
  spendDataset: WorkspaceDataset | null;
  payrollDataset: WorkspaceDataset | null;
}): UploadPilotSnapshot | null {
  if (opts.dataSource !== "upload") return null;

  const spendRows =
    opts.spendDataset?.kind === "spend" ? (opts.spendDataset.rows as Array<{ amount?: number; vendor?: string; date?: string | null }>) : [];
  const payrollRows =
    opts.payrollDataset?.kind === "payroll" ? (opts.payrollDataset.rows as Array<{ salaryCurrent?: number }>) : [];

  const totalSpend = spendRows.reduce((s, r) => s + (typeof r.amount === "number" ? r.amount : 0), 0);
  const totalPayroll = payrollRows.reduce((s, r) => s + (typeof r.salaryCurrent === "number" ? r.salaryCurrent : 0), 0);
  const rowCount = spendRows.length + payrollRows.length;

  let minDate: string | null = null;
  let maxDate: string | null = null;
  spendRows.forEach((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  });

  const byVendor = new Map<string, number>();
  spendRows.forEach((r) => {
    const name = String(r.vendor || "").trim();
    if (!name) return;
    const amt = typeof r.amount === "number" ? r.amount : 0;
    if (amt <= 0) return;
    byVendor.set(name, (byVendor.get(name) || 0) + amt);
  });
  let topVendor: { name: string; amount: number } | null = null;
  for (const [name, amount] of byVendor.entries()) {
    if (!topVendor || amount > topVendor.amount) topVendor = { name, amount };
  }

  const fc = buildUploadForecastPayload({
    entity: opts.entity,
    range: opts.range,
    spendDataset: opts.spendDataset,
    payrollDataset: opts.payrollDataset,
  });
  const flags = buildUploadInvestigationFlags({
    entity: opts.entity,
    range: opts.range,
    spendDataset: opts.spendDataset,
    payrollDataset: opts.payrollDataset,
  });
  const analytics = buildUploadAnalyticsSnapshot({
    entity: opts.entity,
    range: opts.range,
    spendDataset: opts.spendDataset,
    payrollDataset: opts.payrollDataset,
  });
  return {
    dataFingerprint: {
      totalSpend,
      totalPayroll,
      rowCount,
      dateRange: { from: minDate, to: maxDate },
      topVendor,
    },
    forecastCards: fc?.forecast.cards ?? null,
    alerts: flags.slice(0, 14).map((f) => ({ severity: f.severity, title: f.title })),
    analytics,
  };
}
