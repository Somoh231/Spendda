import { z } from "zod";

/** Persisted in `tenants.settings` (JSON) and mirrored in localStorage for instant shell theming. */
export const tenantBrandingSchema = z.object({
  portalDisplayName: z.string().min(1).max(120).optional(),
  accentHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  footerNote: z.string().max(240).optional(),
});

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;

const LS_PREFIX = "spendda_tenant_branding_v1:";

export function brandingStorageKey(clientId: string) {
  return `${LS_PREFIX}${clientId}`;
}

export function readTenantBrandingLocal(clientId: string | null | undefined): TenantBranding | null {
  if (typeof window === "undefined" || !clientId) return null;
  try {
    const raw = window.localStorage.getItem(brandingStorageKey(clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return tenantBrandingSchema.safeParse(parsed).success ? tenantBrandingSchema.parse(parsed) : null;
  } catch {
    return null;
  }
}

export function writeTenantBrandingLocal(clientId: string, branding: TenantBranding) {
  if (typeof window === "undefined" || !clientId) return;
  try {
    window.localStorage.setItem(brandingStorageKey(clientId), JSON.stringify(branding));
  } catch {
    // ignore
  }
}

export function mergeTenantSettings(
  prev: Record<string, unknown> | null | undefined,
  patch: Partial<TenantBranding>,
): Record<string, unknown> {
  const base = prev && typeof prev === "object" ? { ...prev } : {};
  if (patch.portalDisplayName !== undefined) base.portalDisplayName = patch.portalDisplayName;
  if (patch.accentHex !== undefined) base.accentHex = patch.accentHex;
  if (patch.footerNote !== undefined) base.footerNote = patch.footerNote;
  return base;
}
