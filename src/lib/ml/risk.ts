import type { DemoDataset } from "@/lib/demo-data/types";
import { clamp, mean, percentile, std } from "./utils";

export type MlRiskRow = {
  id: string;
  label: string;
  riskScore: number; // 0-100
  confidencePct: number; // 0-100
  drivers: string[];
};

function confidenceFromSignalStrength(s: number) {
  return Math.round(clamp(55 + s * 0.9, 35, 97));
}

export function buildVendorRiskScores(dataset: DemoDataset, opts?: { lookbackDays?: number }): MlRiskRow[] {
  const lookbackDays = opts?.lookbackDays ?? 30;
  const cutoff = new Date(Date.now() - lookbackDays * 86400000).toISOString().slice(0, 10);
  const recent = dataset.transactions.filter((t) => t.date >= cutoff);

  const byVendor = new Map<string, { vendor: string; amounts: number[]; count: number }>();
  for (const t of recent) {
    const cur = byVendor.get(t.vendorId) || { vendor: t.vendorName, amounts: [], count: 0 };
    cur.amounts.push(t.amount);
    cur.count += 1;
    byVendor.set(t.vendorId, cur);
  }

  const totals = [...byVendor.values()].map((v) => v.amounts.reduce((a, b) => a + b, 0));
  const totalMu = mean(totals);
  const totalSigma = std(totals);

  const rows: MlRiskRow[] = [];
  for (const [vendorId, v] of byVendor.entries()) {
    const total = v.amounts.reduce((a, b) => a + b, 0);
    const z = totalSigma > 0 ? (total - totalMu) / totalSigma : 0;
    const p95 = percentile(v.amounts, 0.95);
    const unusual = v.amounts.filter((a) => p95 > 0 && a >= p95).length;

    const base = 35 + Math.max(0, z) * 10;
    const conc = clamp((totalMu > 0 ? (total / (totalMu * 3)) : 0) * 28, 0, 40);
    const spike = clamp((unusual / Math.max(1, v.count)) * 120, 0, 30);

    const risk = Math.round(clamp(base + conc + spike, 0, 100));
    const strength = conc + spike + Math.max(0, z) * 10;
    const drivers: string[] = [
      `Spend share elevated vs peer vendors (z=${z.toFixed(1)}).`,
      `Unusual invoice sizes: ${unusual}/${v.count} ≥ vendor p95.`,
    ];

    rows.push({
      id: vendorId,
      label: v.vendor,
      riskScore: risk,
      confidencePct: confidenceFromSignalStrength(strength),
      drivers: drivers.slice(0, 3),
    });
  }

  rows.sort((a, b) => b.riskScore - a.riskScore);
  return rows.slice(0, 20);
}

export function buildDepartmentRiskScores(dataset: DemoDataset, opts?: { lookbackDays?: number }): MlRiskRow[] {
  const lookbackDays = opts?.lookbackDays ?? 30;
  const cutoff = new Date(Date.now() - lookbackDays * 86400000).toISOString().slice(0, 10);
  const recent = dataset.transactions.filter((t) => t.date >= cutoff);

  const byDept = new Map<string, { name: string; spend: number; tx: number }>();
  for (const t of recent) {
    const d = dataset.departments.find((x) => x.id === t.departmentId);
    const cur = byDept.get(t.departmentId) || { name: d?.name ?? t.departmentId, spend: 0, tx: 0 };
    cur.spend += t.amount;
    cur.tx += 1;
    byDept.set(t.departmentId, cur);
  }

  const spends = [...byDept.values()].map((d) => d.spend);
  const mu = mean(spends);
  const sigma = std(spends);

  const rows: MlRiskRow[] = [];
  for (const [deptId, d] of byDept.entries()) {
    const z = sigma > 0 ? (d.spend - mu) / sigma : 0;
    const velocity = d.tx > 0 ? d.spend / d.tx : 0;
    const risk = Math.round(clamp(38 + Math.max(0, z) * 14 + clamp((velocity / Math.max(1, mu / 60)) * 6, 0, 18), 0, 100));
    const strength = Math.max(0, z) * 20 + Math.min(18, d.tx / 4);
    rows.push({
      id: deptId,
      label: d.name,
      riskScore: risk,
      confidencePct: confidenceFromSignalStrength(strength),
      drivers: [
        `Spend level elevated vs peer departments (z=${z.toFixed(1)}).`,
        `Transaction velocity: ${Math.round(velocity).toLocaleString()} per txn.`,
      ],
    });
  }

  rows.sort((a, b) => b.riskScore - a.riskScore);
  return rows.slice(0, 20);
}

