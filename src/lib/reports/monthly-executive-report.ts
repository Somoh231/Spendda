import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";
import { buildUploadAnalyticsSnapshot } from "@/lib/workspace/upload-analytics-engine";
import { buildUploadForecastPayload } from "@/lib/workspace/upload-forecast";
import { buildUploadInvestigationFlags, type UploadInvestigationFlag } from "@/lib/workspace/upload-flags";
import { computeUploadDashboardMetrics } from "@/lib/workspace/upload-dashboard-metrics";

export type MonthlyExecutiveAnomalyRow = {
  date: string;
  vendor: string;
  department: string;
  amount: number;
  flags: string;
  invoiceId: string;
};

export type MonthlyExecutiveReport = {
  generatedAt: string;
  periodLabel: string;
  organizationName: string;
  entityLabel: string;
  currency: string;
  /** 1. Board narrative */
  executiveSummary: string[];
  /** 2. KPI block */
  kpis: {
    totalSpend: number;
    payrollMonthly: number;
    flagsCount: number;
    savingsOpportunity: number;
    forecastRiskScore: number;
    healthScore: number;
  };
  /** 3. Spend trends */
  spendTrendsMonthly: { month: string; total: number }[];
  spendTrendsCaption: string;
  departmentRanking: Array<{ name: string; spend: number; pctOfTotal: number }>;
  /** 4. Payroll */
  payrollInsights: string[];
  payrollHighRisk: number;
  payrollMediumRisk: number;
  /** 5. Risk */
  riskFindings: UploadInvestigationFlag[];
  /** 6. Savings */
  savingsOpportunities: string[];
  /** 7. Forecast */
  forecast: {
    budgetShortfall: number;
    retirementWavePct: number;
    payrollGrowthPct: number;
    overspendRiskScore: number;
    nextPeriodText: string;
  };
  /** 8. Actions */
  recommendedActions: string[];
  /** CSV / appendix */
  anomalyRows: MonthlyExecutiveAnomalyRow[];
  sourceFiles: { spend: string | null; payroll: string | null };
};

function filterSpendByRange(rows: SpendTxn[], range: DateRange) {
  return rows.filter((t) => {
    if (!range.from && !range.to) return true;
    if (!t.date) return true;
    if (range.from && t.date < range.from) return false;
    if (range.to && t.date > range.to) return false;
    return true;
  });
}

function healthFromMetrics(flags: number, spendRows: number) {
  const rate = spendRows ? flags / spendRows : 0;
  return Math.max(38, Math.min(96, Math.round(88 - rate * 140 - Math.max(0, rate - 0.15) * 40)));
}

/**
 * Premium monthly / period report content derived only from uploaded workspace datasets.
 */
export function buildMonthlyExecutiveReportFromUpload(opts: {
  organizationName: string;
  entityLabel: string;
  /** Primary entity key for flag ids / rollups (e.g. workspace primary). */
  metricsEntity: string;
  periodLabel: string;
  range: DateRange;
  spendDataset: WorkspaceDataset | null;
  payrollDataset: WorkspaceDataset | null;
}): MonthlyExecutiveReport | null {
  const spendRowsAll = opts.spendDataset?.kind === "spend" ? (opts.spendDataset.rows as SpendTxn[]) : [];
  const payrollRows = opts.payrollDataset?.kind === "payroll" ? (opts.payrollDataset.rows as PayrollRow[]) : [];
  if (!spendRowsAll.length && !payrollRows.length) return null;

  const entity = opts.metricsEntity.trim() || "HQ";
  const metrics = computeUploadDashboardMetrics({
    entity,
    range: opts.range,
    spendRows: spendRowsAll,
    payrollRows,
  });
  if (!metrics) return null;

  const analytics = buildUploadAnalyticsSnapshot({
    entity,
    range: opts.range,
    spendDataset: opts.spendDataset,
    payrollDataset: opts.payrollDataset,
  });
  if (!analytics) return null;

  const fc = buildUploadForecastPayload({
    entity,
    range: opts.range,
    spendDataset: opts.spendDataset,
    payrollDataset: opts.payrollDataset,
  });

  const flags = buildUploadInvestigationFlags({
    entity,
    range: opts.range,
    spendDataset: opts.spendDataset,
    payrollDataset: opts.payrollDataset,
  }).sort((a, b) => b.score - a.score);

  const spendScoped = filterSpendByRange(spendRowsAll, opts.range);
  const anomalyRows: MonthlyExecutiveAnomalyRow[] = spendScoped
    .filter((t) => t.flags?.length)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 500)
    .map((t) => ({
      date: t.date || "—",
      vendor: t.vendor || "",
      department: t.department || "",
      amount: t.amount,
      flags: t.flags.join("; "),
      invoiceId: t.invoiceId || "",
    }));

  const k = metrics.kpis;
  const healthScore = healthFromMetrics(k.flags30d, spendScoped.length);

  const exec: string[] = [];
  exec.push(
    `Reporting period **${opts.periodLabel}** for **${opts.entityLabel}** — figures below are computed from uploaded files, not demo placeholders.`,
  );
  if (analytics.totals.spendRowCount) {
    exec.push(
      `In-scope spend **$${Math.round(analytics.totals.spendPositive).toLocaleString()}** across **${analytics.totals.spendRowCount.toLocaleString()}** rows; **${analytics.totals.flaggedSpendRows.toLocaleString()}** rows carry control flags.`,
    );
  }
  if (analytics.totals.payrollRowCount) {
    exec.push(
      `Payroll: **${analytics.totals.payrollRowCount.toLocaleString()}** employees in file; salary roll-up **$${Math.round(analytics.totals.payrollSalarySum).toLocaleString()}** (mapped columns).`,
    );
  }
  if (analytics.trends.lastMomPct !== null) {
    exec.push(
      `Latest dated month vs prior: **${analytics.trends.lastMomPct >= 0 ? "+" : ""}${analytics.trends.lastMomPct.toFixed(1)}%** spend change.`,
    );
  }
  exec.push(`Vendor concentration: top vendor **${analytics.vendorConcentration.topVendors[0]?.name || "—"}** at **${analytics.vendorConcentration.top1Pct.toFixed(1)}%** of spend.`);

  const payrollHigh = payrollRows.filter((p) => p.risk === "High").length;
  const payrollMed = payrollRows.filter((p) => p.risk === "Medium").length;
  const payrollInsights: string[] = [];
  if (payrollRows.length) {
    payrollInsights.push(
      `**${payrollHigh}** high-risk and **${payrollMed}** medium-risk rows under current heuristics (duplicate bank, inactive-paid, salary spikes).`,
    );
    const byDept = new Map<string, number>();
    payrollRows.forEach((p) => {
      const d = (p.department || "Unassigned").trim() || "Unassigned";
      byDept.set(d, (byDept.get(d) || 0) + 1);
    });
    const top = [...byDept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    payrollInsights.push(`Largest headcount buckets: ${top.map(([n, c]) => `${n} (${c})`).join(" · ")}.`);
  } else {
    payrollInsights.push("No payroll file in scope for this export.");
  }

  const savingsOpportunities: string[] = [
    `Flagged-line exposure (heuristic): **$${Math.round(k.savingsOpportunity30d).toLocaleString()}** — review mapped duplicates, repeats, and large-ticket outliers.`,
  ];
  if (analytics.forecastNext) {
    savingsOpportunities.push(
      `Linear trend on **${analytics.forecastNext.monthsUsed}** monthly buckets implies next-quarter run-rate near **$${Math.round(analytics.forecastNext.avgNext3).toLocaleString()}**/mo (pilot model).`,
    );
  }

  const cards = fc?.forecast.cards ?? {
    budgetShortfall: k.savingsOpportunity30d,
    retirementWavePct: 0,
    payrollGrowthPct: 0,
    overspendRiskScore: k.forecastRiskScore,
  };

  let nextPeriodText = "Not enough dated monthly history for a linear next-period projection.";
  if (analytics.forecastNext) {
    nextPeriodText = `Projected next buckets (linear on uploads): ${analytics.forecastNext.nextMonths.map((m) => `${m.label} $${Math.round(m.projected).toLocaleString()}`).join(" · ")}.`;
  }

  const recommendedActions = [...analytics.recommendations];
  if (flags.filter((f) => f.severity === "High").length) {
    recommendedActions.unshift(
      `Triage **${flags.filter((f) => f.severity === "High").length}** high-severity upload flags in Alerts before month-end close.`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    periodLabel: opts.periodLabel,
    organizationName: opts.organizationName,
    entityLabel: opts.entityLabel,
    currency: fc?.org.currency || "USD",
    executiveSummary: exec,
    kpis: {
      totalSpend: k.totalSpend30d,
      payrollMonthly: k.payrollMonthly,
      flagsCount: k.flags30d,
      savingsOpportunity: k.savingsOpportunity30d,
      forecastRiskScore: k.forecastRiskScore,
      healthScore,
    },
    spendTrendsMonthly: analytics.trends.monthly,
    departmentRanking: analytics.departmentRanking,
    spendTrendsCaption:
      analytics.trends.monthly.length >= 2
        ? "Month-over-month totals from dated spend rows in your analytics range."
        : "Add more dated spend months in range to strengthen trend charts.",
    payrollInsights,
    payrollHighRisk: payrollHigh,
    payrollMediumRisk: payrollMed,
    riskFindings: flags.slice(0, 80),
    savingsOpportunities,
    forecast: {
      budgetShortfall: cards.budgetShortfall,
      retirementWavePct: cards.retirementWavePct,
      payrollGrowthPct: cards.payrollGrowthPct,
      overspendRiskScore: cards.overspendRiskScore,
      nextPeriodText,
    },
    recommendedActions: recommendedActions.slice(0, 12),
    anomalyRows,
    sourceFiles: {
      spend: opts.spendDataset?.kind === "spend" ? opts.spendDataset.filename : null,
      payroll: opts.payrollDataset?.kind === "payroll" ? opts.payrollDataset.filename : null,
    },
  };
}
