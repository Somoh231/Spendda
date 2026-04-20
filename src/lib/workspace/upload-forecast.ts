import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, WorkspaceDataset } from "@/lib/upload/dataset-store";
import { computeUploadDashboardMetrics } from "@/lib/workspace/upload-dashboard-metrics";

export type UploadForecastPayload = {
  org: { currency: string };
  forecast: {
    spendVariance: { month: string; value: number }[];
    payrollGrowth: { month: string; value: number }[];
    cards: {
      budgetShortfall: number;
      retirementWavePct: number;
      payrollGrowthPct: number;
      overspendRiskScore: number;
    };
  };
};

function mean(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Only real month buckets from uploads — no synthetic filler (charts may show a single point). */
function realMonthlyOnly(monthly: { month: string; value: number }[]): { month: string; value: number }[] {
  return monthly.filter((m) => m.month && Number.isFinite(m.value));
}

/**
 * Pilot forecast view built only from uploaded datasets (month-over-month spend delta + payroll % heuristics).
 */
export function buildUploadForecastPayload(opts: {
  entity: string;
  range: DateRange;
  spendDataset: WorkspaceDataset | null;
  payrollDataset: WorkspaceDataset | null;
}): UploadForecastPayload | null {
  const spendRows = opts.spendDataset?.kind === "spend" ? opts.spendDataset.rows : undefined;
  const payrollRows = opts.payrollDataset?.kind === "payroll" ? opts.payrollDataset.rows : undefined;
  const metrics = computeUploadDashboardMetrics({
    entity: opts.entity,
    range: opts.range,
    spendRows,
    payrollRows,
  });
  if (!metrics) return null;

  const monthly = realMonthlyOnly(metrics.monthlySpend);

  const spendVariance = monthly.map((p, i) => {
    const prev = i > 0 ? monthly[i - 1].value : p.value;
    return { month: p.month, value: Math.round(p.value - prev) };
  });

  const pr = (payrollRows || []) as PayrollRow[];
  const increases = pr.map((p) => p.salaryIncreasePct).filter((x): x is number => x != null && Number.isFinite(x));
  const payrollGrowthPct = increases.length ? Math.round(mean(increases) * 10) / 10 : 0;

  // Align payroll growth % series to the same months as spend (constant = observed average increase).
  const payrollGrowth = monthly.map((row) => ({
    month: row.month,
    value: Math.round(payrollGrowthPct * 10) / 10,
  }));

  const retirementHint = increases.filter((x) => x > 4);
  const retirementWavePct = retirementHint.length
    ? Math.min(22, Math.round(mean(retirementHint) * 3.2))
    : 0;

  return {
    org: { currency: "USD" },
    forecast: {
      spendVariance,
      payrollGrowth,
      cards: {
        budgetShortfall: Math.round(metrics.kpis.savingsOpportunity30d),
        retirementWavePct,
        payrollGrowthPct,
        overspendRiskScore: metrics.kpis.forecastRiskScore,
      },
    },
  };
}
