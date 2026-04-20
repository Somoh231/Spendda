import type { UploadedExecutiveBrief } from "@/lib/upload/briefs";
import type { UploadedInsights } from "@/lib/upload/storage";

import { buildNarrativePack } from "./enterprise-narrative";
import type { EnterpriseExportOptions } from "./export-options";
import type { ReportBundle } from "./report-bundle";
import { portfolioHealthScore } from "./health-score";

function esc(s: string) {
  const t = String(s ?? "");
  if (/[",\n]/.test(t)) return `"${t.replaceAll('"', '""')}"`;
  return t;
}

function csvLines(headers: string[], rows: (string | number | boolean)[][]) {
  const h = headers.map(esc).join(",");
  const body = rows.map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
  return `${h}\n${body}`;
}

export function buildRawDataCsvExport(
  bundle: ReportBundle,
  briefs: UploadedExecutiveBrief[],
  uploads: UploadedInsights[],
  opts: EnterpriseExportOptions,
  reportVersion: string,
): string {
  const k = bundle.summary.kpis;
  const cur = bundle.org.currency || "USD";
  const narrative = buildNarrativePack(bundle);
  const parts: string[] = [];

  parts.push("# SPENDDA_RAW_DATA_EXPORT");
  parts.push(`# organization,${esc(opts.organizationName)}`);
  parts.push(`# entity,${esc(opts.entity)}`);
  parts.push(`# period,${esc(opts.periodLabel)}`);
  parts.push(`# generated_utc,${new Date().toISOString()}`);
  parts.push(`# report_version,${reportVersion}`);
  parts.push("");

  parts.push("## EXECUTIVE_NARRATIVE_BULLETS");
  parts.push(csvLines(["bullet"], narrative.executiveBullets.map((b) => [b])));
  parts.push("");

  parts.push("## SUMMARY_KPIS");
  parts.push(
    csvLines(
      ["metric", "value", "currency"],
      [
        ["spend_30d", k.totalSpend30d, cur],
        ["payroll_monthly", k.payrollMonthly, cur],
        ["flags_30d", k.flags30d, ""],
        ["savings_opportunity_30d", k.savingsOpportunity30d, cur],
        ["forecast_risk_score", k.forecastRiskScore, ""],
        ["portfolio_health_score", portfolioHealthScore(bundle), ""],
      ],
    ),
  );
  parts.push("");

  parts.push("## DEPARTMENTS_SPEND_30D");
  parts.push(
    csvLines(
      ["department", "spend"],
      [...bundle.summary.departmentSpend30d].map((d) => [d.department, d.value]),
    ),
  );
  parts.push("");

  parts.push("## FLAGS");
  parts.push(
    csvLines(
      ["id", "title", "severity", "date", "score", "owner", "due_date", "status"],
      bundle.flags.map((f) => {
        const m = bundle.investigations[f.id];
        return [f.id, f.title, f.severity, f.date, f.score, m?.owner ?? "", m?.dueDate ?? "", m?.status ?? ""];
      }),
    ),
  );
  parts.push("");

  parts.push("## TRANSACTIONS_SAMPLE");
  parts.push(
    csvLines(
      ["id", "date", "vendorName", "category", "amount", "currency", "invoiceId", "paymentMethod"],
      bundle.transactions.map((t) => [
        t.id,
        t.date,
        t.vendorName,
        t.category,
        t.amount,
        t.currency,
        t.invoiceId,
        t.paymentMethod,
      ]),
    ),
  );
  parts.push("");

  parts.push("## FORECAST_CARDS");
  parts.push(
    csvLines(
      ["budgetShortfall", "retirementWavePct", "payrollGrowthPct", "overspendRiskScore"],
      [
        [
          bundle.forecast.cards.budgetShortfall,
          bundle.forecast.cards.retirementWavePct,
          bundle.forecast.cards.payrollGrowthPct,
          bundle.forecast.cards.overspendRiskScore,
        ],
      ],
    ),
  );
  parts.push("");

  parts.push("## FORECAST_SPEND_VARIANCE");
  parts.push(csvLines(["month", "value"], bundle.forecast.spendVariance.map((p) => [p.month, p.value])));
  parts.push("");

  if (bundle.ml) {
    parts.push("## ML_OVERLAY_META");
    parts.push(
      csvLines(
        ["metric", "value"],
        [
          ["ml_confidence_pct", bundle.ml.confidencePct],
          ["rules_flags_30d", bundle.ml.comparison.ruleFlags30d],
          ["ml_anomalies_30d", bundle.ml.comparison.mlAnomalies30d],
          ["agreement_estimate_pct", bundle.ml.comparison.overlapEstimate],
        ],
      ),
    );
    parts.push("");

    parts.push("## ML_TOP_ANOMALIES");
    parts.push(
      csvLines(
        ["kind", "title", "severity", "score", "confidencePct", "topDriver", "linkedRuleFlags"],
        bundle.ml.anomalies.top.slice(0, 40).map((a) => [
          a.kind,
          a.title,
          a.severity,
          a.score,
          a.confidencePct,
          a.explain?.[0] ?? "",
          a.linkedRuleFlags?.map((f) => `${f.ruleId}:${f.severity}:${f.score}`).join(" | ") ?? "",
        ]),
      ),
    );
    parts.push("");
  }

  parts.push("## UPLOADS");
  parts.push(
    csvLines(
      ["kind", "entity", "filename", "uploadedAt"],
      uploads.map((u) => [u.kind, u.entity, u.filename, u.uploadedAt]),
    ),
  );
  parts.push("");

  parts.push("## EXECUTIVE_BRIEFS");
  parts.push(
    csvLines(
      ["title", "audience", "summary", "highlights"],
      briefs.map((b) => [b.title, b.audience, b.summary, b.highlights.join(" | ")]),
    ),
  );

  return parts.join("\n");
}
