import type { ConnectorId } from "../connector-id";

export type SyncCadence = "disabled" | "manual_only" | "hourly" | "daily" | "weekly";

export type SyncJobRunStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

/**
 * Declarative job spec — future worker materializes runs from this + tenant secrets.
 */
export type SyncJobSpec = {
  id: string;
  tenantId: string;
  connectorId: ConnectorId;
  cadence: SyncCadence;
  /** ISO8601 — null when disabled or manual-only */
  nextRunAt: string | null;
  paused: boolean;
  /** Future: cron expression or vendor-specific window */
  windowDescription?: string;
};

export type SyncJobRun = {
  jobId: string;
  runId: string;
  startedAt: string;
  finishedAt?: string;
  status: SyncJobRunStatus;
  /** Summary for ops dashboards */
  message?: string;
};
