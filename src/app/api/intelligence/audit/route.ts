import { NextRequest, NextResponse } from "next/server";

import type { IntelligenceAuditEntry } from "@/lib/intelligence/audit-log";
import { CLIENT_COOKIE, decodeClientSession } from "@/lib/auth/client-cookie";

/**
 * Prototype audit log: in-memory per Node process.
 * In serverless multi-instance deployments this is not shared — replace with a durable store (DB / SIEM).
 */
const globalStore = globalThis as typeof globalThis & {
  __spenddaIntelligenceAuditByClient?: Record<string, IntelligenceAuditEntry[]>;
};

const MAX = 200;

function getStore(clientId: string): IntelligenceAuditEntry[] {
  if (!globalStore.__spenddaIntelligenceAuditByClient) globalStore.__spenddaIntelligenceAuditByClient = {};
  if (!globalStore.__spenddaIntelligenceAuditByClient[clientId]) globalStore.__spenddaIntelligenceAuditByClient[clientId] = [];
  return globalStore.__spenddaIntelligenceAuditByClient[clientId];
}

function clientIdFromReq(req?: NextRequest) {
  const raw = req?.cookies.get(CLIENT_COOKIE)?.value;
  const client = raw ? decodeClientSession(raw) : null;
  return client?.clientId || null;
}

export async function GET(req: NextRequest) {
  const clientId = clientIdFromReq(req);
  if (!clientId) return NextResponse.json({ items: [] });
  const items = [...getStore(clientId)].reverse().slice(0, 80);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const clientId = clientIdFromReq(req);
    if (!clientId) return NextResponse.json({ error: "Missing client session" }, { status: 401 });
    const body = (await req.json()) as Partial<IntelligenceAuditEntry>;
    if (!body?.query || !body?.snapshotId) {
      return NextResponse.json({ error: "query and snapshotId required" }, { status: 400 });
    }
    const entry: IntelligenceAuditEntry = {
      ts: body.ts || new Date().toISOString(),
      query: String(body.query),
      snapshotId: String(body.snapshotId),
      signalsUsed: Number(body.signalsUsed ?? 0),
      confidencePct: Number(body.confidencePct ?? 0),
    };
    const store = getStore(clientId);
    store.unshift(entry);
    while (store.length > MAX) store.pop();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
