/**
 * Deterministic snapshot id for audit trail (stable for SSR + hydration).
 * Not cryptographic — demo / prototype grade.
 */
export function buildDataSnapshotId(parts: { entity: string; uploadCount: number; questionHash: string }) {
  const raw = `${parts.entity}|${parts.uploadCount}|${parts.questionHash}`;
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `SNAP-${hex.toUpperCase()}`;
}

export function hashPrompt(q: string) {
  const s = q.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, "0");
}
