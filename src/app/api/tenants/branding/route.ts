import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_TENANT_USER_ID, requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";
import { mergeTenantSettings, tenantBrandingSchema } from "@/lib/tenants/tenant-branding";
import { normalizeTenantRole } from "@/lib/tenants/types";

export async function GET() {
  const gate = await requireTenantMembership();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const supabase = await createSupabaseServerClient();
  let settings: Record<string, unknown> = {};
  if (supabase && gate.user.id !== DEMO_TENANT_USER_ID) {
    const { data, error } = await supabase.from("tenants").select("settings").eq("id", gate.tenant.id).maybeSingle();
    if (!error && data && typeof (data as { settings?: unknown }).settings === "object") {
      const s = (data as { settings?: unknown }).settings;
      if (s && s !== null) settings = { ...(s as Record<string, unknown>) };
    }
  }

  const parsed = tenantBrandingSchema.partial().safeParse(settings);
  return NextResponse.json({
    tenantName: gate.tenant.name,
    planTier: gate.planTier,
    role: normalizeTenantRole(gate.role),
    branding: parsed.success ? parsed.data : {},
  });
}

export async function PATCH(request: Request) {
  const gate = await requireTenantMembership();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!tenantRoleCan(gate.role, "tenant.branding.write")) {
    return NextResponse.json({ error: "Portal branding updates require Owner or Finance Lead." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const patch = tenantBrandingSchema.partial().safeParse(body);
  if (!patch.success) {
    return NextResponse.json({ error: "Invalid request", issues: patch.error.issues }, { status: 400 });
  }

  if (gate.user.id === DEMO_TENANT_USER_ID) {
    const next = mergeTenantSettings({}, patch.data);
    return NextResponse.json({ ok: true, settings: next, demo: true });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const { data: cur, error: readErr } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", gate.tenant.id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  const prev = (cur as { settings?: Record<string, unknown> } | null)?.settings;
  const next = mergeTenantSettings(prev, patch.data);
  const { error } = await supabase.from("tenants").update({ settings: next }).eq("id", gate.tenant.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, settings: next });
}
