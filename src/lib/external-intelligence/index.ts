export type {
  ClientRelevanceContext,
  ConfidenceLevel,
  ExternalUpdate,
  ExternalUpdateCategory,
  RegulatoryRegion,
  UrgencyLevel,
} from "./types";
export { EXTERNAL_INTELLIGENCE_FEED } from "./feed";
export {
  deriveClientRelevanceContext,
  externalUpdateMatches,
  externalUpdatesToReportBullets,
  getHighPriorityExternalUpdates,
  getRelevantExternalUpdates,
} from "./filter";
