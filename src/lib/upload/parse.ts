import * as XLSX from "xlsx";
import { parseCsv, parseCsvMatrix, type CsvRow } from "@/lib/csv";
import { matrixToCsvRows } from "@/lib/upload/financial-engine";

export type UploadParseResult =
  | { ok: true; rows: CsvRow[]; filename: string; kind: "csv" | "xlsx" }
  | { ok: false; error: string };

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export async function parseUploadFile(file: File): Promise<UploadParseResult> {
  try {
    const name = file.name || "upload";
    const ext = name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) return { ok: false, error: "No worksheets found in the Excel file." };
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];
      const matrix = raw.map((row) => (Array.isArray(row) ? row : []).map((c) => asString(c)));
      const rows = matrixToCsvRows(matrix);
      if (rows.length === 0) return { ok: false, error: "No rows found in the first worksheet." };
      return { ok: true, rows, filename: name, kind: "xlsx" };
    }

    // Default CSV path (also covers files without extension)
    const text = await file.text();
    const matrix = parseCsvMatrix(text);
    const rows = matrix.length > 0 ? matrixToCsvRows(matrix) : parseCsv(text);
    if (rows.length === 0) return { ok: false, error: "No rows found. Ensure the file has a header row." };
    return { ok: true, rows, filename: name, kind: "csv" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/password|encrypted|corrupt/i.test(msg)) {
      return { ok: false, error: "That workbook appears encrypted or unreadable. Save as CSV or an unprotected .xlsx and try again." };
    }
    return {
      ok: false,
      error: msg ? `Could not read this file (${msg}).` : "Could not read this file. Use a UTF-8 CSV or a standard .xlsx export.",
    };
  }
}

export async function loadSampleCsv(path: string): Promise<UploadParseResult> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: `Failed to load sample (${res.status}).` };
    const text = await res.text();
    const matrix = parseCsvMatrix(text);
    const rows = matrix.length > 0 ? matrixToCsvRows(matrix) : parseCsv(text);
    if (rows.length === 0) return { ok: false, error: "Sample file contained no rows." };
    const filename = path.split("/").pop() || "sample.csv";
    return { ok: true, rows, filename, kind: "csv" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to load sample." };
  }
}

