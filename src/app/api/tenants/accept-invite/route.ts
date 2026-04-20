import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseUser } from "@/lib/supabase/require-user";

const schema = z.object({
  token: z.string().min(8),
});

export async function POST(request: Request) {
  const { user, error } = await requireSupabaseUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const token = parsed.data.token;
  const nowIso = new Date().toISOString();

  const { data: rows, error: qErr } = await supabase
    .from("tenant_invites")
    .select("id, tenant_id, email, role, expires_at, used_at, tenants(name)")
    .eq("token", token)
    .limit(1);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  const inv: any = rows?.[0];
  if (!inv) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (inv.used_at) return NextResponse.json({ error: "Invite already used" }, { status: 409 });
  if (inv.expires_at && String(inv.expires_at) < nowIso) return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  if (inv.email?.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: "Invite email does not match current user" }, { status: 403 });
  }

  // Create membership (RLS should also protect this).
  const { error: mErr } = await supabase.from("tenant_memberships").insert({
    tenant_id: inv.tenant_id,
    user_id: user.id,
    role: inv.role,
  });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Mark invite used.
  const { error: uErr } = await supabase
    .from("tenant_invites")
    .update({ used_at: nowIso })
    .eq("id", inv.id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    tenant: { id: inv.tenant_id, name: inv.tenants?.name || "Tenant" },
    role: inv.role,
  });
}

