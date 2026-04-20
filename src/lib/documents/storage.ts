export type DocumentStatus = "Uploaded" | "Processing" | "Ready" | "Archived";

export type SavedDocument = {
  id: string;
  fileName: string;
  fileType: "PDF" | "CSV" | "XLSX" | "DOCX" | "OTHER";
  uploadedAt: string; // ISO
  reportingPeriod?: string;
  status: DocumentStatus;
  owner?: string;
  sizeBytes?: number;
  /**
   * Optional base64 payload for pilot mode (small files only).
   * Stored as raw base64 (no data URL prefix).
   */
  payloadBase64?: string;
  mimeType?: string;
};

function keyForClient(clientId: string) {
  return `spendda_client_docs:${clientId}`;
}

export function loadClientDocuments(clientId: string): SavedDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyForClient(clientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDocument[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveClientDocuments(clientId: string, docs: SavedDocument[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyForClient(clientId), JSON.stringify(docs));
  } catch {
    // ignore quota errors
  }
}

export function upsertClientDocument(clientId: string, doc: SavedDocument) {
  const docs = loadClientDocuments(clientId);
  const next = [doc, ...docs.filter((d) => d.id !== doc.id)];
  saveClientDocuments(clientId, next);
  return next;
}

export function deleteClientDocument(clientId: string, docId: string) {
  const docs = loadClientDocuments(clientId);
  const next = docs.filter((d) => d.id !== docId);
  saveClientDocuments(clientId, next);
  return next;
}

export function docTypeFromName(name: string): SavedDocument["fileType"] {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "PDF";
  if (n.endsWith(".csv")) return "CSV";
  if (n.endsWith(".xlsx")) return "XLSX";
  if (n.endsWith(".docx")) return "DOCX";
  return "OTHER";
}

export function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

