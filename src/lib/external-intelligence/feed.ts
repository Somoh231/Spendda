import type { ExternalUpdate } from "./types";

/**
 * Curated briefing-style items for product demos.
 * Replace with RSS / vendor API / compliance feeds in production.
 */
export const EXTERNAL_INTELLIGENCE_FEED: ExternalUpdate[] = [
  {
    id: "xr-001",
    category: "interest_rates",
    headline: "Policy rates on hold; forward curves still price gradual easing into next year",
    whyItMatters:
      "Floating-rate debt and working-capital lines reprice faster than fixed structures — small changes in expectations move DSCR stress tests.",
    recommendedAction:
      "Rate stability can still pressure loan costs if your spreads are wide. Review refinancing options and preserve cash for covenant cushions.",
    confidence: "Medium",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: { regions: ["US", "EU", "Global"] },
  },
  {
    id: "xr-002",
    category: "treasury",
    headline: "Treasury guidance emphasizes liquidity reporting for entities with material vendor concentration",
    whyItMatters:
      "Multi-entity operators may face sharper questions on intra-group funding and payable timing when counterparties tighten terms.",
    recommendedAction:
      "Align AP aging with 13-week cash view; document top-10 vendor dependency and mitigation (second source, staged payments).",
    confidence: "Directional",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgSizes: ["Large", "Multi-entity"], orgTypes: ["Government", "Private Company", "Bank", "Hospital"] },
  },
  {
    id: "xr-003",
    category: "wage_law",
    headline: "Emerging-market jurisdictions continue tightening minimum wage and overtime documentation",
    whyItMatters:
      "Payroll-heavy organizations risk back-pay assessments when timesheets and classification records do not match disbursements.",
    recommendedAction:
      "Run a payroll classification audit against attendance logs; reconcile overtime spikes with department budgets.",
    confidence: "High",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      marketTypes: ["Emerging Market"],
      anyPrimaryGoals: ["Payroll oversight", "Workforce planning"],
      regions: ["West Africa", "East Africa", "Global"],
    },
  },
  {
    id: "xr-004",
    category: "tax",
    headline: "VAT / withholding alignment checks intensify for cross-border professional services",
    whyItMatters:
      "Universities and NGOs with donor-funded consultants often have fragmented WHT evidence across campuses.",
    recommendedAction:
      "Centralize vendor tax certificates; validate invoice lines against grant eligibility before period close.",
    confidence: "Medium",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      orgTypes: ["University", "NGO", "Government"],
      anyPrimaryGoals: ["Donor fund accountability", "Executive reporting"],
      industrySegments: ["Education & research", "Nonprofit & NGOs", "Public sector & regulators"],
    },
  },
  {
    id: "xr-005",
    category: "childcare",
    headline: "Licensed childcare and early-learning providers face updated staff-ratio and background-check cadence rules",
    whyItMatters:
      "Where you operate social programs or in-kind childcare (hospital employees, municipal schemes), compliance drives payroll and benefits cost.",
    recommendedAction:
      "Map any dependent-care benefits or outsourced daycare contracts to new staffing minimums; budget benefits load accordingly.",
    confidence: "Directional",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      sectors: ["Healthcare", "Government", "Nonprofit"],
      anyPrimaryGoals: ["Workforce planning", "Payroll oversight"],
    },
  },
  {
    id: "xr-006",
    category: "inflation",
    headline: "Headline inflation cooling while services inflation remains sticky in developed markets",
    whyItMatters:
      "Procurement contracts indexed to CPI may still reset upward on services-heavy baskets even as goods deflate.",
    recommendedAction:
      "Stress-test vendor contracts for index caps; prioritize renegotiation on facilities, logistics, and temp labor categories.",
    confidence: "Medium",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      marketTypes: ["Developed Market"],
      regions: ["US", "EU", "Global"],
      operatingLocations: ["United States", "European Union / UK"],
    },
  },
  {
    id: "xr-007",
    category: "lending",
    headline: "Commercial credit committees favor shorter tenors and tighter covenants for mid-market borrowers",
    whyItMatters:
      "Refinancing windows may shrink; covenant-lite structures are less available outside top-tier credits.",
    recommendedAction:
      "Prepare a lender data room with 24-month cash bridge and sensitivity to +150 bps — align with Debt intelligence module.",
    confidence: "Directional",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgTypes: ["Private Company", "Hospital", "Bank"], orgSizes: ["Mid-size", "Large", "Multi-entity"] },
  },
  {
    id: "xr-008",
    category: "sector_policy",
    headline: "Public-sector transparency rules push faster publication of procurement anomalies above statutory thresholds",
    whyItMatters:
      "Finance teams need repeatable anomaly narratives before disclosure deadlines to protect ministerial and board credibility.",
    recommendedAction:
      "Tighten duplicate-payment detection narratives and owner assignment in Alerts; export board-ready commentary monthly.",
    confidence: "High",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      orgTypes: ["Government"],
      anyPrimaryGoals: ["Fraud / anomaly detection", "Executive reporting"],
      industrySegments: ["Public sector & regulators"],
    },
  },
  {
    id: "xr-009",
    category: "sector_policy",
    headline: "Healthcare payment integrity programs expand targeted reviews on implantable device spend",
    whyItMatters:
      "High-cost clinical categories attract payer clawbacks; supplier concentration amplifies financial exposure.",
    recommendedAction:
      "Segment vendor spend by clinical unit; pair procurement savings goals with clinical utilization review guardrails.",
    confidence: "Medium",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      sectors: ["Healthcare"],
      orgTypes: ["Hospital"],
      industrySegments: ["Healthcare & life sciences"],
    },
  },
  {
    id: "xr-010",
    category: "treasury",
    headline: "West Africa: FX liquidity management remains priority as correspondent banking costs drift higher",
    whyItMatters:
      "Treasury teams funding multi-currency payroll and imports need disciplined hedge documentation and local-bank diversification.",
    recommendedAction:
      "Refresh counterparty limits; scenario-test payroll in functional currency vs. USD invoices for the next two quarters.",
    confidence: "Directional",
    urgency: "Critical",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      regions: ["West Africa"],
      marketTypes: ["Emerging Market"],
      operatingLocations: ["West Africa"],
    },
  },
  {
    id: "xr-011",
    category: "tax",
    headline: "East Africa: digital services tax enforcement widens to enterprise SaaS and cloud marketplaces",
    whyItMatters:
      "Universities and NGOs increasingly buy through marketplaces — invoices may understate gross-up obligations.",
    recommendedAction:
      "Inventory SaaS vendors and marketplace intermediaries; align tax coding in procurement and AP before audit season.",
    confidence: "Medium",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      regions: ["East Africa"],
      orgTypes: ["University", "NGO", "Private Company"],
      operatingLocations: ["East Africa"],
    },
  },
  {
    id: "xr-012",
    category: "interest_rates",
    headline: "Bank ALCO playbooks stress deposit beta sensitivity under slower loan growth scenarios",
    whyItMatters:
      "Net interest margin forecasts need coordinated assumptions on funding mix and asset repricing cohorts.",
    recommendedAction:
      "Reconcile FTP curves to loan and securities repricing buckets; publish a single NIM bridge for executive committee.",
    confidence: "High",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgTypes: ["Bank"], industrySegments: ["Financial services"] },
  },
  {
    id: "xr-013",
    category: "wage_law",
    headline: "Developed markets: contractor vs. employee classification scrutiny rising in platform and gig-adjacent spend",
    whyItMatters:
      "Misclassified workers create payroll tax and benefits liabilities that do not appear in vendor spend alone.",
    recommendedAction:
      "Scan high-volume temp and professional services vendors for role descriptions that imply embedded labor substitution.",
    confidence: "Directional",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: { marketTypes: ["Developed Market"], orgTypes: ["Private Company", "Hospital", "University"] },
  },
  {
    id: "xr-014",
    category: "inflation",
    headline: "Food and energy pass-through still elevates field-office per-diems for relief NGOs",
    whyItMatters:
      "Donor budgets are often fixed while input costs float — program burn can silently overrun without re-baselining.",
    recommendedAction:
      "Reforecast per-diem and logistics indices quarterly; tie narrative to donor reporting for proactive covenant conversations.",
    confidence: "Medium",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      sectors: ["Nonprofit"],
      orgTypes: ["NGO"],
      anyPrimaryGoals: ["Donor fund accountability", "Budget forecasting"],
      industrySegments: ["Nonprofit & NGOs"],
    },
  },
  {
    id: "xr-015",
    category: "lending",
    headline: "Sovereign-linked counterparties face shorter confirmation windows on LC facilities",
    whyItMatters:
      "Import-heavy ministries and hospitals rely on trade finance — delays cascade to vendor payments and project milestones.",
    recommendedAction:
      "Pre-position alternate confirming banks where possible; align procurement milestones to LC availability dates.",
    confidence: "Directional",
    urgency: "High",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgTypes: ["Government", "Hospital"], marketTypes: ["Emerging Market"] },
  },
  {
    id: "xr-016",
    category: "sector_policy",
    headline: "University grant compliance: stricter documentation for sub-award risk and indirect cost caps",
    whyItMatters:
      "Indirect cost recovery disputes can claw back multi-year awards if payroll and spend are not aligned to award logic.",
    recommendedAction:
      "Crosswalk payroll strings to award codes monthly; flag departments with rising IDC ratios vs. sponsor caps.",
    confidence: "High",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: {
      sectors: ["Education"],
      orgTypes: ["University"],
      industrySegments: ["Education & research"],
    },
  },
  {
    id: "xr-017",
    category: "tax",
    headline: "Small-entity safe harbors for electronic invoicing phased in across several emerging jurisdictions",
    whyItMatters:
      "AP modernization projects must sequence e-invoice readiness with cash forecasting to avoid payment freezes.",
    recommendedAction:
      "Pilot e-invoicing with top vendors first; pair with working-capital metrics on Cash flow radar.",
    confidence: "Directional",
    urgency: "Low",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgSizes: ["Small", "Mid-size"], marketTypes: ["Emerging Market"] },
  },
  {
    id: "xr-018",
    category: "childcare",
    headline: "Employer-sponsored childcare stipends increasingly treated as taxable imputed income in cross-border assignments",
    whyItMatters:
      "Global mobility policies interact with local payroll — errors show up as payroll variance and audit findings.",
    recommendedAction:
      "Validate shadow payroll calculations for expatriate benefits; document policy vs. tax treatment in one matrix.",
    confidence: "Directional",
    urgency: "Low",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgSizes: ["Large", "Multi-entity"], marketTypes: ["Developed Market"] },
  },
  {
    id: "xr-019",
    category: "treasury",
    headline: "Money-market fund reforms nudge institutional cash pools toward government-style liquidity ladders",
    whyItMatters:
      "Idle cash yields may compress just as operating accounts need larger buffers for AP volatility.",
    recommendedAction:
      "Segment operational vs. strategic cash; document investment policy thresholds and board review cadence.",
    confidence: "Medium",
    urgency: "Medium",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgTypes: ["Government", "Bank", "Private Company"] },
  },
  {
    id: "xr-020",
    category: "sector_policy",
    headline: "Climate-related disclosure expectations continue to influence capex and insurance renewals for large entities",
    whyItMatters:
      "Insurance and energy pass-through affects opex forecasts and vendor RFP scoring even without formal carbon taxes.",
    recommendedAction:
      "Tag top energy and facilities vendors for renewal dates; include resilience clauses in next RFP cycle.",
    confidence: "Directional",
    urgency: "Low",
    asOfLabel: "Apr 2026 briefing",
    relevance: { orgSizes: ["Large", "Multi-entity"] },
  },
];
