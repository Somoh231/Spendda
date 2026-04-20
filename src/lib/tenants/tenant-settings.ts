import { z } from "zod";

/** Non-branding keys stored in `tenants.settings` JSON. */
export const tenantOperationalSettingsSchema = z.object({
  fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
  supportContactEmail: z.union([z.string().email().max(120), z.literal("")]).optional(),
  defaultConfidentialWatermark: z.boolean().optional(),
});

export type TenantOperationalSettings = z.infer<typeof tenantOperationalSettingsSchema>;

export function mergeOperationalIntoTenantSettings(
  prev: Record<string, unknown>,
  patch: Partial<TenantOperationalSettings>,
): Record<string, unknown> {
  const base = { ...prev };
  if (patch.fiscalYearStartMonth !== undefined) base.fiscalYearStartMonth = patch.fiscalYearStartMonth;
  if (patch.supportContactEmail !== undefined) base.supportContactEmail = patch.supportContactEmail;
  if (patch.defaultConfidentialWatermark !== undefined) {
    base.defaultConfidentialWatermark = patch.defaultConfidentialWatermark;
  }
  return base;
}

export function pickOperationalFromSettings(settings: Record<string, unknown>): TenantOperationalSettings {
  const parsed = tenantOperationalSettingsSchema.safeParse(settings);
  return parsed.success ? parsed.data : {};
}
