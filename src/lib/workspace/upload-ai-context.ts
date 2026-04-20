import type { DateRange } from "@/components/ui/date-range-picker";
import type { WorkspaceDataset } from "@/lib/upload/dataset-store";
import { buildUploadForecastPayload } from "@/lib/workspace/upload-forecast";
import { buildUploadInvestigationFlags } from "@/lib/workspace/upload-flags";
import { buildUploadAnalyticsSnapshot, type UploadAnalyticsSnapshot } from "@/lib/workspace/upload-analytics-engine";

export type UploadPilotSnapshot = {
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
    forecastCards: fc?.forecast.cards ?? null,
    alerts: flags.slice(0, 14).map((f) => ({ severity: f.severity, title: f.title })),
    analytics,
  };
}
