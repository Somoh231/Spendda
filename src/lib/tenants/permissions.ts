import { normalizeTenantRole, type TenantRole } from "./types";

/** Coarse RBAC for the client portal (tenant-scoped). */
export type TenantPermissionAction =
  | "data.upload"
  | "data.view"
  | "reports.export"
  | "documents.delete"
  | "tenant.invite"
  | "tenant.branding.read"
  | "tenant.branding.write"
  | "tenant.settings.write"
  | "tenant.audit.read"
  | "tenant.usage.read"
  | "tenant.billing.read";

const MATRIX: Record<TenantRole, Record<TenantPermissionAction, boolean>> = {
  owner: {
    "data.upload": true,
    "data.view": true,
    "reports.export": true,
    "documents.delete": true,
    "tenant.invite": true,
    "tenant.branding.read": true,
    "tenant.branding.write": true,
    "tenant.settings.write": true,
    "tenant.audit.read": true,
    "tenant.usage.read": true,
    "tenant.billing.read": true,
  },
  finance_lead: {
    "data.upload": true,
    "data.view": true,
    "reports.export": true,
    "documents.delete": true,
    "tenant.invite": true,
    "tenant.branding.read": true,
    "tenant.branding.write": true,
    "tenant.settings.write": true,
    "tenant.audit.read": true,
    "tenant.usage.read": true,
    "tenant.billing.read": false,
  },
  analyst: {
    "data.upload": true,
    "data.view": true,
    "reports.export": true,
    "documents.delete": false,
    "tenant.invite": false,
    "tenant.branding.read": true,
    "tenant.branding.write": false,
    "tenant.settings.write": false,
    "tenant.audit.read": false,
    "tenant.usage.read": false,
    "tenant.billing.read": false,
  },
  viewer: {
    "data.upload": false,
    "data.view": true,
    "reports.export": false,
    "documents.delete": false,
    "tenant.invite": false,
    "tenant.branding.read": true,
    "tenant.branding.write": false,
    "tenant.settings.write": false,
    "tenant.audit.read": false,
    "tenant.usage.read": false,
    "tenant.billing.read": false,
  },
};

export function tenantRoleCan(role: TenantRole | string | undefined, action: TenantPermissionAction): boolean {
  const r = normalizeTenantRole(typeof role === "string" ? role : String(role)) ?? "analyst";
  return MATRIX[r][action];
}
