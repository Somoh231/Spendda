import type { OnboardingProfile } from "@/lib/profile/types";
import { demoPackMeta } from "@/lib/profile/demo-packs";
import {
  mergeRegulatoryRegions,
  regulatoryRegionsForLocation,
  resolveIndustrySegment,
  resolveOperatingLocation,
} from "@/lib/profile/segment-location";

import { EXTERNAL_INTELLIGENCE_FEED } from "./feed";
import type { ClientRelevanceContext, ExternalUpdate, UrgencyLevel } from "./types";

function urgencyRank(u: UrgencyLevel): number {
  switch (u) {
    case "Critical":
      return 0;
    case "High":
      return 1;
    case "Medium":
      return 2;
    default:
      return 3;
  }
}

export function deriveClientRelevanceContext(profile: OnboardingProfile | null): ClientRelevanceContext | null {
  if (!profile) return null;
  const pack = demoPackMeta(profile.demoPackId);
  const industrySegment = resolveIndustrySegment(profile);
  const operatingLocation = resolveOperatingLocation(profile);
  const regionsBase: ClientRelevanceContext["regions"] = ["Global"];
  if (profile.marketType === "Developed Market") {
    regionsBase.push("US", "EU");
  } else {
    regionsBase.push("West Africa", "East Africa");
  }
  if (profile.demoPackId === "liberia-mof") {
    regionsBase.push("West Africa");
  }
  if (profile.demoPackId === "east-africa-university") {
    regionsBase.push("East Africa");
  }
  const regions = mergeRegulatoryRegions([...new Set(regionsBase)], regulatoryRegionsForLocation(operatingLocation));
  return {
    orgType: profile.orgType,
    marketType: profile.marketType,
    orgSize: profile.orgSize,
    primaryGoals: profile.primaryGoals,
    sector: pack.sector,
    regions,
    industrySegment,
    operatingLocation,
  };
}

export function externalUpdateMatches(item: ExternalUpdate, ctx: ClientRelevanceContext): boolean {
  const r = item.relevance;
  if (r.orgTypes?.length && !r.orgTypes.includes(ctx.orgType)) return false;
  if (r.marketTypes?.length && !r.marketTypes.includes(ctx.marketType)) return false;
  if (r.orgSizes?.length && !r.orgSizes.includes(ctx.orgSize)) return false;
  if (r.sectors?.length && !r.sectors.includes(ctx.sector)) return false;
  if (r.anyPrimaryGoals?.length) {
    const hit = r.anyPrimaryGoals.some((g) => ctx.primaryGoals.includes(g));
    if (!hit) return false;
  }
  if (r.regions?.length) {
    const hit = r.regions.some((reg) => ctx.regions.includes(reg));
    if (!hit) return false;
  }
  if (r.industrySegments?.length && !r.industrySegments.includes(ctx.industrySegment)) return false;
  if (r.operatingLocations?.length && !r.operatingLocations.includes(ctx.operatingLocation)) return false;
  return true;
}

/** Client-filtered updates, most urgent first. */
export function getRelevantExternalUpdates(profile: OnboardingProfile | null): ExternalUpdate[] {
  const ctx = deriveClientRelevanceContext(profile);
  if (!ctx) {
    return [...EXTERNAL_INTELLIGENCE_FEED].sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  }
  const matched = EXTERNAL_INTELLIGENCE_FEED.filter((x) => externalUpdateMatches(x, ctx)).sort(
    (a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency),
  );
  if (matched.length) return matched;
  return [...EXTERNAL_INTELLIGENCE_FEED].sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency)).slice(0, 8);
}

export function getHighPriorityExternalUpdates(profile: OnboardingProfile | null, limit = 4): ExternalUpdate[] {
  return getRelevantExternalUpdates(profile)
    .filter((u) => u.urgency === "Critical" || u.urgency === "High")
    .slice(0, limit);
}

/** One-line bullets for PDF / XLS appendix. */
export function externalUpdatesToReportBullets(updates: ExternalUpdate[], limit = 6): string[] {
  return updates.slice(0, limit).map((u) => {
    const tag = u.urgency === "Critical" || u.urgency === "High" ? `[${u.urgency}] ` : "";
    return `${tag}${u.headline} — ${u.recommendedAction}`;
  });
}
