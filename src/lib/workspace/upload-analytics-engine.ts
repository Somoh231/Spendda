import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";
import { getDefaultUploadMaps } from "@/lib/upload/workspace-ingest";
import type { CsvRow } from "@/lib/csv";

export type UploadAnalyticsSnapshot = {
  generatedAt: string;
  entity: string;
  range: { from?: string; to?: string };
  /** Inferred from normalized workspace rows (post column-map). */
  schema: {
    kind: "spend" | "payroll" | "mixed" | "none";
    spendFilename: string | null;
    payrollFilename: string | null;
    spendDateCoveragePct: number;
    spendVendorCoveragePct: number;
    spendDeptCoveragePct: number;
    spendAmountPositivePct: number;
  };
  totals: {
    spendPositive: number;
    spendRowCount: number;
    payrollRowCount: number;
    payrollSalarySum: number;
    flaggedSpendRows: number;
    flaggedSpendAmount: number;
  };
  trends: {
    monthly: { month: string; total: number }[];
    lastMomPct: number | null;
  };
  duplicates: {
    duplicateInvoice: number;
    repeatedPayment: number;
    vendorAmountRepeat3Plus: number;
    samples: Array<{ date: string; vendor: string; amount: number; flags: string }>;
  };
  outliers: {
    p95: number;
    aboveP95: number;
    top: Array<{ date: string; vendor: string; department: string; amount: number }>;
  };
  departmentRanking: Array<{ name: string; spend: number; pctOfTotal: number }>;
  vendorConcentration: {
    topVendors: Array<{ name: string; spend: number; pct: number }>;
    top1Pct: number;
    top5Pct: number;
    hhi: number;
  };
  forecastNext: {
    nextMonths: Array<{ label: string; projected: number }>;
    avgNext3: number;
    monthsUsed: number;
  } | null;
  recommendations: string[];
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

function monthKey(iso: string) {
  return iso && iso.length >= 7 ? iso.slice(0, 7) : "";
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function forecastLinear(monthly: Array<{ month: string; total: number }>) {
  const pts = monthly.filter((p) => p.month).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  const n = pts.length;
  if (n < 3) return null;
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
  const next = [n + 1, n + 2, n + 3].map((x) => Math.max(0, intercept + slope * x));
  const avg = next.reduce((s, v) => s + v, 0) / 3;
  return { next, avg, n };
}

function buildRecommendations(a: Omit<UploadAnalyticsSnapshot, "recommendations">): string[] {
  const out: string[] = [];
  const t = a.totals;
  const v = a.vendorConcentration;
  const d = a.duplicates;

  if (t.spendRowCount > 0) {
    if (v.top1Pct >= 35) {
      out.push(
        `Vendor concentration: top vendor is **${v.topVendors[0]?.name || "—"}** at **${v.top1Pct.toFixed(1)}%** of spend — review contract dependency and payment controls.`,
      );
    }
    if (d.duplicateInvoice + d.repeatedPayment > 0) {
      out.push(
        `Duplicate / repeat patterns: **${d.duplicateInvoice}** duplicate-invoice signals and **${d.repeatedPayment}** repeated-payment signals — reconcile references and bank confirmations.`,
      );
    }
    if (a.outliers.aboveP95 > 0) {
      out.push(
        `**${a.outliers.aboveP95}** transactions exceed the **p95** amount (**$${Math.round(a.outliers.p95).toLocaleString()}**) — validate large tickets against approvals.`,
      );
    }
    if (a.schema.spendDateCoveragePct < 50) {
      out.push(
        `Date coverage is **${a.schema.spendDateCoveragePct}%** — improve transaction dates for reliable month-over-month trends and forecasting.`,
      );
    }
    if (a.trends.lastMomPct !== null && Math.abs(a.trends.lastMomPct) >= 15) {
      out.push(
        `Latest month vs prior: **${a.trends.lastMomPct >= 0 ? "+" : ""}${a.trends.lastMomPct.toFixed(1)}%** spend change — investigate drivers in top departments.`,
      );
    }
  }
  if (t.payrollRowCount > 0) {
    out.push("Payroll: reconcile **high**/**medium** risk rows against HR terminations and bank master data before payroll close.");
  }
  if (!out.length) {
    out.push("No strong automated risk signals in this scope — keep monitoring month-over-month and refresh uploads after source-system corrections.");
  }
  return out.slice(0, 8);
}

/**
 * Full analytics derived only from uploaded workspace datasets (normalized rows + date range).
 */
export function buildUploadAnalyticsSnapshot(opts: {
  entity: string;
  range: DateRange;
  spendDataset: WorkspaceDataset | null;
  payrollDataset: WorkspaceDataset | null;
}): UploadAnalyticsSnapshot | null {
  const spendAll = opts.spendDataset?.kind === "spend" ? opts.spendDataset.rows : [];
  const payrollAll = opts.payrollDataset?.kind === "payroll" ? opts.payrollDataset.rows : [];
  if (!spendAll.length && !payrollAll.length) return null;

  const spend = filterSpendByRange(spendAll, opts.range);
  const payroll = payrollAll;

  const spendPositive = spend.filter((t) => t.amount > 0);
  const spendTotal = spendPositive.reduce((s, t) => s + t.amount, 0);
  const nSpend = spend.length;
  const present = (v: string) => (v && v.trim() ? 1 : 0);
  const spendDateCoveragePct = nSpend ? Math.round((100 * spend.reduce((s, t) => s + present(t.date), 0)) / nSpend) : 0;
  const spendVendorCoveragePct = nSpend ? Math.round((100 * spend.reduce((s, t) => s + present(t.vendor), 0)) / nSpend) : 0;
  const spendDeptCoveragePct = nSpend ? Math.round((100 * spend.reduce((s, t) => s + present(t.department), 0)) / nSpend) : 0;
  const spendAmountPositivePct = nSpend ? Math.round((100 * spendPositive.length) / nSpend) : 0;

  const flaggedSpend = spend.filter((t) => t.flags.length > 0);
  const flaggedSpendAmount = flaggedSpend.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);

  const byMonth = new Map<string, number>();
  for (const t of spend) {
    const m = monthKey(t.date);
    if (!m) continue;
    byMonth.set(m, (byMonth.get(m) || 0) + (t.amount > 0 ? t.amount : 0));
  }
  const monthly = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));

  let lastMomPct: number | null = null;
  if (monthly.length >= 2) {
    const a = monthly[monthly.length - 2].total;
    const b = monthly[monthly.length - 1].total;
    if (a > 0) lastMomPct = ((b - a) / a) * 100;
  }

  const dupInv = spend.filter((t) => t.flags.some((f) => f.toLowerCase().includes("duplicate invoice"))).length;
  const repPay = spend.filter((t) => t.flags.some((f) => f.toLowerCase().includes("repeated payment"))).length;
  const keyCounts = new Map<string, number>();
  spend.forEach((t) => {
    if (!t.vendor || t.amount <= 0) return;
    const k = `${normalize(t.vendor)}|${t.amount}`;
    keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
  });
  const vendorAmt3 = spend.filter((t) => {
    if (!t.vendor || t.amount <= 0) return false;
    return (keyCounts.get(`${normalize(t.vendor)}|${t.amount}`) || 0) >= 3;
  }).length;

  const samples = spend
    .filter((t) => t.flags.length)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t) => ({
      date: t.date || "—",
      vendor: t.vendor || "—",
      amount: t.amount,
      flags: t.flags.join("; "),
    }));

  const amounts = spendPositive.map((t) => t.amount).sort((a, b) => a - b);
  const p95 = amounts.length ? amounts[Math.floor(0.95 * (amounts.length - 1))] : 0;
  const aboveP95 = spendPositive.filter((t) => t.amount >= p95 && p95 > 0).length;
  const topOut = spendPositive
    .filter((t) => t.amount >= p95 && p95 > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t) => ({
      date: t.date || "—",
      vendor: t.vendor || "—",
      department: t.department || "—",
      amount: t.amount,
    }));

  const byDept = new Map<string, number>();
  for (const t of spendPositive) {
    const d = (t.department || "Unassigned").trim() || "Unassigned";
    byDept.set(d, (byDept.get(d) || 0) + t.amount);
  }
  const departmentRanking = [...byDept.entries()]
    .map(([name, v]) => ({ name, spend: v, pctOfTotal: spendTotal > 0 ? (100 * v) / spendTotal : 0 }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 15);

  const byVendor = new Map<string, number>();
  for (const t of spendPositive) {
    const v = (t.vendor || "Unknown").trim() || "Unknown";
    byVendor.set(v, (byVendor.get(v) || 0) + t.amount);
  }
  const vendorSorted = [...byVendor.entries()].sort((a, b) => b[1] - a[1]);
  const topVendors = vendorSorted.slice(0, 10).map(([name, v]) => ({
    name,
    spend: v,
    pct: spendTotal > 0 ? (100 * v) / spendTotal : 0,
  }));
  const top1Pct = topVendors[0]?.pct ?? 0;
  const top5Pct = topVendors.slice(0, 5).reduce((s, x) => s + x.pct, 0);
  const hhi =
    spendTotal > 0
      ? Math.round(
          vendorSorted.reduce((s, [, amt]) => {
            const sh = amt / spendTotal;
            return s + sh * sh;
          }, 0) * 10000,
        )
      : 0;

  const fc = forecastLinear(monthly);
  const forecastNext = fc
    ? {
        nextMonths: fc.next.map((projected, i) => ({ label: `M+${i + 1}`, projected: Math.round(projected) })),
        avgNext3: Math.round(fc.avg),
        monthsUsed: fc.n,
      }
    : null;

  const payrollSalarySum = payroll.reduce((s, p) => s + (Number.isFinite(p.salaryCurrent) ? p.salaryCurrent : 0), 0);

  let kind: UploadAnalyticsSnapshot["schema"]["kind"] = "none";
  if (spend.length && payroll.length) kind = "mixed";
  else if (spend.length) kind = "spend";
  else if (payroll.length) kind = "payroll";

  const base: Omit<UploadAnalyticsSnapshot, "recommendations"> = {
    generatedAt: new Date().toISOString(),
    entity: opts.entity,
    range: { from: opts.range.from, to: opts.range.to },
    schema: {
      kind,
      spendFilename: opts.spendDataset?.kind === "spend" ? opts.spendDataset.filename : null,
      payrollFilename: opts.payrollDataset?.kind === "payroll" ? opts.payrollDataset.filename : null,
      spendDateCoveragePct,
      spendVendorCoveragePct,
      spendDeptCoveragePct,
      spendAmountPositivePct,
    },
    totals: {
      spendPositive: spendTotal,
      spendRowCount: spend.length,
      payrollRowCount: payroll.length,
      payrollSalarySum,
      flaggedSpendRows: flaggedSpend.length,
      flaggedSpendAmount: flaggedSpendAmount,
    },
    trends: { monthly, lastMomPct },
    duplicates: {
      duplicateInvoice: dupInv,
      repeatedPayment: repPay,
      vendorAmountRepeat3Plus: vendorAmt3,
      samples,
    },
    outliers: { p95, aboveP95, top: topOut },
    departmentRanking,
    vendorConcentration: { topVendors, top1Pct, top5Pct, hhi },
    forecastNext,
  };

  return {
    ...base,
    recommendations: buildRecommendations(base),
  };
}

/** For raw CSV rows before ingest: column detection + spend/payroll guess (upload UI / validation). */
export function analyzeRawUploadRows(rows: CsvRow[], filename: string) {
  if (!rows.length) return { ok: false as const, error: "No rows" };
  const maps = getDefaultUploadMaps(rows);
  const headers = Object.keys(rows[0] || {});
  return {
    ok: true as const,
    filename,
    inferredKind: maps.kind,
    headers,
    headerCount: headers.length,
    rowCount: rows.length,
  };
}
