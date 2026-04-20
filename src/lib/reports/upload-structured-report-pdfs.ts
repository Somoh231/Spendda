import { GState, jsPDF } from "jspdf";

import type { StructuredWorkspaceAnalytics } from "@/lib/analytics/structured-workspace-analytics";
import type { EnterpriseExportOptions } from "@/lib/reports/export-options";

const BRAND_NAVY: [number, number, number] = [8, 18, 37];
const BRAND_BLUE: [number, number, number] = [59, 130, 246];

export type UploadStructuredPdfKind =
  | "monthly_owner"
  | "board_summary"
  | "payroll_review"
  | "savings_opportunities"
  | "cash_pressure";

function fmtMoney(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
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

function drawFooter(doc: jsPDF, pageIndex: number, totalPages: number, opts: EnterpriseExportOptions, reportLine: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(48, h - 36, w - 48, h - 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Spendda Intelligence™", 48, h - 22);
  doc.text(reportLine, 48, h - 14);
  doc.text(opts.organizationName, 200, h - 14);
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

function drawMiniBars(
  doc: jsPDF,
  title: string,
  items: { label: string; value: number }[],
  x: number,
  y: number,
  width: number,
  maxVal: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(title, x, y);
  let cy = y + 14;
  const barMaxW = width - 120;
  for (const it of items.slice(0, 8)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(it.label.slice(0, 26), x, cy);
    const frac = maxVal > 0 ? it.value / maxVal : 0;
    doc.setFillColor(226, 232, 240);
    doc.rect(x + 120, cy - 5, barMaxW, 6, "F");
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(x + 120, cy - 5, barMaxW * frac, 6, "F");
    cy += 16;
  }
  return cy + 6;
}

function drawMonthlyLineChart(
  doc: jsPDF,
  title: string,
  series: Array<{ month: string; spend: number }>,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(title, x, y);
  const top = y + 14;
  const pad = 10;
  const cw = w - pad * 2;
  const ch = h - 28;
  const pts = series.filter((p) => p.month).slice(-14);
  if (pts.length < 2) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Not enough monthly buckets to chart.", x + pad, top + ch / 2);
    return top + h + 6;
  }
  const maxV = Math.max(...pts.map((p) => p.spend), 1);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(x + pad, top, cw, ch);
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(1.2);
  const dx = cw / Math.max(1, pts.length - 1);
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = x + pad + i * dx;
    const y1 = top + ch - (pts[i]!.spend / maxV) * (ch - 8) - 4;
    const x2 = x + pad + (i + 1) * dx;
    const y2 = top + ch - (pts[i + 1]!.spend / maxV) * (ch - 8) - 4;
    doc.line(x1, y1, x2, y2);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  const step = Math.max(1, Math.ceil(pts.length / 6));
  for (let i = 0; i < pts.length; i += step) {
    const tx = x + pad + i * dx - 8;
    doc.text(pts[i]!.month.slice(5), tx, top + ch + 10);
  }
  return top + h + 8;
}

function drawCover(
  doc: jsPDF,
  opts: EnterpriseExportOptions,
  title: string,
  subtitle: string,
  logoDataUrl: string | null,
) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(0, 0, w, 220, "F");
  doc.setTextColor(255, 255, 255);
  if (opts.includeLogo && logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 56, 48, 64, 64);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text("SPENDDA", 56, 100);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("SPENDDA", 56, 100);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Spendda Intelligence™", 56, 188);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, 56, 258);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.text(subtitle, 56, 280);
  doc.text(opts.organizationName, 56, 298);
  doc.text(`Entity: ${opts.entity}`, 56, 314);
  doc.text(`Period: ${opts.periodLabel}`, 56, 330);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 56, 346);
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(1);
  doc.line(56, 362, w - 56, 362);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Confidential — for authorized distribution only.", 56, 378);
}

function collectFindings(s: StructuredWorkspaceAnalytics): string[] {
  const out: string[] = [];
  out.push(s.summaryLine);
  for (const x of s.profitability.signals) out.push(x.detail);
  for (const x of s.debtPressure.signals.slice(0, 4)) out.push(x.detail);
  if (s.unusualTransactions.countAtOrAboveP95 > 0) {
    out.push(
      `${s.unusualTransactions.countAtOrAboveP95} transactions at or above the p95 amount (${fmtMoney(s.unusualTransactions.p95Amount)}).`,
    );
  }
  if (s.duplicateCharges.totalSignals > 0) {
    out.push(`${s.duplicateCharges.totalSignals} duplicate / repeat payment signals in scope.`);
  }
  return out.slice(0, 10);
}

function collectRecommendations(s: StructuredWorkspaceAnalytics): string[] {
  const out = s.costSavingsOpportunities.map((c) => `${c.title} — ${c.rationale} (est. ${fmtMoney(c.estimatedImpactUsd)}, ${c.confidence} confidence)`);
  if (s.forecast90Day.projectedTotalApprox90d > 0) {
    out.push(
      `Forward ~90d spend trajectory (sum of 3 projected months): ${fmtMoney(s.forecast90Day.projectedTotalApprox90d)}. ${s.forecast90Day.confidenceNote}`,
    );
  }
  return out.slice(0, 12);
}

function insufficientDataPage(doc: jsPDF, opts: EnterpriseExportOptions, title: string) {
  let y = 72;
  y = drawSectionTitle(doc, title, y);
  y = wrapParagraph(
    doc,
    "No upload-backed analytics could be built for the current entity and date range. Load spend or payroll in Upload Data, set the analytics range in the app header, then download again.",
    48,
    y,
    doc.internal.pageSize.getWidth() - 96,
    14,
  );
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Scope: ${opts.entity} · ${opts.periodLabel}`, 48, y + 8);
}

function finalizeDoc(doc: jsPDF, opts: EnterpriseExportOptions, footerTag: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, opts, footerTag);
  }
  return doc.output("blob");
}

async function startBrandedLetterhead(opts: EnterpriseExportOptions, meta: { cover: string; subtitle: string }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const logo = opts.includeLogo ? await loadLogoDataUrl() : null;
  const bottomSafe = doc.internal.pageSize.getHeight() - 48;
  const pageW = doc.internal.pageSize.getWidth();
  const wm = () => {
    if (opts.confidentialWatermark) drawWatermark(doc, "CONFIDENTIAL");
  };
  drawCover(doc, opts, meta.cover, meta.subtitle, logo);
  wm();
  const addPage = () => {
    doc.addPage();
    wm();
  };
  addPage();
  return { doc, bottomSafe, pageW, addPage };
}

export async function buildUploadStructuredReportPdfBlob(
  kind: UploadStructuredPdfKind,
  structured: StructuredWorkspaceAnalytics | null,
  opts: EnterpriseExportOptions,
): Promise<Blob> {
  const titles: Record<UploadStructuredPdfKind, { cover: string; subtitle: string; footer: string }> = {
    monthly_owner: {
      cover: "Monthly Owner Report",
      subtitle: "Financial findings, charts, and actions from your uploads",
      footer: "Monthly Owner Report",
    },
    board_summary: {
      cover: "Board Summary",
      subtitle: "Condensed KPIs, risks, and outlook for governance",
      footer: "Board Summary",
    },
    payroll_review: {
      cover: "Payroll Review",
      subtitle: "Cost, coverage, and workforce risk signals",
      footer: "Payroll Review",
    },
    savings_opportunities: {
      cover: "Savings Opportunities",
      subtitle: "Heuristic savings signals tied to uploaded transactions",
      footer: "Savings Opportunities",
    },
    cash_pressure: {
      cover: "Cash Pressure Report",
      subtitle: "Liquidity stress proxies from spend, loans, and concentration",
      footer: "Cash Pressure Report",
    },
  };
  const meta = titles[kind];

  if (!structured) {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    if (opts.confidentialWatermark) drawWatermark(doc, "CONFIDENTIAL");
    insufficientDataPage(doc, opts, meta.cover);
    return finalizeDoc(doc, opts, meta.footer);
  }

  const { doc, bottomSafe, pageW, addPage } = await startBrandedLetterhead(opts, meta);
  let y = 56;

  const kpiRows: string[][] = [
    ["Total spend (scoped)", fmtMoney(structured.totalSpend.amount)],
    ["Spend rows", String(structured.totalSpend.transactionCount)],
    ["Payroll cost (scoped)", fmtMoney(structured.payrollVsRevenue.payrollCostInScope)],
    ["Payroll % of detected revenue", structured.payrollVsRevenue.payrollAsPctOfRevenue != null ? `${structured.payrollVsRevenue.payrollAsPctOfRevenue.toFixed(1)}%` : "n/a"],
    ["Duplicate / repeat signals", String(structured.duplicateCharges.totalSignals)],
    ["Debt pressure score", `${structured.debtPressure.score0to100}/100`],
    ["Profitability score", `${structured.profitability.score0to100}/100`],
    ["≈90d projected spend (3 mo sum)", fmtMoney(structured.forecast90Day.projectedTotalApprox90d)],
  ];

  if (kind === "board_summary") {
    y = drawSectionTitle(doc, "Executive snapshot", y);
    y = wrapParagraph(
      doc,
      "This board summary is generated only from normalized uploads and the active analytics date range — no synthetic transactions.",
      48,
      y,
      pageW - 96,
      14,
    );
    y = drawTable(doc, ["Metric", "Value"], kpiRows, y + 4, bottomSafe);
    y = drawSectionTitle(doc, "Key findings", y + 6);
    y = drawBullets(doc, collectFindings(structured).slice(0, 6), 48, y, pageW - 96);
    y = drawSectionTitle(doc, "Recommendations", y + 6);
    y = drawBullets(doc, collectRecommendations(structured).slice(0, 6), 48, y, pageW - 96);
    if (opts.includeCharts && structured.monthOverMonthTrends.series.length >= 2) {
      if (y > bottomSafe - 140) {
        addPage();
        y = 56;
      }
      y = drawMonthlyLineChart(
        doc,
        "Monthly spend trend",
        structured.monthOverMonthTrends.series.map((r) => ({ month: r.month, spend: r.spend })),
        48,
        y + 4,
        pageW - 96,
        120,
      );
    }
    return finalizeDoc(doc, opts, meta.footer);
  }

  if (kind === "payroll_review") {
    y = drawSectionTitle(doc, "Payroll economics", y);
    y = wrapParagraph(doc, structured.payrollVsRevenue.interpretation, 48, y, pageW - 96, 14);
    y = drawTable(
      doc,
      ["Measure", "Value"],
      [
        ["Payroll cost in scope", fmtMoney(structured.payrollVsRevenue.payrollCostInScope)],
        ["Revenue from upload (sum)", structured.payrollVsRevenue.revenueFromUpload != null ? fmtMoney(structured.payrollVsRevenue.revenueFromUpload) : "—"],
        ["Annualized payroll (est.)", structured.payrollVsRevenue.annualizedPayrollEstimate != null ? fmtMoney(structured.payrollVsRevenue.annualizedPayrollEstimate) : "—"],
        ["Data quality", structured.payrollVsRevenue.dataQuality],
      ],
      y + 4,
      bottomSafe,
    );
    y = drawSectionTitle(doc, "Workforce risk mix (heuristic)", y + 8);
    const pr = structured.overtimeTrends.payrollRiskMix;
    const maxR = Math.max(pr.highRiskCount, pr.mediumRiskCount, pr.lowRiskCount, 1);
    if (opts.includeCharts) {
      y = drawMiniBars(
        doc,
        "Payroll rows by risk band",
        [
          { label: "High", value: pr.highRiskCount },
          { label: "Medium", value: pr.mediumRiskCount },
          { label: "Low", value: pr.lowRiskCount },
        ],
        48,
        y + 4,
        pageW - 96,
        maxR,
      );
    }
    y = wrapParagraph(doc, pr.note, 48, y + 4, pageW - 96, 13);
    y = drawSectionTitle(doc, "Recommendations", y + 8);
    y = drawBullets(
      doc,
      [
        "Reconcile high/medium rows against HRIS terminations and bank master data before each payroll close.",
        "If revenue columns exist on spend, validate payroll % of revenue with finance — upload quality is labeled on this report.",
      ],
      48,
      y,
      pageW - 96,
    );
    return finalizeDoc(doc, opts, meta.footer);
  }

  if (kind === "savings_opportunities") {
    y = drawSectionTitle(doc, "Savings signals", y);
    y = wrapParagraph(
      doc,
      "Estimated impacts are heuristics from flagged spend, concentration, and tail-risk rows — use as a triage list, not audited savings.",
      48,
      y,
      pageW - 96,
      14,
    );
    const rows = structured.costSavingsOpportunities.map((c) => [
      c.title.slice(0, 36),
      fmtMoney(c.estimatedImpactUsd),
      c.confidence,
      c.rationale.slice(0, 52) + (c.rationale.length > 52 ? "…" : ""),
    ]);
    y = drawTable(doc, ["Opportunity", "Est. USD", "Confidence", "Rationale"], rows.length ? rows : [["—", "—", "—", "No rows"]], y + 6, bottomSafe);
    if (opts.includeCharts) {
      const depts = structured.departmentRanking.map((d) => ({ label: d.department, value: d.spend }));
      const maxD = depts[0]?.value ?? 1;
      if (y > bottomSafe - 160) {
        addPage();
        y = 56;
      }
      y = drawMiniBars(doc, "Spend concentration by department", depts, 48, y + 8, pageW - 96, maxD);
    }
    y = drawSectionTitle(doc, "Duplicate / repeat context", y + 8);
    y = drawBullets(
      doc,
      [
        `Duplicate invoice signals: ${structured.duplicateCharges.duplicateInvoiceCount}`,
        `Repeated payment signals: ${structured.duplicateCharges.repeatedPaymentCount}`,
        `Vendor + amount repeated ≥3×: ${structured.duplicateCharges.vendorAmountRepeat3PlusCount}`,
      ],
      48,
      y,
      pageW - 96,
    );
    return finalizeDoc(doc, opts, meta.footer);
  }

  if (kind === "cash_pressure") {
    y = drawSectionTitle(doc, "Cash pressure indicators", y);
    y = drawTable(
      doc,
      ["Indicator", "Value"],
      [
        ["Debt pressure score (0–100)", String(structured.debtPressure.score0to100)],
        ["Loan-style payments detected", fmtMoney(structured.debtPressure.loanPaymentsDetectedInScope)],
        ["Top vendor concentration (% of spend)", `${structured.topVendors[0]?.pctOfSpend.toFixed(1) ?? "—"}% (top vendor)`],
        ["≈90d projected spend", fmtMoney(structured.forecast90Day.projectedTotalApprox90d)],
        ["Latest MoM spend change", structured.monthOverMonthTrends.latestChangePct != null ? `${structured.monthOverMonthTrends.latestChangePct.toFixed(1)}%` : "n/a"],
      ],
      y + 4,
      bottomSafe,
    );
    y = drawSectionTitle(doc, "Findings", y + 8);
    y = drawBullets(doc, structured.debtPressure.signals.map((s) => s.detail), 48, y, pageW - 96);
    y = drawSectionTitle(doc, "Recommendations", y + 8);
    y = drawBullets(
      doc,
      [
        "Stress-test next 90 days of cash using the projected spend series plus known payroll cycles.",
        "If loan payment columns are populated, validate against debt schedule and covenant headroom.",
        "Reduce vendor concentration where top-1 share exceeds policy thresholds.",
      ],
      48,
      y,
      pageW - 96,
    );
    if (opts.includeCharts && structured.monthOverMonthTrends.series.length >= 2) {
      if (y > bottomSafe - 140) {
        addPage();
        y = 56;
      }
      y = drawMonthlyLineChart(
        doc,
        "Spend trajectory (uploaded months)",
        structured.monthOverMonthTrends.series.map((r) => ({ month: r.month, spend: r.spend })),
        48,
        y + 4,
        pageW - 96,
        110,
      );
    }
    return finalizeDoc(doc, opts, meta.footer);
  }

  // monthly_owner — full pack
  y = drawSectionTitle(doc, "1. KPI overview", y);
  y = wrapParagraph(
    doc,
    "Figures below are computed from normalized workspace uploads for the selected entity and analytics date range.",
    48,
    y,
    pageW - 96,
    14,
  );
  y = drawTable(doc, ["Metric", "Value"], kpiRows, y + 4, bottomSafe);

  if (opts.includeCharts) {
    if (y > bottomSafe - 200) {
      addPage();
      y = 56;
    }
    if (structured.monthOverMonthTrends.series.length >= 2) {
      y = drawMonthlyLineChart(
        doc,
        "2. Monthly spend trend",
        structured.monthOverMonthTrends.series.map((r) => ({ month: r.month, spend: r.spend })),
        48,
        y + 8,
        pageW - 96,
        130,
      );
    }
    const vendors = structured.topVendors.map((v) => ({ label: v.name, value: v.spend }));
    const vmax = vendors[0]?.value ?? 1;
    y = drawMiniBars(doc, "3. Top vendors by spend", vendors, 48, y + 8, pageW - 96, vmax);
    const depts = structured.departmentRanking.map((d) => ({ label: d.department, value: d.spend }));
    const dmax = depts[0]?.value ?? 1;
    y = drawMiniBars(doc, "4. Departments by spend", depts, 48, y + 8, pageW - 96, dmax);
  }

  if (y > bottomSafe - 120) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "5. Findings", y + 6);
  y = drawBullets(doc, collectFindings(structured), 48, y, pageW - 96);

  if (y > bottomSafe - 120) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "6. Recommendations", y + 6);
  y = drawBullets(doc, collectRecommendations(structured), 48, y, pageW - 96);

  if (y > bottomSafe - 80) {
    addPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "7. Forecast note", y + 6);
  y = wrapParagraph(doc, `${structured.forecast90Day.method}\n\n${structured.forecast90Day.confidenceNote}`, 48, y, pageW - 96, 14);

  return finalizeDoc(doc, opts, meta.footer);
}

export function uploadStructuredReportFilename(kind: UploadStructuredPdfKind, entity: string) {
  const safe = entity.replace(/[^\w\-]+/g, "_").slice(0, 48) || "scope";
  const stamp = new Date().toISOString().slice(0, 10);
  const map: Record<UploadStructuredPdfKind, string> = {
    monthly_owner: `Spendda-Monthly-Owner-Report_${safe}_${stamp}.pdf`,
    board_summary: `Spendda-Board-Summary_${safe}_${stamp}.pdf`,
    payroll_review: `Spendda-Payroll-Review_${safe}_${stamp}.pdf`,
    savings_opportunities: `Spendda-Savings-Opportunities_${safe}_${stamp}.pdf`,
    cash_pressure: `Spendda-Cash-Pressure_${safe}_${stamp}.pdf`,
  };
  return map[kind];
}
