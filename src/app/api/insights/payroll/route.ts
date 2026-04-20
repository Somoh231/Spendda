import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import { buildTenantInsights, computeSummary } from "@/lib/insights/tenant-insights";

const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { spend, payroll } = await buildTenantInsights(supabase, { tenantId: ctx.tenant.id, range: parsed.data });
  const summary = computeSummary(spend, payroll);

  // Department rollup for payroll.
  const byDept = new Map<string, { wages: number; overtime: number; rows: number }>();
  payroll.rows.forEach((r) => {
    const k = (r.department || "").trim() || "Unassigned";
    const cur = byDept.get(k) || { wages: 0, overtime: 0, rows: 0 };
    cur.wages += r.wages > 0 ? r.wages : 0;
    cur.overtime += r.overtime > 0 ? r.overtime : 0;
    cur.rows += 1;
    byDept.set(k, cur);
  });
  const departments = [...byDept.entries()]
    .map(([name, v]) => ({ name, wages: v.wages, overtime: v.overtime, rows: v.rows }))
    .sort((a, b) => b.wages - a.wages)
    .slice(0, 12);

  return NextResponse.json({ ok: true, tenant: ctx.tenant, range: parsed.data, payroll: summary.payroll, departments });
}

