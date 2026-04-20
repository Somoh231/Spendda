import type { DemoDataset } from "./types";
import { buildSummary } from "./summary";
import { buildForecast } from "./forecast";

export type ExecutiveBrief = {
  title: string;
  audience: "Executive" | "CFO" | "Controller";
  summary: string;
  highlights: string[];
  generatedAt: string;
};

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildExecutiveBriefs(dataset: DemoDataset): ExecutiveBrief[] {
  const s = buildSummary(dataset);
  const f = buildForecast(dataset);

  const topVendor = s.topVendors30d[0];
  const highFlags = s.riskBreakdown30d.find((x) => x.name === "High")?.value || 0;
  const mediumFlags = s.riskBreakdown30d.find((x) => x.name === "Medium")?.value || 0;

  const monthlyExecutive: ExecutiveBrief = {
    title: "Monthly Executive Brief",
    audience: "Executive",
    summary: `Total spend is ${formatMoney(
      s.kpis.totalSpend30d,
      dataset.org.currency,
    )} over the last 30 days with ${s.kpis.flags30d} flags detected (${highFlags} high severity). Estimated recoverable savings: ${formatMoney(
      s.kpis.savingsOpportunity30d,
      dataset.org.currency,
    )}.`,
    highlights: [
      `Forecast risk score: ${s.kpis.forecastRiskScore}/100 (budget pressure trending into Q4).`,
      topVendor
        ? `Top vendor concentration: ${topVendor.vendor} at ${formatMoney(
            topVendor.spend,
            dataset.org.currency,
          )} (risk: ${topVendor.concentrationRisk}).`
        : "Vendor concentration risk: moderate across top suppliers.",
      `Recommendation: review duplicate invoices and repeated payments in Operations + Facilities.`,
    ],
    generatedAt: new Date().toISOString(),
  };

  const cfo: ExecutiveBrief = {
    title: "CFO Brief",
    audience: "CFO",
    summary: `At the current spend trajectory, the projected variance indicates a potential shortfall of ${formatMoney(
      Math.max(0, f.cards.budgetShortfall),
      dataset.org.currency,
    )} within the next 6 months. Payroll growth is tracking ~${f.cards.payrollGrowthPct.toFixed(
      1,
    )}% by October.`,
    highlights: [
      `Overspend risk score: ${f.cards.overspendRiskScore}/100.`,
      `Retirement exposure: ${f.cards.retirementWavePct.toFixed(1)}% eligible within 12 months.`,
      `Action: set approval thresholds for top vendors and automate exception reporting.`,
    ],
    generatedAt: new Date().toISOString(),
  };

  const controller: ExecutiveBrief = {
    title: "Controller Brief",
    audience: "Controller",
    summary: `Duplicate invoice and repeated payment patterns are driving the majority of high-severity exceptions. ${mediumFlags} medium-severity signals indicate policy drift in invoice approvals.`,
    highlights: [
      `High-severity flags: ${highFlags}.`,
      `Focus areas: procurement anomalies and invoice matching controls.`,
      `Controls: enforce 3‑way matching and alert on 3+ repeats of vendor+amount in 30 days.`,
    ],
    generatedAt: new Date().toISOString(),
  };

  return [monthlyExecutive, cfo, controller];
}

