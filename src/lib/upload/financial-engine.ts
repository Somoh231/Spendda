import type { CsvRow } from "@/lib/csv";
import { maxAliasScoreForHeader, pickHeader } from "@/lib/upload/headers";

const DATE_ALIASES = [
  "date",
  "transaction date",
  "transaction_date",
  "invoice date",
  "invoice_date",
  "created at",
  "created_at",
  "txn date",
  "posting date",
  "value date",
  "effective date",
  "gl date",
  "import date",
  "period",
  "month",
  "dt",
  "day",
] as const;

const VENDOR_ALIASES = [
  "vendor",
  "supplier",
  "merchant",
  "payee",
  "beneficiary",
  "counterparty",
  "description",
  "memo",
  "narrative",
  "pay to",
  "paid to",
] as const;

const AMOUNT_ALIASES = [
  "amount",
  "amt",
  "spend",
  "total",
  "value",
  "net",
  "payment",
  "payment amount",
  "transaction amount",
  "usd amount",
  "debit",
  "credit",
  "local amount",
  "line amount",
  "total cost",
  "cost",
  "balance",
] as const;

const CATEGORY_ALIASES = [
  "category",
  "expense category",
  "gl category",
  "account",
  "gl account",
  "natural account",
  "type",
  "class",
] as const;

const DEPT_ALIASES = [
  "department",
  "dept",
  "cost center",
  "cost centre",
  "profit center",
  "segment",
  "org unit",
  "division",
  "team",
  "location",
  "branch",
] as const;

const INVOICE_ALIASES = [
  "invoice",
  "invoice id",
  "invoice number",
  "reference",
  "ref",
  "document number",
  "po",
  "po number",
  "check number",
  "cheque",
  "transaction id",
] as const;

const REVENUE_ALIASES = [
  "revenue",
  "sales",
  "income",
  "turnover",
  "receipts",
  "top line",
  "credit sales",
  "recognized revenue",
] as const;

const PAYROLL_EXPENSE_ALIASES = [
  "payroll",
  "wages",
  "salary expense",
  "compensation",
  "personnel cost",
  "labor cost",
  "pay expense",
  "salaries",
] as const;

const LOAN_ALIASES = [
  "loan payment",
  "loan pmt",
  "debt service",
  "p&i",
  "principal payment",
  "mortgage",
  "installment",
  "note payment",
  "repayment",
  "loan principal",
] as const;

const EMPLOYEE_ALIASES = [
  "employee",
  "staff",
  "worker",
  "cardholder",
  "requester",
  "submitted by",
  "user",
  "team member",
  "resource",
] as const;

const PAYROLL_NAME_ALIASES = [
  "name",
  "employee name",
  "employee",
  "full name",
  "staff name",
  "worker name",
  "resource name",
] as const;

const EMPLOYEE_ID_ALIASES = [
  "employee id",
  "emp id",
  "employee number",
  "staff id",
  "person id",
  "badge",
  "worker id",
] as const;

const BANK_ALIASES = [
  "bank account",
  "account number",
  "iban",
  "routing",
  "acct",
  "account no",
] as const;

const STATUS_ALIASES = ["status", "employment status", "employee status", "active", "state"] as const;

const SALARY_ALIASES = [
  "salary",
  "gross salary",
  "gross pay",
  "net pay",
  "monthly salary",
  "annual salary",
  "base pay",
  "compensation",
  "wage",
  "wages",
  "payroll",
  "labor",
  "labor cost",
] as const;

const PREV_SALARY_ALIASES = [
  "previous salary",
  "prior salary",
  "salary previous",
  "old salary",
  "last salary",
] as const;

const PAYROLL_LOAN_ALIASES = [
  "loan deduction",
  "401k loan",
  "staff loan",
  "advance repayment",
  "garnishment",
] as const;

const HEADER_PROBE_ALIAS_GROUPS = [
  DATE_ALIASES,
  VENDOR_ALIASES,
  AMOUNT_ALIASES,
  SALARY_ALIASES,
  PAYROLL_NAME_ALIASES,
  BANK_ALIASES,
  DEPT_ALIASES,
  INVOICE_ALIASES,
  REVENUE_ALIASES,
  LOAN_ALIASES,
] as const;

function scoreHeaderCandidateRow(cells: string[]): number {
  const used = new Set<number>();
  let total = 0;
  for (const aliases of HEADER_PROBE_ALIAS_GROUPS) {
    let bestI = -1;
    let bestS = 48;
    for (let i = 0; i < cells.length; i++) {
      if (used.has(i)) continue;
      const s = maxAliasScoreForHeader(cells[i], aliases);
      if (s > bestS) {
        bestS = s;
        bestI = i;
      }
    }
    if (bestI >= 0) {
      used.add(bestI);
      total += bestS;
    }
  }
  const nonEmpty = cells.filter((c) => c.trim().length > 0).length;
  return total + Math.min(10, nonEmpty) * 0.25;
}

export function findBestHeaderRowIndex(matrix: string[][], maxScan = 28): number {
  if (matrix.length === 0) return 0;
  let bestIdx = 0;
  let bestScore = -1;
  const scan = Math.min(maxScan, matrix.length);
  for (let r = 0; r < scan; r++) {
    const cells = matrix[r].map((c) => String(c ?? "").replace(/\uFEFF/g, "").trim());
    if (cells.every((c) => !c)) continue;
    const s = scoreHeaderCandidateRow(cells);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = r;
    }
  }
  return bestIdx;
}

export function dedupeHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((raw) => {
    const base = (raw || "").trim() || "Column";
    const n = (counts.get(base) || 0) + 1;
    counts.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

function padMatrixWidth(matrix: string[][]): string[][] {
  const w = matrix.reduce((m, row) => Math.max(m, row.length), 0);
  if (w === 0) return matrix;
  return matrix.map((row) => {
    const next = row.slice();
    while (next.length < w) next.push("");
    return next;
  });
}

export function matrixToCsvRows(matrix: string[][]): CsvRow[] {
  const padded = padMatrixWidth(matrix);
  if (padded.length === 0) return [];
  const headerIdx = findBestHeaderRowIndex(padded);
  const rawHeaders = padded[headerIdx].map((c) => String(c ?? "").replace(/\uFEFF/g, "").trim());
  const headers = dedupeHeaders(rawHeaders);
  const out: CsvRow[] = [];
  for (let r = headerIdx + 1; r < padded.length; r++) {
    const row: CsvRow = {};
    let any = false;
    for (let c = 0; c < headers.length; c++) {
      const v = String(padded[r]?.[c] ?? "").trim();
      if (v) any = true;
      row[headers[c]] = v;
    }
    if (any) out.push(row);
  }
  return out;
}

function pickBestUnused(
  headers: string[],
  aliases: readonly string[],
  used: Set<number>,
  minScore = 48,
): string | undefined {
  let bestI = -1;
  let bestS = minScore;
  for (let i = 0; i < headers.length; i++) {
    if (used.has(i)) continue;
    const s = maxAliasScoreForHeader(headers[i], aliases);
    if (s > bestS) {
      bestS = s;
      bestI = i;
    }
  }
  if (bestI < 0) return undefined;
  used.add(bestI);
  return headers[bestI];
}

export function classifyFinancialSheet(headers: string[]): "spend" | "payroll" {
  const usedPay = new Set<number>();
  const salaryCol = pickBestUnused(headers, SALARY_ALIASES, usedPay, 45);
  const nameCol = pickBestUnused(headers, PAYROLL_NAME_ALIASES, usedPay, 45);
  const bankCol = pickBestUnused(headers, BANK_ALIASES, usedPay, 45);
  const payrollScore = [salaryCol, nameCol, bankCol].filter(Boolean).length;

  const usedSpend = new Set<number>();
  const vendorCol = pickBestUnused(headers, VENDOR_ALIASES, usedSpend, 45);
  const amountCol = pickBestUnused(headers, AMOUNT_ALIASES, usedSpend, 45);
  const spendScore = (vendorCol && amountCol ? 2 : 0) + (amountCol ? 1 : 0) + (vendorCol ? 0.5 : 0);

  if (payrollScore >= 2 && payrollScore >= spendScore - 0.25) return "payroll";
  return "spend";
}

export type FinancialEngineExtras = {
  revenueHeader?: string;
  loanPaymentHeader?: string;
  payrollExpenseHeader?: string;
  employeeHeader?: string;
  payrollLoanHeader?: string;
};

export type EngineSpendMap = {
  date?: string;
  vendor?: string;
  amount?: string;
  category?: string;
  department?: string;
  invoiceId?: string;
};

export type EnginePayrollMap = {
  employeeId?: string;
  name?: string;
  department?: string;
  bankAccount?: string;
  status?: string;
  salary?: string;
  salaryPrevious?: string;
};

export type FinancialEngineBindings = {
  spend: EngineSpendMap;
  payroll: EnginePayrollMap;
  extras: FinancialEngineExtras;
};

function fallbackSpend(headers: string[]): EngineSpendMap {
  return {
    date: pickHeader(headers, [...DATE_ALIASES]) ?? undefined,
    vendor: pickHeader(headers, [...VENDOR_ALIASES]) ?? undefined,
    category: pickHeader(headers, [...CATEGORY_ALIASES]) ?? undefined,
    department: pickHeader(headers, [...DEPT_ALIASES]) ?? undefined,
    amount: pickHeader(headers, [...AMOUNT_ALIASES]) ?? undefined,
    invoiceId: pickHeader(headers, [...INVOICE_ALIASES]) ?? undefined,
  };
}

function fallbackPayroll(headers: string[]): EnginePayrollMap {
  return {
    employeeId: pickHeader(headers, [...EMPLOYEE_ID_ALIASES]) ?? undefined,
    name: pickHeader(headers, [...PAYROLL_NAME_ALIASES]) ?? undefined,
    department: pickHeader(headers, [...DEPT_ALIASES]) ?? undefined,
    bankAccount: pickHeader(headers, [...BANK_ALIASES]) ?? undefined,
    status: pickHeader(headers, [...STATUS_ALIASES]) ?? undefined,
    salary: pickHeader(headers, [...SALARY_ALIASES]) ?? undefined,
    salaryPrevious: pickHeader(headers, [...PREV_SALARY_ALIASES]) ?? undefined,
  };
}

export function detectFinancialBindings(headers: string[], sheetKind: "spend" | "payroll"): FinancialEngineBindings {
  const used = new Set<number>();
  const extras: FinancialEngineExtras = {};

  const spend: EngineSpendMap = {};
  const payroll: EnginePayrollMap = {};

  if (sheetKind === "spend") {
    spend.date = pickBestUnused(headers, DATE_ALIASES, used);
    spend.vendor = pickBestUnused(headers, VENDOR_ALIASES, used);
    spend.amount = pickBestUnused(headers, AMOUNT_ALIASES, used);
    spend.department = pickBestUnused(headers, DEPT_ALIASES, used);
    spend.category = pickBestUnused(headers, CATEGORY_ALIASES, used);
    spend.invoiceId = pickBestUnused(headers, INVOICE_ALIASES, used);

    extras.revenueHeader = pickBestUnused(headers, REVENUE_ALIASES, used);
    extras.payrollExpenseHeader = pickBestUnused(headers, PAYROLL_EXPENSE_ALIASES, used);
    extras.loanPaymentHeader = pickBestUnused(headers, LOAN_ALIASES, used);
    extras.employeeHeader = pickBestUnused(headers, EMPLOYEE_ALIASES, used);

    const fb = fallbackSpend(headers);
    spend.date = spend.date ?? fb.date;
    spend.vendor = spend.vendor ?? fb.vendor;
    spend.amount = spend.amount ?? fb.amount;
    spend.department = spend.department ?? fb.department;
    spend.category = spend.category ?? fb.category;
    spend.invoiceId = spend.invoiceId ?? fb.invoiceId;
  } else {
    payroll.employeeId = pickBestUnused(headers, EMPLOYEE_ID_ALIASES, used);
    payroll.name = pickBestUnused(headers, PAYROLL_NAME_ALIASES, used);
    payroll.department = pickBestUnused(headers, DEPT_ALIASES, used);
    payroll.bankAccount = pickBestUnused(headers, BANK_ALIASES, used);
    payroll.status = pickBestUnused(headers, STATUS_ALIASES, used);
    payroll.salary = pickBestUnused(headers, SALARY_ALIASES, used);
    payroll.salaryPrevious = pickBestUnused(headers, PREV_SALARY_ALIASES, used);
    extras.payrollLoanHeader = pickBestUnused(headers, PAYROLL_LOAN_ALIASES, used);

    const fb = fallbackPayroll(headers);
    payroll.employeeId = payroll.employeeId ?? fb.employeeId;
    payroll.name = payroll.name ?? fb.name;
    payroll.department = payroll.department ?? fb.department;
    payroll.bankAccount = payroll.bankAccount ?? fb.bankAccount;
    payroll.status = payroll.status ?? fb.status;
    payroll.salary = payroll.salary ?? fb.salary;
    payroll.salaryPrevious = payroll.salaryPrevious ?? fb.salaryPrevious;
  }

  return { spend, payroll, extras };
}

export function parseFinancialNumber(raw: unknown): number {
  let s = String(raw ?? "").trim();
  if (!s) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\u00a0/g, " ");
  const rawTrim = s;
  if (/^-/.test(rawTrim)) neg = true;
  s = s.replace(/[%\s]/g, "");
  s = s.replace(/[^0-9.,()+-]/g, "");
  s = s.replace(/[()]/g, "");
  if (!/\d/.test(s)) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > lastDot && lastComma >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma >= 0) {
    s = s.replace(/,/g, "");
  } else if (lastComma >= 0 && lastDot === -1) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0].replace(/\./g, "")}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  } else {
    s = s.replace(/,/g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  const out = neg && n > 0 ? -n : n;
  return out;
}

export function normalizeFinancialDate(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const mm = String(m[1]).padStart(2, "0");
    const dd = String(m[2]).padStart(2, "0");
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}
