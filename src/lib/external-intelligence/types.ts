import type {
  IndustrySegment,
  MarketType,
  OperatingLocation,
  OrgSize,
  OrgType,
  PrimaryGoal,
  RegulatoryRegion,
} from "@/lib/profile/types";

export type { RegulatoryRegion } from "@/lib/profile/types";

export type ExternalUpdateCategory =
  | "interest_rates"
  | "treasury"
  | "wage_law"
  | "tax"
  | "childcare"
  | "inflation"
  | "lending"
  | "sector_policy";

export type UrgencyLevel = "Critical" | "High" | "Medium" | "Low";

export type ConfidenceLevel = "High" | "Medium" | "Directional";

export type ExternalUpdate = {
  id: string;
  category: ExternalUpdateCategory;
  headline: string;
  whyItMatters: string;
  recommendedAction: string;
  confidence: ConfidenceLevel;
  urgency: UrgencyLevel;
  /** Effective date / version label for display (curated, not live wire). */
  asOfLabel: string;
  /** Match rules — all specified dimensions must pass (empty = no constraint). */
  relevance: {
    orgTypes?: OrgType[];
    marketTypes?: MarketType[];
    orgSizes?: OrgSize[];
    /** Demo pack sector from `demoPackMeta` — Government, Education, Healthcare, Nonprofit */
    sectors?: string[];
    /** At least one goal must match when specified */
    anyPrimaryGoals?: PrimaryGoal[];
    regions?: RegulatoryRegion[];
    industrySegments?: IndustrySegment[];
    operatingLocations?: OperatingLocation[];
  };
};

export type ClientRelevanceContext = {
  orgType: OrgType;
  marketType: MarketType;
  orgSize: OrgSize;
  primaryGoals: PrimaryGoal[];
  sector: string;
  regions: RegulatoryRegion[];
  industrySegment: IndustrySegment;
  operatingLocation: OperatingLocation;
};
