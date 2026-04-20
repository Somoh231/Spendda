import type { SyncJobSpec, SyncJobRun } from "./types";

/**
 * Placeholder for a future queue (BullMQ, Cloud Tasks, Supabase cron, etc.).
 * Manual uploads remain authoritative until this is implemented server-side.
 */
export function enqueueConnectorSync(_job: SyncJobSpec): { accepted: boolean; reason: string } {
  return {
    accepted: false,
    reason: "Scheduled connector sync is not enabled. Continue using manual uploads.",
  };
}

export function listPlaceholderSyncJobs(): SyncJobSpec[] {
  return [];
}

export function listRecentRuns(_tenantId: string): SyncJobRun[] {
  return [];
}
