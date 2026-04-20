import type { ReportBundle } from "./report-bundle";

export function portfolioHealthScoreParts(parts: {
  forecastRiskScore: number;
  highFlagCount: number;
  riskHighSpendPct: number;
}): number {
  const k = parts.forecastRiskScore;
  const highFlags = parts.highFlagCount;
  const riskHigh = parts.riskHighSpendPct;
  return Math.max(
    0,
    Math.min(100, Math.round(100 - k * 0.45 - Math.min(35, highFlags * 6) - Math.min(15, riskHigh * 0.12))),
  );
}

/** Composite 0–100 index for executive summaries (higher is healthier). */
export function portfolioHealthScore(bundle: ReportBundle): number {
  const k = bundle.summary.kpis;
  const highFlags = bundle.flags.filter((f) => f.severity === "High").length;
  const riskHigh = bundle.summary.riskBreakdown30d.find((r) => r.name === "High")?.value ?? 0;
  return portfolioHealthScoreParts({
    forecastRiskScore: k.forecastRiskScore,
    highFlagCount: highFlags,
    riskHighSpendPct: riskHigh,
  });
}
