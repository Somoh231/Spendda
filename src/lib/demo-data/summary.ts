import type { DemoDataset, DemoSummary } from "./types";

export type SummaryScope = {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  entities?: string[]; // county names (e.g. Region A)
  departments?: string[]; // department names
};

function isoTodayMinus(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return date.toLocaleString(undefined, { month: "short" });
}

function pctChange(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function buildSummary(dataset: DemoDataset): DemoSummary {
  return buildSummaryScoped(dataset);
}

export function buildSummaryScoped(dataset: DemoDataset, scope: SummaryScope = {}): DemoSummary {
  const cutoff30 = isoTodayMinus(30);
  const from = scope.from || cutoff30;
  const to = scope.to || "9999-12-31";
  const deptScope = scope.departments?.length ? new Set(scope.departments) : null;
  const deptNameById = new Map(dataset.departments.map((d) => [d.id, d.name]));
  const countyNameById = new Map(dataset.counties.map((c) => [c.id, c.name]));
  const countyScope = scope.entities?.length ? new Set(scope.entities) : null;

  const tx30 = dataset.transactions.filter((t) => {
    if (t.date < from || t.date > to) return false;
    if (countyScope) {
      const cname = countyNameById.get(t.countyId) || "";
      if (!countyScope.has(cname)) return false;
    }
    if (!deptScope) return true;
    const name = deptNameById.get(t.departmentId) || "";
    return deptScope.has(name);
  });
  const flags30 = dataset.flags.filter((f) => {
    if (f.date < from || f.date > to) return false;
    if (countyScope) {
      const cname = countyNameById.get(f.countyId) || "";
      if (!countyScope.has(cname)) return false;
    }
    if (!deptScope) return true;
    const name = deptNameById.get(f.departmentId) || "";
    return deptScope.has(name);
  });

  const totalSpend30d = tx30.reduce((acc, t) => acc + t.amount, 0);
  const payrollMonthly = Math.round(
    dataset.employees.reduce((acc, e) => acc + e.baseSalaryMonthly, 0),
  );

  const byMonth = new Map<string, number>();
  // Use scoped transactions so charts respect the selected range/scope.
  tx30.forEach((t) => {
    const k = t.date.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) || 0) + t.amount);
  });
  const monthKeys = [...byMonth.keys()].sort();
  const monthlySpend = monthKeys.slice(-24).map((k) => ({
    month: monthLabel(k),
    value: Math.round(byMonth.get(k) || 0),
  }));

  const deptSpend = new Map<string, number>();
  tx30.forEach((t) => {
    const deptName = deptNameById.get(t.departmentId) || "Department";
    deptSpend.set(deptName, (deptSpend.get(deptName) || 0) + t.amount);
  });
  const departmentSpend30d = [...deptSpend.entries()]
    .map(([department, value]) => ({ department, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const riskBreakdown30d = (["Low", "Medium", "High"] as const).map((sev) => ({
    name: sev,
    value: flags30.filter((f) => f.severity === sev).length,
  }));

  const vendorSpend30 = new Map<string, number>();
  tx30.forEach((t) => {
    vendorSpend30.set(t.vendorId, (vendorSpend30.get(t.vendorId) || 0) + t.amount);
  });

  const prev30Start = isoTodayMinus(60);
  const prev30End = isoTodayMinus(30);
  const txPrev30 = dataset.transactions.filter(
    (t) => t.date >= prev30Start && t.date < prev30End,
  );
  const vendorSpendPrev30 = new Map<string, number>();
  txPrev30.forEach((t) => {
    vendorSpendPrev30.set(
      t.vendorId,
      (vendorSpendPrev30.get(t.vendorId) || 0) + t.amount,
    );
  });

  const totalVendorSpend30 = [...vendorSpend30.values()].reduce((a, b) => a + b, 0);
  const topVendors30d = [...vendorSpend30.entries()]
    .map(([vendorId, spend]) => {
      const vendor = dataset.vendors.find((v) => v.id === vendorId);
      const prev = vendorSpendPrev30.get(vendorId) || 0;
      const share = totalVendorSpend30 > 0 ? spend / totalVendorSpend30 : 0;
      const concentrationRisk: "Low" | "Medium" | "High" =
        share >= 0.15 ? "High" : share >= 0.08 ? "Medium" : "Low";
      return {
        vendorId,
        vendor: vendor?.name || "Vendor",
        spend: Math.round(spend),
        concentrationRisk,
        last30dChangePct: Math.round(pctChange(spend, prev)),
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);

  const recentFlags = flags30
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)
    .map((f) => {
      const entity =
        deptNameById.get(f.departmentId) ||
        "Department";
      return {
        id: f.id,
        title: f.title,
        severity: f.severity,
        entity,
        amount: f.amount,
      };
    });

  const savingsOpportunity30d = Math.round(
    flags30
      .filter((f) => f.ruleId === "TX-001" || f.ruleId === "TX-002")
      .reduce((acc, f) => acc + (typeof f.amount === "number" ? f.amount * 0.6 : 0), 0),
  );

  const riskScore = Math.min(
    92,
    Math.max(
      28,
      Math.round(
        (flags30.filter((f) => f.severity === "High").length * 3.2 +
          flags30.filter((f) => f.severity === "Medium").length * 1.2) /
          2 +
          55,
      ),
    ),
  );

  return {
    kpis: {
      totalSpend30d: Math.round(totalSpend30d),
      payrollMonthly,
      flags30d: flags30.length,
      savingsOpportunity30d,
      forecastRiskScore: riskScore,
    },
    monthlySpend,
    departmentSpend30d,
    riskBreakdown30d,
    topVendors30d,
    recentFlags,
  };
}

