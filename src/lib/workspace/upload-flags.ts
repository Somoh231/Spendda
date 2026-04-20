import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";

/** Matches investigations / alerts table on `/app/alerts`. */
export type UploadInvestigationFlag = {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  date: string;
  score: number;
  entity: string;
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

function spendSeverity(flags: string[]): "Low" | "Medium" | "High" {
  const u = flags.join(" ").toLowerCase();
  if (u.includes("duplicate") || u.includes("repeated") || u.includes("unusually")) return "High";
  if (flags.length) return "Medium";
  return "Low";
}

function spendScore(amount: number, flags: string[]) {
  const base = 45 + Math.min(35, Math.round(Math.log10(Math.max(amount, 1) + 1) * 18));
  const bump = flags.some((f) => /duplicate|repeated|unusually/i.test(f)) ? 12 : flags.length ? 6 : 0;
  return Math.max(30, Math.min(98, base + bump));
}

function payrollSeverity(row: PayrollRow): "Low" | "Medium" | "High" {
  return row.risk;
}

function payrollScore(row: PayrollRow) {
  const base = row.risk === "High" ? 78 : row.risk === "Medium" ? 62 : 48;
  const bump = Math.min(18, row.signals.length * 4);
  return Math.max(32, Math.min(96, base + bump));
}

/**
 * Build investigation queue rows from uploaded workspace datasets (same heuristics as parsing engine flags).
 */
export function buildUploadInvestigationFlags(opts: {
  entity: string;
  range: DateRange;
  spendDataset: WorkspaceDataset | null;
  payrollDataset: WorkspaceDataset | null;
}): UploadInvestigationFlag[] {
  const entity = opts.entity;
  const spendDs = opts.spendDataset?.kind === "spend" ? opts.spendDataset : null;
  const payrollDs = opts.payrollDataset?.kind === "payroll" ? opts.payrollDataset : null;
  const fallbackDate = (spendDs?.uploadedAt || payrollDs?.uploadedAt || new Date().toISOString()).slice(0, 10);

  const out: UploadInvestigationFlag[] = [];

  if (spendDs) {
    const rows = filterSpendByRange(spendDs.rows as SpendTxn[], opts.range);
    for (const t of rows) {
      if (!t.flags?.length) continue;
      const day = t.date && t.date.length >= 10 ? t.date.slice(0, 10) : fallbackDate;
      const title = `${t.flags.join(" · ")} · ${t.vendor || "Vendor"}${t.invoiceId ? ` · ${t.invoiceId}` : ""}`;
      out.push({
        id: `upload-spend-${entity}-${t.idx}`,
        title,
        severity: spendSeverity(t.flags),
        date: day,
        score: spendScore(t.amount, t.flags),
        entity,
      });
    }
  }

  if (payrollDs) {
    const rows = payrollDs.rows as PayrollRow[];
    for (const p of rows) {
      if (p.risk === "Low" && !p.signals.length) continue;
      const title =
        p.signals.length > 0
          ? `${p.signals.join(" · ")} · ${p.employeeName || "Employee"}`
          : `${p.risk} risk · ${p.employeeName || "Employee"}`;
      out.push({
        id: `upload-payroll-${entity}-${p.idx}`,
        title,
        severity: payrollSeverity(p),
        date: fallbackDate,
        score: payrollScore(p),
        entity,
      });
    }
  }

  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out.slice(0, 200);
}
