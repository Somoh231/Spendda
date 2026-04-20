import { normalizePlanTier } from "@/lib/tenants/subscription";
import type { TenantPlanTier, TenantRole } from "@/lib/tenants/types";
import { normalizeTenantRole } from "@/lib/tenants/types";

export const CLIENT_COOKIE = "spendda_client";
export const PORTAL_COOKIE = "spendda_portal";

export type ClientSession = {
  clientId: string;
  clientName: string;
  /** Tenant membership role (Supabase tenants). Defaults to member when omitted (legacy cookies). */
  role?: TenantRole;
  /** Subscription / packaging tier for feature gates (client + server). */
  planTier?: TenantPlanTier;
};

export function encodeClientSession(s: ClientSession) {
  return Buffer.from(JSON.stringify(s), "utf8").toString("base64url");
}

export function decodeClientSession(raw: string): ClientSession | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<ClientSession>;
    if (!parsed.clientId || !parsed.clientName) return null;
    return {
      clientId: parsed.clientId,
      clientName: parsed.clientName,
      role: normalizeTenantRole(typeof parsed.role === "string" ? parsed.role : undefined),
      planTier: normalizePlanTier(typeof parsed.planTier === "string" ? parsed.planTier : undefined),
    };
  } catch {
    return null;
  }
}

