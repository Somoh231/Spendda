import type { DemoDataset, ForecastOutput } from "./types";

export type ForecastScope = {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  entities?: string[]; // county names
  departments?: string[]; // department names
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthLabelFromKey(key: string) {
  // key: YYYY-MM
  const [y, m] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return date.toLocaleString(undefined, { month: "short" });
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

function addMonthsUTC(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

export function buildForecast(dataset: DemoDataset): ForecastOutput {
  return buildForecastScoped(dataset);
}

export function buildForecastScoped(dataset: DemoDataset, scope: ForecastScope = {}): ForecastOutput {
  const from = scope.from || "0000-01-01";
  const to = scope.to || "9999-12-31";
  const deptScope = scope.departments?.length ? new Set(scope.departments) : null;
  const deptNameById = new Map(dataset.departments.map((d) => [d.id, d.name]));
  const countyNameById = new Map(dataset.counties.map((c) => [c.id, c.name]));
  const countyScope = scope.entities?.length ? new Set(scope.entities) : null;

  // Aggregate monthly spend (24 months).
  const spendByMonth = new Map<string, number>();
  dataset.transactions.forEach((t) => {
    if (t.date < from || t.date > to) return;
    if (countyScope) {
      const cname = countyNameById.get(t.countyId) || "";
      if (!countyScope.has(cname)) return;
    }
    if (deptScope) {
      const name = deptNameById.get(t.departmentId) || "";
      if (!deptScope.has(name)) return;
    }
    const key = t.date.slice(0, 7);
    spendByMonth.set(key, (spendByMonth.get(key) || 0) + t.amount);
  });

  const sortedKeys = [...spendByMonth.keys()].sort();
  const spendSeries = sortedKeys.map((k) => spendByMonth.get(k) || 0);

  const last6 = spendSeries.slice(-6);
  const avg = last6.reduce((a, b) => a + b, 0) / Math.max(1, last6.length);
  const slope =
    last6.length >= 2 ? (last6[last6.length - 1] - last6[0]) / (last6.length - 1) : 0;

  // Build next 6 months variance vs a baseline budget = avg * 0.98.
  const now = new Date();
  const baseMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const budget = avg * 0.98;
  const spendVariance = Array.from({ length: 6 }).map((_, i) => {
    const m = addMonthsUTC(baseMonth, i + 1);
    const projected = avg + slope * (i + 1);
    const variance = budget - projected; // negative = shortfall
    return { month: monthLabelFromKey(monthKey(m)), value: Math.round(variance) };
  });

  // Payroll growth: gentle upward trend.
  const payrollGrowth = Array.from({ length: 6 }).map((_, i) => {
    const m = addMonthsUTC(baseMonth, i + 1);
    const pct = 1.4 + i * 0.25; // %
    return { month: monthLabelFromKey(monthKey(m)), value: Number(pct.toFixed(1)) };
  });

  const budgetShortfall = Math.max(
    0,
    -spendVariance[spendVariance.length - 1].value,
  );
  const retirementWavePct = 9.2;
  const payrollGrowthPct = payrollGrowth[payrollGrowth.length - 1].value;
  const overspendRiskScore = Math.min(
    92,
    Math.max(35, Math.round((budgetShortfall / Math.max(1, budget)) * 260 + 55)),
  );

  return {
    spendVariance,
    payrollGrowth,
    cards: {
      budgetShortfall: Math.round(budgetShortfall),
      retirementWavePct,
      payrollGrowthPct,
      overspendRiskScore,
    },
  };
}

