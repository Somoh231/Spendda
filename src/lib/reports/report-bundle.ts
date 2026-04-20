import type { DemoSummary, ForecastOutput } from "@/lib/demo-data/types";

export type FlagRow = {
  id: string;
  title: string;
  severity: string;
  date: string;
  score: number;
};

export type TxRow = {
  id: string;
  vendorName: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  invoiceId: string;
  paymentMethod: string;
};

export type InvestigationMetaRow = {
  id: string;
  owner?: string;
  dueDate?: string;
  status?: string;
};

export type MlSummaryLite = {
  generatedAt: string;
  confidencePct: number;
  anomalies: {
    total: number;
    byKind: Record<string, number>;
    top: Array<{
      kind: string;
      title: string;
      severity: string;
      score: number;
      confidencePct: number;
      explain: string[];
      linkedRuleFlags?: Array<{ id: string; ruleId: string; severity: string; score: number }>;
    }>;
  };
  risk: {
    topVendors: Array<{ label: string; riskScore: number; confidencePct: number; drivers: string[] }>;
    topDepartments: Array<{ label: string; riskScore: number; confidencePct: number; drivers: string[] }>;
  };
  forecast: {
    method: string;
    points: Array<{ month: string; projected: number; lower: number; upper: number; confidencePct: number }>;
    explain: string[];
  };
  comparison: {
    ruleFlags30d: number;
    mlAnomalies30d: number;
    overlapEstimate: number;
    explain: string[];
  };
};

export type ReportBundle = {
  org: { currency: string };
  summary: DemoSummary;
  forecast: ForecastOutput;
  flags: FlagRow[];
  transactions: TxRow[];
  investigations: Record<string, InvestigationMetaRow>;
  ml?: MlSummaryLite;
  fetchedAt: string;
};

export async function fetchReportBundle(): Promise<ReportBundle> {
  const base = typeof window !== "undefined" ? window.location.origin : "";

  const [sumRes, fcRes, flRes, txRes, invRes, mlRes] = await Promise.all([
    fetch(`${base}/api/demo/summary`, { cache: "no-store" }),
    fetch(`${base}/api/demo/forecast`, { cache: "no-store" }),
    fetch(`${base}/api/demo/flags?page=1&pageSize=200`, { cache: "no-store" }),
    fetch(`${base}/api/demo/transactions?page=1&pageSize=200`, { cache: "no-store" }),
    fetch(`${base}/api/investigations/meta`, { cache: "no-store" }),
    fetch(`${base}/api/intelligence/ml/summary`, { cache: "no-store" }),
  ]);

  if (!sumRes.ok) throw new Error(`Summary unavailable (${sumRes.status})`);
  const sumJson = (await sumRes.json()) as { org: { currency: string }; summary: DemoSummary };

  let forecast: ForecastOutput = {
    spendVariance: [],
    payrollGrowth: [],
    cards: {
      budgetShortfall: 0,
      retirementWavePct: 0,
      payrollGrowthPct: 0,
      overspendRiskScore: 0,
    },
  };
  if (fcRes.ok) {
    const fc = (await fcRes.json()) as { forecast: ForecastOutput };
    forecast = fc.forecast;
  }

  let flags: FlagRow[] = [];
  if (flRes.ok) {
    const fl = (await flRes.json()) as { items?: FlagRow[] };
    flags = fl.items ?? [];
  }

  let transactions: TxRow[] = [];
  if (txRes.ok) {
    const tx = (await txRes.json()) as { items?: TxRow[] };
    transactions = tx.items ?? [];
  }

  let investigations: Record<string, InvestigationMetaRow> = {};
  if (invRes.ok) {
    const inv = (await invRes.json()) as { meta?: Record<string, InvestigationMetaRow> };
    investigations = inv.meta ?? {};
  }

  let ml: MlSummaryLite | undefined = undefined;
  if (mlRes.ok) {
    const mj = (await mlRes.json()) as { summary?: MlSummaryLite };
    if (mj.summary) ml = mj.summary;
  }

  return {
    org: sumJson.org,
    summary: sumJson.summary,
    forecast,
    flags,
    transactions,
    investigations,
    ml,
    fetchedAt: new Date().toISOString(),
  };
}
