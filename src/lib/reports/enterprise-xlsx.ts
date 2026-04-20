import * as XLSX from "xlsx";

import type { UploadedExecutiveBrief } from "@/lib/upload/briefs";
import type { UploadedInsights } from "@/lib/upload/storage";

import { buildNarrativePack } from "./enterprise-narrative";
import type { EnterpriseExportOptions } from "./export-options";
import type { ReportBundle } from "./report-bundle";
import { portfolioHealthScore } from "./health-score";

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

function applyHeaderFreezeAndFilter(ws: XLSX.WorkSheet, ref: string) {
  ws["!autofilter"] = { ref };
  ws["!views"] = [{ state: "frozen" as const, ySplit: 1, topLeftCell: "A2", activeCell: "A2", showGridLines: true }];
}

export function buildEnterpriseXlsxArrayBuffer(
  bundle: ReportBundle,
  briefs: UploadedExecutiveBrief[],
  uploads: UploadedInsights[],
  opts: EnterpriseExportOptions,
  reportVersion: string,
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const cur = bundle.org.currency || "USD";
  const k = bundle.summary.kpis;
  const narrative = buildNarrativePack(bundle);

  const summaryAoa: (string | number)[][] = [
    ["Spendda Intelligence™ — Excel Summary Pack"],
    [opts.organizationName],
    [`Entity: ${opts.entity}`],
    [`Period: ${opts.periodLabel}`],
    [`Generated (UTC): ${new Date().toISOString()}`],
    [],
    ["Executive summary (auto)"],
    ...narrative.executiveBullets.map((b) => ["•", b]),
    [],
    ...(opts.marketRegulatoryBullets?.length
      ? [
          ["Market & regulatory (client-filtered)", ""],
          ...opts.marketRegulatoryBullets.map((b) => ["•", b]),
          [],
        ]
      : []),
    ["Metric", "Value"],
    ["Currency", cur],
    ["Spend (30d)", k.totalSpend30d],
    ["Payroll (monthly)", k.payrollMonthly],
    ["Flags (30d)", k.flags30d],
    ["Savings opportunity (30d)", k.savingsOpportunity30d],
    ["Forecast risk score", k.forecastRiskScore],
    ["Portfolio health score (0-100)", portfolioHealthScore(bundle)],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  setColWidths(wsSummary, [48, 56]);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  const txRows = bundle.transactions.map((t) => ({
    id: t.id,
    date: t.date,
    vendorName: t.vendorName,
    category: t.category,
    amount: t.amount,
    currency: t.currency,
    invoiceId: t.invoiceId,
    paymentMethod: t.paymentMethod,
  }));
  const wsTx = XLSX.utils.json_to_sheet(txRows.length ? txRows : [{ note: "No transaction rows in export sample" }]);
  if (txRows.length) {
    const keys = Object.keys(txRows[0]!);
    const end = XLSX.utils.encode_cell({ r: txRows.length, c: keys.length - 1 });
    applyHeaderFreezeAndFilter(wsTx, `A1:${end}`);
  }
  setColWidths(wsTx, [14, 12, 28, 16, 12, 10, 18, 12]);
  XLSX.utils.book_append_sheet(wb, wsTx, "Transactions");

  const alertRows = bundle.flags.map((f) => {
    const m = bundle.investigations[f.id];
    return {
      id: f.id,
      title: f.title,
      severity: f.severity,
      date: f.date,
      score: f.score,
      owner: m?.owner ?? "",
      dueDate: m?.dueDate ?? "",
      status: m?.status ?? "",
    };
  });
  const wsAlerts = XLSX.utils.json_to_sheet(alertRows.length ? alertRows : [{ note: "No alert rows in export sample" }]);
  if (alertRows.length) {
    const keys = Object.keys(alertRows[0]!);
    const end = XLSX.utils.encode_cell({ r: alertRows.length, c: keys.length - 1 });
    applyHeaderFreezeAndFilter(wsAlerts, `A1:${end}`);
  }
  setColWidths(wsAlerts, [14, 40, 10, 12, 8, 16, 14, 12]);
  XLSX.utils.book_append_sheet(wb, wsAlerts, "Alerts");

  const fc = bundle.forecast.cards;
  const fcAoa: (string | number)[][] = [
    ["Forecasting"],
    ["Budget shortfall", fc.budgetShortfall],
    ["Retirement wave %", fc.retirementWavePct],
    ["Payroll growth %", fc.payrollGrowthPct],
    ["Overspend risk score", fc.overspendRiskScore],
    [],
    ["Month", "Spend variance"],
    ...bundle.forecast.spendVariance.slice(0, 12).map((p) => [p.month, p.value]),
    [],
    ["Month", "Payroll growth %"],
    ...bundle.forecast.payrollGrowth.slice(0, 12).map((p) => [p.month, p.value]),
  ];
  const wsFc = XLSX.utils.aoa_to_sheet(fcAoa);
  setColWidths(wsFc, [22, 18]);
  XLSX.utils.book_append_sheet(wb, wsFc, "Forecasting");

  const deptRows = [...bundle.summary.departmentSpend30d]
    .sort((a, b) => b.value - a.value)
    .map((d) => ({ department: d.department, spend30d: d.value }));
  const wsDept = XLSX.utils.json_to_sheet(deptRows.length ? deptRows : [{ department: "", spend30d: "" }]);
  if (deptRows.length) applyHeaderFreezeAndFilter(wsDept, `A1:B${deptRows.length + 1}`);
  setColWidths(wsDept, [32, 16]);
  XLSX.utils.book_append_sheet(wb, wsDept, "Departments");

  // ML assistive overlay (Phase 1) — separate sheet for analyst transparency.
  if (bundle.ml) {
    const ml = bundle.ml;
    const mlAoa: (string | number)[][] = [
      ["ML assistive overlay (Phase 1)"],
      ["Note", "Lightweight baselines; rules remain authoritative."],
      ["Overall ML confidence (%)", ml.confidencePct],
      [],
      ["Rules flags (30d)", ml.comparison.ruleFlags30d],
      ["ML anomalies (30d)", ml.comparison.mlAnomalies30d],
      ["Agreement estimate (%)", ml.comparison.overlapEstimate],
      [],
      ["Top ML anomalies"],
      ["kind", "title", "severity", "score", "confidencePct", "topDriver", "linkedRuleFlags"],
      ...ml.anomalies.top.slice(0, 25).map((a) => [
        a.kind,
        a.title,
        a.severity,
        a.score,
        a.confidencePct,
        a.explain?.[0] ?? "",
        a.linkedRuleFlags?.map((f) => `${f.ruleId}:${f.severity}:${f.score}`).join(" | ") ?? "",
      ]),
      [],
      ["Top vendor risk (ML)"],
      ["vendor", "riskScore", "confidencePct", "drivers"],
      ...ml.risk.topVendors.slice(0, 20).map((v) => [v.label, v.riskScore, v.confidencePct, (v.drivers || []).join(" | ")]),
      [],
      ["Top department risk (ML)"],
      ["department", "riskScore", "confidencePct", "drivers"],
      ...ml.risk.topDepartments
        .slice(0, 20)
        .map((d) => [d.label, d.riskScore, d.confidencePct, (d.drivers || []).join(" | ")]),
    ];
    const wsMl = XLSX.utils.aoa_to_sheet(mlAoa);
    setColWidths(wsMl, [18, 52, 12, 10, 14, 44, 44]);
    XLSX.utils.book_append_sheet(wb, wsMl, "ML");
  }

  const metaAoa: (string | number)[][] = [
    ["Metadata"],
    ["Prepared by", "Spendda Intelligence™"],
    ["Report version", reportVersion],
    ["Organization", opts.organizationName],
    ["Entity / branch", opts.entity],
    ["Reporting period", opts.periodLabel],
    ["Bundle fetched (UTC)", bundle.fetchedAt],
    ["ML overlay included", bundle.ml ? "yes" : "no"],
    ["Uploads count", uploads.length],
    ["Executive brief cards", briefs.length],
    ["Transactions sample rows", bundle.transactions.length],
    ["Flags sample rows", bundle.flags.length],
    [],
    ["Upload inventory"],
    ["kind", "entity", "filename", "uploadedAt"],
    ...uploads.map((x) => [x.kind, x.entity, x.filename, x.uploadedAt]),
    [],
    ["Executive briefs (text)"],
    ["title", "audience", "summary", "highlights"],
    ...briefs.map((b) => [b.title, b.audience, b.summary, b.highlights.join(" | ")]),
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaAoa);
  setColWidths(wsMeta, [28, 56]);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Metadata");

  const arr = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  const copy = new Uint8Array(arr.byteLength);
  copy.set(arr);
  return copy.buffer;
}
