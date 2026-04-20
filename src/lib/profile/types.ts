export type OrgType =
  | "Government"
  | "Private Company"
  | "University"
  | "NGO"
  | "Hospital"
  | "Bank";

export type MarketType = "Emerging Market" | "Developed Market";

export type OrgSize = "Small" | "Mid-size" | "Large" | "Multi-entity";

export type PrimaryGoal =
  | "Payroll oversight"
  | "Procurement savings"
  | "Budget forecasting"
  | "Fraud / anomaly detection"
  | "Executive reporting"
  | "Donor fund accountability"
  | "Workforce planning"
  | "Multi-branch visibility";

export type UserRole = "Admin" | "Finance Lead" | "Executive" | "Auditor" | "Analyst";

export type DemoPackId =
  | "default"
  | "liberia-mof"
  | "east-africa-university"
  | "mercy-regional-hospital"
  | "global-ngo-relief";

/** Primary industry lens for analytics, external intelligence, and reporting. */
export const INDUSTRY_SEGMENTS = [
  "Public sector & regulators",
  "Financial services",
  "Healthcare & life sciences",
  "Education & research",
  "Nonprofit & NGOs",
  "Private sector (general)",
] as const;
export type IndustrySegment = (typeof INDUSTRY_SEGMENTS)[number];

/** Primary operating jurisdiction / macro region (coarse). */
export const OPERATING_LOCATIONS = [
  "United States",
  "European Union / UK",
  "West Africa",
  "East Africa",
  "Other emerging markets",
  "Global / multi-region",
] as const;
export type OperatingLocation = (typeof OPERATING_LOCATIONS)[number];

/** Regulatory / macro zones for external feed matching. */
export type RegulatoryRegion = "US" | "EU" | "West Africa" | "East Africa" | "Global";

export type OnboardingProfile = {
  /** Tenant boundary key (set server-side from client session). */
  clientId?: string;
  orgType: OrgType;
  marketType: MarketType;
  orgSize: OrgSize;
  primaryGoals: PrimaryGoal[];
  dataMode: "upload" | "demo";
  /** When `dataMode` is `demo`, selects narrative + seeded dataset flavor. */
  demoPackId?: DemoPackId;
  /** Industry lens — when unset, inferred from organization type until onboarding captures it. */
  industrySegment?: IndustrySegment;
  /** Operating location — when unset, inferred from market type and demo pack. */
  operatingLocation?: OperatingLocation;
  role: UserRole;
  entities: string[];
  activeEntity: string;
  createdAt: string;
};

