import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, SpendTxn } from "@/lib/upload/dataset-store";
import { computeUploadDashboardMetrics } from "@/lib/workspace/upload-dashboard-metrics";

import { rangeDayCount } from "./demo-data";

export type UploadCostSignals = {
  spendInRange: number;
  payrollMonthly: number;
  /** Simple annualization from scoped range length. */
  annualizedVendorSpend: number;
  monthlySpendSeries: { month: string; value: number }[];
  flags30d: number;
  savingsOpportunity30d: number;
  forecastRiskScore: number;
};

export function getUploadCostSignals(opts: {
  entity: string;
  range: DateRange;
  spendRows: SpendTxn[] | null | undefined;
  payrollRows: PayrollRow[] | null | undefined;
}): UploadCostSignals | null {
  const m = computeUploadDashboardMetrics(opts);
  if (!m) return null;
  const days = rangeDayCount(opts.range);
  const annualizedVendorSpend = m.kpis.totalSpend30d * (365 / days);
  return {
    spendInRange: m.kpis.totalSpend30d,
    payrollMonthly: m.kpis.payrollMonthly,
    annualizedVendorSpend,
    monthlySpendSeries: m.monthlySpend,
    flags30d: m.kpis.flags30d,
    savingsOpportunity30d: m.kpis.savingsOpportunity30d,
    forecastRiskScore: m.kpis.forecastRiskScore,
  };
}

export function averageMonthlySpendFromSeries(series: { month: string; value: number }[]): number {
  if (!series.length) return 0;
  const last = series.slice(-3);
  const sum = last.reduce((s, x) => s + x.value, 0);
  return sum / last.length;
}
