import { formatISO } from "date-fns";

export type InvestigationStatus = "New" | "In Review" | "Escalated" | "Closed";

export type InvestigationAuditEvent = {
  at: string;
  action: string;
};

export type InvestigationRecord = {
  owner?: string;
  dueDate?: string;
  status: InvestigationStatus;
  auditLog: InvestigationAuditEvent[];
};

const KEY_V2 = "spendda_investigation_meta_v2";
const KEY_V1 = "spendda_alert_meta_v1";

function keyForClient(base: string, clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${base}:${id}` : base;
}

type LegacyStatus = "Open" | "In progress" | "Resolved";

function migrateStatus(s: InvestigationStatus | LegacyStatus): InvestigationStatus {
  if (s === "Open") return "New";
  if (s === "In progress") return "In Review";
  if (s === "Resolved") return "Closed";
  return s as InvestigationStatus;
}

function appendAudit(rec: InvestigationRecord, action: string): InvestigationRecord {
  return {
    ...rec,
    auditLog: [{ at: formatISO(new Date()), action }, ...rec.auditLog].slice(0, 25),
  };
}

export function loadInvestigations(opts?: { clientId?: string | null }): Record<string, InvestigationRecord> {
  if (typeof window === "undefined") return {};
  try {
    const v2 = window.localStorage.getItem(keyForClient(KEY_V2, opts?.clientId));
    if (v2) return JSON.parse(v2) as Record<string, InvestigationRecord>;

    const v1raw = window.localStorage.getItem(keyForClient(KEY_V1, opts?.clientId));
    if (!v1raw) return {};

    const v1 = JSON.parse(v1raw) as Record<
      string,
      { owner?: string; dueDate?: string; status: LegacyStatus }
    >;
    const migrated: Record<string, InvestigationRecord> = {};
    for (const [id, m] of Object.entries(v1)) {
      migrated[id] = {
        owner: m.owner,
        dueDate: m.dueDate,
        status: migrateStatus(m.status),
        auditLog: [{ at: formatISO(new Date()), action: "Migrated from legacy alert metadata" }],
      };
    }
    window.localStorage.setItem(keyForClient(KEY_V2, opts?.clientId), JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
}

export function saveInvestigations(next: Record<string, InvestigationRecord>, opts?: { clientId?: string | null }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyForClient(KEY_V2, opts?.clientId), JSON.stringify(next));
}

/** Prefer server-backed case metadata; fall back to migrated local v2. */
export async function loadInvestigationsRemote(
  opts?: { clientId?: string | null },
): Promise<Record<string, InvestigationRecord>> {
  if (typeof window === "undefined") return {};
  try {
    const res = await fetch("/api/investigations/meta", { cache: "no-store" });
    if (!res.ok) throw new Error("bad status");
    const j = (await res.json()) as { meta?: Record<string, InvestigationRecord> };
    const remote = j.meta || {};
    if (Object.keys(remote).length > 0) return remote;
  } catch {
    // ignore
  }
  return loadInvestigations(opts);
}

/** Persist to server and mirror to localStorage for resilience. */
export async function persistInvestigationsRemote(
  meta: Record<string, InvestigationRecord>,
  opts?: { clientId?: string | null },
) {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/investigations/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta }),
    });
  } catch {
    // ignore
  }
  saveInvestigations(meta, opts);
}

export function patchInvestigation(
  prev: Record<string, InvestigationRecord>,
  id: string,
  patch: Partial<Pick<InvestigationRecord, "owner" | "dueDate" | "status">> & { auditAction?: string },
): Record<string, InvestigationRecord> {
  const base: InvestigationRecord = prev[id] || {
    status: "New",
    auditLog: [],
  };
  let nextRec: InvestigationRecord = { ...base, ...patch, auditLog: base.auditLog };
  if (patch.auditAction) nextRec = appendAudit(nextRec, patch.auditAction);
  else if (patch.status && patch.status !== base.status) {
    nextRec = appendAudit(nextRec, `Status → ${patch.status}`);
  } else if (patch.owner !== undefined && patch.owner !== base.owner) {
    nextRec = appendAudit(nextRec, `Owner updated`);
  } else if (patch.dueDate !== undefined && patch.dueDate !== base.dueDate) {
    nextRec = appendAudit(nextRec, `Due date updated`);
  }
  return { ...prev, [id]: nextRec };
}
