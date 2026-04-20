export type Sector =
  | "Government"
  | "Private Sector"
  | "Education"
  | "Nonprofit"
  | "Healthcare"
  | "Financial Services";

export type Organization = {
  id: string;
  name: string;
  sector: Sector;
  currency: string;
};

export type Ministry = {
  id: string;
  name: string;
};

export type County = {
  id: string;
  name: string;
};

export type Department = {
  id: string;
  name: string;
  ministryId: string;
  countyId: string;
};

export type Vendor = {
  id: string;
  name: string;
  category:
    | "Facilities"
    | "Medical"
    | "IT"
    | "Logistics"
    | "Construction"
    | "Professional Services"
    | "Education"
    | "Security"
    | "Travel"
    | "Office Supplies";
  preferred: boolean;
  createdAt: string;
};

export type Employee = {
  id: string;
  fullName: string;
  nationalId: string;
  bankAccount: string;
  ministryId: string;
  countyId: string;
  departmentId: string;
  title: string;
  status: "Active" | "Inactive" | "Terminated";
  hireDate: string;
  baseSalaryMonthly: number;
};

export type Transaction = {
  id: string;
  orgId: string;
  ministryId: string;
  countyId: string;
  departmentId: string;
  vendorId: string;
  vendorName: string;
  category: Vendor["category"];
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  invoiceId: string;
  paymentMethod: "ACH" | "Wire" | "Card" | "Check";
  createdAt: string;
};

export type Flag = {
  id: string;
  entityType: "transaction" | "employee";
  entityId: string;
  date: string;
  ministryId: string;
  countyId: string;
  departmentId: string;
  title: string;
  ruleId: string;
  severity: "Low" | "Medium" | "High";
  score: number; // 0-100
  amount?: number;
  evidence: Record<string, string | number | boolean>;
};

export type DemoDataset = {
  org: Organization;
  ministries: Ministry[];
  counties: County[];
  departments: Department[];
  vendors: Vendor[];
  employees: Employee[];
  transactions: Transaction[];
  flags: Flag[];
  generatedAt: string;
};

export type ChartPoint = { month: string; value: number };
export type DeptSpend = { department: string; value: number };

export type DemoSummary = {
  kpis: {
    totalSpend30d: number;
    payrollMonthly: number;
    flags30d: number;
    savingsOpportunity30d: number;
    forecastRiskScore: number;
  };
  monthlySpend: ChartPoint[]; // 24 months
  departmentSpend30d: DeptSpend[];
  riskBreakdown30d: { name: "Low" | "Medium" | "High"; value: number }[];
  topVendors30d: {
    vendorId: string;
    vendor: string;
    spend: number;
    concentrationRisk: "Low" | "Medium" | "High";
    last30dChangePct: number;
  }[];
  recentFlags: Array<{
    id: string;
    title: string;
    severity: "Low" | "Medium" | "High";
    entity: string;
    amount?: number;
  }>;
};

export type ForecastOutput = {
  spendVariance: ChartPoint[]; // next 6 months (negative variance = shortfall)
  payrollGrowth: Array<{ month: string; value: number }>; // %
  cards: {
    budgetShortfall: number;
    retirementWavePct: number;
    payrollGrowthPct: number;
    overspendRiskScore: number;
  };
};

