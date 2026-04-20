import { NextRequest, NextResponse } from "next/server";

import type { InvestigationRecord } from "@/lib/investigations/storage";
import { CLIENT_COOKIE, decodeClientSession } from "@/lib/auth/client-cookie";

/**
 * Prototype case metadata: in-memory per Node process.
 * Replace with durable storage for production audit workflows.
 */
const globalStore = globalThis as typeof globalThis & {
  __spenddaInvestigationMetaByClient?: Record<string, Record<string, InvestigationRecord>>;
};

function clientIdFromReq(req: NextRequest) {
  const raw = req.cookies.get(CLIENT_COOKIE)?.value;
  const client = raw ? decodeClientSession(raw) : null;
  return client?.clientId || null;
}

function getStore(clientId: string): Record<string, InvestigationRecord> {
  if (!globalStore.__spenddaInvestigationMetaByClient) globalStore.__spenddaInvestigationMetaByClient = {};
  if (!globalStore.__spenddaInvestigationMetaByClient[clientId]) globalStore.__spenddaInvestigationMetaByClient[clientId] = {};
  return globalStore.__spenddaInvestigationMetaByClient[clientId];
}

export async function GET(req: NextRequest) {
  const clientId = clientIdFromReq(req);
  if (!clientId) return NextResponse.json({ meta: {} }, { status: 200 });
  return NextResponse.json({ meta: getStore(clientId) });
}

export async function POST(req: NextRequest) {
  try {
    const clientId = clientIdFromReq(req);
    if (!clientId) return NextResponse.json({ error: "Missing client session" }, { status: 401 });
    const body = (await req.json()) as { meta?: Record<string, InvestigationRecord> };
    if (!body.meta || typeof body.meta !== "object") {
      return NextResponse.json({ error: "meta object required" }, { status: 400 });
    }
    if (!globalStore.__spenddaInvestigationMetaByClient) globalStore.__spenddaInvestigationMetaByClient = {};
    globalStore.__spenddaInvestigationMetaByClient[clientId] = body.meta;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
