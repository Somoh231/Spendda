import type { OrgType } from "./types";

/** Sidebar + page title for the former “Departments” route. */
export function entityNavLabel(orgType: OrgType | undefined): string {
  switch (orgType) {
    case "Government":
      return "Ministries";
    case "Private Company":
      return "Branches / Units";
    case "University":
      return "Faculties / Schools";
    case "NGO":
      return "Programs / Offices";
    case "Hospital":
      return "Clinical Units";
    case "Bank":
      return "Branches";
    case "Home Care Agency":
      return "Service Lines";
    case "Childcare Center":
      return "Centers";
    case "Restaurant Group":
      return "Locations";
    case "SME":
      return "Departments";
    default:
      return "Departments";
  }
}

export function organizationShellSubtitle(orgType: OrgType | undefined): string {
  switch (orgType) {
    case "Government":
      return "Public finance & audit intelligence";
    case "Private Company":
      return "Margin, vendor, and workforce intelligence";
    case "University":
      return "Grants, payroll, and board-ready oversight";
    case "NGO":
      return "Donor utilization & program efficiency";
    case "Hospital":
      return "Clinical operations & supplier intelligence";
    case "Bank":
      return "Compliance, contracts, and efficiency";
    case "Home Care Agency":
      return "Caregiver pay, client billing & cash runway";
    case "Childcare Center":
      return "Staff ratios, subsidy billing & payroll health";
    case "Restaurant Group":
      return "Revenue, labor cost & location performance";
    case "SME":
      return "Spend, payroll & monthly financial clarity";
    default:
      return "Public Accountability Intelligence™";
  }
}

export type OrgSignal = { title: string; detail: string; tone: "blue" | "amber" | "emerald" | "rose" };

export function orgSignalsForType(orgType: OrgType | undefined): OrgSignal[] {
  switch (orgType) {
    case "Government":
      return [
        { title: "Ghost worker detection", detail: "Inactive-paid and duplicate-bank clustering across ministries.", tone: "rose" },
        { title: "Procurement leakage", detail: "Repeated payments, split invoices, and vendor concentration.", tone: "amber" },
        { title: "Public budget variance", detail: "Ministry vs. county drift with audit-ready evidence trails.", tone: "blue" },
        { title: "Region comparisons", detail: "Entity roll-ups for HQ vs. regional performance.", tone: "emerald" },
      ];
    case "Private Company":
      return [
        { title: "Margin leakage", detail: "Category drift, maverick spend, and margin pressure hotspots.", tone: "amber" },
        { title: "Vendor savings", detail: "Rate, volume, and substitution levers surfaced as actions.", tone: "emerald" },
        { title: "Workforce cost", detail: "Payroll growth vs. headcount efficiency across branches.", tone: "blue" },
        { title: "CFO dashboard", detail: "Forecast, savings, and risk in one executive surface.", tone: "blue" },
      ];
    case "University":
      return [
        { title: "Grant utilization", detail: "Spend pacing vs. award periods with compliance guardrails.", tone: "blue" },
        { title: "Faculty payroll", detail: "Spikes, overlaps, and policy exceptions for HR review.", tone: "amber" },
        { title: "Enrollment vs staffing", detail: "Capacity signals for deans and the board.", tone: "emerald" },
        { title: "Board summaries", detail: "Narrative-ready KPIs for trustees and auditors.", tone: "blue" },
      ];
    case "NGO":
      return [
        { title: "Donor utilization", detail: "Restricted vs. unrestricted pacing with traceability.", tone: "emerald" },
        { title: "Program efficiency", detail: "Cost per outcome proxies across field offices.", tone: "blue" },
        { title: "Regional comparisons", detail: "Benchmark-like views for country directors.", tone: "amber" },
        { title: "Compliance reporting", detail: "Evidence packets for donors and regulators.", tone: "rose" },
      ];
    case "Hospital":
      return [
        { title: "Overtime pressure", detail: "Clinical units trending above safe staffing bands.", tone: "rose" },
        { title: "Supplier spend", detail: "Medical and facilities vendor concentration alerts.", tone: "amber" },
        { title: "Staffing coverage", detail: "Unit-level workload vs. payroll signals.", tone: "blue" },
        { title: "Cost trends", detail: "Budget pressure with forecast overlays.", tone: "emerald" },
      ];
    case "Bank":
      return [
        { title: "Compliance anomalies", detail: "Pattern deviations with investigation scaffolding.", tone: "rose" },
        { title: "Vendor contracts", detail: "Renewal, rate, and obligation risk clustering.", tone: "amber" },
        { title: "Headcount efficiency", detail: "FTE vs. spend benchmarks across branches.", tone: "blue" },
        { title: "Executive risk dashboards", detail: "Board-grade roll-ups with confidence scoring.", tone: "blue" },
      ];
    case "Home Care Agency":
      return [
        { title: "Payroll vs revenue", detail: "Caregiver pay as % of billable hours — healthy target is under 60%.", tone: "amber" },
        { title: "Overdue invoices", detail: "Client billing gaps and Medicaid reimbursement delays.", tone: "rose" },
        { title: "Overtime by shift", detail: "Evening and weekend overtime patterns by caregiver group.", tone: "amber" },
        { title: "Cash runway", detail: "Weeks of coverage based on billing cycle and payroll dates.", tone: "blue" },
      ];
    case "Childcare Center":
      return [
        { title: "Staff ratio compliance", detail: "Caregiver-to-child ratios vs state licensing requirements.", tone: "rose" },
        { title: "Subsidy billing gaps", detail: "State subsidy payments vs enrollment — late or missing.", tone: "amber" },
        { title: "Payroll by center", detail: "Staff cost per enrolled child across locations.", tone: "blue" },
        { title: "Operating cost trend", detail: "Monthly cost trajectory vs enrollment revenue.", tone: "emerald" },
      ];
    case "Restaurant Group":
      return [
        { title: "Labor cost %", detail: "Labor as % of revenue vs 30% benchmark — by location.", tone: "amber" },
        { title: "Location ranking", detail: "Revenue and margin ranked — spot your strongest and weakest.", tone: "blue" },
        { title: "Food cost %", detail: "COGS trends with duplicate vendor invoice detection.", tone: "rose" },
        { title: "Location gap", detail: "What your top location does differently vs the lowest.", tone: "emerald" },
      ];
    case "SME":
      return [
        { title: "Cash position", detail: "Weekly cash in vs out — how many weeks of runway you have.", tone: "blue" },
        { title: "Top vendor spend", detail: "Which vendors take the most — and whether that's justified.", tone: "amber" },
        { title: "Payroll health", detail: "Payroll as % of revenue with month-over-month trend.", tone: "emerald" },
        { title: "Anomalies", detail: "Duplicate payments, unusual spikes, and invoices worth reviewing.", tone: "rose" },
      ];
    default:
      return [
        { title: "Spend intelligence", detail: "Cross-entity visibility with anomaly surfacing.", tone: "blue" },
        { title: "Payroll oversight", detail: "Duplicate and inactive-paid detection.", tone: "amber" },
        { title: "Forecasting", detail: "Budget pressure and scenario cards.", tone: "emerald" },
      ];
  }
}
