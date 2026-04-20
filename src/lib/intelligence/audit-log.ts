const KEY = "spendda_intelligence_audit_v1";
const MAX_LOCAL = 40;

function keyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${KEY}:${id}` : KEY;
}

export type IntelligenceAuditEntry = {
  ts: string;
  query: string;
  snapshotId: string;
  signalsUsed: number;
  confidencePct: number;
};

function mirrorLocal(entry: IntelligenceAuditEntry, clientId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(keyForClient(clientId));
    const prev = raw ? (JSON.parse(raw) as IntelligenceAuditEntry[]) : [];
    const next = [entry, ...prev].slice(0, MAX_LOCAL);
    window.localStorage.setItem(keyForClient(clientId), JSON.stringify(next));
  } catch {
    // ignore
  }
}

function readLocal(clientId?: string | null): IntelligenceAuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyForClient(clientId));
    return raw ? (JSON.parse(raw) as IntelligenceAuditEntry[]) : [];
  } catch {
    return [];
  }
}

/** Append to server audit log and mirror to localStorage (offline / fallback). */
export async function appendIntelligenceAudit(entry: IntelligenceAuditEntry, opts?: { clientId?: string | null }) {
  mirrorLocal(entry, opts?.clientId);
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/intelligence/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`audit POST ${res.status}`);
  } catch {
    // Server unavailable — local mirror already written.
  }
}

/** Prefer server audit log; fall back to local mirror when offline or API errors. */
export async function fetchIntelligenceAudit(opts?: { clientId?: string | null }): Promise<IntelligenceAuditEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/intelligence/audit", { cache: "no-store" });
    if (!res.ok) throw new Error(`audit GET ${res.status}`);
    const j = (await res.json()) as { items?: IntelligenceAuditEntry[] };
    return j.items || [];
  } catch {
    return readLocal(opts?.clientId).slice(0, MAX_LOCAL);
  }
}

/** Synchronous read (local cache only) — use for SSR initial state. */
export function readIntelligenceAudit(opts?: { clientId?: string | null }): IntelligenceAuditEntry[] {
  return readLocal(opts?.clientId);
}
