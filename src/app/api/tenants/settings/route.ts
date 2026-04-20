import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_TENANT_USER_ID, requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";
import {
  mergeOperationalIntoTenantSettings,
  pickOperationalFromSettings,
  tenantOperationalSettingsSchema,
} from "@/lib/tenants/tenant-settings";

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

  return NextResponse.json({
    tenantId: gate.tenant.id,
    operational: pickOperationalFromSettings(settings),
  });
}

export async function PATCH(request: Request) {
  const gate = await requireTenantMembership();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!tenantRoleCan(gate.role, "tenant.settings.write")) {
    return NextResponse.json({ error: "Workspace defaults require Owner or Finance Lead." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const patch = tenantOperationalSettingsSchema.partial().safeParse(body);
  if (!patch.success) {
    return NextResponse.json({ error: "Invalid request", issues: patch.error.issues }, { status: 400 });
  }

  if (gate.user.id === DEMO_TENANT_USER_ID) {
    const next = mergeOperationalIntoTenantSettings({}, patch.data);
    return NextResponse.json({ ok: true, operational: pickOperationalFromSettings(next), demo: true });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const { data: cur, error: readErr } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", gate.tenant.id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  const prev =
    (cur as { settings?: Record<string, unknown> } | null)?.settings &&
    typeof (cur as { settings?: Record<string, unknown> }).settings === "object"
      ? ({ ...(cur as { settings: Record<string, unknown> }).settings } as Record<string, unknown>)
      : {};
  const next = mergeOperationalIntoTenantSettings(prev, patch.data);
  const { error } = await supabase.from("tenants").update({ settings: next }).eq("id", gate.tenant.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, operational: pickOperationalFromSettings(next) });
}
