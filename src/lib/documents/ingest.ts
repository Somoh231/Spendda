import { docTypeFromName, upsertClientDocument, type DocumentStatus, type SavedDocument } from "./storage";

const MAX_PILOT_BYTES = 1_500_000; // ~1.5MB

export async function saveFileToClientDocuments(opts: {
  clientId: string;
  file: File;
  reportingPeriod?: string;
  status?: DocumentStatus;
  owner?: string;
}): Promise<SavedDocument> {
  const { clientId, file } = opts;
  const id = `DOC_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  let payloadBase64: string | undefined = undefined;
  if (file.size <= MAX_PILOT_BYTES) {
    payloadBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => {
        const result = String(reader.result || "");
        const idx = result.indexOf("base64,");
        resolve(idx >= 0 ? result.slice(idx + "base64,".length) : "");
      };
      reader.readAsDataURL(file);
    });
  }

  const doc: SavedDocument = {
    id,
    fileName: file.name,
    fileType: docTypeFromName(file.name),
    uploadedAt: new Date().toISOString(),
    reportingPeriod: opts.reportingPeriod?.trim() ? opts.reportingPeriod.trim() : undefined,
    status: opts.status || "Ready",
    owner: opts.owner?.trim() ? opts.owner.trim() : "Portal User",
    sizeBytes: file.size,
    payloadBase64,
    mimeType: file.type || undefined,
  };

  upsertClientDocument(clientId, doc);
  return doc;
}

