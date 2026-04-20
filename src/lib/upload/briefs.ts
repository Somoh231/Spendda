import { formatMoney } from "@/lib/mock/demo";
import type { UploadedInsights, UploadedPayrollInsights, UploadedSpendInsights } from "@/lib/upload/storage";

export type UploadedExecutiveBrief = {
  title: string;
  audience: "Executive" | "CFO" | "Controller";
  summary: string;
  highlights: string[];
};

function getSpend(items: UploadedInsights[], entity?: string) {
  return items.find((x) => x.kind === "spend" && (!entity || x.entity === entity)) as
    | UploadedSpendInsights
    | undefined;
}

function getPayroll(items: UploadedInsights[], entity?: string) {
  return items.find((x) => x.kind === "payroll" && (!entity || x.entity === entity)) as
    | UploadedPayrollInsights
    | undefined;
}

export function buildUploadedExecutiveBriefs(
  items: UploadedInsights[],
  opts?: { entity?: string },
): UploadedExecutiveBrief[] {
  const spend = getSpend(items, opts?.entity);
  const payroll = getPayroll(items, opts?.entity);

  const spendText = spend
    ? `${formatMoney(spend.totalSpend)} across ${spend.totalTransactions.toLocaleString()} transactions`
    : "spend data not uploaded yet";
  const payrollText = payroll
    ? `${payroll.totalEmployees.toLocaleString()} employees analyzed`
    : "payroll data not uploaded yet";

  const exec: UploadedExecutiveBrief = {
    title: "Uploaded Data Executive Brief",
    audience: "Executive",
    summary: `This briefing is generated from your uploaded files${opts?.entity ? ` for ${opts.entity}` : ""}: ${spendText}; ${payrollText}.`,
    highlights: [
      spend?.topVendor ? `Top vendor: ${spend.topVendor}.` : "Top vendor will appear after spend upload.",
      spend?.topDepartment ? `Top spend department: ${spend.topDepartment}.` : "Top spend department will appear after spend upload.",
      payroll?.topDepartment ? `Largest payroll department: ${payroll.topDepartment}.` : "Largest payroll department will appear after payroll upload.",
    ],
  };

  const cfo: UploadedExecutiveBrief = {
    title: "CFO Brief (Uploaded Data)",
    audience: "CFO",
    summary: spend
      ? `Total spend in the uploaded file is ${formatMoney(spend.totalSpend)}. ${spend.flaggedCount.toLocaleString()} transactions were flagged for review (repeats: ${spend.repeatedCount.toLocaleString()}, unusual: ${spend.unusualCount.toLocaleString()}).`
      : "Upload spend to generate a CFO brief with totals and exceptions.",
    highlights: [
      spend?.topVendor ? `Spend concentration: ${spend.topVendor} is the top vendor.` : "Upload spend to compute vendor concentration.",
      spend?.topDepartment ? `Department pressure: ${spend.topDepartment} is highest by spend.` : "Upload spend to compute department pressure.",
      payroll ? `Payroll risk: ${payroll.highRisk.toLocaleString()} high-risk employees detected.` : "Upload payroll to compute payroll risk exposure.",
    ],
  };

  const controller: UploadedExecutiveBrief = {
    title: "Controller Brief (Uploaded Data)",
    audience: "Controller",
    summary:
      spend || payroll
        ? `Controls signals detected from uploaded files.${spend ? ` Spend exceptions: ${spend.flaggedCount.toLocaleString()} flagged.` : ""}${payroll ? ` Payroll exceptions: ${payroll.highRisk.toLocaleString()} high risk, ${payroll.mediumRisk.toLocaleString()} medium risk.` : ""}`
        : "Upload spend and/or payroll to generate a Controller brief with exception counts and recommended controls.",
    highlights: [
      spend ? `Repeated payments signals: ${spend.repeatedCount.toLocaleString()}.` : "Repeated payments signals available after spend upload.",
      payroll ? `Duplicate bank-account signals: ${payroll.duplicateBankSignals.toLocaleString()}.` : "Duplicate bank-account signals available after payroll upload.",
      payroll ? `Inactive paid signals: ${payroll.inactivePaidSignals.toLocaleString()}.` : "Inactive paid signals available after payroll upload.",
    ],
  };

  return [exec, cfo, controller];
}

