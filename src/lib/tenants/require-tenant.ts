import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { CLIENT_COOKIE, decodeClientSession } from "@/lib/auth/client-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseUser } from "@/lib/supabase/require-user";
import { normalizePlanTier } from "@/lib/tenants/subscription";
import { normalizeTenantRole } from "@/lib/tenants/types";

const DEMO_COOKIE = "spendda_demo";
/** Synthetic user id for demo / local sessions (no Supabase JWT). */
export const DEMO_TENANT_USER_ID = "00000000-0000-0000-0000-000000000000";

function demoUser(): User {
  return { id: DEMO_TENANT_USER_ID } as User;
}

export async function requireTenantMembership() {
  const jar = await cookies();
  const isDemo = jar.get(DEMO_COOKIE)?.value === "1";
  const raw = jar.get(CLIENT_COOKIE)?.value || "";
  const client = raw ? decodeClientSession(raw) : null;
  if (!client?.clientId) {
    return { ok: false as const, status: 412 as const, error: "No tenant selected" };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    if (!isDemo) return { ok: false as const, status: 501 as const, error: "Supabase not configured" };
    return {
      ok: true as const,
      user: demoUser(),
      tenant: { id: client.clientId, name: client.clientName },
      role: normalizeTenantRole(client.role) ?? "owner",
      planTier: normalizePlanTier(client.planTier),
    };
  }

  const { user, error } = await requireSupabaseUser();
  if (!user) {
    if (!isDemo) return { ok: false as const, status: 401 as const, error: error ?? "Not authenticated" };
    return {
      ok: true as const,
      user: demoUser(),
      tenant: { id: client.clientId, name: client.clientName },
      role: normalizeTenantRole(client.role) ?? "owner",
      planTier: normalizePlanTier(client.planTier),
    };
  }

  const { data, error: mErr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(id, name)")
    .eq("user_id", user.id)
    .eq("tenant_id", client.clientId)
    .limit(1);

  if (mErr) return { ok: false as const, status: 500 as const, error: mErr.message };
  const row: any = data?.[0];
  if (!row?.tenant_id) return { ok: false as const, status: 403 as const, error: "Not a member of this tenant" };

  const tenantId = row.tenant_id as string;
  const { data: tierRow, error: tierErr } = await supabase
    .from("tenants")
    .select("plan_tier")
    .eq("id", tenantId)
    .maybeSingle();
  const planTier = tierErr
    ? normalizePlanTier(undefined)
    : normalizePlanTier((tierRow as { plan_tier?: string } | null)?.plan_tier);

  return {
    ok: true as const,
    user,
    tenant: { id: tenantId, name: row.tenants?.name || client.clientName || "Tenant" },
    role: normalizeTenantRole(row.role as string) ?? "analyst",
    planTier,
  };
}

