import type { ConnectorId } from "../connector-id";
import type { RawSourceEnvelope } from "../raw-ingestion";

export type ConnectorCategory = "accounting" | "payroll" | "banking" | "erp" | "hr";

export type ConnectorAvailability = "planned" | "beta" | "ga";

export type ConnectorAuthKind = "oauth2" | "api_key" | "basic" | "partner_token" | "none";

export type ConnectorDefinition = {
  id: ConnectorId;
  displayName: string;
  category: ConnectorCategory;
  description: string;
  availability: ConnectorAvailability;
  authKind: ConnectorAuthKind;
  /** Declarative capabilities for UI + future job runner. */
  capabilities: {
    supportsScheduledSync: boolean;
    supportsIncrementalSync: boolean;
    supportsWebhooks: boolean;
  };
};

/** Future: decrypted credentials handle — never store secrets in client bundles. */
export type ConnectorAuthContext = {
  tenantId: string;
  connectorId: ConnectorId;
  credentialRef: string;
};

/**
 * Contract for a future connector worker (server-side).
 * Manual CSV/XLSX path stays separate; connectors only populate `RawSourceEnvelope`.
 */
export interface ConnectorSyncAdapter {
  readonly definition: ConnectorDefinition;
  /** Optional: pull vendor-native payloads into the raw layer. */
  fetchRawDelta?(ctx: ConnectorAuthContext, opts: { since?: string }): Promise<RawSourceEnvelope[]>;
}
