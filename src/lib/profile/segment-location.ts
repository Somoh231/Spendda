import type { IndustrySegment, OnboardingProfile, OperatingLocation, OrgType, RegulatoryRegion } from "./types";

export function defaultIndustrySegmentFromOrgType(orgType: OrgType): IndustrySegment {
  switch (orgType) {
    case "Home Care Agency":
      return "Home care & senior services";
    case "Childcare Center":
      return "Childcare & early education";
    case "Restaurant Group":
      return "Food & beverage";
    case "SME":
      return "Small business (general)";
    case "Government":
      return "Public sector & regulators";
    case "Bank":
      return "Financial services";
    case "Hospital":
      return "Healthcare & life sciences";
    case "University":
      return "Education & research";
    case "NGO":
      return "Nonprofit & NGOs";
    default:
      return "Private sector (general)";
  }
}

export function defaultOperatingLocationFromProfile(p: Pick<OnboardingProfile, "marketType" | "demoPackId">): OperatingLocation {
  if (p.demoPackId === "home-care-us") return "United States — Home Care";
  if (p.demoPackId === "childcare-us") return "United States — Childcare";
  if (p.demoPackId === "restaurant-us") return "United States — Restaurant";
  if (p.demoPackId === "sme-us") return "United States — SME";
  if (p.demoPackId === "liberia-mof") return "West Africa";
  if (p.demoPackId === "east-africa-university") return "East Africa";
  if (p.marketType === "Developed Market") return "United States";
  return "Other emerging markets";
}

export function resolveIndustrySegment(profile: OnboardingProfile | null): IndustrySegment {
  if (!profile) return "Private sector (general)";
  if (profile.industrySegment) return profile.industrySegment;
  return defaultIndustrySegmentFromOrgType(profile.orgType);
}

export function resolveOperatingLocation(profile: OnboardingProfile | null): OperatingLocation {
  if (!profile) return "Global / multi-region";
  if (profile.operatingLocation) return profile.operatingLocation;
  return defaultOperatingLocationFromProfile(profile);
}

/** Maps profile location to regulatory regions used by external feed tags. */
export function regulatoryRegionsForLocation(loc: OperatingLocation): RegulatoryRegion[] {
  switch (loc) {
    case "United States — Home Care":
    case "United States — Childcare":
    case "United States — Restaurant":
    case "United States — SME":
    case "United States":
      return ["US", "Global"];
    case "European Union / UK":
      return ["EU", "Global"];
    case "West Africa":
      return ["West Africa", "Global"];
    case "East Africa":
      return ["East Africa", "Global"];
    case "Other emerging markets":
      return ["West Africa", "East Africa", "Global"];
    default:
      return ["US", "EU", "West Africa", "East Africa", "Global"];
  }
}

export function mergeRegulatoryRegions(inferred: RegulatoryRegion[], fromLocation: RegulatoryRegion[]): RegulatoryRegion[] {
  return [...new Set([...inferred, ...fromLocation])];
}
