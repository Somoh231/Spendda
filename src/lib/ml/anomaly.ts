import type { DemoDataset, Flag } from "@/lib/demo-data/types";
import { clamp, mean, percentile, sigmoid, std } from "./utils";

export type MlAnomalyKind = "payment" | "payroll" | "spend_spike";

export type MlAnomaly = {
  kind: MlAnomalyKind;
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  score: number; // 0-100
  confidencePct: number; // 0-100
  explain: string[];
  linkedRuleFlags?: Array<{ id: string; ruleId: string; severity: Flag["severity"]; score: number }>;
};

function severityFromScore(score: number): MlAnomaly["severity"] {
  if (score >= 80) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function isoTodayMinus(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

function confidenceFromZ(zAbs: number) {
  // 0 at z=0, ~85 at z=2, ~97 at z=3
  return Math.round(clamp(sigmoid((zAbs - 1) * 2.1) * 100, 18, 99));
}

export function buildMlAnomalies(dataset: DemoDataset, opts?: { lookbackDays?: number }): MlAnomaly[] {
  const lookbackDays = opts?.lookbackDays ?? 30;
  const cutoff = isoTodayMinus(lookbackDays);
  const txRecent = dataset.transactions.filter((t) => t.date >= cutoff);

  // Pre-index rule flags for comparison/links.
  const flagsByEntity = new Map<string, Flag[]>();
  for (const f of dataset.flags) {
    const key = `${f.entityType}:${f.entityId}`;
    const arr = flagsByEntity.get(key) || [];
    arr.push(f);
    flagsByEntity.set(key, arr);
  }

  // --- Payments: vendor-local outlier + repeated amount windows
  const byVendorAmounts = new Map<string, number[]>();
  for (const t of dataset.transactions) {
    const arr = byVendorAmounts.get(t.vendorId) || [];
    arr.push(t.amount);
    byVendorAmounts.set(t.vendorId, arr);
  }
  const vendorStats = new Map<string, { mu: number; sigma: number; p90: number; p95: number }>();
  for (const [vendorId, xs] of byVendorAmounts.entries()) {
    const mu = mean(xs);
    const sigma = std(xs);
    vendorStats.set(vendorId, { mu, sigma, p90: percentile(xs, 0.9), p95: percentile(xs, 0.95) });
  }

  const repeatKeyCounts = new Map<string, number>();
  for (const t of txRecent) {
    const key = `${t.vendorId}|${t.departmentId}|${t.amount}`;
    repeatKeyCounts.set(key, (repeatKeyCounts.get(key) || 0) + 1);
  }

  const paymentAnoms: MlAnomaly[] = [];
  for (const t of txRecent) {
    const s = vendorStats.get(t.vendorId);
    if (!s) continue;
    const z = s.sigma > 0 ? (t.amount - s.mu) / s.sigma : 0;
    const zAbs = Math.abs(z);
    const repeats = repeatKeyCounts.get(`${t.vendorId}|${t.departmentId}|${t.amount}`) || 0;

    const outlierScore = s.p95 > 0 ? clamp(((t.amount / s.p95) - 1) * 55 + zAbs * 12, 0, 100) : clamp(zAbs * 18, 0, 100);
    const repeatScore = repeats >= 3 ? clamp(58 + (repeats - 2) * 12, 0, 100) : 0;
    const score = Math.round(clamp(Math.max(outlierScore, repeatScore), 0, 100));

    // Gate: only keep meaningful findings.
    if (score < 64) continue;

    const explain: string[] = [];
    if (repeats >= 3) explain.push(`Repeated payment pattern: same vendor/department/amount observed ${repeats}x in ${lookbackDays}d.`);
    if (zAbs >= 2) explain.push(`Amount deviates from vendor baseline by z=${z.toFixed(1)} (μ=${Math.round(s.mu).toLocaleString()}, σ=${Math.round(s.sigma).toLocaleString()}).`);
    if (s.p95 > 0) explain.push(`Amount is ${(t.amount / s.p95).toFixed(2)}× vendor p95 (p95≈${Math.round(s.p95).toLocaleString()}).`);

    const linked = (flagsByEntity.get(`transaction:${t.id}`) || [])
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((f) => ({ id: f.id, ruleId: f.ruleId, severity: f.severity, score: f.score }));

    const confidence = Math.round(
      clamp(
        Math.max(
          confidenceFromZ(zAbs),
          repeats >= 3 ? clamp(55 + (repeats - 2) * 10, 0, 96) : 0,
        ),
        24,
        99,
      ),
    );

    paymentAnoms.push({
      kind: "payment",
      id: t.id,
      title: `Payment anomaly — ${t.vendorName}`,
      severity: severityFromScore(score),
      score,
      confidencePct: confidence,
      explain: explain.slice(0, 4),
      linkedRuleFlags: linked.length ? linked : undefined,
    });
  }

  // --- Payroll: duplicate bank accounts (cluster size) + inactive/terminated paid proxy
  const bankCounts = new Map<string, number>();
  dataset.employees.forEach((e) => bankCounts.set(e.bankAccount, (bankCounts.get(e.bankAccount) || 0) + 1));

  const payrollAnoms: MlAnomaly[] = [];
  for (const e of dataset.employees) {
    const c = bankCounts.get(e.bankAccount) || 0;
    const inactivePaidProxy = (e.status === "Inactive" || e.status === "Terminated") && e.baseSalaryMonthly > 0;
    const score = clamp((c > 1 ? 62 + Math.min(30, c * 6) : 0) + (inactivePaidProxy ? 30 : 0), 0, 100);
    if (score < 70) continue;
    const explain: string[] = [];
    if (c > 1) explain.push(`Bank account shared by ${c} employees (cluster).`);
    if (inactivePaidProxy) explain.push(`Employee status is ${e.status} with ongoing payroll amount (proxy signal).`);
    explain.push(`Baseline salary: ${Math.round(e.baseSalaryMonthly).toLocaleString()} per month.`);

    const linked = (flagsByEntity.get(`employee:${e.id}`) || [])
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((f) => ({ id: f.id, ruleId: f.ruleId, severity: f.severity, score: f.score }));

    payrollAnoms.push({
      kind: "payroll",
      id: e.id,
      title: `Payroll integrity anomaly — ${e.fullName}`,
      severity: severityFromScore(score),
      score: Math.round(score),
      confidencePct: Math.round(clamp(72 + Math.min(22, c * 6) + (inactivePaidProxy ? 8 : 0), 35, 99)),
      explain: explain.slice(0, 4),
      linkedRuleFlags: linked.length ? linked : undefined,
    });
  }

  // --- Spend spike: department spend vs peer baseline (30d)
  const deptSpend = new Map<string, number>();
  txRecent.forEach((t) => deptSpend.set(t.departmentId, (deptSpend.get(t.departmentId) || 0) + t.amount));
  const deptValues = [...deptSpend.values()];
  const mu = mean(deptValues);
  const sigma = std(deptValues);

  const spikeAnoms: MlAnomaly[] = [];
  for (const [deptId, spend] of deptSpend.entries()) {
    const z = sigma > 0 ? (spend - mu) / sigma : 0;
    const zAbs = Math.abs(z);
    if (z < 1.9) continue; // only above baseline spikes
    const dept = dataset.departments.find((d) => d.id === deptId);
    const score = Math.round(clamp(62 + zAbs * 12, 0, 100));
    spikeAnoms.push({
      kind: "spend_spike",
      id: deptId,
      title: `Spend spike — ${dept?.name ?? deptId}`,
      severity: severityFromScore(score),
      score,
      confidencePct: confidenceFromZ(zAbs),
      explain: [
        `Department spend is z=${z.toFixed(1)} vs peer departments over ${lookbackDays}d.`,
        `Observed spend: ${Math.round(spend).toLocaleString()} (μ≈${Math.round(mu).toLocaleString()}).`,
      ],
    });
  }

  const all = [...paymentAnoms, ...payrollAnoms, ...spikeAnoms];
  all.sort((a, b) => b.score - a.score);
  return all.slice(0, 220);
}

