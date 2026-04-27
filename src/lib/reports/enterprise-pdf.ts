import { GState, jsPDF } from "jspdf";

import type { UploadedExecutiveBrief } from "@/lib/upload/briefs";
import type { UploadedInsights } from "@/lib/upload/storage";

import { buildNarrativePack } from "./enterprise-narrative";
import type { EnterpriseExportOptions } from "./export-options";
import type { ReportBundle } from "./report-bundle";
import { portfolioHealthScore } from "./health-score";

function isSmeOrg(orgType?: string): boolean {
  return ["Home Care Agency", "Childcare Center", "Restaurant Group", "SME"].includes(orgType ?? "");
}

function deptLabel(orgType?: string): string {
  switch (orgType) {
    case "Restaurant Group":
      return "Location";
    case "Home Care Agency":
      return "Service line";
    case "Childcare Center":
      return "Center";
    default:
      return "Department";
  }
}

const BRAND_NAVY: [number, number, number] = [8, 18, 37];
const BRAND_BLUE: [number, number, number] = [59, 130, 246];

export type PdfVariant = "executive" | "board";

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
  doc.text("Spendda Intelligence™", 48, h - 22);
  doc.text(opts.organizationName, 48, h - 14);
  doc.text(opts.entity, 140, h - 14);
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

function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
  opts: { maxY: number; includeRaw: boolean },
) {
  if (!opts.includeRaw) return startY;
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
    if (y > opts.maxY - 24) {
      doc.addPage();
      y = 72;
    }
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
  items: { label: string; value: number }[],
  x: number,
  y: number,
  width: number,
  maxVal: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("Department concentration (top)", x, y);
  let cy = y + 14;
  const barMaxW = width - 120;
  for (const it of items.slice(0, 6)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(it.label.slice(0, 22), x, cy);
    const frac = maxVal > 0 ? it.value / maxVal : 0;
    doc.setFillColor(226, 232, 240);
    doc.rect(x + 120, cy - 5, barMaxW, 6, "F");
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(x + 120, cy - 5, barMaxW * frac, 6, "F");
    cy += 16;
  }
  return cy + 6;
}

function drawCover(
  doc: jsPDF,
  opts: EnterpriseExportOptions,
  variant: PdfVariant,
  logoDataUrl: string | null,
) {
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
  const industryTitle = {
    "Home Care Agency": variant === "board" ? "Home Care Monthly Report" : "Care Operations Brief",
    "Childcare Center": variant === "board" ? "Childcare Monthly Report" : "Center Operations Brief",
    "Restaurant Group": variant === "board" ? "Restaurant Monthly Report" : "Location Performance Brief",
    SME: variant === "board" ? "Monthly Business Report" : "Business Performance Brief",
  };
  const title =
    opts.orgType && industryTitle[opts.orgType as keyof typeof industryTitle]
      ? industryTitle[opts.orgType as keyof typeof industryTitle]
      : variant === "board"
        ? "Board Pack"
        : "Executive Brief";
  doc.text(title, 56, 270);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(opts.organizationName, 56, 292);
  doc.text(`Entity / Branch: ${opts.entity}`, 56, 308);
  doc.text(`Reporting period: ${opts.periodLabel}`, 56, 324);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 56, 340);
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(1);
  doc.line(56, 352, w - 56, 352);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Confidential — for authorized distribution only.", 56, 368);
}

export async function buildEnterprisePdfBlob(
  bundle: ReportBundle,
  briefs: UploadedExecutiveBrief[],
  uploads: UploadedInsights[],
  opts: EnterpriseExportOptions,
  variant: PdfVariant,
): Promise<Blob> {
  const narrative = buildNarrativePack(bundle);
  const logo = opts.includeLogo ? await loadLogoDataUrl() : null;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const bottomSafe = pageH - 48;

  const applyWatermark = () => {
    if (opts.confidentialWatermark) drawWatermark(doc, "CONFIDENTIAL");
  };

  drawCover(doc, opts, variant, logo);
  applyWatermark();

  const addBodyPage = () => {
    doc.addPage();
    applyWatermark();
  };

  // --- Executive summary
  addBodyPage();
  let y = 56;
  y = drawSectionTitle(doc, "1. Executive summary", y);
  y = drawBullets(doc, narrative.executiveBullets, 48, y, pageW - 96);

  if (variant === "board" && briefs.length) {
    y = drawSectionTitle(doc, "Uploaded intelligence", y + 8);
    for (const b of briefs.slice(0, 3)) {
      const para = `${b.title} — ${b.summary.slice(0, 420)}`;
      y = wrapParagraph(doc, para, 48, y, pageW - 96, 14);
      if (y > bottomSafe - 80) {
        addBodyPage();
        y = 56;
      }
    }
  }

  // KPI overview
  if (y > bottomSafe - 120) {
    addBodyPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "2. KPI overview", y + 6);
  y = wrapParagraph(doc, narrative.kpiNarrative, 48, y, pageW - 96, 14);
  const k = bundle.summary.kpis;
  const cur = bundle.org.currency || "USD";
  y = drawTable(
    doc,
    ["Metric", "Value"],
    [
      [
        isSmeOrg(opts.orgType)
          ? opts.orgType === "Restaurant Group"
            ? "Total revenue"
            : "Total operating cost"
          : "Spend (30d)",
        fmtMoney(k.totalSpend30d, cur),
      ],
      [
        isSmeOrg(opts.orgType)
          ? opts.orgType === "Home Care Agency"
            ? "Caregiver pay"
            : opts.orgType === "Restaurant Group"
              ? "Labor cost"
              : "Staff payroll"
          : "Payroll (monthly)",
        fmtMoney(k.payrollMonthly, cur),
      ],
      [isSmeOrg(opts.orgType) ? "Items flagged for review" : "Flags (30d)", String(k.flags30d)],
      [
        isSmeOrg(opts.orgType) ? "Potential savings identified" : "Savings opportunity",
        fmtMoney(k.savingsOpportunity30d, cur),
      ],
      [isSmeOrg(opts.orgType) ? "Risk score" : "Forecast risk score", `${k.forecastRiskScore}/100`],
      [
        isSmeOrg(opts.orgType) ? "Business health score" : "Portfolio health score",
        `${portfolioHealthScore(bundle)}/100`,
      ],
    ],
    y + 4,
    { maxY: bottomSafe, includeRaw: true },
  );

  if (opts.includeCharts) {
    const depts = [...bundle.summary.departmentSpend30d].sort((a, b) => b.value - a.value);
    const maxVal = depts[0]?.value ?? 1;
    if (y > bottomSafe - 140) {
      addBodyPage();
      y = 56;
    }
    y = drawMiniBars(
      doc,
      depts.map((d) => ({ label: d.department, value: d.value })),
      48,
      y + 6,
      pageW - 96,
      maxVal,
    );
  }

  // Alerts
  if (y > bottomSafe - 100) {
    addBodyPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "3. Alerts & investigations", y + 6);
  y = wrapParagraph(doc, narrative.alertsNarrative, 48, y, pageW - 96, 14);
  const high = bundle.flags.filter((f) => f.severity === "High").slice(0, 12);
  const seen = new Set<string>();
  const alertRows = high
    .map((f) => {
      const meta = bundle.investigations[f.id];
      // Deduplicate by title — show count instead of repeating rows
      const baseTitle = f.title.slice(0, 40);
      return [baseTitle, f.severity, meta?.owner ?? "Unassigned", meta?.dueDate ?? "—", meta?.status ?? "Open"];
    })
    .filter((row) => {
      const key = row[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Add a summary line if there were duplicates
  const totalHigh = bundle.flags.filter((f) => f.severity === "High").length;
  if (totalHigh > alertRows.length) {
    alertRows.push([`+ ${totalHigh - alertRows.length} additional similar flags`, "High", "—", "—", "Open"]);
  }
  if (opts.includeRawTables) {
    y = drawTable(
      doc,
      ["Item", "Severity", "Owner", "Due", "Status"],
      alertRows.length ? alertRows : [["No high-severity items in sample", "—", "—", "—", "—"]],
      y + 4,
      { maxY: bottomSafe, includeRaw: true },
    );
  } else {
    y = wrapParagraph(
      doc,
      "Detailed alert register omitted per export settings; narrative and KPIs remain directionally complete.",
      48,
      y + 4,
      pageW - 96,
      13,
    );
  }

  // Department performance
  if (y > bottomSafe - 80) {
    addBodyPage();
    y = 56;
  }
  y = drawSectionTitle(
    doc,
    isSmeOrg(opts.orgType) ? `4. ${deptLabel(opts.orgType)} performance` : "4. Department performance",
    y + 6,
  );
  y = wrapParagraph(doc, narrative.departmentNarrative, 48, y, pageW - 96, 14);
  const deptRows = [...bundle.summary.departmentSpend30d]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((d, i, arr) => {
      const next = arr[i + 1];
      const variance =
        next && next.value > 0 ? `${(((d.value - next.value) / next.value) * 100).toFixed(1)}%` : "—";
      return [d.department, fmtMoney(d.value, cur), variance];
    });
  if (opts.includeRawTables) {
    y = drawTable(
      doc,
      [
        isSmeOrg(opts.orgType) ? deptLabel(opts.orgType) : "Department",
        isSmeOrg(opts.orgType) ? (opts.orgType === "Restaurant Group" ? "Revenue" : "Cost") : "Spend",
        "Vs next",
      ],
      deptRows,
      y + 4,
      { maxY: bottomSafe, includeRaw: true },
    );
  } else {
    y = wrapParagraph(
      doc,
      "Department variance table omitted per export settings.",
      48,
      y + 4,
      pageW - 96,
      13,
    );
  }

  // Forecasting
  if (y > bottomSafe - 100) {
    addBodyPage();
    y = 56;
  }
  y = drawSectionTitle(
    doc,
    isSmeOrg(opts.orgType) ? "5. Financial outlook" : "5. Forecasting outlook",
    y + 6,
  );
  y = wrapParagraph(doc, narrative.forecastNarrative, 48, y, pageW - 96, 14);
  const fc = bundle.forecast.cards;
  y = drawTable(
    doc,
    ["Indicator", "Value"],
    isSmeOrg(opts.orgType)
      ? [
          [
            opts.orgType === "Home Care Agency"
              ? "Cash runway pressure"
              : opts.orgType === "Restaurant Group"
                ? "Revenue shortfall risk"
                : "Budget pressure",
            fmtMoney(fc.budgetShortfall, cur),
          ],
          [
            opts.orgType === "Home Care Agency"
              ? "Payroll as % of revenue"
              : opts.orgType === "Restaurant Group"
                ? "Labor cost trend"
                : "Payroll growth",
            `${fc.payrollGrowthPct.toFixed(1)}%`,
          ],
          ["Overspend risk", `${fc.overspendRiskScore}/100`],
        ]
      : [
          ["Budget shortfall", fmtMoney(fc.budgetShortfall, cur)],
          ["Retirement wave", `${fc.retirementWavePct.toFixed(1)}%`],
          ["Payroll growth", `${fc.payrollGrowthPct.toFixed(1)}%`],
          ["Overspend risk", `${fc.overspendRiskScore}/100`],
        ],
    y + 4,
    { maxY: bottomSafe, includeRaw: true },
  );

  // Recommendations
  if (y > bottomSafe - 80) {
    addBodyPage();
    y = 56;
  }
  y = drawSectionTitle(doc, "6. Recommended actions", y + 6);

  const smeRecommendations: Record<string, string[]> = {
    "Home Care Agency": [
      "Review caregiver overtime — target payroll under 60% of revenue.",
      "Chase overdue client invoices before next payroll cycle.",
      "Confirm Medicaid reimbursement submissions are up to date.",
      "Check evening shift staffing levels to reduce weekend overtime.",
    ],
    "Childcare Center": [
      "Verify staff-to-child ratios are within state licensing requirements.",
      "Follow up on delayed subsidy payments from state programs.",
      "Review part-time scheduling across centers for cost efficiency.",
      "Compare cost per enrolled child across locations and investigate gaps.",
    ],
    "Restaurant Group": [
      "Investigate underperforming location — compare labor % to group average.",
      "Review food vendor invoices for duplicates or unexplained price increases.",
      "Set labor cost % target per location and track weekly.",
      "Check for duplicate or split invoices from primary food suppliers.",
    ],
    SME: [
      "Review top 3 vendors — they represent a high share of total spend.",
      "Confirm there are no duplicate or recurring payments to investigate.",
      "Compare this month's payroll % to your 3-month rolling average.",
      "Schedule a monthly review of flagged transactions with your accountant.",
    ],
  };

  const recommendationBullets =
    isSmeOrg(opts.orgType) && opts.orgType && smeRecommendations[opts.orgType]
      ? smeRecommendations[opts.orgType]
      : narrative.recommendations;

  y = drawBullets(doc, recommendationBullets, 48, y, pageW - 96);

  const externalBullets = opts.marketRegulatoryBullets?.filter(Boolean) ?? [];
  if (externalBullets.length && !isSmeOrg(opts.orgType)) {
    if (y > bottomSafe - 80) {
      addBodyPage();
      y = 56;
    }
    y = drawSectionTitle(doc, "7. Market & regulatory context", y + 6);
    y = wrapParagraph(
      doc,
      "Client-filtered external intelligence (rates, policy, and sector signals). Replace with licensed feeds in production.",
      48,
      y,
      pageW - 96,
      13,
    );
    y = drawBullets(doc, externalBullets, 48, y + 4, pageW - 96);
  }

  // ML overlay (assistive) — included when available.
  if (bundle.ml && !isSmeOrg(opts.orgType)) {
    if (y > bottomSafe - 120) {
      addBodyPage();
      y = 56;
    }
    y = drawSectionTitle(
      doc,
      externalBullets.length ? "8. ML assistive overlay (Phase 1)" : "ML assistive overlay (Phase 1)",
      y + 6,
    );
    const ml = bundle.ml;
    y = wrapParagraph(
      doc,
      `This section summarizes lightweight statistical models used to assist review. Confidence reflects signal strength and variance; the rules engine remains the control baseline.`,
      48,
      y,
      pageW - 96,
      14,
    );
    y = drawTable(
      doc,
      ["Metric", "Value"],
      [
        ["ML confidence (overall)", `${ml.confidencePct}%`],
        ["Rules flags (30d)", String(ml.comparison.ruleFlags30d)],
        ["ML anomalies (30d)", String(ml.comparison.mlAnomalies30d)],
        ["Agreement (estimate)", `${ml.comparison.overlapEstimate}%`],
      ],
      y + 4,
      { maxY: bottomSafe, includeRaw: true },
    );

    const top = ml.anomalies.top.slice(0, 6);
    if (top.length) {
      if (y > bottomSafe - 120) {
        addBodyPage();
        y = 56;
      }
      y = wrapParagraph(doc, "Top ML findings (with explainability):", 48, y + 2, pageW - 96, 13);
      y = drawTable(
        doc,
        ["Finding", "Severity", "Conf.", "Driver"],
        top.map((a) => [a.title.slice(0, 34), a.severity, `${a.confidencePct}%`, (a.explain?.[0] ?? "").slice(0, 38)]),
        y + 4,
        { maxY: bottomSafe, includeRaw: opts.includeRawTables },
      );
    }
  }

  if (variant === "board") {
    if (y > bottomSafe - 60) {
      addBodyPage();
      y = 56;
    }
    y = drawSectionTitle(doc, "Appendix — data coverage", y + 6);
    const uploadLine = `Active uploads: ${uploads.length}. Executive brief cards: ${briefs.length}.`;
    y = wrapParagraph(doc, uploadLine, 48, y, pageW - 96, 14);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, opts);
  }

  return doc.output("blob");
}
