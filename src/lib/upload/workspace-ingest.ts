import type { CsvRow } from "@/lib/csv";
import {
  classifyFinancialSheet,
  detectFinancialBindings,
  normalizeFinancialDate,
  parseFinancialNumber,
} from "@/lib/upload/financial-engine";
import { pickHeader } from "@/lib/upload/headers";
import type { UploadedInsights } from "@/lib/upload/storage";
import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function getFirst(row: CsvRow, keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find((h) => normalize(h) === normalize(k));
    if (found) return row[found];
  }
  return "";
}

function toNumber(s: string) {
  return parseFinancialNumber(s);
}

function columnAbsSumSample(rows: CsvRow[], header: string, limit = 350): number {
  const n = Math.min(limit, rows.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += Math.abs(parseFinancialNumber(rows[i]?.[header]));
  }
  return s;
}

/** Skip long integer columns that are almost certainly IDs, not currency. */
function isLikelyIdColumn(rows: CsvRow[], header: string, limit = 100): boolean {
  const n = Math.min(limit, rows.length);
  let intLike = 0;
  let any = 0;
  for (let i = 0; i < n; i++) {
    const v = String(rows[i]?.[header] ?? "").trim();
    if (!v) continue;
    any++;
    const compact = v.replace(/[\s,]/g, "");
    if (/^\d{8,}$/.test(compact)) intLike++;
  }
  return any > 5 && intLike / any > 0.75;
}

function refineSpendAmountFromRows(headers: string[], rows: CsvRow[], mapping: SpendMapping): SpendMapping {
  if (!rows.length) return mapping;
  const reserved = new Set(
    [mapping.date, mapping.vendor, mapping.department, mapping.category, mapping.invoiceId].filter(Boolean) as string[],
  );
  const amountKey = mapping.amount;
  const currentSum = amountKey ? columnAbsSumSample(rows, amountKey) : 0;
  if (currentSum > 1) return mapping;

  let best: string | undefined;
  let bestSum = 0;
  for (const h of headers) {
    if (reserved.has(h)) continue;
    if (isLikelyIdColumn(rows, h)) continue;
    const sum = columnAbsSumSample(rows, h);
    if (sum > bestSum) {
      bestSum = sum;
      best = h;
    }
  }
  if (best && bestSum > 1 && bestSum > currentSum) {
    return { ...mapping, amount: best };
  }
  return mapping;
}

function refinePayrollSalaryFromRows(headers: string[], rows: CsvRow[], mapping: PayrollMapping): PayrollMapping {
  if (!rows.length) return mapping;
  const reserved = new Set(
    [mapping.name, mapping.department, mapping.employeeId, mapping.bankAccount, mapping.status, mapping.salaryPrevious].filter(
      Boolean,
    ) as string[],
  );
  const sk = mapping.salary;
  const currentSum = sk ? columnAbsSumSample(rows, sk) : 0;
  if (currentSum > 1) return mapping;

  let best: string | undefined;
  let bestSum = 0;
  for (const h of headers) {
    if (reserved.has(h)) continue;
    if (isLikelyIdColumn(rows, h)) continue;
    const sum = columnAbsSumSample(rows, h);
    if (sum > bestSum) {
      bestSum = sum;
      best = h;
    }
  }
  if (best && bestSum > 1) {
    return { ...mapping, salary: best };
  }
  return mapping;
}

export type SpendMapping = {
  date?: string;
  vendor?: string;
  category?: string;
  department?: string;
  amount?: string;
  invoiceId?: string;
};

export type WorkspaceSpendColumnMap = SpendMapping;

function autoSpendMapping(headers: string[]): SpendMapping {
  return detectFinancialBindings(headers, "spend").spend;
}

function getSpendMapped(row: CsvRow, mapping: SpendMapping, key: keyof SpendMapping, aliases: string[]) {
  const mappedHeader = mapping[key];
  if (mappedHeader && Object.prototype.hasOwnProperty.call(row, mappedHeader)) return row[mappedHeader] || "";
  return getFirst(row, aliases);
}

export type PayrollMapping = {
  employeeId?: string;
  name?: string;
  department?: string;
  bankAccount?: string;
  status?: string;
  salary?: string;
  salaryPrevious?: string;
};

export type WorkspacePayrollColumnMap = PayrollMapping;

export type WorkspaceIngestOverrides = {
  spendOverrides?: Partial<SpendMapping>;
  payrollOverrides?: Partial<PayrollMapping>;
};

function resolveSpendMapping(headers: string[], overrides?: Partial<SpendMapping>, rows?: CsvRow[]): SpendMapping {
  const base = autoSpendMapping(headers);
  const out: SpendMapping = { ...base };
  if (overrides) {
    (Object.keys(overrides) as (keyof SpendMapping)[]).forEach((k) => {
      const v = overrides[k];
      if (v === undefined || v === "") delete out[k];
      else out[k] = v;
    });
  }
  return rows?.length ? refineSpendAmountFromRows(headers, rows, out) : out;
}

function resolvePayrollMapping(headers: string[], overrides?: Partial<PayrollMapping>, rows?: CsvRow[]): PayrollMapping {
  const base = autoPayrollMapping(headers);
  const out: PayrollMapping = { ...base };
  if (overrides) {
    (Object.keys(overrides) as (keyof PayrollMapping)[]).forEach((k) => {
      const v = overrides[k];
      if (v === undefined || v === "") delete out[k];
      else out[k] = v;
    });
  }
  return rows?.length ? refinePayrollSalaryFromRows(headers, rows, out) : out;
}

function autoPayrollMapping(headers: string[]): PayrollMapping {
  return detectFinancialBindings(headers, "payroll").payroll;
}

function getPayrollMapped(row: CsvRow, mapping: PayrollMapping, key: keyof PayrollMapping, aliases: string[]) {
  const mappedHeader = mapping[key];
  if (mappedHeader && Object.prototype.hasOwnProperty.call(row, mappedHeader)) return row[mappedHeader] || "";
  return getFirst(row, aliases);
}

const classifyDataset = classifyFinancialSheet;

function computeSpendInsight(rows: CsvRow[], mapping: SpendMapping, filename: string, entity: string): UploadedInsights {
  const tx = rows.map((r) => {
    const vendor = getSpendMapped(r, mapping, "vendor", ["vendor", "merchant", "payee", "supplier"]);
    const category = getSpendMapped(r, mapping, "category", ["category", "expense_category", "type"]);
    const department = getSpendMapped(r, mapping, "department", ["department", "cost_center", "dept", "team", "location", "branch"]);
    const amount = toNumber(
      getSpendMapped(r, mapping, "amount", ["amount", "spend", "total", "value", "debit", "payment", "cost", "line_total"]),
    );
    return { vendor, category, department, amount };
  });

  const amounts = tx.map((t) => t.amount).filter((a) => a > 0).sort((a, b) => a - b);
  const p95 = amounts.length === 0 ? 0 : amounts[Math.floor(0.95 * (amounts.length - 1))];

  const repeatedKeyCounts = new Map<string, number>();
  tx.forEach((t) => {
    const key = `${normalize(t.vendor)}|${t.amount}`;
    if (t.vendor && t.amount > 0) repeatedKeyCounts.set(key, (repeatedKeyCounts.get(key) || 0) + 1);
  });

  const withFlags = tx.map((t) => {
    const flags: string[] = [];
    const repeatKey = `${normalize(t.vendor)}|${t.amount}`;
    if ((repeatedKeyCounts.get(repeatKey) || 0) >= 3) flags.push("Repeated payment");
    if (p95 > 0 && t.amount >= p95) flags.push("Unusually large");
    return { ...t, flags };
  });

  const byVendor = new Map<string, number>();
  const byDept = new Map<string, number>();
  withFlags.forEach((t) => {
    if (t.vendor) byVendor.set(t.vendor, (byVendor.get(t.vendor) || 0) + t.amount);
    if (t.department) byDept.set(t.department, (byDept.get(t.department) || 0) + t.amount);
  });

  const topVendor = [...byVendor.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topDepartment = [...byDept.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const positive = withFlags.filter((t) => t.amount > 0);
  const totalSpend = positive.reduce((s, t) => s + t.amount, 0);
  const flagged = positive.filter((t) => t.flags.length > 0).length;
  const repeated = positive.filter((t) => t.flags.includes("Repeated payment")).length;
  const unusual = positive.filter((t) => t.flags.includes("Unusually large")).length;

  return {
    kind: "spend",
    entity,
    filename,
    uploadedAt: new Date().toISOString(),
    totalTransactions: positive.length,
    totalSpend,
    flaggedCount: flagged,
    repeatedCount: repeated,
    unusualCount: unusual,
    topVendor,
    topDepartment,
  };
}

type Risk = "Low" | "Medium" | "High";

function computePayrollInsight(rows: CsvRow[], mapping: PayrollMapping, filename: string, entity: string): UploadedInsights {
  const items = rows.map((r) => {
    const employeeName = getPayrollMapped(r, mapping, "name", ["name", "employee_name", "employee"]);
    const department = getPayrollMapped(r, mapping, "department", ["department", "dept", "cost_center", "team", "location", "branch"]);
    const bankAccount = getPayrollMapped(r, mapping, "bankAccount", ["bank_account", "bank", "account"]);
    const status = getPayrollMapped(r, mapping, "status", ["status", "employment_status"]).toLowerCase();
    const salaryCurrent = toNumber(
      getPayrollMapped(r, mapping, "salary", [
        "salary",
        "wage",
        "wages",
        "payroll",
        "compensation",
        "labor",
        "gross_salary",
        "gross",
      ]),
    );
    const salaryPrevious = toNumber(
      getPayrollMapped(r, mapping, "salaryPrevious", ["salary_previous", "prev_salary", "previous_salary"]),
    );
    const salaryIncreasePct =
      Number.isFinite(salaryCurrent) && Number.isFinite(salaryPrevious) && salaryPrevious > 0
        ? ((salaryCurrent - salaryPrevious) / salaryPrevious) * 100
        : null;

    return { employeeName, department, bankAccount, status, salaryCurrent, salaryIncreasePct };
  });

  const nameCounts = new Map<string, number>();
  const bankCounts = new Map<string, number>();
  items.forEach((i) => {
    const n = normalize(i.employeeName);
    const b = normalize(i.bankAccount);
    if (n) nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
    if (b) bankCounts.set(b, (bankCounts.get(b) || 0) + 1);
  });

  const enriched = items.map((i) => {
    const signals: string[] = [];
    const isDupName = i.employeeName && (nameCounts.get(normalize(i.employeeName)) || 0) > 1;
    const isDupBank = i.bankAccount && (bankCounts.get(normalize(i.bankAccount)) || 0) > 1;
    if (isDupName) signals.push("Duplicate name");
    if (isDupBank) signals.push("Duplicate bank account");
    if (i.salaryIncreasePct !== null && i.salaryIncreasePct >= 20) {
      signals.push(`Unusual salary increase (+${i.salaryIncreasePct.toFixed(0)}%)`);
    }
    if ((i.status === "inactive" || i.status === "terminated") && i.salaryCurrent > 0) {
      signals.push("Inactive employee still paid");
    }
    const risk: Risk =
      signals.includes("Duplicate bank account") || signals.includes("Inactive employee still paid")
        ? "High"
        : signals.length
          ? "Medium"
          : "Low";
    return { ...i, risk, signals };
  });

  const total = enriched.length;
  const high = enriched.filter((e) => e.risk === "High").length;
  const medium = enriched.filter((e) => e.risk === "Medium").length;
  const dupBank = enriched.filter((e) => e.signals.includes("Duplicate bank account")).length;
  const inactivePaid = enriched.filter((e) => e.signals.includes("Inactive employee still paid")).length;
  const spikes = enriched.filter((e) => e.signals.some((s) => s.toLowerCase().includes("salary increase"))).length;

  const byDept = new Map<string, number>();
  enriched.forEach((e) => {
    if (!e.department) return;
    byDept.set(e.department, (byDept.get(e.department) || 0) + 1);
  });
  const topDepartment = [...byDept.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    kind: "payroll",
    entity,
    filename,
    uploadedAt: new Date().toISOString(),
    totalEmployees: total,
    highRisk: high,
    mediumRisk: medium,
    duplicateBankSignals: dupBank,
    inactivePaidSignals: inactivePaid,
    salarySpikeSignals: spikes,
    topDepartment,
  };
}

/**
 * Auto-detect spend vs payroll, map columns like the dedicated upload pages, and return an insight row for localStorage.
 */
export function ingestWorkspaceUpload(
  rows: CsvRow[],
  filename: string,
  entity: string,
  overrides?: WorkspaceIngestOverrides,
): UploadedInsights {
  const headers = Object.keys(rows[0] || {});
  const kind = classifyDataset(headers);
  if (kind === "payroll") {
    const mapping = resolvePayrollMapping(headers, overrides?.payrollOverrides, rows);
    return computePayrollInsight(rows, mapping, filename, entity);
  }
  const mapping = resolveSpendMapping(headers, overrides?.spendOverrides, rows);
  return computeSpendInsight(rows, mapping, filename, entity);
}

export function describeIngestKind(rows: CsvRow[]): "spend" | "payroll" {
  const headers = Object.keys(rows[0] || {});
  return classifyDataset(headers);
}

export function getDefaultUploadMaps(rows: CsvRow[]) {
  const headers = Object.keys(rows[0] || {});
  const kind = classifyDataset(headers);
  return {
    kind,
    headers,
    spend: autoSpendMapping(headers),
    payroll: autoPayrollMapping(headers),
  };
}

export function ingestWorkspaceDataset(
  rows: CsvRow[],
  filename: string,
  entity: string,
  overrides?: WorkspaceIngestOverrides,
): WorkspaceDataset {
  const headers = Object.keys(rows[0] || {});
  const kind = classifyDataset(headers);
  const uploadedAt = new Date().toISOString();

  if (kind === "payroll") {
    const mapping = resolvePayrollMapping(headers, overrides?.payrollOverrides, rows);
    const loanHeader = detectFinancialBindings(headers, "payroll").extras.payrollLoanHeader;
    const items: PayrollRow[] = rows.map((r, idx) => {
      const employeeName = getPayrollMapped(r, mapping, "name", ["name", "employee_name", "employee"]);
      const department = getPayrollMapped(r, mapping, "department", ["department", "dept", "cost_center", "team", "location", "branch"]);
      const bankAccount = getPayrollMapped(r, mapping, "bankAccount", ["bank_account", "bank", "account"]);
      const status = getPayrollMapped(r, mapping, "status", ["status", "employment_status"]).toLowerCase();
      const salaryCurrent = toNumber(
        getPayrollMapped(r, mapping, "salary", [
          "salary",
          "wage",
          "wages",
          "payroll",
          "compensation",
          "labor",
          "gross_salary",
          "gross",
        ]),
      );
      const salaryPrevious = toNumber(
        getPayrollMapped(r, mapping, "salaryPrevious", ["salary_previous", "prev_salary", "previous_salary"]),
      );
      const salaryIncreasePct =
        Number.isFinite(salaryCurrent) && Number.isFinite(salaryPrevious) && salaryPrevious > 0
          ? ((salaryCurrent - salaryPrevious) / salaryPrevious) * 100
          : null;
      const loanPayment = loanHeader ? parseFinancialNumber(r[loanHeader]) : 0;
      const row: PayrollRow = {
        kind: "payroll",
        idx,
        employeeName,
        department,
        bankAccount,
        status,
        salaryCurrent,
        salaryIncreasePct,
        risk: "Low",
        signals: [],
      };
      if (loanPayment) row.loanPayment = loanPayment;
      return row;
    });

    const nameCounts = new Map<string, number>();
    const bankCounts = new Map<string, number>();
    items.forEach((i) => {
      const n = normalize(i.employeeName);
      const b = normalize(i.bankAccount);
      if (n) nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
      if (b) bankCounts.set(b, (bankCounts.get(b) || 0) + 1);
    });

    const enriched: PayrollRow[] = items.map((i) => {
      const signals: string[] = [];
      const isDupName = i.employeeName && (nameCounts.get(normalize(i.employeeName)) || 0) > 1;
      const isDupBank = i.bankAccount && (bankCounts.get(normalize(i.bankAccount)) || 0) > 1;
      if (isDupName) signals.push("Duplicate name");
      if (isDupBank) signals.push("Duplicate bank account");
      if (i.salaryIncreasePct !== null && i.salaryIncreasePct >= 20) signals.push(`Unusual salary increase (+${i.salaryIncreasePct.toFixed(0)}%)`);
      if ((i.status === "inactive" || i.status === "terminated") && i.salaryCurrent > 0) signals.push("Inactive employee still paid");
      const risk: PayrollRow["risk"] =
        signals.includes("Duplicate bank account") || signals.includes("Inactive employee still paid")
          ? "High"
          : signals.length
            ? "Medium"
            : "Low";
      return { ...i, signals, risk };
    });

    return { kind: "payroll", filename, entity, uploadedAt, rows: enriched };
  }

  const mapping = resolveSpendMapping(headers, overrides?.spendOverrides, rows);
  const extras = detectFinancialBindings(headers, "spend").extras;
  const tx: SpendTxn[] = rows.map((r, idx) => {
    const vendor = getSpendMapped(r, mapping, "vendor", ["vendor", "merchant", "payee", "supplier"]);
    const category = getSpendMapped(r, mapping, "category", ["category", "expense_category", "type"]);
    const department = getSpendMapped(r, mapping, "department", ["department", "cost_center", "dept", "team", "location", "branch"]);
    let amount = toNumber(
      getSpendMapped(r, mapping, "amount", ["amount", "spend", "total", "value", "debit", "payment", "cost", "line_total"]),
    );
    if (!amount && extras.revenueHeader) amount = Math.abs(parseFinancialNumber(r[extras.revenueHeader]));
    const invoiceId = getSpendMapped(r, mapping, "invoiceId", ["invoice_id", "invoice", "reference", "ref", "document_number"]);
    const date = normalizeFinancialDate(
      getSpendMapped(r, mapping, "date", [
        "date",
        "created_at",
        "invoice_date",
        "transaction_date",
        "txn_date",
        "posting_date",
      ]),
    );
    const row: SpendTxn = { kind: "spend", idx, vendor, department, category, invoiceId, date, amount, flags: [] };
    if (extras.revenueHeader) {
      const rev = parseFinancialNumber(r[extras.revenueHeader]);
      if (rev) row.revenue = rev;
    }
    if (extras.payrollExpenseHeader) {
      const pe = parseFinancialNumber(r[extras.payrollExpenseHeader]);
      if (pe) row.payrollExpense = pe;
    }
    if (extras.loanPaymentHeader) {
      const lp = parseFinancialNumber(r[extras.loanPaymentHeader]);
      if (lp) row.loanPayment = lp;
    }
    if (extras.employeeHeader) {
      const emp = String(r[extras.employeeHeader] ?? "").trim();
      if (emp) row.employee = emp;
    }
    return row;
  });

  const amounts = tx.map((t) => t.amount).filter((a) => a > 0).sort((a, b) => a - b);
  const p95 = amounts.length ? amounts[Math.floor(0.95 * (amounts.length - 1))] : 0;
  const repeatedKeyCounts = new Map<string, number>();
  tx.forEach((t) => {
    const key = `${normalize(t.vendor)}|${normalize(t.invoiceId)}|${t.amount}`;
    if (t.vendor && t.amount > 0) repeatedKeyCounts.set(key, (repeatedKeyCounts.get(key) || 0) + 1);
  });
  const enriched = tx.map((t) => {
    const flags: string[] = [];
    const key = `${normalize(t.vendor)}|${normalize(t.invoiceId)}|${t.amount}`;
    if ((repeatedKeyCounts.get(key) || 0) >= 2 && t.invoiceId) flags.push("Duplicate invoice");
    if ((repeatedKeyCounts.get(key) || 0) >= 3) flags.push("Repeated payment");
    if (p95 > 0 && t.amount >= p95) flags.push("Unusually large");
    return { ...t, flags };
  });

  return { kind: "spend", filename, entity, uploadedAt, rows: enriched };
}
