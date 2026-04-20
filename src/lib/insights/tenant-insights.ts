import type { SupabaseClient } from "@supabase/supabase-js";

export type InsightsRange = { from?: string; to?: string };

function monthKey(iso: string) {
  return iso && iso.length >= 7 ? iso.slice(0, 7) : "";
}

function toIsoDateOrNull(s: unknown): string | null {
  const v = String(s ?? "").trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function inRange(iso: string | null, r: InsightsRange) {
  if (!iso) return true;
  if (r.from && iso < r.from) return false;
  if (r.to && iso > r.to) return false;
  return true;
}

export async function loadSpendRows(
  supabase: SupabaseClient,
  opts: { tenantId: string; range: InsightsRange; limit?: number },
) {
  let q = supabase
    .from("tenant_spend_transactions")
    .select("date,vendor,amount,department,category,invoice_id,source_upload_id,created_at")
    .eq("tenant_id", opts.tenantId)
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (opts.range.from) q = q.gte("date", opts.range.from);
  if (opts.range.to) q = q.lte("date", opts.range.to);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    date: toIsoDateOrNull(r.date),
    vendor: (r.vendor as string | null) || "",
    amount: typeof r.amount === "number" ? r.amount : r.amount ? Number(r.amount) : 0,
    department: (r.department as string | null) || "",
    category: (r.category as string | null) || "",
    invoiceId: (r.invoice_id as string | null) || "",
    sourceUploadId: (r.source_upload_id as string | null) || "",
  }));
}

export async function loadPayrollRows(
  supabase: SupabaseClient,
  opts: { tenantId: string; range: InsightsRange; limit?: number },
) {
  let q = supabase
    .from("tenant_payroll_rows")
    .select("date,employee,wages,overtime,department,location,source_upload_id,created_at")
    .eq("tenant_id", opts.tenantId)
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (opts.range.from) q = q.gte("date", opts.range.from);
  if (opts.range.to) q = q.lte("date", opts.range.to);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    date: toIsoDateOrNull(r.date),
    employee: (r.employee as string | null) || "",
    wages: typeof r.wages === "number" ? r.wages : r.wages ? Number(r.wages) : 0,
    overtime: typeof r.overtime === "number" ? r.overtime : r.overtime ? Number(r.overtime) : 0,
    department: (r.department as string | null) || "",
    location: (r.location as string | null) || "",
    sourceUploadId: (r.source_upload_id as string | null) || "",
  }));
}

export function computeSummary(spend: ReturnType<typeof normalizeSpend>, payroll: ReturnType<typeof normalizePayroll>) {
  const spendPositive = spend.rows.filter((r) => r.amount > 0);
  const totalSpend = spendPositive.reduce((s, r) => s + r.amount, 0);
  const payrollPositive = payroll.rows.filter((r) => r.wages > 0);
  const totalWages = payrollPositive.reduce((s, r) => s + r.wages, 0);
  return {
    spend: {
      rowCount: spend.rows.length,
      positiveRowCount: spendPositive.length,
      totalPositive: totalSpend,
    },
    payroll: {
      rowCount: payroll.rows.length,
      positiveRowCount: payrollPositive.length,
      totalWages,
      overtimeTotal: payroll.rows.reduce((s, r) => s + (r.overtime || 0), 0),
    },
  };
}

export function computeTopVendors(spend: ReturnType<typeof normalizeSpend>, top = 10) {
  const m = new Map<string, number>();
  const total = spend.rows.reduce((s, r) => s + (r.amount > 0 ? r.amount : 0), 0);
  spend.rows.forEach((r) => {
    const k = r.vendor.trim() || "Unknown";
    if (r.amount > 0) m.set(k, (m.get(k) || 0) + r.amount);
  });
  const ranked = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
  return ranked.map(([name, spendUsd]) => ({ name, spend: spendUsd, pct: total ? (100 * spendUsd) / total : 0 }));
}

export function computeDepartments(spend: ReturnType<typeof normalizeSpend>, top = 12) {
  const m = new Map<string, number>();
  const total = spend.rows.reduce((s, r) => s + (r.amount > 0 ? r.amount : 0), 0);
  spend.rows.forEach((r) => {
    const k = r.department.trim() || "Unassigned";
    if (r.amount > 0) m.set(k, (m.get(k) || 0) + r.amount);
  });
  const ranked = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
  return ranked.map(([name, spendUsd]) => ({ name, spend: spendUsd, pct: total ? (100 * spendUsd) / total : 0 }));
}

export function computeAnomalies(spend: ReturnType<typeof normalizeSpend>) {
  const rows = spend.rows.filter((r) => r.amount > 0);
  const amounts = rows.map((r) => r.amount).sort((a, b) => a - b);
  const p95 = amounts.length ? amounts[Math.floor(0.95 * (amounts.length - 1))] : 0;
  const big = p95
    ? rows
        .filter((r) => r.amount >= p95)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 20)
    : [];

  const dupKeyCounts = new Map<string, number>();
  rows.forEach((r) => {
    const key = `${(r.vendor || "").toLowerCase()}|${(r.invoiceId || "").toLowerCase()}|${r.amount}`;
    if (r.vendor && r.invoiceId) dupKeyCounts.set(key, (dupKeyCounts.get(key) || 0) + 1);
  });
  const dups = rows
    .filter((r) => {
      const key = `${(r.vendor || "").toLowerCase()}|${(r.invoiceId || "").toLowerCase()}|${r.amount}`;
      return (dupKeyCounts.get(key) || 0) >= 2;
    })
    .slice(0, 50);

  return {
    outliers: { p95, aboveP95: big.length, top: big },
    duplicates: { count: dups.length, samples: dups.slice(0, 10) },
  };
}

export function computeForecast(spend: ReturnType<typeof normalizeSpend>) {
  const byMonth = new Map<string, number>();
  spend.rows.forEach((r) => {
    if (!r.date || r.amount <= 0) return;
    const m = monthKey(r.date);
    if (!m) return;
    byMonth.set(m, (byMonth.get(m) || 0) + r.amount);
  });
  const monthly = [...byMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-18);
  if (monthly.length < 3) return { monthly, forecastNext3: null as null | { next: number[]; avg: number } };
  const pts = monthly.slice(-12);
  const n = pts.length;
  const xs = pts.map((_, i) => i + 1);
  const ys = pts.map((p) => p.total);
  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { monthly, forecastNext3: null };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const next = [n + 1, n + 2, n + 3].map((x) => Math.max(0, intercept + slope * x));
  const avg = next.reduce((s, v) => s + v, 0) / 3;
  return { monthly, forecastNext3: { next, avg } };
}

function normalizeSpend(rows: Awaited<ReturnType<typeof loadSpendRows>>, range: InsightsRange) {
  return { rows: rows.filter((r) => inRange(r.date, range)) };
}

function normalizePayroll(rows: Awaited<ReturnType<typeof loadPayrollRows>>, range: InsightsRange) {
  return { rows: rows.filter((r) => inRange(r.date, range)) };
}

export async function buildTenantInsights(supabase: SupabaseClient, opts: { tenantId: string; range: InsightsRange }) {
  const [spendRows, payrollRows] = await Promise.all([
    loadSpendRows(supabase, { tenantId: opts.tenantId, range: opts.range, limit: 120_000 }),
    loadPayrollRows(supabase, { tenantId: opts.tenantId, range: opts.range, limit: 120_000 }),
  ]);
  const spend = normalizeSpend(spendRows, opts.range);
  const payroll = normalizePayroll(payrollRows, opts.range);
  return { spend, payroll };
}

