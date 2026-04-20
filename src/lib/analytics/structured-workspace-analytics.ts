import type { DateRange } from "@/components/ui/date-range-picker";
import type { SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";
import { buildUploadAnalyticsSnapshot } from "@/lib/workspace/upload-analytics-engine";
import { computeUploadDashboardMetrics } from "@/lib/workspace/upload-dashboard-metrics";

const VERSION = 1 as const;

function filterSpendByRange(rows: SpendTxn[], range: DateRange) {
  return rows.filter((t) => {
    if (!range.from && !range.to) return true;
    if (!t.date) return true;
    if (range.from && t.date < range.from) return false;
    if (range.to && t.date > range.to) return false;
    return true;
  });
}

function monthKey(iso: string) {
  return iso && iso.length >= 7 ? iso.slice(0, 7) : "";
}

function linearForecastNext3(monthly: { month: string; total: number }[]): {
  months: Array<{ monthKey: string; projectedSpend: number }>;
  monthsUsed: number;
} | null {
  const pts = monthly.filter((p) => p.month).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  const n = pts.length;
  if (n < 2) return null;
  const xs = pts.map((_, i) => i + 1);
  const ys = pts.map((p) => p.total);
  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const lastKey = pts[n - 1]!.month;
  const [y0, m0] = lastKey.split("-").map(Number);
  const months: Array<{ monthKey: string; projectedSpend: number }> = [];
  for (let k = 1; k <= 3; k++) {
    const d = new Date(Date.UTC(y0, (m0 || 1) - 1 + k, 1));
    const mk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const x = n + k;
    months.push({ monthKey: mk, projectedSpend: Math.max(0, Math.round(intercept + slope * x)) });
  }
  return { months, monthsUsed: n };
}

function lateMonthSpendLift(spend: SpendTxn[]) {
  const byMonth = new Map<string, { first: number; second: number }>();
  for (const t of spend) {
    if (!t.date || t.amount <= 0) continue;
    const m = monthKey(t.date);
    if (!m) continue;
    const day = Number.parseInt(t.date.slice(8, 10), 10);
    if (!Number.isFinite(day)) continue;
    const cur = byMonth.get(m) || { first: 0, second: 0 };
    if (day <= 15) cur.first += t.amount;
    else cur.second += t.amount;
    byMonth.set(m, cur);
  }
  const rows = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([month, b]) => {
      const ratio = b.first > 0 ? b.second / b.first : null;
      return {
        month,
        spendTotal: b.first + b.second,
        secondHalfToFirstHalfSpendRatio: ratio,
      };
    });
  const avgRatio =
    rows.length > 0
      ? rows.reduce((s, r) => s + (r.secondHalfToFirstHalfSpendRatio ?? 1), 0) / rows.length
      : null;
  return { periods: rows, avgSecondHalfToFirstHalfRatio: avgRatio };
}

export type StructuredWorkspaceAnalyticsOpts = {
  entity: string;
  range: DateRange;
  spendDataset: WorkspaceDataset | null;
  payrollDataset: WorkspaceDataset | null;
};

export type StructuredWorkspaceAnalytics = {
  version: typeof VERSION;
  generatedAt: string;
  entity: string;
  range: { from?: string; to?: string };
  currency: "USD";
  schema: {
    kind: "spend" | "payroll" | "mixed" | "none";
    spendFilename: string | null;
    payrollFilename: string | null;
  };
  totalSpend: {
    amount: number;
    transactionCount: number;
    positiveAmountRowCount: number;
  };
  payrollVsRevenue: {
    payrollCostInScope: number;
    revenueFromUpload: number | null;
    payrollAsPctOfRevenue: number | null;
    annualizedPayrollEstimate: number | null;
    annualizedRevenueEstimate: number | null;
    dataQuality: "high" | "medium" | "low";
    interpretation: string;
  };
  topVendors: Array<{ rank: number; name: string; spend: number; pctOfSpend: number }>;
  duplicateCharges: {
    totalSignals: number;
    duplicateInvoiceCount: number;
    repeatedPaymentCount: number;
    vendorAmountRepeat3PlusCount: number;
    sampleTransactions: Array<{ date: string; vendor: string; amount: number; reason: string }>;
  };
  unusualTransactions: {
    p95Amount: number;
    countAtOrAboveP95: number;
    items: Array<{ date: string; vendor: string; department: string; amount: number }>;
  };
  monthOverMonthTrends: {
    series: Array<{ month: string; spend: number; changePctPriorMonth: number | null }>;
    latestChangePct: number | null;
  };
  departmentRanking: Array<{ rank: number; department: string; spend: number; pctOfTotal: number }>;
  overtimeTrends: {
    definition: string;
    spendLateMonthLift: {
      periods: Array<{
        month: string;
        spendTotal: number;
        secondHalfToFirstHalfSpendRatio: number | null;
      }>;
      avgSecondHalfToFirstHalfRatio: number | null;
    };
    payrollRiskMix: {
      highRiskCount: number;
      mediumRiskCount: number;
      lowRiskCount: number;
      note: string;
    };
  };
  debtPressure: {
    score0to100: number;
    loanPaymentsDetectedInScope: number;
    signals: Array<{ kind: string; severity: "low" | "medium" | "high"; detail: string; amountUsd?: number }>;
  };
  profitability: {
    score0to100: number;
    impliedMarginPct: number | null;
    signals: Array<{ kind: string; detail: string }>;
  };
  forecast90Day: {
    method: string;
    projectedByMonth: Array<{ month: string; projectedSpend: number }>;
    projectedTotalApprox90d: number;
    monthsOfHistoryUsed: number;
    confidenceNote: string;
  };
  costSavingsOpportunities: Array<{
    id: string;
    title: string;
    estimatedImpactUsd: number;
    confidence: "low" | "medium" | "high";
    rationale: string;
  }>;
  /** Compact echo of upload snapshot totals for chat tool payloads. */
  summaryLine: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Structured financial analytics JSON for dashboards, API responses, and AI chat tools.
 * Built only from normalized workspace spend/payroll uploads + date range.
 */
export function buildStructuredWorkspaceAnalytics(
  opts: StructuredWorkspaceAnalyticsOpts,
): StructuredWorkspaceAnalytics | null {
  const snapshot = buildUploadAnalyticsSnapshot(opts);
  if (!snapshot) return null;

  const spendAll = opts.spendDataset?.kind === "spend" ? opts.spendDataset.rows : [];
  const payrollAll = opts.payrollDataset?.kind === "payroll" ? opts.payrollDataset.rows : [];
  const spend = filterSpendByRange(spendAll, opts.range);

  const revenueSum = spend.reduce((s, t) => s + (t.revenue && t.revenue > 0 ? t.revenue : 0), 0);
  const loanSum = spend.reduce((s, t) => s + (t.loanPayment && t.loanPayment > 0 ? t.loanPayment : 0), 0);
  const payrollCost = snapshot.totals.payrollSalarySum;

  const revenueFromUpload = revenueSum > 0 ? revenueSum : null;
  const payrollPctRev =
    revenueFromUpload && revenueFromUpload > 0 ? (100 * payrollCost) / revenueFromUpload : null;

  const distinctMonths = new Set(spend.map((t) => monthKey(t.date)).filter(Boolean)).size;
  const monthCount = Math.max(1, distinctMonths);
  const annualizedPayroll = payrollCost > 0 ? (payrollCost / monthCount) * 12 : null;
  const annualizedRevenue = revenueFromUpload ? (revenueFromUpload / monthCount) * 12 : null;

  let dataQuality: "high" | "medium" | "low" = "low";
  if (revenueFromUpload && snapshot.schema.spendDateCoveragePct >= 70) dataQuality = "high";
  else if (revenueFromUpload || snapshot.schema.spendDateCoveragePct >= 45) dataQuality = "medium";

  const interpretation =
    payrollPctRev != null
      ? `Payroll in scope is ${payrollPctRev.toFixed(1)}% of revenue columns detected in the upload (same date range).`
      : revenueFromUpload == null
        ? "Revenue was not detected on spend rows — payroll % of revenue requires a revenue column or manual revenue input."
        : "Revenue detected but payroll cost is zero in this scope.";

  const dupTotal =
    snapshot.duplicates.duplicateInvoice +
    snapshot.duplicates.repeatedPayment +
    snapshot.duplicates.vendorAmountRepeat3Plus;

  const dupSamples = snapshot.duplicates.samples.map((s) => ({
    date: s.date,
    vendor: s.vendor,
    amount: s.amount,
    reason: s.flags,
  }));

  const momSeries = snapshot.trends.monthly.map((row, i, arr) => {
    const prev = i > 0 ? arr[i - 1]!.total : null;
    const changePctPriorMonth =
      prev !== null && prev > 0 ? ((row.total - prev) / prev) * 100 : null;
    return {
      month: row.month,
      spend: row.total,
      changePctPriorMonth,
    };
  });

  const topVendors = snapshot.vendorConcentration.topVendors.map((v, i) => ({
    rank: i + 1,
    name: v.name,
    spend: v.spend,
    pctOfSpend: v.pct,
  }));

  const deptRank = snapshot.departmentRanking.map((d, i) => ({
    rank: i + 1,
    department: d.name,
    spend: d.spend,
    pctOfTotal: d.pctOfTotal,
  }));

  const lift = lateMonthSpendLift(spend);
  const highR = payrollAll.filter((p) => p.risk === "High").length;
  const medR = payrollAll.filter((p) => p.risk === "Medium").length;
  const lowR = payrollAll.filter((p) => p.risk === "Low").length;

  const vendorTop1 = snapshot.vendorConcentration.top1Pct;
  const dupIntensity = dupTotal / Math.max(1, snapshot.totals.spendRowCount);
  const loanIntensity = loanSum / Math.max(1, snapshot.totals.spendPositive);

  let debtScore = 42;
  debtScore += clamp(vendorTop1 * 0.35, 0, 22);
  debtScore += clamp(dupIntensity * 180, 0, 18);
  debtScore += clamp(loanIntensity * 140, 0, 20);
  debtScore = Math.round(clamp(debtScore, 18, 96));

  const debtSignals: StructuredWorkspaceAnalytics["debtPressure"]["signals"] = [];
  if (loanSum > 0) {
    debtSignals.push({
      kind: "loan_payment_flow",
      severity: loanIntensity >= 0.08 ? "high" : loanIntensity >= 0.03 ? "medium" : "low",
      detail: `Detected loan-style payments totaling $${Math.round(loanSum).toLocaleString()} in scoped spend.`,
      amountUsd: Math.round(loanSum),
    });
  }
  if (vendorTop1 >= 32) {
    debtSignals.push({
      kind: "vendor_concentration",
      severity: vendorTop1 >= 48 ? "high" : "medium",
      detail: `Top vendor concentration is ${vendorTop1.toFixed(1)}% of spend — refinancing and covenant risk often correlate with supplier dependency.`,
    });
  }
  if (dupTotal > 0) {
    debtSignals.push({
      kind: "payment_integrity",
      severity: dupTotal >= 12 ? "medium" : "low",
      detail: `${dupTotal} duplicate / repeat payment signals — operational slippage can cascade into liquidity surprises.`,
    });
  }
  if (!debtSignals.length) {
    debtSignals.push({
      kind: "baseline",
      severity: "low",
      detail: "No strong debt-pressure pattern from uploads alone — continue monitoring concentration and loan flows.",
    });
  }

  const spendNet = snapshot.totals.spendPositive;
  let impliedMargin: number | null = null;
  if (revenueFromUpload && revenueFromUpload > 0) {
    impliedMargin = ((revenueFromUpload - spendNet) / revenueFromUpload) * 100;
  }
  let profitScore = 52;
  if (impliedMargin != null) {
    profitScore += clamp(impliedMargin * 0.9, -28, 38);
  } else {
    profitScore += snapshot.trends.lastMomPct != null && snapshot.trends.lastMomPct < -5 ? -6 : 4;
  }
  profitScore = Math.round(clamp(profitScore, 22, 94));

  const profitSignals: StructuredWorkspaceAnalytics["profitability"]["signals"] = [];
  if (impliedMargin != null) {
    profitSignals.push({
      kind: "upload_implied_margin",
      detail: `Using summed revenue columns vs spend in scope, implied margin is about ${impliedMargin.toFixed(1)}%.`,
    });
  } else {
    profitSignals.push({
      kind: "revenue_missing",
      detail: "Upload lacks reliable revenue totals — profitability view is spend-trend only until revenue is mapped.",
    });
  }
  if (snapshot.trends.lastMomPct != null && Math.abs(snapshot.trends.lastMomPct) >= 12) {
    profitSignals.push({
      kind: "spend_volatility",
      detail: `Latest full month vs prior: ${snapshot.trends.lastMomPct >= 0 ? "+" : ""}${snapshot.trends.lastMomPct.toFixed(1)}% spend change.`,
    });
  }

  const fc =
    linearForecastNext3(snapshot.trends.monthly) ||
    (snapshot.forecastNext
      ? {
          months: snapshot.forecastNext.nextMonths.map((m, i) => ({
            monthKey: `M+${i + 1}`,
            projectedSpend: m.projected,
          })),
          monthsUsed: snapshot.forecastNext.monthsUsed,
        }
      : null);

  const projectedByMonth = fc
    ? fc.months.map((m) => ({ month: m.monthKey, projectedSpend: m.projectedSpend }))
    : [];
  const projectedTotalApprox90d = projectedByMonth.reduce((s, m) => s + m.projectedSpend, 0);
  const monthsUsed = fc?.monthsUsed ?? 0;

  const metrics = computeUploadDashboardMetrics({
    entity: opts.entity,
    range: opts.range,
    spendRows: spendAll,
    payrollRows: payrollAll,
  });

  const savings: StructuredWorkspaceAnalytics["costSavingsOpportunities"] = [];
  if (metrics && metrics.kpis.savingsOpportunity30d > 0) {
    savings.push({
      id: "flagged_spend_review",
      title: "Review flagged spend for recovery / clawback",
      estimatedImpactUsd: Math.round(metrics.kpis.savingsOpportunity30d),
      confidence: "medium",
      rationale: "Sum of spend rows carrying duplicate, repeat, or unusually-large signals in the selected range.",
    });
  }
  if (vendorTop1 >= 30) {
    savings.push({
      id: "vendor_concentration_renegotiation",
      title: "Renegotiate or dual-source top vendor",
      estimatedImpactUsd: Math.round(snapshot.totals.spendPositive * 0.04),
      confidence: "low",
      rationale: `Top vendor is ~${vendorTop1.toFixed(0)}% of addressable spend — typical sourcing resets recover a few points on a fraction of that spend.`,
    });
  }
  if (snapshot.outliers.aboveP95 > 0) {
    savings.push({
      id: "large_ticket_controls",
      title: "Tighten approvals on tail spend above p95",
      estimatedImpactUsd: Math.round(
        snapshot.outliers.top.reduce((s, t) => s + t.amount, 0) * 0.12,
      ),
      confidence: "low",
      rationale: `${snapshot.outliers.aboveP95} transactions at/above the p95 threshold — policy controls often reduce tail bleed without hurting core ops.`,
    });
  }
  if (dupTotal > 0) {
    savings.push({
      id: "duplicate_payment_cleanup",
      title: "Clear duplicate / repeat payment backlog",
      estimatedImpactUsd: Math.round(snapshot.duplicates.samples.reduce((s, x) => s + x.amount, 0)),
      confidence: dupTotal >= 5 ? "medium" : "low",
      rationale: "Duplicate and repeat-payment patterns often recover cash once reconciled against invoices and bank files.",
    });
  }
  if (!savings.length) {
    savings.push({
      id: "monitoring_only",
      title: "Maintain monitoring cadence",
      estimatedImpactUsd: 0,
      confidence: "low",
      rationale: "Limited automated savings signals in this upload slice — keep monthly variance and vendor reviews active.",
    });
  }

  const summaryLine = [
    `Spend $${Math.round(snapshot.totals.spendPositive).toLocaleString()} (${snapshot.totals.spendRowCount} rows)`,
    payrollAll.length ? `Payroll rows ${payrollAll.length}` : null,
    payrollPctRev != null ? `Payroll/Revenue ${payrollPctRev.toFixed(1)}%` : null,
    snapshot.trends.lastMomPct != null
      ? `MoM ${snapshot.trends.lastMomPct >= 0 ? "+" : ""}${snapshot.trends.lastMomPct.toFixed(1)}%`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    version: VERSION,
    generatedAt: snapshot.generatedAt,
    entity: opts.entity,
    range: { from: opts.range.from, to: opts.range.to },
    currency: "USD",
    schema: {
      kind: snapshot.schema.kind,
      spendFilename: snapshot.schema.spendFilename,
      payrollFilename: snapshot.schema.payrollFilename,
    },
    totalSpend: {
      amount: snapshot.totals.spendPositive,
      transactionCount: snapshot.totals.spendRowCount,
      positiveAmountRowCount: spend.filter((t) => t.amount > 0).length,
    },
    payrollVsRevenue: {
      payrollCostInScope: payrollCost,
      revenueFromUpload,
      payrollAsPctOfRevenue: payrollPctRev,
      annualizedPayrollEstimate: annualizedPayroll,
      annualizedRevenueEstimate: annualizedRevenue,
      dataQuality,
      interpretation,
    },
    topVendors,
    duplicateCharges: {
      totalSignals: dupTotal,
      duplicateInvoiceCount: snapshot.duplicates.duplicateInvoice,
      repeatedPaymentCount: snapshot.duplicates.repeatedPayment,
      vendorAmountRepeat3PlusCount: snapshot.duplicates.vendorAmountRepeat3Plus,
      sampleTransactions: dupSamples,
    },
    unusualTransactions: {
      p95Amount: snapshot.outliers.p95,
      countAtOrAboveP95: snapshot.outliers.aboveP95,
      items: snapshot.outliers.top,
    },
    monthOverMonthTrends: {
      series: momSeries,
      latestChangePct: snapshot.trends.lastMomPct,
    },
    departmentRanking: deptRank,
    overtimeTrends: {
      definition:
        "Overtime-style signals are proxied: (1) spend in days 16–31 vs 1–15 of each month, (2) payroll risk mix — uploads do not include true wage overtime hours.",
      spendLateMonthLift: {
        periods: lift.periods,
        avgSecondHalfToFirstHalfRatio: lift.avgSecondHalfToFirstHalfRatio,
      },
      payrollRiskMix: {
        highRiskCount: highR,
        mediumRiskCount: medR,
        lowRiskCount: lowR,
        note: "Payroll risk comes from duplicate names/banks, salary spikes, and inactive-paid heuristics in the upload pipeline.",
      },
    },
    debtPressure: {
      score0to100: debtScore,
      loanPaymentsDetectedInScope: Math.round(loanSum),
      signals: debtSignals,
    },
    profitability: {
      score0to100: profitScore,
      impliedMarginPct: impliedMargin != null ? Math.round(impliedMargin * 10) / 10 : null,
      signals: profitSignals,
    },
    forecast90Day: {
      method: "Trailing linear regression on monthly spend (same as upload snapshot), summed for 3 forward months ≈ 90 days.",
      projectedByMonth,
      projectedTotalApprox90d,
      monthsOfHistoryUsed: monthsUsed,
      confidenceNote:
        monthsUsed >= 6
          ? "Six or more spend months observed — short-horizon linear extrapolation is more stable."
          : monthsUsed >= 3
            ? "Only a few months of history — treat projections as directional, not budget-grade."
            : "Insufficient monthly history — projections are weak and mostly illustrative.",
    },
    costSavingsOpportunities: savings.slice(0, 12),
    summaryLine,
  };
}

/** Full structured JSON for chat “details” / tool payloads (truncated for safety). */
export function structuredAnalyticsToJsonBlock(s: StructuredWorkspaceAnalytics, maxChars = 28000): string {
  const raw = JSON.stringify(s, null, 2);
  const body = raw.length > maxChars ? `${raw.slice(0, maxChars)}\n… (truncated)` : raw;
  return `\`\`\`json\n${body}\n\`\`\``;
}

/**
 * Short markdown grounded only in `structured` — no invented KPIs.
 * `questionLower` nudges ordering when the user’s ask is specific.
 */
export function formatStructuredAnalyticsNarrative(structured: StructuredWorkspaceAnalytics, questionLower: string): string {
  const q = questionLower.toLowerCase();
  const lines: string[] = [];
  const $ = (n: number) => `$${Math.round(n).toLocaleString()}`;

  lines.push(`### Finance snapshot · **${structured.entity}**`);
  lines.push(
    `_Scope: ${structured.range.from || "…"} → ${structured.range.to || "…"} · ${structured.schema.kind} · real upload totals only._`,
  );

  const emphasizePayroll = /\bpayroll\b/.test(q);
  const emphasizeVendor = /\bvendor\b/.test(q);
  const emphasizeOverspend = /\b(overspend|too much|waste|leak|bleed)\b/.test(q);
  const emphasizeFix = /\b(fix|priorit|urgent|first)\b/.test(q);

  if (emphasizePayroll || structured.payrollVsRevenue.payrollCostInScope > 0) {
    const p = structured.payrollVsRevenue;
    lines.push(
      `- **Payroll cost (in scope):** ${$(p.payrollCostInScope)} · rows in payroll file (see sources) · payroll % of detected revenue: **${
        p.payrollAsPctOfRevenue != null ? `${p.payrollAsPctOfRevenue.toFixed(1)}%` : "n/a (no revenue column)"
      }** (${p.dataQuality} data quality).`,
    );
    lines.push(`  - _${p.interpretation}_`);
  }

  lines.push(
    `- **Total spend (mapped, in range):** ${$(structured.totalSpend.amount)} across **${structured.totalSpend.transactionCount.toLocaleString()}** spend rows (**${structured.totalSpend.positiveAmountRowCount.toLocaleString()}** with positive amounts).`,
  );

  if (emphasizeVendor || emphasizeOverspend) {
    const v = structured.topVendors.slice(0, 5);
    if (v.length) {
      lines.push(
        `- **Top vendors:** ${v.map((x) => `**${x.name}** ${$(x.spend)} (${x.pctOfSpend.toFixed(1)}%)`).join(" · ")}`,
      );
    }
  }

  if (emphasizeOverspend || emphasizeFix) {
    const d = structured.departmentRanking.slice(0, 5);
    if (d.length) {
      lines.push(
        `- **Largest department buckets:** ${d.map((x) => `**${x.department}** ${$(x.spend)} (${x.pctOfTotal.toFixed(1)}%)`).join(" · ")}`,
      );
    }
  }

  if (structured.monthOverMonthTrends.latestChangePct != null) {
    const m = structured.monthOverMonthTrends.latestChangePct;
    lines.push(`- **Latest month vs prior (spend):** ${m >= 0 ? "+" : ""}${m.toFixed(1)}%.`);
  }

  lines.push(
    `- **Duplicate / repeat signals:** ${structured.duplicateCharges.totalSignals} (invoice ${structured.duplicateCharges.duplicateInvoiceCount}, repeated payment ${structured.duplicateCharges.repeatedPaymentCount}, vendor+amount≥3 ${structured.duplicateCharges.vendorAmountRepeat3PlusCount}).`,
  );
  lines.push(
    `- **Unusual size (p95):** threshold ${$(structured.unusualTransactions.p95Amount)} · **${structured.unusualTransactions.countAtOrAboveP95}** rows at/above.`,
  );

  lines.push(
    `- **Debt pressure score:** ${structured.debtPressure.score0to100}/100 · loan-like flows in scope **${$(structured.debtPressure.loanPaymentsDetectedInScope)}**.`,
  );
  lines.push(`- **Profitability score:** ${structured.profitability.score0to100}/100 · implied margin **${structured.profitability.impliedMarginPct ?? "n/a"}%**.`);
  lines.push(
    `- **≈90d spend outlook (sum of 3 projected months):** ${$(structured.forecast90Day.projectedTotalApprox90d)} — _${structured.forecast90Day.confidenceNote}_`,
  );

  if (emphasizeFix && structured.costSavingsOpportunities.length) {
    const top = structured.costSavingsOpportunities.filter((c) => c.estimatedImpactUsd > 0).slice(0, 3);
    if (top.length) {
      lines.push(
        `- **Largest automated savings signals (heuristic):** ${top.map((c) => `**${c.title}** (~${$(c.estimatedImpactUsd)}, ${c.confidence})`).join(" · ")}`,
      );
    }
  }

  lines.push(`\n_${structured.summaryLine}_`);
  return lines.join("\n");
}
