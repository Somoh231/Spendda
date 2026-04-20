import type { CsvRow } from "@/lib/csv";
import { emitWorkspaceDataChanged } from "@/lib/workspace/workspace-events";

export type SpendTxn = {
  kind: "spend";
  idx: number;
  date: string; // ISO date (YYYY-MM-DD) when possible
  vendor: string;
  department: string;
  category: string;
  invoiceId: string;
  amount: number;
  flags: string[];
  /** Auto-detected from upload when present (same row as spend). */
  revenue?: number;
  payrollExpense?: number;
  loanPayment?: number;
  employee?: string;
};

export type PayrollRow = {
  kind: "payroll";
  idx: number;
  employeeName: string;
  department: string;
  bankAccount: string;
  status: string;
  salaryCurrent: number;
  salaryIncreasePct: number | null;
  risk: "Low" | "Medium" | "High";
  signals: string[];
  /** Loan / garnishment style deductions when a column is detected. */
  loanPayment?: number;
};

export type WorkspaceDataset =
  | {
      kind: "spend";
      filename: string;
      uploadedAt: string;
      entity: string;
      rows: SpendTxn[];
    }
  | {
      kind: "payroll";
      filename: string;
      uploadedAt: string;
      entity: string;
      rows: PayrollRow[];
    };

const KEY = "spendda_workspace_datasets_v1";

/** Workspace uploads are partitioned by tenant (`clientId` from session). */
function keyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${KEY}:${id}` : KEY;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getWorkspaceDatasets(clientId?: string | null): WorkspaceDataset[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<WorkspaceDataset[]>(window.localStorage.getItem(keyForClient(clientId)));
  return Array.isArray(parsed) ? parsed : [];
}

export function getWorkspaceDataset(opts: { clientId?: string | null; entity: string; kind: "spend" | "payroll" }) {
  const all = getWorkspaceDatasets(opts.clientId);
  return all.find((d) => d.kind === opts.kind && d.entity === opts.entity) || null;
}

export function upsertWorkspaceDataset(next: WorkspaceDataset, clientId?: string | null) {
  if (typeof window === "undefined") return;
  const key = keyForClient(clientId);
  const existing = getWorkspaceDatasets(clientId);
  const filtered = existing.filter((d) => !(d.kind === next.kind && d.entity === next.entity));
  // Keep small enough for localStorage pilots; store recent 4.
  const merged = [next, ...filtered].slice(0, 4);
  window.localStorage.setItem(key, JSON.stringify(merged));
  emitWorkspaceDataChanged();
}

export function removeWorkspaceDataset(opts: { clientId?: string | null; entity: string; kind: "spend" | "payroll" }) {
  if (typeof window === "undefined") return;
  const key = keyForClient(opts.clientId);
  const existing = getWorkspaceDatasets(opts.clientId);
  const merged = existing.filter((d) => !(d.kind === opts.kind && d.entity === opts.entity));
  window.localStorage.setItem(key, JSON.stringify(merged));
  emitWorkspaceDataChanged();
}

export function estimateDatasetSizeBytes(rows: CsvRow[]) {
  try {
    return new TextEncoder().encode(JSON.stringify(rows.slice(0, 50))).length * Math.max(1, rows.length / 50);
  } catch {
    return rows.length * 400;
  }
}

