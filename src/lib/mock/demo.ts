export const demo = {
  kpis: {
    totalSpend: 18_400_000,
    payrollSpend: 9_700_000,
    flagsDetected: 146,
    savingsOpportunity: 240_000,
    forecastRiskScore: 68,
  },
  monthlySpend: [
    { month: "Nov", spend: 15_200_000 },
    { month: "Dec", spend: 16_450_000 },
    { month: "Jan", spend: 16_900_000 },
    { month: "Feb", spend: 17_150_000 },
    { month: "Mar", spend: 17_800_000 },
    { month: "Apr", spend: 18_400_000 },
  ],
  departmentSpend: [
    { department: "Health", spend: 4_950_000 },
    { department: "Education", spend: 3_820_000 },
    { department: "Operations", spend: 3_100_000 },
    { department: "Infrastructure", spend: 2_740_000 },
    { department: "Security", spend: 2_120_000 },
    { department: "Finance", spend: 1_670_000 },
  ],
  payrollGrowth: [
    { month: "Nov", growth: 0.9 },
    { month: "Dec", growth: 1.1 },
    { month: "Jan", growth: 0.7 },
    { month: "Feb", growth: 1.3 },
    { month: "Mar", growth: 1.0 },
    { month: "Apr", growth: 1.6 },
  ],
  riskBreakdown: [
    { name: "Low", value: 78 },
    { name: "Medium", value: 56 },
    { name: "High", value: 12 },
  ],
  vendors: [
    {
      vendor: "Northbridge Medical Supplies",
      spend: 1_420_000,
      concentrationRisk: "High",
      last30dChangePct: 18,
    },
    {
      vendor: "Cedarline Facilities Group",
      spend: 1_050_000,
      concentrationRisk: "Medium",
      last30dChangePct: 6,
    },
    {
      vendor: "Atlas IT Services",
      spend: 920_000,
      concentrationRisk: "Medium",
      last30dChangePct: 4,
    },
    {
      vendor: "Emerald Logistics Co.",
      spend: 810_000,
      concentrationRisk: "Low",
      last30dChangePct: -2,
    },
  ],
  recentFlags: [
    {
      id: "FLAG-1029",
      type: "Repeated payment",
      severity: "High",
      entity: "Operations",
      amount: 48_200,
    },
    {
      id: "FLAG-1028",
      type: "Inactive employee still paid",
      severity: "Medium",
      entity: "Education",
      amount: 7_650,
    },
    {
      id: "FLAG-1027",
      type: "Unusual salary increase",
      severity: "Medium",
      entity: "Health",
      amount: 4_300,
    },
    {
      id: "FLAG-1026",
      type: "Duplicate bank account",
      severity: "High",
      entity: "Infrastructure",
      amount: 22_100,
    },
  ],
};

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

