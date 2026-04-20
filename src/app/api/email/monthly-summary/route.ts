import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";

const schema = z.object({
  email: z.string().email(),
  enabled: z.boolean().default(true),
});

export async function POST(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const { error } = await supabase.from("tenant_email_subscriptions").upsert(
    {
      tenant_id: ctx.tenant.id,
      user_id: ctx.user.id,
      kind: "monthly_summary",
      email: parsed.data.email,
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,user_id,kind" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const { data, error } = await supabase
    .from("tenant_email_subscriptions")
    .select("email, enabled, updated_at")
    .eq("tenant_id", ctx.tenant.id)
    .eq("user_id", ctx.user.id)
    .eq("kind", "monthly_summary")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subscription: data || null });
}

