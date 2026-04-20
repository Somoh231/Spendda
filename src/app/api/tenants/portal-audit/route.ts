import { NextResponse } from "next/server";
import { z } from "zod";

import type { PortalAuditEntry } from "@/lib/tenants/portal-audit-types";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";

const globalStore = globalThis as typeof globalThis & {
  __spenddaPortalAuditByTenant?: Record<string, PortalAuditEntry[]>;
};

const MAX = 200;

const ALLOWED_ACTIONS = [
  "export.pdf",
  "export.xlsx",
  "export.csv",
  "upload.complete",
  "branding.updated",
  "tenant.activated",
] as const;

const postSchema = z.object({
  action: z.enum(ALLOWED_ACTIONS),
  detail: z.string().max(400).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

function getStore(tenantId: string): PortalAuditEntry[] {
  if (!globalStore.__spenddaPortalAuditByTenant) globalStore.__spenddaPortalAuditByTenant = {};
  if (!globalStore.__spenddaPortalAuditByTenant[tenantId]) globalStore.__spenddaPortalAuditByTenant[tenantId] = [];
  return globalStore.__spenddaPortalAuditByTenant[tenantId];
}

export async function GET() {
  const gate = await requireTenantMembership();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!tenantRoleCan(gate.role, "tenant.audit.read")) {
    return NextResponse.json({ error: "Audit log is limited to Owner or Finance Lead." }, { status: 403 });
  }
  const items = [...getStore(gate.tenant.id)].reverse().slice(0, 100);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const gate = await requireTenantMembership();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const entry: PortalAuditEntry = {
    ts: new Date().toISOString(),
    action: parsed.data.action,
    detail: parsed.data.detail,
    meta: { ...(parsed.data.meta ?? {}), actorId: gate.user.id },
  };
  const store = getStore(gate.tenant.id);
  store.unshift(entry);
  while (store.length > MAX) store.pop();

  return NextResponse.json({ ok: true });
}
