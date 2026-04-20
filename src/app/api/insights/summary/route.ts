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
  return NextResponse.json({ ok: true, tenant: ctx.tenant, range: parsed.data, summary });
}

