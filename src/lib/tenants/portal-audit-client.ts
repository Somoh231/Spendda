/** Fire-and-forget portal audit (server enforces membership + allowlisted actions). */
export async function appendPortalAudit(payload: {
  action: "export.pdf" | "export.xlsx" | "export.csv" | "upload.complete" | "branding.updated" | "tenant.activated";
  detail?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/tenants/portal-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}

export async function recordTenantUsage(payload: { kind: "export" | "upload"; bytes?: number }) {
  try {
    await fetch("/api/tenants/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}
