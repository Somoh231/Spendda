import type { ConnectorId } from "./connector-id";

export type RawPayloadEncoding = "json" | "vendor_csv" | "vendor_xml" | "vendor_pdf" | "binary";

/**
 * Vendor-opaque payload reference — raw layer is never fed directly to charts.
 * Future: object storage key, KMS envelope, or partner vault id.
 */
export type RawSourceEnvelope = {
  ingestionId: string;
  tenantId: string;
  entityId: string;
  connectorId: ConnectorId;
  externalResourceId: string;
  receivedAt: string;
  contentType: string;
  encoding: RawPayloadEncoding;
  storageRef: string;
  checksumSha256?: string;
  /** Optional vendor cursor for incremental sync. */
  vendorCursor?: string;
};

/** Placeholder — future persistence (Postgres / object store). */
export type RawIngestionStore = {
  save(envelope: RawSourceEnvelope): Promise<void>;
  listForTenant(tenantId: string, limit: number): Promise<RawSourceEnvelope[]>;
};

export const notImplementedRawStore: RawIngestionStore = {
  async save() {
    throw new Error("Raw ingestion store not wired in this build.");
  },
  async listForTenant() {
    return [];
  },
};
