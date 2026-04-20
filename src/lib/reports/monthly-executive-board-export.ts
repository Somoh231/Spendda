import { GState, jsPDF } from "jspdf";
import * as XLSX from "xlsx";

import type { EnterpriseExportOptions } from "@/lib/reports/export-options";
import type { MonthlyExecutiveReport } from "@/lib/reports/monthly-executive-report";

const BRAND_NAVY: [number, number, number] = [8, 18, 37];
const BRAND_BLUE: [number, number, number] = [59, 130, 246];

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

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/brand/spendda-logo.png", { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => reject(new Error("read fail"));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawWatermark(doc: jsPDF, text: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  doc.setGState(new GState({ opacity: 0.08 }));
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(42);
  doc.text(text, w / 2, h / 2, { align: "center", angle: 35 });
  doc.restoreGraphicsState();
}

function drawFooter(doc: jsPDF, pageIndex: number, totalPages: number, opts: EnterpriseExportOptions) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(48, h - 36, w - 48, h - 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Spendda Intelligence™ — Monthly Executive Report", 48, h - 22);
  doc.text(opts.organizationName, 48, h - 14);
  doc.text(opts.entity, 200, h - 14);
  doc.text(`Generated ${new Date().toLocaleString()}`, w - 48, h - 22, { align: "right" });
  doc.text(`Page ${pageIndex} of ${totalPages}`, w - 48, h - 14, { align: "right" });
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(48, y, 4, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(title, 58, y + 10);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(48, y + 18, doc.internal.pageSize.getWidth() - 48, y + 18);
  doc.setTextColor(20, 20, 20);
  return y + 28;
}

function wrapParagraph(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(35, 35, 35);
  let cy = y;
  for (const line of lines) {
    doc.text(line, x, cy);
    cy += lineHeight;
  }
  return cy + 4;
}

function drawBullets(doc: jsPDF, bullets: string[], x: number, y: number, maxWidth: number) {
  let cy = y;
  doc.setFontSize(10.5);
  for (const b of bullets) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_BLUE);
    doc.text("•", x, cy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(35, 35, 35);
    const lines = doc.splitTextToSize(b, maxWidth - 12) as string[];
    let lx = x + 8;
    let first = true;
    for (const line of lines) {
      doc.text(line, lx, cy);
      cy += 14;
      if (first) {
        lx = x + 8;
        first = false;
      }
    }
    cy += 2;
  }
  return cy;
}

function drawTable(doc: jsPDF, headers: string[], rows: string[][], startY: number, maxY: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const usable = pageW - margin * 2;
  const colCount = headers.length;
  const colW = usable / colCount;
  let y = startY;
  const rowH = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 6, usable, rowH + 2, "F");
  doc.setTextColor(...BRAND_NAVY);
  headers.forEach((h, i) => doc.text(h, margin + i * colW + 2, y + 4));
  y += rowH + 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  for (const row of rows) {
    if (y > maxY - 24) break;
    row.forEach((cell, i) => {
      const txt = doc.splitTextToSize(String(cell), colW - 4)[0] as string;
      doc.text(txt, margin + i * colW + 2, y);
    });
    y += rowH;
  }
  return y + 8;
}

function drawMiniBars(doc: jsPDF, items: { label: string; value: number }[], x: number, y: number, width: number, maxVal: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("Spend by department (top)", x, y);
  let cy = y + 14;
  const barMaxW = width - 120;
  for (const it of items.slice(0, 8)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(it.label.slice(0, 24), x, cy);
    const frac = maxVal > 0 ? it.value / maxVal : 0;
    doc.setFillColor(226, 232, 240);
    doc.rect(x + 120, cy - 5, barMaxW, 6, "F");
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(x + 120, cy - 5, barMaxW * frac, 6, "F");
    cy += 16;
  }
  return cy + 6;
}

function drawCover(doc: jsPDF, opts: EnterpriseExportOptions, logoDataUrl: string | null, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(0, 0, w, 230, "F");
  doc.setTextColor(255, 255, 255);
  if (opts.includeLogo && logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 56, 48, 72, 72);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("SPENDDA", 56, 110);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("SPENDDA", 56, 110);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Prepared by Spendda Intelligence™", 56, 200);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Monthly Executive Report", 56, 270);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(opts.organizationName, 56, 292);
  doc.text(`Scope: ${opts.entity}`, 56, 308);
  doc.text(`Period: ${opts.periodLabel}`, 56, 324);
  doc.text(subtitle, 56, 342);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 56, 358);
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(1);
  doc.line(56, 372, w - 56, 372);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Board-ready · Upload-derived metrics", 56, 388);
}

export async function buildMonthlyBoardPdfBlob(
  report: MonthlyExecutiveReport,
  opts: EnterpriseExportOptions,
): Promise<Blob> {
  const logo = opts.includeLogo ? await loadLogoDataUrl() : null;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const bottomSafe = pageH - 52;
  const maxText = pageW - 96;

  const applyWatermark = () => {
    if (opts.confidentialWatermark) drawWatermark(doc, "CONFIDENTIAL");
  };

  const sub =
    `Sources: spend **${report.sourceFiles.spend || "—"}** · payroll **${report.sourceFiles.payroll || "—"}**`;
  drawCover(doc, opts, logo, sub);
  applyWatermark();

  const addPage = () => {
    doc.addPage();
    applyWatermark();
  };

  addPage();
  let y = 56;
  y = drawSectionTitle(doc, "1. Executive summary", y);
  y = drawBullets(doc, report.executiveSummary, 48, y, maxText);
  if (opts.marketRegulatoryBullets?.length) {
    y = drawSectionTitle(doc, "Market & regulatory (client-filtered)", y + 4);
    y = drawBullets(doc, opts.marketRegulatoryBullets.slice(0, 8), 48, y, maxText);
  }

  if (y > bottomSafe - 100) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "2. KPI overview", y + 6);
  const cur = report.currency;
  const k = report.kpis;
  y = drawTable(
    doc,
    ["Metric", "Value"],
    [
      ["Total spend (scoped)", fmtMoney(k.totalSpend, cur)],
      ["Payroll (roll-up)", fmtMoney(k.payrollMonthly, cur)],
      ["Flagged rows (count)", String(k.flagsCount)],
      ["Savings opportunity (heuristic)", fmtMoney(k.savingsOpportunity, cur)],
      ["Forecast risk score", `${k.forecastRiskScore}/100`],
      ["Data readiness score (approx.)", `${k.healthScore}/100`],
    ],
    y + 4,
    bottomSafe,
  );

  if (opts.includeCharts) {
    const deptBars = report.departmentRanking.slice(0, 10).map((d) => ({ label: d.name, value: d.spend }));
    const maxVal = deptBars[0]?.value ?? 1;
    if (y > bottomSafe - 140) {
      addPage();
      y = 56;
    }
    if (deptBars.length) {
      y = drawMiniBars(doc, deptBars, 48, y + 4, maxText + 48, maxVal);
    }
  }

  if (y > bottomSafe - 120) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "3. Spend trends", y + 6);
  y = wrapParagraph(doc, report.spendTrendsCaption, 48, y, maxText, 14);
  const trendRows = report.spendTrendsMonthly.slice(-18).map((m) => [m.month, fmtMoney(m.total, cur)]);
  y = drawTable(doc, ["Month", "Spend"], trendRows.length ? trendRows : [["—", "No dated months"]], y + 4, bottomSafe);

  if (y > bottomSafe - 100) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "4. Payroll insights", y + 6);
  y = drawBullets(doc, report.payrollInsights, 48, y, maxText);

  if (y > bottomSafe - 100) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "5. Risk findings", y + 6);
  const riskRows = report.riskFindings.slice(0, 24).map((f) => [
    f.title.slice(0, 42),
    f.severity,
    f.date,
    String(f.score),
  ]);
  y = drawTable(
    doc,
    ["Finding", "Severity", "Date", "Score"],
    riskRows.length ? riskRows : [["No flagged rows in export window", "—", "—", "—"]],
    y + 4,
    bottomSafe,
  );

  if (y > bottomSafe - 100) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "6. Savings opportunities", y + 6);
  y = drawBullets(doc, report.savingsOpportunities, 48, y, maxText);

  if (y > bottomSafe - 120) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "7. Forecast", y + 6);
  y = wrapParagraph(doc, report.forecast.nextPeriodText, 48, y, maxText, 14);
  y = drawTable(
    doc,
    ["Indicator", "Value"],
    [
      ["Budget shortfall (heuristic)", fmtMoney(report.forecast.budgetShortfall, cur)],
      ["Retirement wave %", `${report.forecast.retirementWavePct.toFixed(1)}%`],
      ["Payroll growth %", `${report.forecast.payrollGrowthPct.toFixed(1)}%`],
      ["Overspend risk", `${report.forecast.overspendRiskScore}/100`],
    ],
    y + 4,
    bottomSafe,
  );

  if (y > bottomSafe - 80) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "8. Recommended actions", y + 6);
  y = drawBullets(doc, report.recommendedActions, 48, y, maxText);

  if (y > bottomSafe - 60) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "Appendix — data lineage", y + 6);
  y = wrapParagraph(
    doc,
    `All numeric sections are computed from normalized upload rows for **${report.entityLabel}** during **${report.periodLabel}**. Export anomalies separately as CSV for audit workpapers.`,
    48,
    y,
    maxText,
    14,
  );

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, opts);
  }
  return doc.output("blob");
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

function freezeHeader(ws: XLSX.WorkSheet, ref: string) {
  ws["!autofilter"] = { ref };
  ws["!views"] = [{ state: "frozen" as const, ySplit: 1, topLeftCell: "A2", activeCell: "A2", showGridLines: true }];
}

export function buildMonthlyBoardXlsxArrayBuffer(
  report: MonthlyExecutiveReport,
  opts: EnterpriseExportOptions,
  reportVersion: string,
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const cur = report.currency;

  const cover: (string | number)[][] = [
    ["Spendda — Monthly Executive Report (Upload)"],
    [opts.organizationName],
    [`Scope: ${opts.entity}`],
    [`Period: ${opts.periodLabel}`],
    [`Generated (UTC): ${report.generatedAt}`],
    [`Report version: ${reportVersion}`],
    [],
    ["Spend file", report.sourceFiles.spend ?? "—"],
    ["Payroll file", report.sourceFiles.payroll ?? "—"],
    [],
    ["1. Executive summary"],
    ...report.executiveSummary.map((b) => [b]),
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(cover);
  setColWidths(wsCover, [72]);
  XLSX.utils.book_append_sheet(wb, wsCover, "Cover");

  const k = report.kpis;
  const kpiRows = [
    ["Metric", "Value"],
    ["Total spend (scoped)", k.totalSpend],
    ["Payroll roll-up", k.payrollMonthly],
    ["Flagged rows", k.flagsCount],
    ["Savings opportunity (heuristic)", k.savingsOpportunity],
    ["Forecast risk score", k.forecastRiskScore],
    ["Data readiness (approx.)", k.healthScore],
  ];
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
  setColWidths(wsKpi, [36, 20]);
  XLSX.utils.book_append_sheet(wb, wsKpi, "KPIs");

  const trend = [["Month", "Spend"], ...report.spendTrendsMonthly.map((m) => [m.month, m.total])];
  const wsTrend = XLSX.utils.aoa_to_sheet(trend.length > 1 ? trend : [["Month", "Spend"], ["—", 0]]);
  setColWidths(wsTrend, [14, 16]);
  if (trend.length > 1) freezeHeader(wsTrend, `A1:B${trend.length}`);
  XLSX.utils.book_append_sheet(wb, wsTrend, "Spend_trends");

  const deptSheet = [
    ["Department", "Spend", "Pct_of_total"],
    ...report.departmentRanking.map((d) => [d.name, d.spend, Math.round(d.pctOfTotal * 10) / 10]),
  ];
  const wsDept = XLSX.utils.aoa_to_sheet(deptSheet.length > 1 ? deptSheet : [["Department", "Spend", "Pct"], ["—", 0, 0]]);
  setColWidths(wsDept, [28, 16, 14]);
  if (deptSheet.length > 1) freezeHeader(wsDept, `A1:C${deptSheet.length}`);
  XLSX.utils.book_append_sheet(wb, wsDept, "Dept_ranking");

  const pay = [["Insight"], ...report.payrollInsights.map((x) => [x])];
  const wsPay = XLSX.utils.aoa_to_sheet(pay);
  setColWidths(wsPay, [80]);
  XLSX.utils.book_append_sheet(wb, wsPay, "Payroll");

  const risk = report.riskFindings.map((f) => ({
    title: f.title,
    severity: f.severity,
    date: f.date,
    score: f.score,
    entity: f.entity,
  }));
  const wsRisk = XLSX.utils.json_to_sheet(risk.length ? risk : [{ title: "No risks in window" }]);
  if (risk.length) {
    const end = XLSX.utils.encode_cell({ r: risk.length, c: 4 });
    freezeHeader(wsRisk, `A1:${end}`);
  }
  setColWidths(wsRisk, [48, 12, 12, 8, 12]);
  XLSX.utils.book_append_sheet(wb, wsRisk, "Risks");

  const sav = [["Opportunity"], ...report.savingsOpportunities.map((x) => [x])];
  const wsSav = XLSX.utils.aoa_to_sheet(sav);
  setColWidths(wsSav, [90]);
  XLSX.utils.book_append_sheet(wb, wsSav, "Savings");

  const fc = report.forecast;
  const wsFc = XLSX.utils.aoa_to_sheet([
    ["Forecast block"],
    ["Budget shortfall", fc.budgetShortfall],
    ["Retirement wave %", fc.retirementWavePct],
    ["Payroll growth %", fc.payrollGrowthPct],
    ["Overspend risk score", fc.overspendRiskScore],
    [],
    ["Next-period narrative"],
    [fc.nextPeriodText],
  ]);
  setColWidths(wsFc, [28, 44]);
  XLSX.utils.book_append_sheet(wb, wsFc, "Forecast");

  const act = [["Action"], ...report.recommendedActions.map((x) => [x])];
  const wsAct = XLSX.utils.aoa_to_sheet(act);
  setColWidths(wsAct, [100]);
  XLSX.utils.book_append_sheet(wb, wsAct, "Actions");

  const anom = report.anomalyRows.map((r) => ({
    date: r.date,
    vendor: r.vendor,
    department: r.department,
    amount: r.amount,
    flags: r.flags,
    invoiceId: r.invoiceId,
  }));
  const wsAn = XLSX.utils.json_to_sheet(anom.length ? anom : [{ note: "No anomaly rows" }]);
  if (anom.length) {
    const keys = Object.keys(anom[0]!);
    const end = XLSX.utils.encode_cell({ r: anom.length, c: keys.length - 1 });
    freezeHeader(wsAn, `A1:${end}`);
  }
  setColWidths(wsAn, [12, 28, 20, 14, 40, 20]);
  XLSX.utils.book_append_sheet(wb, wsAn, "Anomalies");

  const arr = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  const copy = new Uint8Array(arr.byteLength);
  copy.set(arr);
  return copy.buffer;
}

function esc(s: string) {
  const t = String(s ?? "");
  if (/[",\n]/.test(t)) return `"${t.replaceAll('"', '""')}"`;
  return t;
}

export function buildMonthlyAnomaliesCsv(report: MonthlyExecutiveReport, opts: EnterpriseExportOptions, reportVersion: string): string {
  const lines: string[] = [];
  lines.push("# SPENDDA_MONTHLY_ANOMALIES_CSV");
  lines.push(`# organization,${esc(opts.organizationName)}`);
  lines.push(`# entity,${esc(opts.entity)}`);
  lines.push(`# period,${esc(opts.periodLabel)}`);
  lines.push(`# generated_utc,${report.generatedAt}`);
  lines.push(`# report_version,${reportVersion}`);
  lines.push("");
  const h = ["date", "vendor", "department", "amount", "flags", "invoice_id"].map(esc).join(",");
  lines.push(h);
  for (const r of report.anomalyRows) {
    lines.push([r.date, r.vendor, r.department, r.amount, r.flags, r.invoiceId].map((c) => esc(String(c))).join(","));
  }
  return lines.join("\n");
}
