import type { DemoDataset } from "@/lib/demo-data/types";

import { buildMlAnomalies, type MlAnomaly } from "./anomaly";
import { buildMlForecast, type MlForecast } from "./forecast";
import { buildDepartmentRiskScores, buildVendorRiskScores, type MlRiskRow } from "./risk";

export type MlSummary = {
  generatedAt: string;
  confidencePct: number;
  anomalies: {
    total: number;
    byKind: Record<string, number>;
    top: MlAnomaly[];
  };
  risk: {
    topVendors: MlRiskRow[];
    topDepartments: MlRiskRow[];
  };
  forecast: MlForecast;
  comparison: {
    ruleFlags30d: number;
    mlAnomalies30d: number;
    overlapEstimate: number;
    explain: string[];
  };
};

export function buildMlSummary(dataset: DemoDataset): MlSummary {
  const anomalies = buildMlAnomalies(dataset, { lookbackDays: 30 });
  const byKind: Record<string, number> = {};
  anomalies.forEach((a) => (byKind[a.kind] = (byKind[a.kind] || 0) + 1));

  const topVendors = buildVendorRiskScores(dataset, { lookbackDays: 30 });
  const topDepartments = buildDepartmentRiskScores(dataset, { lookbackDays: 30 });
  const forecast = buildMlForecast(dataset, 6);

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const ruleFlags30d = dataset.flags.filter((f) => f.date >= cutoff).length;

  // Overlap estimate: % of ML anomalies that have at least one linked rule flag.
  const overlapped = anomalies.filter((a) => (a.linkedRuleFlags?.length || 0) > 0).length;
  const overlapEstimate = anomalies.length ? Math.round((overlapped / anomalies.length) * 100) : 0;

  const conf =
    anomalies.length === 0
      ? 72
      : Math.round(
          Math.min(
            95,
            Math.max(
              45,
              anomalies.slice(0, 12).reduce((acc, a) => acc + a.confidencePct, 0) / Math.min(12, anomalies.length),
            ),
          ),
        );

  return {
    generatedAt: new Date().toISOString(),
    confidencePct: conf,
    anomalies: {
      total: anomalies.length,
      byKind,
      top: anomalies.slice(0, 12),
    },
    risk: {
      topVendors,
      topDepartments,
    },
    forecast,
    comparison: {
      ruleFlags30d,
      mlAnomalies30d: anomalies.length,
      overlapEstimate,
      explain: [
        "Rules engine: deterministic control checks (duplicate invoices, repeated payments, unusual vendor spikes, duplicate bank accounts).",
        "ML layer: statistical baselines for outliers, clustering, and trend deviation; produces confidence + drivers.",
        "Overlap = where both methods agree; deltas highlight candidates for analyst review and threshold tuning.",
      ],
    },
  };
}

