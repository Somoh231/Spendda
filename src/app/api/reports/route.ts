import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";

const schema = z.object({
  kind: z.string().min(1).max(80),
  title: z.string().min(1).max(140),
  status: z.enum(["Queued", "Generating", "Ready", "Failed"]).default("Ready"),
  rangeFrom: z.string().optional(),
  rangeTo: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!tenantRoleCan(ctx.role, "reports.export")) {
    return NextResponse.json({ error: "Reports export is not permitted for this workspace role." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const v = parsed.data;
  const { data, error } = await supabase
    .from("tenant_reports")
    .insert({
      tenant_id: ctx.tenant.id,
      kind: v.kind,
      title: v.title,
      status: v.status,
      range_from: v.rangeFrom ?? null,
      range_to: v.rangeTo ?? null,
      payload: v.payload ?? {},
      created_by: ctx.user.id,
    })
    .select("id, created_at")
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.[0]?.id, createdAt: data?.[0]?.created_at });
}

