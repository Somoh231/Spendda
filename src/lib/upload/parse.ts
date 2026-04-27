import * as XLSX from "xlsx";
import { parseCsv, parseCsvMatrix, type CsvRow } from "@/lib/csv";
import { matrixToCsvRows } from "@/lib/upload/financial-engine";

function assessParseQuality(rows: CsvRow[]): {
  hasDateColumn: boolean;
  hasAmountColumn: boolean;
  hasVendorColumn: boolean;
  confidence: "high" | "medium" | "low";
  warnings: string[];
} {
  if (!rows.length)
    return {
      hasDateColumn: false,
      hasAmountColumn: false,
      hasVendorColumn: false,
      confidence: "low",
      warnings: ["File appears empty"],
    };

  const headers = Object.keys(rows[0]);
  const sample = rows.slice(0, 50);
  const warnings: string[] = [];

  // Date detection: look for columns with date-like string values
  const hasDateColumn = headers.some((h) => {
    const vals = sample.map((r) => String(r[h] ?? "").trim()).filter(Boolean);
    return vals.some((v) => /\d{4}[-\/]\d{1,2}|^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(v));
  });

  // Amount detection: look for columns with numeric values > 0
  const hasAmountColumn = headers.some((h) => {
    const vals = sample.map((r) => String(r[h] ?? "").replace(/[$,\s]/g, ""));
    const nums = vals.map(Number).filter((n) => !isNaN(n) && n > 0);
    return nums.length > vals.length * 0.4;
  });

  // Vendor detection: string column with varied non-empty values
  const hasVendorColumn = headers.some((h) => {
    const vals = sample.map((r) => String(r[h] ?? "").trim()).filter(Boolean);
    const unique = new Set(vals);
    return vals.length > 3 && unique.size > 2 && vals.every((v) => isNaN(Number(v)));
  });

  if (!hasDateColumn) warnings.push("No date column detected — time-based analysis will be limited");
  if (!hasAmountColumn) warnings.push("No amount column detected — spend totals may be inaccurate");
  if (!hasVendorColumn) warnings.push("No vendor/name column detected — grouping by vendor unavailable");

  const score = [hasDateColumn, hasAmountColumn, hasVendorColumn].filter(Boolean).length;
  const confidence = score === 3 ? "high" : score === 2 ? "medium" : "low";

  return { hasDateColumn, hasAmountColumn, hasVendorColumn, confidence, warnings };
}

export type UploadParseResult =
  | { ok: true; rows: CsvRow[]; filename: string; kind: "csv" | "xlsx"; quality: ReturnType<typeof assessParseQuality> }
  | { ok: false; error: string };

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

// (assessParseQuality defined above)

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
      return { ok: true, rows, filename: name, kind: "xlsx", quality: assessParseQuality(rows) };
    }

    // Default CSV path (also covers files without extension)
    const text = await file.text();
    const matrix = parseCsvMatrix(text);
    const rows = matrix.length > 0 ? matrixToCsvRows(matrix) : parseCsv(text);
    if (rows.length === 0) return { ok: false, error: "No rows found. Ensure the file has a header row." };
    return { ok: true, rows, filename: name, kind: "csv", quality: assessParseQuality(rows) };
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
    return { ok: true, rows, filename, kind: "csv", quality: assessParseQuality(rows) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to load sample." };
  }
}

