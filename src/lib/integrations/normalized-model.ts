import type { PayrollRow, SpendTxn } from "@/lib/upload/dataset-store";

import type { ConnectorId } from "./connector-id";

/**
 * Normalized analytics rows — intentionally aligned with manual upload shapes
 * (`SpendTxn`, `PayrollRow`) so dashboards, ML, and reports stay one code path.
 */
export type NormalizedSpendRecord = SpendTxn;
export type NormalizedPayrollRecord = PayrollRow;

export type NormalizedIngestionSource =
  | {
      kind: "connector";
      connectorId: ConnectorId;
      ingestionId: string;
      externalBatchId?: string;
    }
  | {
      kind: "manual_upload";
      filename: string;
      uploadedAt: string;
    };

/**
 * Batch produced after normalization (mapping, validation, dedupe) — this is what
 * workspace analytics should consume, regardless of whether raw came from CSV or QuickBooks.
 */
export type NormalizedDatasetBatch = {
  tenantId: string;
  entityId: string;
  source: NormalizedIngestionSource;
  spend: NormalizedSpendRecord[];
  payroll: NormalizedPayrollRecord[];
  normalizedAt: string;
};
