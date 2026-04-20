import type { TenantPlanTier } from "./types";

export type SubscriptionFeature =
  | "exports.pdf"
  | "exports.xlsx"
  | "ai.workspace"
  | "intelligence.full"
  | "uploads.unlimited";

export const PLAN_LIMITS: Record<
  TenantPlanTier,
  { maxUploadMbPerMonth: number; maxSeats: number }
> = {
  pilot: { maxUploadMbPerMonth: 500, maxSeats: 5 },
  growth: { maxUploadMbPerMonth: 5_000, maxSeats: 25 },
  enterprise: { maxUploadMbPerMonth: 50_000, maxSeats: 500 },
};

const FEATURE_MATRIX: Record<TenantPlanTier, Record<SubscriptionFeature, boolean>> = {
  pilot: {
    "exports.pdf": true,
    "exports.xlsx": false,
    "ai.workspace": true,
    "intelligence.full": false,
    "uploads.unlimited": false,
  },
  growth: {
    "exports.pdf": true,
    "exports.xlsx": true,
    "ai.workspace": true,
    "intelligence.full": true,
    "uploads.unlimited": false,
  },
  enterprise: {
    "exports.pdf": true,
    "exports.xlsx": true,
    "ai.workspace": true,
    "intelligence.full": true,
    "uploads.unlimited": true,
  },
};

export function planAllowsFeature(
  tier: TenantPlanTier | undefined,
  feature: SubscriptionFeature,
): boolean {
  const t = tier ?? "pilot";
  return FEATURE_MATRIX[t][feature];
}

export function normalizePlanTier(raw: string | null | undefined): TenantPlanTier {
  if (raw === "growth" || raw === "enterprise" || raw === "pilot") return raw;
  return "pilot";
}
