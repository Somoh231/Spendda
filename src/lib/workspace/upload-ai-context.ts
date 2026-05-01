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

export type ChatContext = {
  dataSource: string;
  orgType?: string;
  organizationName?: string;
  entity?: string;
  filename?: string;
  rowCount: number;
  totalSpend: number;
  totalPayroll: number;
  payrollRatioPct: number;
  topVendors: string[];
  dateRange: { from: string | null; to: string | null };
  flagCount: number;
  anomalies: string[];
  warnings: string[];
};

export function buildChatContext(opts: {
  dataSource: string;
  spendDataset?: WorkspaceDataset | null;
  payrollDataset?: WorkspaceDataset | null;
  activeDatasetLabel?: string;
  orgType?: string;
  organizationName?: string;
  entity?: string;
}): ChatContext {
  const { dataSource, spendDataset, payrollDataset, orgType, organizationName, entity, activeDatasetLabel } = opts;

  const isUpload = dataSource === "upload";

  if (!isUpload) {
    return {
      dataSource,
      orgType,
      organizationName,
      entity,
      rowCount: 0,
      totalSpend: 0,
      totalPayroll: 0,
      payrollRatioPct: 0,
      topVendors: [],
      dateRange: { from: null, to: null },
      flagCount: 0,
      anomalies: [],
      warnings: [],
    };
  }

  const spendRows =
    spendDataset?.kind === "spend"
      ? (spendDataset.rows as Array<{
          vendor?: string;
          amount?: number;
          date?: string | null;
          flags?: string[];
        }>)
      : [];

  const payrollRows =
    payrollDataset?.kind === "payroll"
      ? (payrollDataset.rows as Array<{
          salaryCurrent?: number;
        }>)
      : [];

  const totalSpend = spendRows.reduce(
    (s, r) => s + (typeof r.amount === "number" && r.amount > 0 ? r.amount : 0),
    0,
  );

  const totalPayroll = payrollRows.reduce(
    (s, r) => s + (typeof r.salaryCurrent === "number" && r.salaryCurrent > 0 ? r.salaryCurrent : 0),
    0,
  );

  const vendorMap = new Map<string, number>();
  for (const r of spendRows) {
    const v = String(r.vendor ?? "").trim();
    const a = typeof r.amount === "number" ? r.amount : 0;
    if (v && a > 0) vendorMap.set(v, (vendorMap.get(v) ?? 0) + a);
  }
  const topVendors = [...vendorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amt]) => `${name} ($${Math.round(amt).toLocaleString()})`);

  const dates = spendRows
    .map((r) => String(r.date ?? "").slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  const flagged = spendRows.filter((r) => Array.isArray(r.flags) && r.flags.length > 0);
  const anomalySet = new Set<string>();
  for (const r of flagged) {
    for (const f of r.flags ?? []) anomalySet.add(String(f));
  }

  const warnings: string[] = [];
  if (topVendors.length === 0)
    warnings.push("No vendor column detected — upload a file with a vendor or payee column");
  if (dates.length === 0) warnings.push("No date column detected — time-based analysis unavailable");

  const filename = activeDatasetLabel?.split("·")[0]?.trim() ?? "uploaded file";

  return {
    dataSource,
    orgType,
    organizationName,
    entity,
    filename,
    rowCount: spendRows.length + payrollRows.length,
    totalSpend,
    totalPayroll,
    payrollRatioPct: totalSpend > 0 ? Math.round((totalPayroll / totalSpend) * 100) : 0,
    topVendors,
    dateRange: {
      from: dates[0] ?? null,
      to: dates[dates.length - 1] ?? null,
    },
    flagCount: flagged.length,
    anomalies: [...anomalySet].slice(0, 5),
    warnings,
  };
}
