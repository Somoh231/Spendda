export type CsvRow = Record<string, string>;

export function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const rows = lines.slice(1).map((line) => splitCsvLine(line));

  return rows.map((cells) => {
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    return row;
  });
}

/** Raw matrix for header-row detection (keeps leading blank lines until trimming). */
export function parseCsvMatrix(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const matrix = lines.map((line) => splitCsvLine(line.replace(/\uFEFF/g, "")));
  while (matrix.length > 0 && matrix[matrix.length - 1].every((c) => !String(c).trim())) {
    matrix.pop();
  }
  return matrix;
}

