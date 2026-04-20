import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";

const schema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export async function GET(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { data, error } = await supabase
    .from("tenant_reports")
    .select("id, kind, title, status, range_from, range_to, created_at")
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items =
    (data || []).map((r: any) => ({
      id: r.id as string,
      kind: r.kind as string,
      title: r.title as string,
      status: r.status as string,
      rangeFrom: (r.range_from as string | null) || undefined,
      rangeTo: (r.range_to as string | null) || undefined,
      createdAt: r.created_at as string,
    })) || [];

  return NextResponse.json({ ok: true, items });
}

