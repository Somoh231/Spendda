import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";

type UsageSnap = { exports: number; uploadBytes: number };

const globalStore = globalThis as typeof globalThis & {
  __spenddaTenantUsage?: Record<string, Record<string, UsageSnap>>;
};

function periodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthMap(tenantId: string): Record<string, UsageSnap> {
  if (!globalStore.__spenddaTenantUsage) globalStore.__spenddaTenantUsage = {};
  if (!globalStore.__spenddaTenantUsage[tenantId]) globalStore.__spenddaTenantUsage[tenantId] = {};
  return globalStore.__spenddaTenantUsage[tenantId];
}

const postSchema = z.object({
  kind: z.enum(["export", "upload"]),
  bytes: z.number().int().nonnegative().optional(),
});

export async function GET() {
  const gate = await requireTenantMembership();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!tenantRoleCan(gate.role, "tenant.usage.read")) {
    return NextResponse.json({ error: "Usage metrics are limited to Owner or Finance Lead." }, { status: 403 });
  }
  const p = periodKey();
  const snap = getMonthMap(gate.tenant.id)[p] ?? { exports: 0, uploadBytes: 0 };
  return NextResponse.json({ period: p, ...snap });
}

export async function POST(request: Request) {
  const gate = await requireTenantMembership();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const p = periodKey();
  const map = getMonthMap(gate.tenant.id);
  const cur = map[p] ?? { exports: 0, uploadBytes: 0 };
  if (parsed.data.kind === "export") cur.exports += 1;
  if (parsed.data.kind === "upload") cur.uploadBytes += parsed.data.bytes ?? 0;
  map[p] = cur;

  return NextResponse.json({ ok: true, period: p, ...cur });
}
