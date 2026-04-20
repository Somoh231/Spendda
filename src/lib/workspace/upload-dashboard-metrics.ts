import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, SpendTxn } from "@/lib/upload/dataset-store";

export type UploadDashboardKpis = {
  totalSpend30d: number;
  payrollMonthly: number;
  flags30d: number;
  savingsOpportunity30d: number;
  forecastRiskScore: number;
};

export type UploadDashboardFlag = {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  entity: string;
  amount?: number;
};

export type UploadDashboardMetrics = {
  kpis: UploadDashboardKpis;
  monthlySpend: { month: string; value: number }[];
  departmentSpend30d: { department: string; value: number }[];
  riskBreakdown30d: { name: "Low" | "Medium" | "High"; value: number }[];
  recentFlags: UploadDashboardFlag[];
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

function flagSeverity(flags: string[]): "Low" | "Medium" | "High" {
  const f = flags.join(" ").toLowerCase();
  if (f.includes("unusually") || f.includes("duplicate") || f.includes("repeated")) return "High";
  if (flags.length) return "Medium";
  return "Low";
}

/**
 * KPIs and rollups derived only from uploaded spend/payroll rows and the analytics date range.
 */
export function computeUploadDashboardMetrics(opts: {
  entity: string;
  range: DateRange;
  spendRows: SpendTxn[] | null | undefined;
  payrollRows: PayrollRow[] | null | undefined;
}): UploadDashboardMetrics | null {
  const spendAll = opts.spendRows || [];
  const payrollAll = opts.payrollRows || [];
  if (!spendAll.length && !payrollAll.length) return null;

  const spend = filterSpendByRange(spendAll, opts.range);

  const totalSpend = spend.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);
  const flaggedSpend = spend.filter((t) => t.flags.length > 0);
  const flags30d = flaggedSpend.length;

  const savingsOpportunity = spend.reduce((s, t) => {
    if (!t.flags.length) return s;
    const risky = t.flags.some((x) => {
      const u = x.toLowerCase();
      return u.includes("duplicate") || u.includes("repeated") || u.includes("unusually");
    });
    return risky && t.amount > 0 ? s + t.amount : s;
  }, 0);

  const payrollMonthly = payrollAll.reduce((s, p) => s + (Number.isFinite(p.salaryCurrent) ? p.salaryCurrent : 0), 0);

  const highR = payrollAll.filter((p) => p.risk === "High").length;
  const medR = payrollAll.filter((p) => p.risk === "Medium").length;
  const lowR = payrollAll.filter((p) => p.risk === "Low").length;

  const flagRate = spend.length ? flags30d / spend.length : 0;
  const payrollRiskRate = payrollAll.length ? highR / payrollAll.length : 0;
  const forecastRiskScore = Math.max(
    38,
    Math.min(
      94,
      Math.round(52 + flagRate * 110 + payrollRiskRate * 70 + (savingsOpportunity > 0 ? 6 : 0)),
    ),
  );

  const byMonth = new Map<string, number>();
  for (const t of spend) {
    const m = monthKey(t.date);
    if (!m) continue;
    byMonth.set(m, (byMonth.get(m) || 0) + (t.amount > 0 ? t.amount : 0));
  }
  const monthlySpend = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({ month, value }));

  const byDept = new Map<string, number>();
  for (const t of spend) {
    const d = (t.department || "Unassigned").trim() || "Unassigned";
    byDept.set(d, (byDept.get(d) || 0) + (t.amount > 0 ? t.amount : 0));
  }
  const departmentSpend30d = [...byDept.entries()]
    .map(([department, value]) => ({ department, value }))
    .sort((a, b) => b.value - a.value);

  const riskBreakdown30d: UploadDashboardMetrics["riskBreakdown30d"] = [
    { name: "High", value: highR },
    { name: "Medium", value: medR },
    { name: "Low", value: lowR },
  ];

  const recentFlags: UploadDashboardFlag[] = flaggedSpend.slice(0, 12).map((t) => ({
    id: `upload-spend-${t.idx}`,
    title: `${t.flags[0] || "Flagged"} · ${t.vendor || "Vendor"}`,
    severity: flagSeverity(t.flags),
    entity: opts.entity,
    amount: t.amount > 0 ? t.amount : undefined,
  }));

  for (const p of payrollAll.filter((p) => p.risk !== "Low" || p.signals.length).slice(0, 8)) {
    recentFlags.push({
      id: `upload-payroll-${p.idx}`,
      title: `${p.risk} risk · ${p.employeeName || "Employee"}${p.signals[0] ? ` · ${p.signals[0]}` : ""}`,
      severity: p.risk,
      entity: opts.entity,
      amount: p.salaryCurrent > 0 ? p.salaryCurrent : undefined,
    });
  }

  return {
    kpis: {
      totalSpend30d: totalSpend,
      payrollMonthly,
      flags30d,
      savingsOpportunity30d: savingsOpportunity,
      forecastRiskScore,
    },
    monthlySpend,
    departmentSpend30d,
    riskBreakdown30d,
    recentFlags,
  };
}
