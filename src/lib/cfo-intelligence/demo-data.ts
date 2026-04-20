import type { DateRange } from "@/components/ui/date-range-picker";

export type LoanStatus = "Current" | "Watch" | "Matured";

export type DemoLoan = {
  id: string;
  name: string;
  lender: string;
  balance: number;
  rateApr: number;
  monthlyPayment: number;
  maturityIso: string;
  status: LoanStatus;
};

export type DebtStrategy = "snowball" | "avalanche" | "preservation";

export type RecommendationPriority = "High" | "Medium" | "Low";

export type RecommendationCard = {
  id: string;
  title: string;
  impactEstimate: string;
  priority: RecommendationPriority;
  category: string;
  nextAction: string;
};

const MS_DAY = 86_400_000;

export function rangeDayCount(range: DateRange): number {
  if (!range.from || !range.to) return 30;
  const a = new Date(range.from).getTime();
  const b = new Date(range.to).getTime();
  const d = Math.round((b - a) / MS_DAY) + 1;
  return Math.max(1, Math.min(366, d));
}

export function getDemoLoans(): DemoLoan[] {
  return [
    {
      id: "l1",
      name: "HQ Term Loan A",
      lender: "Northwind Capital",
      balance: 1_240_000,
      rateApr: 7.85,
      monthlyPayment: 18_400,
      maturityIso: "2029-03-01",
      status: "Current",
    },
    {
      id: "l2",
      name: "Equipment Facility",
      lender: "Summit Equipment Finance",
      balance: 412_000,
      rateApr: 6.1,
      monthlyPayment: 9_200,
      maturityIso: "2027-11-15",
      status: "Current",
    },
    {
      id: "l3",
      name: "Revolver B",
      lender: "Harbor Regional Bank",
      balance: 280_000,
      rateApr: 8.95,
      monthlyPayment: 6_750,
      maturityIso: "2026-09-30",
      status: "Watch",
    },
    {
      id: "l4",
      name: "Acquisition Bridge",
      lender: "Atlas Credit Partners",
      balance: 2_100_000,
      rateApr: 9.4,
      monthlyPayment: 42_800,
      maturityIso: "2026-12-01",
      status: "Current",
    },
  ];
}

export function sortLoansForStrategy(loans: DemoLoan[], strategy: DebtStrategy): DemoLoan[] {
  const copy = [...loans];
  if (strategy === "snowball") copy.sort((a, b) => a.balance - b.balance);
  else if (strategy === "avalanche") copy.sort((a, b) => b.rateApr - a.rateApr);
  else copy.sort((a, b) => a.monthlyPayment - b.monthlyPayment);
  return copy;
}

export function loanKpis(loans: DemoLoan[], marketRateApr = 5.75) {
  const totalDebt = loans.reduce((s, l) => s + l.balance, 0);
  const monthlyDebtService = loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const avgRate =
    totalDebt > 0 ? loans.reduce((s, l) => s + l.balance * l.rateApr, 0) / totalDebt : 0;
  let interestRemaining = 0;
  for (const l of loans) {
    const mat = new Date(l.maturityIso).getTime();
    const now = Date.now();
    const monthsLeft = Math.max(1, Math.ceil((mat - now) / (MS_DAY * 30)));
    const monthlyInt = (l.balance * (l.rateApr / 100)) / 12;
    interestRemaining += monthlyInt * monthsLeft * 0.72;
  }
  const weightedToMarket = loans.reduce((s, l) => {
    const delta = Math.max(0, l.rateApr - marketRateApr);
    return s + (l.balance * delta) / 100 / 12;
  }, 0);
  return {
    totalDebt,
    monthlyDebtService,
    avgInterestRate: avgRate,
    interestRemaining,
    refinanceMonthlySavings: Math.round(weightedToMarket),
  };
}

export type ProfitabilityBaseline = {
  annualRevenue: number;
  /** Operating vendor/program spend (annualized from uploads or demo). */
  annualVendorSpend: number;
  annualPayroll: number;
  /** Demo-only fixed layer (insurance, facilities, etc.). */
  annualFixedOverhead: number;
  /** Gross margin on revenue before vendor (simplified). */
  revenueGrossMarginPct: number;
};

export function demoProfitabilityBaseline(): ProfitabilityBaseline {
  return {
    annualRevenue: 4_280_000,
    annualVendorSpend: 1_020_000,
    annualPayroll: 1_860_000,
    annualFixedOverhead: 640_000,
    revenueGrossMarginPct: 0.58,
  };
}

export function buildProfitabilityScenario(
  base: ProfitabilityBaseline,
  opts: {
    revenuePct: number;
    payrollCutPct: number;
    vendorCutPct: number;
    newStaffMonthly: number;
    priceLiftPct: number;
  },
) {
  const priceMult = 1 + opts.priceLiftPct / 100;
  const revMult = 1 + opts.revenuePct / 100;
  const revenue = base.annualRevenue * revMult * priceMult;
  const grossProfit = revenue * base.revenueGrossMarginPct - base.annualVendorSpend * (1 - opts.vendorCutPct / 100);
  const payroll =
    base.annualPayroll * (1 - opts.payrollCutPct / 100) + opts.newStaffMonthly * 12;
  const net = grossProfit - payroll - base.annualFixedOverhead;
  const marginPct = revenue > 0 ? (net / revenue) * 100 : 0;
  const variableCostRatio =
    revenue > 0
      ? (base.annualVendorSpend * (1 - opts.vendorCutPct / 100) + payroll) / revenue
      : 0.65;
  const contributionMarginPct = Math.max(0.08, 1 - variableCostRatio * 0.92);
  const breakEvenRevenue = (base.annualFixedOverhead + payroll * 0.92) / contributionMarginPct;
  const profitTarget = 420_000;
  const profitTargetGap = profitTarget - net;
  return { revenue, grossProfit, net, marginPct, breakEvenRevenue, profitTargetGap, profitTarget };
}

export function profitabilityTrendSeries(): { month: string; revenue: number; expense: number; marginPct: number }[] {
  const out: { month: string; revenue: number; expense: number; marginPct: number }[] = [];
  let rev = 3_100_000;
  let exp = 2_720_000;
  for (let i = 0; i < 10; i++) {
    const m = `2025-${String(i + 3).padStart(2, "0")}`;
    rev *= 1.012 + i * 0.001;
    exp *= 1.008 + i * 0.0012;
    out.push({
      month: m,
      revenue: Math.round(rev / 12),
      expense: Math.round(exp / 12),
      marginPct: Math.round(((rev - exp) / rev) * 1000) / 10,
    });
  }
  return out;
}

export type CashDayPoint = { day: string; cash: number; floor: number };

export function buildCashForecast90d(opts: {
  openingCash: number;
  dailyNetBurn: number;
  volatility: number;
}): CashDayPoint[] {
  const pts: CashDayPoint[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  let cash = opts.openingCash;
  const floor = opts.openingCash * 0.18;
  for (let d = 0; d < 90; d++) {
    const t = new Date(start.getTime() + d * MS_DAY);
    const wave = Math.sin(d / 9) * opts.volatility;
    cash = Math.max(floor * 0.4, cash - opts.dailyNetBurn + wave);
    pts.push({
      day: t.toISOString().slice(0, 10),
      cash: Math.round(cash),
      floor: Math.round(floor),
    });
  }
  return pts;
}

export function demoRecommendationCards(): RecommendationCard[] {
  return [
    {
      id: "r1",
      title: "Reduce overtime in Admin",
      impactEstimate: "$18–32k / quarter",
      priority: "High",
      category: "Payroll",
      nextAction: "Review Admin schedules vs. SLA; cap OT at 8% until backlog clears.",
    },
    {
      id: "r2",
      title: "Vendor contract renegotiation opportunity",
      impactEstimate: "$45–70k / year",
      priority: "Medium",
      category: "Procurement",
      nextAction: "Bundle top 5 IT vendors; request indexed pricing + volume tier.",
    },
    {
      id: "r3",
      title: "Duplicate payments need review",
      impactEstimate: "$6–14k recoverable",
      priority: "High",
      category: "Controls",
      nextAction: "Open exceptions queue; confirm vendor credits before next close.",
    },
    {
      id: "r4",
      title: "Refinance Revolver B",
      impactEstimate: "$2.1k / month",
      priority: "Medium",
      category: "Debt",
      nextAction: "Request term sheet at market +25bps; model covenant headroom.",
    },
    {
      id: "r5",
      title: "Raise pricing 3% to restore margin",
      impactEstimate: "+110–160 bps margin",
      priority: "Low",
      category: "Revenue",
      nextAction: "Pilot on low-elasticity SKUs; monitor churn for 60 days.",
    },
    {
      id: "r6",
      title: "Cash runway below target",
      impactEstimate: "Risk: liquidity stress in 90d window",
      priority: "High",
      category: "Treasury",
      nextAction: "Defer non-critical capex; tighten AP terms on tier-2 vendors.",
    },
    {
      id: "r7",
      title: "Overstaffed location detected",
      impactEstimate: "$28k / month loaded cost",
      priority: "Medium",
      category: "Workforce",
      nextAction: "Compare FTE to transaction volume; rebalance shifts across sites.",
    },
  ];
}
