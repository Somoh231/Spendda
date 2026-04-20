import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  q: z.string().optional(),
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
  /** In demo this was counties; here we treat it as department scope labels. */
  counties: z.string().optional(),
});

export async function GET(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const { page, pageSize, q, from, to, counties } = parsed.data;
  const needle = (q || "").trim();
  const deptScope = counties
    ? new Set(
        counties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  let query = supabase
    .from("tenant_spend_transactions")
    .select("id,date,vendor,amount,department,category,invoice_id", { count: "exact" })
    .eq("tenant_id", ctx.tenant.id);

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (deptScope && deptScope.size) query = query.in("department", [...deptScope]);
  if (needle) {
    // Supabase OR filters: use ilike across vendor/category/invoice.
    const like = `%${needle.replace(/%/g, "")}%`;
    query = query.or(`vendor.ilike.${like},category.ilike.${like},invoice_id.ilike.${like}`);
  }

  // Newest first (null dates last)
  query = query.order("date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });

  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;
  const { data, error, count } = await query.range(fromIdx, toIdx);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items =
    (data || []).map((t: any) => ({
      id: t.id as string,
      vendorName: (t.vendor as string | null) || "—",
      category: (t.category as string | null) || "—",
      amount: Number(t.amount || 0),
      currency: "USD",
      date: t.date ? String(t.date) : "—",
      invoiceId: (t.invoice_id as string | null) || "—",
      paymentMethod: "—",
    })) || [];

  return NextResponse.json({
    total: count || 0,
    page,
    pageSize,
    items,
  });
}

