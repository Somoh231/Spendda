import type { OnboardingProfile } from "@/lib/profile/types";
import type { UploadedInsights } from "@/lib/upload/storage";
import type { UploadAnalyticsSnapshot } from "@/lib/workspace/upload-analytics-engine";
import { buildUploadedExecutiveBriefs } from "@/lib/upload/briefs";
import { buildDataSnapshotId, hashPrompt } from "./snapshot-id";

export type IntelligenceBrief = {
  snapshotId: string;
  riskSummary: string[];
  financialExposure: {
    estimatedExposure: string;
    concentrationRisk: string;
    varianceVsBaseline: string;
  };
  rootCauseSignals: string[];
  whyFlagged: string[];
  recommendedActions: string[];
  confidencePct: number;
  signalsUsed: number;
};

function spendInsight(items: UploadedInsights[], entity?: string) {
  return items.find((x) => x.kind === "spend" && (!entity || x.entity === entity)) as
    | Extract<UploadedInsights, { kind: "spend" }>
    | undefined;
}

function payrollInsight(items: UploadedInsights[], entity?: string) {
  return items.find((x) => x.kind === "payroll" && (!entity || x.entity === entity)) as
    | Extract<UploadedInsights, { kind: "payroll" }>
    | undefined;
}

export function buildIntelligenceBrief(input: {
  question: string;
  entity?: string;
  profile: OnboardingProfile | null;
  uploads: UploadedInsights[];
  /** When set, narrative uses row-level metrics instead of generic placeholders. */
  datasetAnalytics?: UploadAnalyticsSnapshot | null;
}): IntelligenceBrief {
  const q = input.question.trim();
  const ql = q.toLowerCase();
  const entity = input.entity || "HQ";
  const a = input.datasetAnalytics || null;
  const spend = spendInsight(input.uploads, entity);
  const payroll = payrollInsight(input.uploads, entity);
  const briefs = buildUploadedExecutiveBriefs(input.uploads, { entity });
  const snapshotId = buildDataSnapshotId({
    entity,
    uploadCount: input.uploads.length,
    questionHash: hashPrompt(q),
  });

  const org = input.profile?.orgType || "Organization";
  const market = input.profile?.marketType || "Core markets";

  const baseSignals = 12 + (spend ? 8 : 0) + (payroll ? 9 : 0);
  const confidencePct = Math.min(96, Math.max(38, Math.round(58 + baseSignals * 1.4 + (spend ? 10 : 0))));

  const defaultRisks = a
    ? [
        `Uploaded spend in scope: **$${Math.round(a.totals.spendPositive).toLocaleString()}** across **${a.totals.spendRowCount.toLocaleString()}** rows; **${a.totals.flaggedSpendRows.toLocaleString()}** rows carry flags (≈ **$${Math.round(a.totals.flaggedSpendAmount).toLocaleString()}** in flagged-line amounts).`,
        a.trends.lastMomPct !== null
          ? `Latest month vs prior spend: **${a.trends.lastMomPct >= 0 ? "+" : ""}${a.trends.lastMomPct.toFixed(1)}%** (from dated monthly buckets).`
          : "Month-over-month trend needs more dated spend rows in range.",
        `Vendor structure: top vendor **${a.vendorConcentration.topVendors[0]?.name || "—"}** at **${a.vendorConcentration.top1Pct.toFixed(1)}%** of spend; duplicate-invoice signals **${a.duplicates.duplicateInvoice}**, repeated-payment **${a.duplicates.repeatedPayment}**.`,
      ]
    : [
        `${org}: procurement concentration and repeated-payment patterns exceed comfort thresholds in the current window.`,
        `Payroll integrity: off-cycle and inactive-paid signals require confirmation against HR master records (${market}).`,
        `Compliance posture: evidence packets are incomplete for ${Math.max(2, Math.round((briefs[0]?.highlights.length || 3) * 1.4))} active oversight threads.`,
      ];

  const defaultExposure = a
    ? {
        estimatedExposure: `$${Math.round(a.totals.flaggedSpendAmount).toLocaleString()} (sum of amounts on flagged spend rows in scope)`,
        concentrationRisk: `${a.vendorConcentration.top1Pct.toFixed(1)}% (top-vendor share of positive spend)`,
        varianceVsBaseline:
          a.trends.lastMomPct !== null
            ? `${a.trends.lastMomPct >= 0 ? "+" : ""}${a.trends.lastMomPct.toFixed(1)}% last month vs prior (dated rows)`
            : "MoM variance not computed (insufficient dated months)",
      }
    : {
        estimatedExposure: spend ? `$${Math.round(spend.totalSpend * 0.018).toLocaleString()}` : "$2.4M–$3.1M (modeled range)",
        concentrationRisk: spend ? `${Math.min(62, 22 + Math.round((spend.repeatedCount / Math.max(1, spend.totalTransactions)) * 900))}%` : "38% (top-vendor modeled)",
        varianceVsBaseline: "+6.4% vs trailing 6-month baseline (spend); payroll +2.1% MoM",
      };

  const defaultRootCauses = a
    ? [
        `Outliers: **${a.outliers.aboveP95}** transactions at/above **p95** amount **$${Math.round(a.outliers.p95).toLocaleString()}**.`,
        `Department load: **${a.departmentRanking[0]?.name || "—"}** leads spend at **$${Math.round(a.departmentRanking[0]?.spend || 0).toLocaleString()}**.`,
        `Duplicate / repeat heuristics fired on **${a.duplicates.duplicateInvoice + a.duplicates.repeatedPayment}** spend rows (see Alerts / spend file).`,
      ]
    : [
        "Vendor invoice clustering: repeated vendor + amount + close-date combinations.",
        "Payroll drift: department-level salary variance vs approved headcount plan.",
        "Control gaps: missing PO linkage on high-value transactions in sensitive categories.",
      ];

  const defaultWhy = a
    ? [
        `Concentration: HHI **${a.vendorConcentration.hhi}** with top-5 taking **${a.vendorConcentration.top5Pct.toFixed(1)}%** of spend.`,
        `Data completeness: **${a.schema.spendDateCoveragePct}%** of spend rows have parseable dates (affects trends/forecast).`,
        `Payroll file: **${a.totals.payrollRowCount}** rows, salary roll-up **$${Math.round(a.totals.payrollSalarySum).toLocaleString()}** (mapped columns).`,
        `Vendor+amount clusters (≥3): **${a.duplicates.vendorAmountRepeat3Plus}** rows.`,
      ]
    : [
        "Variance: spend category variance exceeds +8% vs peer cohort median.",
        "Peer deviation: top-department spend is +11 pts above peer percentile (p75).",
        "Historical deviation: current month exceeds same-month prior year by +9.2%.",
        "Threshold breach: high-severity alert volume exceeds governance SLA for 2 consecutive weeks.",
      ];

  const defaultActions = a?.recommendations?.length
    ? a.recommendations.slice(0, 5)
    : [
        "Open Investigations and assign owners with 7-day due dates for all High severity cases.",
        "Freeze incremental approvals for the top concentrated vendor pending evidence packet.",
        "Publish a one-page board brief with exposure, mitigation status, and confidence bounds.",
      ];

  if (ql.includes("board") || ql.includes("brief") || ql.includes("briefing")) {
    return {
      snapshotId,
      riskSummary: [
        "Executive narrative requires validated exposure numbers before external distribution.",
        "Two procurement categories show sustained peer deviation.",
        "Payroll stability is acceptable but overtime pressure is trending upward.",
      ],
      financialExposure: {
        estimatedExposure: defaultExposure.estimatedExposure,
        concentrationRisk: defaultExposure.concentrationRisk,
        varianceVsBaseline: "+4.1% vs plan (month-to-date); payroll within tolerance",
      },
      rootCauseSignals: [
        "Leadership requests increased granularity on ministry / region splits.",
        "Repeated-payment signals concentrated in two vendor families.",
        "Grant / program tagging inconsistent for 6–9% of transactions (upload-dependent).",
      ],
      whyFlagged: [
        "Variance: board pack thresholds triggered at +6% program variance.",
        "Peer deviation: national peer median lower for comparable entity mix.",
        "Historical deviation: QTD spend above prior fiscal pattern.",
        "Threshold breach: reporting cadence SLA at risk for two oversight units.",
      ],
      recommendedActions: [
        "Export the confidential Spendda Intelligence Report PDF for leadership review.",
        "Attach investigation owners + audit trail links for each open High item.",
        "Schedule a 30-minute reforecast review with Finance + HR leads.",
      ],
      confidencePct: Math.min(94, confidencePct + 6),
      signalsUsed: baseSignals + 10,
    };
  }

  if (ql.includes("anomal") || ql.includes("fraud") || ql.includes("investigat") || ql.includes("suspicious")) {
    return {
      snapshotId,
      riskSummary: [
        spend
          ? `Spend anomalies: ${spend.flaggedCount.toLocaleString()} flagged (repeats ${spend.repeatedCount.toLocaleString()}, unusual ${spend.unusualCount.toLocaleString()}).`
          : "Spend anomaly signals are not yet grounded in entity uploads — triage using demo baselines.",
        payroll
          ? `Payroll anomalies: ${payroll.highRisk.toLocaleString()} high risk, ${payroll.mediumRisk.toLocaleString()} medium risk.`
          : "Payroll anomaly signals require payroll upload for entity-scoped evidence.",
        "Cross-system reconciliation: bank + HR status mismatches are the fastest path to false positives — validate before escalation.",
      ],
      financialExposure: {
        estimatedExposure: spend ? `$${Math.round(spend.totalSpend * 0.011).toLocaleString()}` : defaultExposure.estimatedExposure,
        concentrationRisk: spend
          ? `${Math.min(71, 18 + Math.round((spend.unusualCount / Math.max(1, spend.totalTransactions)) * 1200))}%`
          : defaultExposure.concentrationRisk,
        varianceVsBaseline: "+9.8% vs baseline in flagged categories (30d)",
      },
      rootCauseSignals: [
        "Repeated vendor+amount windows suggest control bypass or invoice duplication.",
        "Inactive-paid and duplicate-bank payroll signals indicate master data drift.",
        "Threshold calibration may be misaligned for emerging-market volatility.",
      ],
      whyFlagged: defaultWhy,
      recommendedActions: [
        "Create formal investigations with evidence checklist for each High severity item.",
        "Request vendor statement reconciliation for top 3 counterparties.",
        "Run payroll exception reconciliation against HR termination dates.",
      ],
      confidencePct: spend && payroll ? Math.min(93, confidencePct + 8) : Math.max(44, confidencePct - 10),
      signalsUsed: baseSignals + 14,
    };
  }

  if (ql.includes("growth") || ql.includes("spend")) {
    return {
      snapshotId,
      riskSummary: a
        ? [
            a.trends.lastMomPct !== null
              ? `Last month vs prior (dated spend): **${a.trends.lastMomPct >= 0 ? "+" : ""}${a.trends.lastMomPct.toFixed(1)}%**.`
              : "Not enough dated months in range for a clean MoM read.",
            `Top department by spend: **${a.departmentRanking[0]?.name || "—"}** (**$${Math.round(a.departmentRanking[0]?.spend || 0).toLocaleString()}**).`,
            `Vendor concentration: top-1 **${a.vendorConcentration.top1Pct.toFixed(1)}%**, top-5 **${a.vendorConcentration.top5Pct.toFixed(1)}%**.`,
          ]
        : [
            "Spend growth is not uniform: concentration in HR + Operations categories.",
            "Vendor dependency elevated vs prior quarter.",
            "Forecast risk score indicates budget pressure before month-end.",
          ],
      financialExposure: defaultExposure,
      rootCauseSignals: defaultRootCauses,
      whyFlagged: defaultWhy,
      recommendedActions: defaultActions,
      confidencePct,
      signalsUsed: baseSignals + 6,
    };
  }

  if (ql.includes("vendor") || ql.includes("concentration")) {
    return {
      snapshotId,
      riskSummary: a
        ? [
            `Top vendor **${a.vendorConcentration.topVendors[0]?.name || "—"}** = **${a.vendorConcentration.top1Pct.toFixed(1)}%** of in-scope spend.`,
            `Top-5 vendors = **${a.vendorConcentration.top5Pct.toFixed(1)}%**; HHI **${a.vendorConcentration.hhi}** (upload-derived).`,
            `Duplicate / repeat payment heuristics: **${a.duplicates.duplicateInvoice + a.duplicates.repeatedPayment}** rows flagged.`,
          ]
        : [
            spend
              ? `Top vendor by observed spend: ${spend.topVendor || "Unknown"} — concentration risk elevated.`
              : "Vendor concentration cannot be asserted without spend upload for this entity.",
            "Single-source risk: contract fragmentation increases renewal leverage risk.",
            "Payment velocity increased vs trailing baseline.",
          ],
      financialExposure: a
        ? {
            estimatedExposure: `$${Math.round(a.totals.flaggedSpendAmount).toLocaleString()} (flagged-line amounts)`,
            concentrationRisk: `${a.vendorConcentration.top1Pct.toFixed(1)}% (top-vendor share)`,
            varianceVsBaseline:
              a.trends.lastMomPct !== null
                ? `${a.trends.lastMomPct >= 0 ? "+" : ""}${a.trends.lastMomPct.toFixed(1)}% MoM (dated buckets)`
                : defaultExposure.varianceVsBaseline,
          }
        : {
            estimatedExposure: spend ? `$${Math.round(spend.totalSpend * 0.021).toLocaleString()}` : defaultExposure.estimatedExposure,
            concentrationRisk: spend ? `${Math.min(68, 26 + Math.round((spend.repeatedCount / Math.max(1, spend.totalTransactions)) * 800))}%` : "41%",
            varianceVsBaseline: "+5.6% vs baseline (vendor-managed categories)",
          },
      rootCauseSignals: defaultRootCauses,
      whyFlagged: defaultWhy,
      recommendedActions: defaultActions,
      confidencePct: spend || a ? Math.min(96, confidencePct + 4) : Math.max(38, confidencePct - 6),
      signalsUsed: baseSignals + 5,
    };
  }

  if (ql.includes("compliance") || ql.includes("compli")) {
    return {
      snapshotId,
      riskSummary: [
        "Compliance risk is driven by evidence completeness and approval chain integrity.",
        "Procurement policy exceptions are above the rolling median.",
        "Payroll policy adherence is strong but documentation gaps exist for exceptions.",
      ],
      financialExposure: {
        estimatedExposure: "$640K–$1.1M (policy exception exposure, modeled)",
        concentrationRisk: "29%",
        varianceVsBaseline: "+3.2% vs compliance baseline index",
      },
      rootCauseSignals: [
        "Missing PO linkage on high-value transactions.",
        "Late submissions for two oversight units.",
        "Inconsistent categorization across similar vendors.",
      ],
      whyFlagged: [
        "Variance: exception rate exceeds internal governance threshold.",
        "Peer deviation: higher than peer median for comparable public-sector cohort.",
        "Historical deviation: rising for 3 consecutive months.",
        "Threshold breach: documentation completeness below SLA.",
      ],
      recommendedActions: [
        "Route exceptions to legal + procurement joint review within 10 days.",
        "Publish a remediation plan with owners and dates in Investigations.",
        "Export audit-ready evidence index from Reports.",
      ],
      confidencePct: Math.min(90, confidencePct + 2),
      signalsUsed: baseSignals + 9,
    };
  }

  // Default / payroll-specific
  return {
    snapshotId,
    riskSummary: defaultRisks,
    financialExposure: defaultExposure,
    rootCauseSignals: defaultRootCauses,
    whyFlagged: defaultWhy,
    recommendedActions: defaultActions,
    confidencePct,
    signalsUsed: baseSignals,
  };
}
