export type PortalAuditEntry = {
  ts: string;
  action: string;
  detail?: string;
  meta?: Record<string, unknown>;
};
