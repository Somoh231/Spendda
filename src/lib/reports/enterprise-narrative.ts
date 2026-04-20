import type { ReportBundle } from "./report-bundle";
import { portfolioHealthScore } from "./health-score";

function fmtMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function pct(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

export type NarrativePack = {
  executiveBullets: string[];
  kpiNarrative: string;
  alertsNarrative: string;
  departmentNarrative: string;
  forecastNarrative: string;
  recommendations: string[];
};

export function buildNarrativePack(bundle: ReportBundle): NarrativePack {
  const { summary, forecast, flags } = bundle;
  const cur = bundle.org.currency || "USD";
  const k = summary.kpis;
  const highFlags = flags.filter((f) => f.severity === "High").length;
  const topDept = [...summary.departmentSpend30d].sort((a, b) => b.value - a.value)[0];
  const riskHigh = summary.riskBreakdown30d.find((r) => r.name === "High")?.value ?? 0;
  const healthScore = portfolioHealthScore(bundle);

  const spendVsPayroll =
    k.payrollMonthly > 0
      ? ((k.totalSpend30d / (k.payrollMonthly * 1)) * 100).toFixed(0)
      : null;

  const executiveBullets: string[] = [
    `Overall health score is ${healthScore}/100, synthesizing forecast risk, exception severity, and concentration posture for board-ready triage.`,
    `Spend over the reporting window is ${fmtMoney(k.totalSpend30d, cur)} with ${fmtMoney(
      k.payrollMonthly,
      cur,
    )} in monthly payroll exposure and ${k.flags30d} active risk signals.`,
    riskHigh > 0
      ? `${pct(riskHigh)} of categorized spend sits in elevated risk bands; governance review is warranted where concentration overlaps vendor dependency.`
      : "Risk concentration remains within tolerable bands; continue monitoring vendor dependency as spend mix shifts.",
    k.savingsOpportunity30d > 0
      ? `Identified savings levers approximate ${fmtMoney(k.savingsOpportunity30d, cur)} across rate, volume, and substitution opportunities.`
      : "Savings signals are muted in the current sample; validate category coverage and procurement policy alignment.",
    `Forecast risk score is ${k.forecastRiskScore}/100 with budget shortfall exposure near ${fmtMoney(
      forecast.cards.budgetShortfall,
      cur,
    )} under the baseline scenario.`,
  ];

  if (topDept) {
    executiveBullets.push(
      `${topDept.department} leads departmental outlays at ${fmtMoney(
        topDept.value,
        cur,
      )}; variance review against plan is recommended if this exceeds historical norms.`,
    );
  }

  const kpiNarrative = `KPI posture shows total spend of ${fmtMoney(
    k.totalSpend30d,
    cur,
  )} against payroll of ${fmtMoney(
    k.payrollMonthly,
    cur,
  )} and ${k.flags30d} flags. ${spendVsPayroll ? `Spend is roughly ${spendVsPayroll}% of a single month payroll baseline, useful for quick staffing vs. procurement balance checks.` : ""}`.trim();

  const alertsNarrative =
    highFlags > 0
      ? `Investigations backlog includes ${highFlags} high-severity items requiring executive visibility; owners and due dates should be confirmed to avoid audit tail risk.`
      : "No high-severity items surfaced in the sampled flag set; maintain cadence on medium items to prevent escalation.";

  const deptSorted = [...summary.departmentSpend30d].sort((a, b) => b.value - a.value);
  const second = deptSorted[1];
  const departmentNarrative = second
    ? `Departmental mix is led by ${topDept?.department ?? "—"} with meaningful follow-on concentration in ${second.department}. Efficiency comparisons favor benchmarking unit costs and purchase frequency between these groups.`
    : "Departmental concentration is limited in the current dataset; expand entity coverage for comparative efficiency views.";

  const forecastNarrative = `Scenario outlook implies payroll growth near ${pct(
    forecast.cards.payrollGrowthPct,
  )} with retirement wave pressure at ${pct(
    forecast.cards.retirementWavePct,
  )}. Overspend risk score registers ${forecast.cards.overspendRiskScore}/100; immediate procurement and hiring controls are advised if score remains elevated through the next close.`;

  const recommendations = [
    "Tighten variance commentary for the top three departments and tie actions to budget owners within two weeks.",
    highFlags > 0
      ? "Assign accountable owners and due dates for all high-severity flags; escalate blockers to finance leadership."
      : "Run a medium-risk sweep to confirm no latent issues are under-classified.",
    k.savingsOpportunity30d > 0
      ? `Prioritize quick wins totaling at least ${fmtMoney(
          Math.min(k.savingsOpportunity30d, k.savingsOpportunity30d * 0.25),
          cur,
        )} through renegotiation and demand management.`
      : "Refresh vendor rate cards and index-linked renewals ahead of the next cycle.",
    "Reconcile forecast assumptions with hiring plans and capex gates; publish a single source of truth for board consumption.",
  ];

  return {
    executiveBullets,
    kpiNarrative,
    alertsNarrative,
    departmentNarrative,
    forecastNarrative,
    recommendations,
  };
}
