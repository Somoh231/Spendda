import type { jsPDF } from "jspdf";
import type { OnboardingProfile } from "@/lib/profile/types";
import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";

export type AiWorkspaceReportKind =
  | "owner_monthly"
  | "payroll_summary"
  | "expense_trends"
  | "risk_action";

/** Detect user intent to export one of the pilot PDF packs from natural language. */
export function parseReportExportIntent(raw: string): AiWorkspaceReportKind | null {
  const t = raw.toLowerCase().trim();
  if (!t) return null;
  const wantsDoc =
    /\b(download|export|generate|create|save)\b/.test(t) ||
    /\breport\b/.test(t) ||
    /\bpdf\b/.test(t);
  if (!wantsDoc) return null;

  if (/\bowner\b/.test(t) && /\bmonthly\b/.test(t)) return "owner_monthly";
  if (/\bmonthly\b/.test(t) && /\bowner\b/.test(t)) return "owner_monthly";

  if (/\bpayroll\b/.test(t) && /\bsummary\b/.test(t)) return "payroll_summary";

  if (/\bexpense\b/.test(t) && /\btrends?\b/.test(t)) return "expense_trends";

  if (/\brisk\b/.test(t) && (/\baction\b/.test(t) || /\band\b/.test(t) || t.includes("&"))) return "risk_action";

  return null;
}

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${Math.round(v).toLocaleString()}`;
}

function groupSum<T,>(items: T[], key: (t: T) => string, value: (t: T) => number) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it).trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + (Number.isFinite(value(it)) ? value(it) : 0));
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, value: v })).sort((a, b) => b.value - a.value);
}

function monthKey(isoDate: string) {
  return isoDate && isoDate.length >= 7 ? isoDate.slice(0, 7) : "";
}

function filterSpend(spend: SpendTxn[], range: DateRange) {
  return spend.filter((t) => {
    if (!range.from && !range.to) return true;
    if (!t.date) return true;
    if (range.from && t.date < range.from) return false;
    if (range.to && t.date > range.to) return false;
    return true;
  });
}

function addSection(doc: jsPDF, title: string, lines: string[], margin: number, maxW: number, yRef: { y: number }) {
  let y = yRef.y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const t = doc.splitTextToSize(title, maxW);
  doc.text(t, margin, y);
  y += t.length * 14 + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of lines) {
    const chunk = doc.splitTextToSize(line, maxW);
    doc.text(chunk, margin, y);
    y += chunk.length * 13 + 6;
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
  }
  yRef.y = y + 10;
}

export async function downloadAiWorkspaceReportPdf(opts: {
  kind: AiWorkspaceReportKind;
  profile: OnboardingProfile | null;
  entity: string;
  range: DateRange;
  spendDs: WorkspaceDataset | null;
  payrollDs: WorkspaceDataset | null;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const maxW = 612 - margin * 2;
  let y = 56;
  const yRef = { y };

  const orgType = opts.profile?.orgType || "—";
  const spendRows = opts.spendDs?.kind === "spend" ? filterSpend(opts.spendDs.rows as SpendTxn[], opts.range) : [];
  const payrollRows = opts.payrollDs?.kind === "payroll" ? (opts.payrollDs.rows as PayrollRow[]) : [];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Spendda Intelligence Report", margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    `Entity: ${opts.entity}`,
    `Org type: ${orgType}`,
    `Date range: ${opts.range.from || "…"} → ${opts.range.to || "…"}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    `Mode: pilot heuristic (upload-derived)`,
  ];
  doc.text(meta, margin, y);
  y += meta.length * 13 + 14;
  yRef.y = y;

  const title =
    opts.kind === "owner_monthly"
      ? "Owner Monthly Report"
      : opts.kind === "payroll_summary"
        ? "Payroll Summary"
        : opts.kind === "expense_trends"
          ? "Expense Trends"
          : "Risk & Action Report";

  addSection(
    doc,
    title,
    [
      "This report is generated from uploaded datasets in pilot mode. It is intended for internal review and demo pilots.",
      "For production, reports should be persisted server-side with audit trails and signed URLs.",
    ],
    margin,
    maxW,
    yRef,
  );

  if (opts.kind === "owner_monthly") {
    const totalSpend = spendRows.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);
    const flagged = spendRows.filter((t) => t.flags.length).length;
    const topDept = groupSum(spendRows, (t) => t.department || "Unassigned", (t) => t.amount).slice(0, 5);
    const topVendor = groupSum(spendRows, (t) => t.vendor || "Unknown", (t) => t.amount).slice(0, 5);
    addSection(
      doc,
      "Executive summary",
      [
        spendRows.length
          ? `Observed spend (scoped): ${money(totalSpend)} across ${spendRows.length.toLocaleString()} rows.`
          : "No spend rows available for this entity/date scope.",
        spendRows.length ? `Flagged transactions (heuristic): ${flagged.toLocaleString()}.` : "",
        payrollRows.length
          ? `Payroll rows available: ${payrollRows.length.toLocaleString()} (see Payroll Summary report for detail).`
          : "",
      ].filter(Boolean),
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Key KPIs",
      [
        spendRows.length ? `Total spend: ${money(totalSpend)}` : "Total spend: —",
        spendRows.length ? `Active vendors (non-empty): ${new Set(spendRows.map((t) => t.vendor).filter(Boolean)).size}` : "Active vendors: —",
        payrollRows.length ? `Employees modeled: ${payrollRows.length}` : "Employees modeled: —",
      ],
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Top departments",
      topDept.length ? topDept.map((d, i) => `${i + 1}. ${d.key}: ${money(d.value)}`) : ["—"],
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Top vendors",
      topVendor.length ? topVendor.map((d, i) => `${i + 1}. ${d.key}: ${money(d.value)}`) : ["—"],
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Recommendations",
      [
        "Validate duplicate invoice keys against AP master data.",
        "Reconcile top vendor concentration with contract renewals.",
        "Publish a monthly owner brief with owners + due dates for each high-risk item.",
      ],
      margin,
      maxW,
      yRef,
    );
  }

  if (opts.kind === "payroll_summary") {
    if (!payrollRows.length) {
      addSection(doc, "Payroll summary", ["No payroll dataset uploaded for this entity."], margin, maxW, yRef);
    } else {
      const high = payrollRows.filter((p) => p.risk === "High").length;
      const med = payrollRows.filter((p) => p.risk === "Medium").length;
      const dupBank = payrollRows.filter((p) => p.signals.includes("Duplicate bank account")).length;
      const inactivePaid = payrollRows.filter((p) => p.signals.includes("Inactive employee still paid")).length;
      addSection(
        doc,
        "Summary",
        [
          `Rows: ${payrollRows.length.toLocaleString()}`,
          `High risk: ${high.toLocaleString()} · Medium risk: ${med.toLocaleString()}`,
          `Duplicate bank account signals: ${dupBank.toLocaleString()}`,
          `Inactive-paid signals: ${inactivePaid.toLocaleString()}`,
        ],
        margin,
        maxW,
        yRef,
      );
      const topDept = groupSum(payrollRows, (p) => p.department || "Unassigned", () => 1).slice(0, 8);
      addSection(
        doc,
        "Headcount by department (upload rows)",
        topDept.map((d, i) => `${i + 1}. ${d.key}: ${Math.round(d.value)}`),
        margin,
        maxW,
        yRef,
      );
    }
  }

  if (opts.kind === "expense_trends") {
    if (!spendRows.length) {
      addSection(doc, "Expense trends", ["No spend dataset uploaded for this entity/date scope."], margin, maxW, yRef);
    } else {
      const byMonth = groupSum(spendRows, (t) => monthKey(t.date), (t) => t.amount)
        .filter((m) => m.key)
        .sort((a, b) => a.key.localeCompare(b.key))
        .slice(-12);
      addSection(
        doc,
        "Monthly spend (last up to 12 months with dates)",
        byMonth.length ? byMonth.map((m) => `${m.key}: ${money(m.value)}`) : ["Not enough dated rows to compute monthly trend."],
        margin,
        maxW,
        yRef,
      );
      const byCat = groupSum(spendRows, (t) => t.category || "Uncategorized", (t) => t.amount).slice(0, 10);
      addSection(
        doc,
        "Top categories",
        byCat.map((c, i) => `${i + 1}. ${c.key}: ${money(c.value)}`),
        margin,
        maxW,
        yRef,
      );
    }
  }

  if (opts.kind === "risk_action") {
    const dupInvoices = spendRows.filter((t) => t.flags.includes("Duplicate invoice")).slice(0, 12);
    const repeated = spendRows.filter((t) => t.flags.includes("Repeated payment")).slice(0, 12);
    const unusual = spendRows.filter((t) => t.flags.includes("Unusually large")).slice(0, 12);
    const payrollRisky = payrollRows.filter((p) => p.risk !== "Low" || p.signals.length).slice(0, 12);

    addSection(
      doc,
      "Spend risks (sample)",
      dupInvoices.length
        ? dupInvoices.map((t) => `Duplicate invoice candidate: ${t.vendor} · ${t.invoiceId || "—"} · ${money(t.amount)}`)
        : ["No duplicate invoice candidates detected with current keys."],
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Repeated payments (sample)",
      repeated.length
        ? repeated.map((t) => `Repeated payment candidate: ${t.vendor} · ${money(t.amount)}`)
        : ["No repeated payment candidates detected."],
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Unusually large payments (sample)",
      unusual.length ? unusual.map((t) => `${t.vendor} · ${money(t.amount)}`) : ["No unusually large payments detected."],
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Payroll risks (sample)",
      payrollRisky.length
        ? payrollRisky.map((p) => `${p.risk}: ${p.employeeName || "—"} · ${p.signals.join("; ") || "—"}`)
        : ["No payroll anomalies detected with current heuristics."],
      margin,
      maxW,
      yRef,
    );
    addSection(
      doc,
      "Recommended actions",
      [
        "Assign owners to each High item with a 7-day due date.",
        "Request vendor statements for top repeated-payment clusters.",
        "Reconcile payroll exceptions against HR termination dates.",
      ],
      margin,
      maxW,
      yRef,
    );
  }

  const filename =
    opts.kind === "owner_monthly"
      ? "spendda-owner-monthly-report.pdf"
      : opts.kind === "payroll_summary"
        ? "spendda-payroll-summary.pdf"
        : opts.kind === "expense_trends"
          ? "spendda-expense-trends.pdf"
          : "spendda-risk-action-report.pdf";

  doc.save(filename);
}
