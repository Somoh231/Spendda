import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseUser } from "@/lib/supabase/require-user";

export async function GET() {
  const { user, error } = await requireSupabaseUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const { data, error: qErr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(id, name)")
    .eq("user_id", user.id);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const tenants =
    (data || [])
      .map((row: any) => ({
        tenantId: row.tenant_id as string,
        role: row.role as string,
        name: row.tenants?.name as string | undefined,
      }))
      .filter((t) => Boolean(t.tenantId) && Boolean(t.name)) || [];

  return NextResponse.json({ tenants });
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
});

export async function POST(request: Request) {
  const { user, error } = await requireSupabaseUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  // Create tenant.
  const { data: tenantRows, error: tErr } = await supabase
    .from("tenants")
    .insert({ name: parsed.data.name })
    .select("id, name")
    .limit(1);

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  const tenant = tenantRows?.[0];
  if (!tenant) return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });

  // Create membership as owner.
  const { error: mErr } = await supabase.from("tenant_memberships").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "owner",
  });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, tenant: { id: tenant.id, name: tenant.name } });
}

