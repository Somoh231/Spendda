import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseUser } from "@/lib/supabase/require-user";
import { CLIENT_COOKIE, PORTAL_COOKIE, encodeClientSession } from "@/lib/auth/client-cookie";
import { normalizePlanTier } from "@/lib/tenants/subscription";
import { normalizeTenantRole } from "@/lib/tenants/types";

const schema = z.object({
  tenantId: z.string().min(1),
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

  const tenantId = parsed.data.tenantId;
  const { data, error: qErr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(id, name)")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .limit(1);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  const row: any = data?.[0];
  if (!row?.tenants?.id || !row?.tenants?.name) {
    return NextResponse.json({ error: "Not a member of that tenant" }, { status: 403 });
  }

  const jar = await cookies();
  const role = normalizeTenantRole(row.role as string) ?? "analyst";
  const tenantIdResolved = row.tenants.id as string;
  const { data: tierRow, error: tierErr } = await supabase
    .from("tenants")
    .select("plan_tier")
    .eq("id", tenantIdResolved)
    .maybeSingle();
  const planTier = tierErr ? normalizePlanTier(undefined) : normalizePlanTier((tierRow as { plan_tier?: string } | null)?.plan_tier);
  jar.set(
    CLIENT_COOKIE,
    encodeClientSession({
      clientId: row.tenants.id,
      clientName: row.tenants.name,
      role,
      planTier,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
  // Portal mode simply indicates "tenant portal surface"; keep it on for SaaS users too.
  jar.set(PORTAL_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, tenant: { id: row.tenants.id, name: row.tenants.name }, role: row.role });
}

