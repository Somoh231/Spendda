/** Canonical tenant RBAC (stored on membership + mirrored in client cookie). */
export type TenantRole = "owner" | "finance_lead" | "analyst" | "viewer";

/** Legacy roles still allowed in Postgres until rows are migrated. */
export type TenantRoleLegacy = "admin" | "member";

/** Commercial packaging — drives feature limits and upgrade CTAs. */
export type TenantPlanTier = "pilot" | "growth" | "enterprise";

export type Tenant = {
  id: string;
  name: string;
  created_at?: string;
};

export type TenantMembership = {
  tenant_id: string;
  user_id: string;
  role: TenantRole | TenantRoleLegacy;
  created_at?: string;
};

export type TenantInvite = {
  id: string;
  tenant_id: string;
  email: string;
  role: TenantRole | TenantRoleLegacy;
  token: string;
  expires_at: string;
  used_at?: string | null;
  created_at?: string;
};

/** Map DB / cookie strings to canonical roles (never breaks legacy `admin`/`member`). */
export function normalizeTenantRole(raw: string | null | undefined): TenantRole | undefined {
  if (raw === "owner" || raw === "finance_lead" || raw === "analyst" || raw === "viewer") return raw;
  if (raw === "admin") return "finance_lead";
  if (raw === "member") return "analyst";
  return undefined;
}

export function formatTenantRoleLabel(role: string | null | undefined): string {
  const r = normalizeTenantRole(role ?? undefined) ?? "analyst";
  const labels: Record<TenantRole, string> = {
    owner: "Owner",
    finance_lead: "Finance Lead",
    analyst: "Analyst",
    viewer: "Viewer",
  };
  return labels[r];
}

/** Invite users, edit tenant row in Supabase (aligns with RLS using legacy + new roles). */
export function tenantDbRoleCanInvite(role: string | null | undefined): boolean {
  const x = String(role || "");
  return x === "owner" || x === "admin" || x === "finance_lead";
}

/** Update tenant name/settings in DB (RLS `tenants_update_admin`). */
export function tenantDbRoleCanManageTenantRecord(role: string | null | undefined): boolean {
  return tenantDbRoleCanInvite(role);
}

