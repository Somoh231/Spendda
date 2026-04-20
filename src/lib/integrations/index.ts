/**
 * Integrations layer — connectors produce **raw** envelopes; normalizers emit **analytics** batches
 * aligned with manual upload shapes. Upload UI and ingest paths remain unchanged.
 */
export type { NormalizedDatasetBatch, NormalizedIngestionSource, NormalizedPayrollRecord, NormalizedSpendRecord } from "./normalized-model";
export type { RawPayloadEncoding, RawSourceEnvelope, RawIngestionStore } from "./raw-ingestion";
export { notImplementedRawStore } from "./raw-ingestion";

export type { ConnectorId } from "./connector-id";
export type {
  ConnectorAuthContext,
  ConnectorAuthKind,
  ConnectorAvailability,
  ConnectorCategory,
  ConnectorDefinition,
  ConnectorSyncAdapter,
} from "./connectors";
export { CONNECTOR_DEFINITIONS, getConnectorDefinition, listConnectorDefinitions } from "./connectors";

export type { SyncCadence, SyncJobRun, SyncJobRunStatus, SyncJobSpec } from "./sync/types";
export { enqueueConnectorSync, listPlaceholderSyncJobs, listRecentRuns } from "./sync/scheduler-stub";
