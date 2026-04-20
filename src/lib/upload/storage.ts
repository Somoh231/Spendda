import { emitWorkspaceDataChanged } from "@/lib/workspace/workspace-events";

export type UploadedSpendInsights = {
  kind: "spend";
  entity: string;
  filename: string;
  uploadedAt: string;
  totalTransactions: number;
  totalSpend: number;
  flaggedCount: number;
  repeatedCount: number;
  unusualCount: number;
  topVendor?: string;
  topDepartment?: string;
};

export type UploadedPayrollInsights = {
  kind: "payroll";
  entity: string;
  filename: string;
  uploadedAt: string;
  totalEmployees: number;
  highRisk: number;
  mediumRisk: number;
  duplicateBankSignals: number;
  inactivePaidSignals: number;
  salarySpikeSignals: number;
  topDepartment?: string;
};

export type UploadedInsights = UploadedSpendInsights | UploadedPayrollInsights;

const KEY = "spendda_uploaded_insights_v1";

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

export function getUploadedInsights(clientId?: string | null): UploadedInsights[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<UploadedInsights[]>(window.localStorage.getItem(keyForClient(clientId)));
  return Array.isArray(parsed) ? parsed : [];
}

export function getUploadedInsightsForEntity(entity: string, clientId?: string | null): UploadedInsights[] {
  return getUploadedInsights(clientId).filter((x) => x.entity === entity);
}

export function getUploadedInsight(
  entity: string,
  kind: UploadedInsights["kind"],
  clientId?: string | null,
) {
  return getUploadedInsights(clientId).find((x) => x.entity === entity && x.kind === kind) || null;
}

export function upsertUploadedInsights(next: UploadedInsights, clientId?: string | null) {
  if (typeof window === "undefined") return;
  const key = keyForClient(clientId);
  const existing = getUploadedInsights(clientId);
  const filtered = existing.filter((x) => !(x.kind === next.kind && x.entity === next.entity));
  const merged = [next, ...filtered].slice(0, 5);
  window.localStorage.setItem(key, JSON.stringify(merged));
  emitWorkspaceDataChanged();
}

export function removeUploadedInsight(opts: {
  clientId?: string | null;
  entity: string;
  kind: UploadedInsights["kind"];
}) {
  if (typeof window === "undefined") return;
  const key = keyForClient(opts.clientId);
  const existing = getUploadedInsights(opts.clientId);
  const merged = existing.filter((x) => !(x.kind === opts.kind && x.entity === opts.entity));
  window.localStorage.setItem(key, JSON.stringify(merged));
  emitWorkspaceDataChanged();
}

/** Append-only log for upload hub (persists after current workspace rows are removed). */
export type UploadHistoryEntry = {
  id: string;
  entity: string;
  kind: "spend" | "payroll";
  filename: string;
  rowCount: number;
  columnCount: number;
  uploadedAt: string;
};

const HISTORY_KEY = "spendda_upload_history_v1";

function historyKeyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${HISTORY_KEY}:${id}` : HISTORY_KEY;
}

export function getUploadHistory(clientId?: string | null): UploadHistoryEntry[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<UploadHistoryEntry[]>(window.localStorage.getItem(historyKeyForClient(clientId)));
  return Array.isArray(parsed) ? parsed : [];
}

export function appendUploadHistory(entry: UploadHistoryEntry, clientId?: string | null) {
  if (typeof window === "undefined") return;
  const key = historyKeyForClient(clientId);
  const prev = getUploadHistory(clientId);
  const merged = [entry, ...prev.filter((x) => x.id !== entry.id)].slice(0, 40);
  window.localStorage.setItem(key, JSON.stringify(merged));
  emitWorkspaceDataChanged();
}

