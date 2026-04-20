import { createRng } from "./rng";
import type { DemoDataset, Flag, Transaction } from "./types";

type DatasetBase = Omit<DemoDataset, "flags">;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isoTodayMinus(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

function severityFromScore(score: number): Flag["severity"] {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

export function buildFlags(dataset: DatasetBase, seed: number): Flag[] {
  const rng = createRng(seed ^ 0xa11ce);

  const last30dCutoff = isoTodayMinus(30);
  const txRecent = dataset.transactions.filter((t) => t.date >= last30dCutoff);

  const flags: Flag[] = [];
  let id = 1000;

  // Rule TX-001: Duplicate invoice id (same vendor + invoiceId appears >1)
  const dupKeyCounts = new Map<string, number>();
  for (const t of dataset.transactions) {
    const key = `${t.vendorId}|${t.invoiceId}`;
    dupKeyCounts.set(key, (dupKeyCounts.get(key) || 0) + 1);
  }
  for (const t of txRecent) {
    const key = `${t.vendorId}|${t.invoiceId}`;
    const count = dupKeyCounts.get(key) || 0;
    if (count > 1 && rng.bool(0.95)) {
      const score = clamp(55 + Math.min(35, count * 8), 0, 100);
      flags.push({
        id: `FLAG-${id++}`,
        entityType: "transaction",
        entityId: t.id,
        date: t.date,
        ministryId: t.ministryId,
        countyId: t.countyId,
        departmentId: t.departmentId,
        title: "Duplicate invoice detected",
        ruleId: "TX-001",
        severity: severityFromScore(score),
        score,
        amount: t.amount,
        evidence: {
          invoiceId: t.invoiceId,
          vendor: t.vendorName,
          matches: count,
        },
      });
    }
  }

  // Rule TX-002: Repeated payments (same vendor + dept + amount repeats >=3 in 30d)
  const repeatKeyCounts = new Map<string, number>();
  for (const t of txRecent) {
    const key = `${t.vendorId}|${t.departmentId}|${t.amount}`;
    repeatKeyCounts.set(key, (repeatKeyCounts.get(key) || 0) + 1);
  }
  for (const t of txRecent) {
    const key = `${t.vendorId}|${t.departmentId}|${t.amount}`;
    const count = repeatKeyCounts.get(key) || 0;
    if (count >= 3 && rng.bool(0.9)) {
      const score = clamp(60 + Math.min(35, (count - 2) * 10), 0, 100);
      flags.push({
        id: `FLAG-${id++}`,
        entityType: "transaction",
        entityId: t.id,
        date: t.date,
        ministryId: t.ministryId,
        countyId: t.countyId,
        departmentId: t.departmentId,
        title: "Repeated payment pattern",
        ruleId: "TX-002",
        severity: severityFromScore(score),
        score,
        amount: t.amount,
        evidence: {
          vendor: t.vendorName,
          repeatsLast30d: count,
          amount: t.amount,
        },
      });
    }
  }

  // Rule TX-003: Unusually large transaction vs vendor 90th percentile
  const vendorAmounts = new Map<string, number[]>();
  for (const t of dataset.transactions) {
    const arr = vendorAmounts.get(t.vendorId) || [];
    arr.push(t.amount);
    vendorAmounts.set(t.vendorId, arr);
  }
  const vendorP90 = new Map<string, number>();
  for (const [vendorId, arr] of vendorAmounts.entries()) {
    arr.sort((a, b) => a - b);
    const idx = Math.floor(arr.length * 0.9);
    vendorP90.set(vendorId, arr[Math.min(arr.length - 1, idx)]);
  }
  for (const t of txRecent) {
    const p90 = vendorP90.get(t.vendorId) || 0;
    if (p90 > 0 && t.amount >= p90 * 1.8 && rng.bool(0.85)) {
      const score = clamp(55 + Math.min(45, Math.round((t.amount / p90) * 12)), 0, 100);
      flags.push({
        id: `FLAG-${id++}`,
        entityType: "transaction",
        entityId: t.id,
        date: t.date,
        ministryId: t.ministryId,
        countyId: t.countyId,
        departmentId: t.departmentId,
        title: "Unusual spend spike",
        ruleId: "TX-003",
        severity: severityFromScore(score),
        score,
        amount: t.amount,
        evidence: {
          vendor: t.vendorName,
          vendorP90: p90,
          amount: t.amount,
        },
      });
    }
  }

  // Rule EMP-001: Duplicate bank account among employees (potential ghost/duplicate)
  const bankCounts = new Map<string, number>();
  dataset.employees.forEach((e) => {
    bankCounts.set(e.bankAccount, (bankCounts.get(e.bankAccount) || 0) + 1);
  });
  for (const e of dataset.employees) {
    const c = bankCounts.get(e.bankAccount) || 0;
    if (c > 1 && rng.bool(0.06)) {
      const score = clamp(70 + Math.min(30, c * 8), 0, 100);
      flags.push({
        id: `FLAG-${id++}`,
        entityType: "employee",
        entityId: e.id,
        date: last30dCutoff,
        ministryId: e.ministryId,
        countyId: e.countyId,
        departmentId: e.departmentId,
        title: "Duplicate bank account on payroll",
        ruleId: "EMP-001",
        severity: severityFromScore(score),
        score,
        amount: e.baseSalaryMonthly,
        evidence: {
          bankAccount: e.bankAccount,
          matches: c,
          status: e.status,
        },
      });
    }
  }

  // Cap total flags for UX performance while still looking alive.
  flags.sort((a, b) => (a.date < b.date ? 1 : -1));
  return flags.slice(0, 2200);
}

export function riskScoreForTransaction(
  t: Transaction,
  flagsForTx: Flag[],
): number {
  // Weighted: start with baseline (0-20), add flag scores.
  const base = 8 + Math.min(12, Math.log10(Math.max(10, t.amount)) * 2);
  const add = flagsForTx.reduce((acc, f) => acc + f.score * 0.55, 0);
  return clamp(Math.round(base + add), 0, 100);
}

