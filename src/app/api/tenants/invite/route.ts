import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseUser } from "@/lib/supabase/require-user";
import { tenantDbRoleCanInvite } from "@/lib/tenants/types";

const schema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  /** Stored on invite / membership; legacy values mapped at insert. */
  role: z.enum(["finance_lead", "analyst", "viewer", "admin", "member"]).default("analyst"),
});

function inviteRoleForDb(role: string): string {
  switch (role) {
    case "finance_lead":
      return "finance_lead";
    case "analyst":
      return "analyst";
    case "viewer":
      return "viewer";
    case "admin":
      return "finance_lead";
    case "member":
      return "analyst";
    default:
      return "analyst";
  }
}

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

  // Ensure inviter is admin/owner in that tenant.
  const { data: mem, error: mErr } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", parsed.data.tenantId)
    .eq("user_id", user.id)
    .limit(1);
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  const inviterRole = mem?.[0]?.role as string | undefined;
  if (!tenantDbRoleCanInvite(inviterRole)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error: iErr } = await supabase
    .from("tenant_invites")
    .insert({
      tenant_id: parsed.data.tenantId,
      email: parsed.data.email.toLowerCase(),
      role: inviteRoleForDb(parsed.data.role),
      token,
      expires_at: expiresAt,
    })
    .select("id, token, expires_at")
    .limit(1);

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  const invite = rows?.[0];
  if (!invite) return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      token: invite.token,
      expiresAt: invite.expires_at,
      acceptPath: `/app/accept-invite?token=${encodeURIComponent(invite.token)}`,
    },
  });
}

