import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";

const rowSchema = z.object({
  employee: z.string().optional(),
  date: z.string().optional(),
  wages: z.number().optional(),
  overtime: z.number().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

const schema = z.object({
  sourceUploadId: z.string().uuid(),
  rows: z.array(rowSchema).min(1).max(2000),
});

function asDate(value?: string) {
  const s = (value || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export async function POST(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!tenantRoleCan(ctx.role, "data.upload")) {
    return NextResponse.json({ error: "Uploads are not permitted for this workspace role." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const insertRows = parsed.data.rows.map((r) => ({
    tenant_id: ctx.tenant.id,
    employee: r.employee?.trim() ? r.employee.trim() : null,
    date: asDate(r.date),
    wages: typeof r.wages === "number" && Number.isFinite(r.wages) ? r.wages : null,
    overtime: typeof r.overtime === "number" && Number.isFinite(r.overtime) ? r.overtime : null,
    department: r.department?.trim() ? r.department.trim() : null,
    location: r.location?.trim() ? r.location.trim() : null,
    source_upload_id: parsed.data.sourceUploadId,
  }));

  const { error } = await supabase.from("tenant_payroll_rows").insert(insertRows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: insertRows.length });
}

