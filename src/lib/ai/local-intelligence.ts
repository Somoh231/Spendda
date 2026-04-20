import type { OnboardingProfile } from "@/lib/profile/types";
import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";
import type { DateRange } from "@/components/ui/date-range-picker";
import type { UploadPilotSnapshot } from "@/lib/workspace/upload-ai-context";
import type { UploadAnalyticsSnapshot } from "@/lib/workspace/upload-analytics-engine";
import { buildUploadAnalyticsSnapshot } from "@/lib/workspace/upload-analytics-engine";
import {
  mergeUserTurnsOnly,
  routeUserIntent,
  shouldRunDatasetAnalytics,
  wantsDeepDetail,
} from "@/lib/ai/intent-routing";
import {
  buildStructuredWorkspaceAnalytics,
  formatStructuredAnalyticsNarrative,
  structuredAnalyticsToJsonBlock,
} from "@/lib/analytics/structured-workspace-analytics";

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${Math.round(v).toLocaleString()}`;
}

function topN<T>(arr: T[], n: number) {
  return arr.slice(0, Math.max(0, n));
}

function uniqSorted(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function groupSum<T>(items: T[], key: (t: T) => string, value: (t: T) => number) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it).trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + (Number.isFinite(value(it)) ? value(it) : 0));
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, value: v })).sort((a, b) => b.value - a.value);
}

function asTable(rows: Array<Record<string, string | number>>, cols: string[]) {
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i], " ")).join("  ");
  const header = line(cols);
  const sep = line(cols.map((c, i) => "-".repeat(Math.max(3, Math.min(widths[i], 32)))));
  const body = rows.map((r) => line(cols.map((c) => String(r[c] ?? "")))).join("\n");
  return `${header}\n${sep}\n${body}`;
}

function monthKey(isoDate: string) {
  return isoDate && isoDate.length >= 7 ? isoDate.slice(0, 7) : "";
}

function forecastNextQuarter(monthly: Array<{ month: string; total: number }>) {
  // Simple linear trend on month index (good enough for pilots).
  const pts = monthly
    .filter((p) => p.month)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
  const n = pts.length;
  if (n < 3) return null;
  const xs = pts.map((_, i) => i + 1);
  const ys = pts.map((p) => p.total);
  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const next = [n + 1, n + 2, n + 3].map((x) => Math.max(0, intercept + slope * x));
  const avg = next.reduce((s, v) => s + v, 0) / 3;
  return { next, avg };
}

/** User text only — strip trailing context appended by the global assistant. */
function userQuestionFromPrompt(full: string) {
  const t = full.trim();
  return t.split(/\n\nContext:/)[0]?.trim() ?? t;
}

function uploadForecastPreamble(pilot: UploadPilotSnapshot) {
  const a = pilot.analytics;
  if (a?.forecastNext) {
    return (
      `**Forecast (from your uploaded monthly spend, ${a.forecastNext.monthsUsed} months):** ` +
      `average of next 3 projected months ≈ **${money(a.forecastNext.avgNext3)}** ` +
      `(linear trend on real month totals).\n\n`
    );
  }
  const c = pilot.forecastCards;
  if (!c) return "";
  return (
    `**Forecasting (upload heuristics, aligned with the Forecasting page):** ` +
    `exposure-style savings signal ≈ **${money(c.budgetShortfall)}**; **overspend risk score ${c.overspendRiskScore}**; ` +
    `payroll increase hint **${c.payrollGrowthPct}%**` +
    (c.retirementWavePct > 0 ? `; retirement wave hint **${c.retirementWavePct}%** (weak pilot heuristic).` : `; retirement wave not inferred from increases.`) +
    `\n\n`
  );
}

function formatAnalyticsEngineBlock(a: UploadAnalyticsSnapshot, entity: string) {
  const lines: string[] = [];
  lines.push(`### Data engine (${entity})`);
  lines.push(
    `- **Inferred schema:** ${a.schema.kind} · spend file **${a.schema.spendFilename || "—"}** · payroll file **${a.schema.payrollFilename || "—"}**`,
  );
  lines.push(
    `- **Field coverage (spend):** date **${a.schema.spendDateCoveragePct}%**, vendor **${a.schema.spendVendorCoveragePct}%**, department **${a.schema.spendDeptCoveragePct}%**, positive amount **${a.schema.spendAmountPositivePct}%**`,
  );
  lines.push(
    `- **Totals:** spend **${money(a.totals.spendPositive)}** (${a.totals.spendRowCount.toLocaleString()} rows in range) · payroll rows **${a.totals.payrollRowCount.toLocaleString()}** · flagged spend rows **${a.totals.flaggedSpendRows.toLocaleString()}** (≈ **${money(a.totals.flaggedSpendAmount)}** flagged-line amounts)`,
  );
  if (a.trends.monthly.length) {
    const last3 = a.trends.monthly.slice(-3).map((m) => `${m.month}: ${money(m.total)}`);
    lines.push(`- **Trend (monthly spend):** ${last3.join(" · ")}`);
    if (a.trends.lastMomPct !== null) {
      lines.push(`- **Last month vs prior:** **${a.trends.lastMomPct >= 0 ? "+" : ""}${a.trends.lastMomPct.toFixed(1)}%**`);
    }
  }
  lines.push(
    `- **Duplicates / repeats:** duplicate-invoice signals **${a.duplicates.duplicateInvoice}**, repeated-payment **${a.duplicates.repeatedPayment}**, vendor+amount ≥3 occurrences **${a.duplicates.vendorAmountRepeat3Plus}**`,
  );
  lines.push(
    `- **Outliers:** p95 amount **${money(a.outliers.p95)}** · **${a.outliers.aboveP95}** rows at/above p95`,
  );
  const deptTop = a.departmentRanking.slice(0, 5);
  if (deptTop.length) {
    lines.push(
      `- **Top departments:** ${deptTop.map((d) => `${d.name} ${money(d.spend)} (${d.pctOfTotal.toFixed(1)}%)`).join(" · ")}`,
    );
  }
  const vTop = a.vendorConcentration.topVendors.slice(0, 5);
  if (vTop.length) {
    lines.push(
      `- **Vendor concentration:** top-1 **${a.vendorConcentration.top1Pct.toFixed(1)}%**, top-5 **${a.vendorConcentration.top5Pct.toFixed(1)}%**, HHI **${a.vendorConcentration.hhi}** · leaders: ${vTop.map((v) => `${v.name} (${v.pct.toFixed(1)}%)`).join(", ")}`,
    );
  }
  if (a.forecastNext) {
    lines.push(
      `- **Next-period forecast:** ${a.forecastNext.nextMonths.map((m) => `${m.label} ${money(m.projected)}`).join(" · ")} (avg **${money(a.forecastNext.avgNext3)}**)`,
    );
  }
  lines.push(`- **Recommendations:**`);
  a.recommendations.forEach((r) => lines.push(`  - ${r}`));
  return lines.join("\n");
}

function coveragePct(rows: SpendTxn[]) {
  if (!rows.length) return 0;
  const c = (p: number) => Math.round(Math.max(0, Math.min(1, p)) * 100);
  const present = (v: string) => (v && v.trim() ? 1 : 0);
  const vendor = rows.reduce((s, r) => s + present(r.vendor), 0) / rows.length;
  const dept = rows.reduce((s, r) => s + present(r.department), 0) / rows.length;
  const amt = rows.reduce((s, r) => s + (r.amount > 0 ? 1 : 0), 0) / rows.length;
  const date = rows.reduce((s, r) => s + present(r.date), 0) / rows.length;
  const inv = rows.reduce((s, r) => s + present(r.invoiceId), 0) / rows.length;
  return c(0.22 * vendor + 0.18 * dept + 0.22 * amt + 0.18 * date + 0.2 * inv);
}

export function answerFromDataset(opts: {
  question: string;
  datasetSpend: WorkspaceDataset | null;
  datasetPayroll: WorkspaceDataset | null;
  profile: OnboardingProfile | null;
  entity: string;
  range?: DateRange;
  /** When workspace is upload-backed, aligns answers with Forecasting cards + Alerts queue. */
  uploadPilot?: UploadPilotSnapshot | null;
  /** Recent turns (user + assistant) for follow-up finance questions — last messages only. */
  conversationTurns?: ReadonlyArray<{ role: "user" | "assistant"; content: string }>;
}) {
  const q = userQuestionFromPrompt(opts.question);
  const ql = q.toLowerCase();
  const orgType = opts.profile?.orgType || "Organization";
  const entity = opts.entity;

  const spendAll = opts.datasetSpend?.kind === "spend" ? (opts.datasetSpend.rows as SpendTxn[]) : [];
  const payroll = opts.datasetPayroll?.kind === "payroll" ? (opts.datasetPayroll.rows as PayrollRow[]) : [];
  const range = opts.range || {};

  const spend = spendAll.filter((t) => {
    if (!range.from && !range.to) return true;
    if (!t.date) return true; // keep undated rows in pilots
    if (range.from && t.date < range.from) return false;
    if (range.to && t.date > range.to) return false;
    return true;
  });

  type Viz =
    | { type: "bar"; title: string; data: Array<{ name: string; value: number }> }
    | { type: "line"; title: string; data: Array<{ x: string; y: number; y2?: number | null }> };

  const sources = {
    entity,
    range,
    spend: opts.datasetSpend?.kind === "spend" ? { filename: opts.datasetSpend.filename, rows: spend.length } : null,
    payroll: opts.datasetPayroll?.kind === "payroll" ? { filename: opts.datasetPayroll.filename, rows: payroll.length } : null,
  };
  const confidence =
    spend.length
      ? Math.max(42, Math.min(96, Math.round(40 + coveragePct(spend) * 0.6 + (payroll.length ? 8 : 0))))
      : payroll.length
        ? 62
        : 0;

  const hasAny = spend.length || payroll.length;
  const mergedUser = mergeUserTurnsOnly(q, opts.conversationTurns);
  const mode = routeUserIntent(q, opts.conversationTurns);
  const runFinance = shouldRunDatasetAnalytics(mode);

  const uploadAnalytics: UploadAnalyticsSnapshot | null = hasAny
    ? opts.uploadPilot?.analytics ??
      buildUploadAnalyticsSnapshot({
        entity,
        range: opts.range || {},
        spendDataset: opts.datasetSpend,
        payrollDataset: opts.datasetPayroll,
      })
    : null;

  const structured =
    hasAny && runFinance && uploadAnalytics
      ? buildStructuredWorkspaceAnalytics({
          entity,
          range: opts.range || {},
          spendDataset: opts.datasetSpend,
          payrollDataset: opts.datasetPayroll,
        })
      : null;

  if (mode === "thanks") {
    const replies = [
      "Glad it helped.",
      "Anytime — ping me when you want the next slice.",
      "You’re welcome. Want a quick read on anything else?",
    ];
    const pick = replies[entity.length % replies.length]!;
    return {
      kind: "intent_thanks" as const,
      text: pick,
      meta: { sources, confidencePct: 0, mode: "local" as const },
    };
  }

  if (mode === "greeting") {
    return {
      kind: "intent_greeting" as const,
      text: hasAny
        ? `Hey — I’ve got **${entity}** in view. What’s on your mind?`
        : "Hey — happy to help. Drop a spreadsheet when you want me to work from real rows.",
      meta: { sources, confidencePct: hasAny ? confidence : 0, mode: "local" as const },
    };
  }

  if (mode === "readiness") {
    return {
      kind: "intent_readiness" as const,
      text: hasAny
        ? "Ready when you are."
        : "Ready — upload CSV/XLSX when you want numbers from a file.",
      meta: { sources, confidencePct: hasAny ? confidence : 0, mode: "local" as const },
    };
  }

  if (mode === "help_request") {
    return {
      kind: "intent_help" as const,
      text:
        "I can chat normally, or crunch your upload when you ask for things like **summarize**, **top vendors**, or **what looks suspicious**.",
      meta: { sources, confidencePct: hasAny ? confidence : 0, mode: "local" as const },
    };
  }

  if (mode === "report_request") {
    return {
      kind: "intent_report" as const,
      text: "Use **Reports** or **AI Workspace** in the menu for PDF packs.",
      meta: { sources, confidencePct: 0, mode: "local" as const },
    };
  }

  if (mode === "upload_request") {
    return {
      kind: "intent_upload" as const,
      text: "Use **Upload** in the app or drop CSV/XLSX here, then ask me to dig in.",
      meta: { sources, confidencePct: 0, mode: "local" as const },
    };
  }

  if (!hasAny) {
    if (runFinance) {
      return {
        text:
          `No **spend or payroll** file in scope for **${entity}** yet — I won’t invent KPIs.\n\n` +
          `Upload **CSV/XLSX**, then ask again.`,
        kind: "empty" as const,
        meta: { sources, confidencePct: 0, mode: "local" as const },
      };
    }
    return {
      kind: "chat_conversational" as const,
      text: "I don’t have a file in this scope yet — upload when you’re ready, or just chat in the meantime.",
      meta: { sources, confidencePct: 0, mode: "local" as const },
    };
  }

  if (!runFinance) {
    if (mode === "feedback_from_user") {
      return {
        kind: "chat_feedback" as const,
        text:
          "Sorry that missed the mark. I run on your uploaded rows with fixed templates, so I can sound robotic. Tell me what felt off and ask again in plain English — I’ll match the tone better when I’m not in “numbers mode.”",
        meta: { sources, confidencePct: Math.min(confidence, 55), mode: "local" as const },
      };
    }
    if (mode === "clarification") {
      return {
        kind: "chat_clarification" as const,
        text:
          "Fair question — I only answer from the rows in scope (and I can miss a column mapping). If something looked wrong, say which number or vendor and I’ll re-check that path.",
        meta: { sources, confidencePct: Math.min(confidence, 62), mode: "local" as const },
      };
    }
    if (mode === "conversational") {
      return {
        kind: "chat_conversational" as const,
        text: hasAny
          ? "I’m here. If you want me to work the file, ask something specific — otherwise I’m happy to just talk it through."
          : "Sure — what do you want to figure out?",
        meta: { sources, confidencePct: hasAny ? Math.min(confidence, 50) : 0, mode: "local" as const },
      };
    }
    return {
      kind: "chat_conversational" as const,
      text: hasAny
        ? "Say the word when you want numbers from this workspace."
        : "Upload when you’re ready and I’ll stay out of the finance templates until you ask.",
      meta: { sources, confidencePct: hasAny ? confidence : 0, mode: "local" as const },
    };
  }

  const deep = wantsDeepDetail(ql);

  // --- Explicit analysis only (user asked for data / analytics) ---

  if (structured && /\b(why|how come)\b.*\bpayroll\b|\bpayroll\b.*\b(high|higher|highest|up|rise|risen|rising|large|big|expensive|costly|so much)\b/i.test(mergedUser)) {
    const p = structured.payrollVsRevenue;
    const bullets = [
      `**Payroll cost in this scope:** ${money(p.payrollCostInScope)} (sum of salary fields on payroll rows).`,
      p.payrollAsPctOfRevenue != null
        ? `**Payroll ÷ detected revenue columns:** **${p.payrollAsPctOfRevenue.toFixed(1)}%** (${p.dataQuality} quality — needs revenue mapped on spend rows).`
        : `**Payroll ÷ revenue:** not computable — no **revenue** amounts detected on spend rows in this upload.`,
      `**Payroll risk mix:** ${structured.overtimeTrends.payrollRiskMix.highRiskCount} high · ${structured.overtimeTrends.payrollRiskMix.mediumRiskCount} medium · ${structured.overtimeTrends.payrollRiskMix.lowRiskCount} low (heuristic).`,
      `**Spend in same scope:** ${money(structured.totalSpend.amount)} across **${structured.totalSpend.transactionCount.toLocaleString()}** spend rows.`,
    ];
    return {
      kind: "payroll_cost_explainer" as const,
      text: `### Payroll · ${entity}\n\n${bullets.map((b) => `• ${b}`).join("\n")}`,
      detailText: structuredAnalyticsToJsonBlock(structured),
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (structured && /\b(what should i fix|what to fix|fix first|priorit|prioritize|most urgent|where to start|biggest problem|biggest issue)\b/i.test(mergedUser)) {
    const items = structured.costSavingsOpportunities.filter((c) => c.estimatedImpactUsd > 0).slice(0, 6);
    const body =
      items.length > 0
        ? items
            .map(
              (c, i) =>
                `${i + 1}. **${c.title}** — est. **${money(c.estimatedImpactUsd)}** (${c.confidence} confidence)\n   _${c.rationale}_`,
            )
            .join("\n\n")
        : `No high-confidence dollar estimates from heuristics — still review **${structured.duplicateCharges.totalSignals}** duplicate/repeat signals and **${structured.unusualTransactions.countAtOrAboveP95}** large rows vs p95.`;
    return {
      kind: "fix_first" as const,
      text: `### What to fix first · ${entity}\n\n${body}`,
      detailText: structuredAnalyticsToJsonBlock(structured),
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (structured && /\b(where|which)\b.*\b(overspend|over-spend|over spending|spending too|bleeding|leakage|waste|too much)\b/i.test(mergedUser)) {
    const depts = structured.departmentRanking.slice(0, 6);
    const vendors = structured.topVendors.slice(0, 5);
    const deptLine = depts.length
      ? `**Departments (share of spend):** ${depts.map((d) => `**${d.department}** ${money(d.spend)} (${d.pctOfTotal.toFixed(1)}%)`).join(" · ")}`
      : "No department buckets detected.";
    const venLine = vendors.length
      ? `**Top vendors:** ${vendors.map((v) => `**${v.name}** ${money(v.spend)} (${v.pctOfSpend.toFixed(1)}%)`).join(" · ")}`
      : "";
    return {
      kind: "overspend_locator" as const,
      text: `### Overspending hotspots · ${entity}\n\n• ${deptLine}\n\n${venLine ? `• ${venLine}` : ""}\n\n• **Unusual transactions (≥p95):** **${structured.unusualTransactions.countAtOrAboveP95}** rows (threshold **${money(structured.unusualTransactions.p95Amount)}**).`,
      detailText: structuredAnalyticsToJsonBlock(structured),
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (/\b(suspicious|anomal|what looks suspicious|find anomalies|anomaly hunt|red flag|looks?\s+off|fishy)\b/i.test(ql) && spend.length) {
    const flagged = spend
      .filter((t) => t.flags.length)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20)
      .map((t) => ({
        Date: t.date || "—",
        Vendor: t.vendor || "—",
        Department: t.department || "—",
        Amount: money(t.amount),
        Flags: t.flags.join("; ") || "—",
      }));
    if (!flagged.length) {
      return {
        kind: "suspicious_none" as const,
        text: `**No flagged spend** in **${entity}** for this scope.`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const tableMd = `\`\`\`\n${asTable(flagged, ["Date", "Vendor", "Department", "Amount", "Flags"])}\n\`\`\``;
    if (deep) {
      return {
        kind: "suspicious" as const,
        text: `### Flagged spend · ${entity}\n\n${tableMd}`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const top = flagged.slice(0, 4);
    const bullets = top.map((t) => `• **${t.Vendor}** · ${t.Amount} · ${t.Flags}`);
    return {
      kind: "suspicious" as const,
      text: `### Flagged spend · ${entity}\n\n${bullets.join("\n")}\n\n_${flagged.length} rows — expand for the full table._`,
      detailText: tableMd,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (
    opts.uploadPilot?.alerts?.length &&
    /\b(risks?|alerts?|investigations?|flags?)\b/i.test(ql)
  ) {
    const list = opts.uploadPilot.alerts.slice(0, 10);
    const lines = list.map((a) => `- **${a.severity}** · ${a.title}`);
    const tail =
      opts.uploadPilot.alerts.length > 10
        ? `\n\n… +${opts.uploadPilot.alerts.length - 10} more in **Alerts**.`
        : `\n\nRouting and scores live in **Alerts**.`;
    if (deep) {
      return {
        kind: "upload_risks" as const,
        text: `### Alerts · ${entity}\n\n${lines.join("\n")}${tail}`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const kpis = list.slice(0, 3).map((a) => ({
      label: a.title.slice(0, 28) + (a.title.length > 28 ? "…" : ""),
      value: a.severity,
      hint: "Queue item",
    }));
    return {
      kind: "upload_risks" as const,
      text: `### Top alerts · ${entity}\n\n${list
        .slice(0, 4)
        .map((a) => `• **${a.severity}** — ${a.title}`)
        .join("\n")}\n\n_${opts.uploadPilot.alerts.length} items — expand for the list._`,
      detailText: `${lines.join("\n")}${tail}`,
      kpis: kpis.length ? kpis : undefined,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Top vendors by spend (ranked), when analytics exist — not plain name catalog.
  const vendorCatalogIntent =
    /\b(list|names|which)\b.*\bvendors?\b|\bvendors?\b.*\b(list|names|which)\b/i.test(ql);
  if (/\btop vendors?\b/i.test(ql) && spend.length && uploadAnalytics && !vendorCatalogIntent) {
    const a = uploadAnalytics;
    const top = a.vendorConcentration.topVendors.slice(0, 10);
    const rows = top.map((v, i) => ({
      Rank: i + 1,
      Vendor: v.name,
      Spend: money(v.spend),
      Share: `${v.pct.toFixed(1)}%`,
    }));
    const viz: Viz = {
      type: "bar",
      title: `Top vendors · ${entity}`,
      data: topN(top, 6).map((v) => ({ name: v.name, value: Math.round(v.spend) })),
    };
    const kpis = topN(top, 3).map((v) => ({
      label: v.name.length > 22 ? `${v.name.slice(0, 22)}…` : v.name,
      value: money(v.spend),
      hint: `${v.pct.toFixed(1)}% of spend`,
    }));
    const tableMd = `\`\`\`\n${asTable(rows, ["Rank", "Vendor", "Spend", "Share"])}\n\`\`\``;
    if (deep) {
      return {
        kind: "vendor_spend_rank" as const,
        text: `### Top vendors · ${entity}\n\n${tableMd}`,
        viz,
        kpis,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const bullets = top.slice(0, 4).map((v) => `• **${v.name}** — ${money(v.spend)} (${v.pct.toFixed(1)}%)`);
    return {
      kind: "vendor_spend_rank" as const,
      text: `### Top vendors · ${entity}\n\n${bullets.join("\n")}\n\n_Concentration: top-1 **${a.vendorConcentration.top1Pct.toFixed(1)}%** · top-5 **${a.vendorConcentration.top5Pct.toFixed(1)}%**._`,
      detailText: tableMd,
      viz,
      kpis,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Department names.
  if (ql.includes("department") && (ql.includes("name") || ql.includes("list") || ql.includes("what are"))) {
    const depts = uniqSorted([
      ...spend.map((t) => t.department),
      ...payroll.map((p) => p.department),
    ]);
    const sample = topN(depts, 40);
    const body =
      `Departments for **${entity}** (**${depts.length}**):\n\n` +
      sample.map((d) => `- ${d}`).join("\n") +
      (depts.length > sample.length ? `\n\n… +${depts.length - sample.length} more` : "");
    if (deep) {
      return {
        kind: "departments" as const,
        text: body,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const preview = sample.slice(0, 12).map((d) => `• ${d}`).join("\n");
    return {
      kind: "departments" as const,
      text: `### Departments · ${entity}\n\n**${depts.length}** detected — first **${Math.min(12, sample.length)}** below.\n\n${preview}${depts.length > 12 ? `\n\n_Full list in details._` : ""}`,
      detailText: depts.length > 12 ? body : undefined,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Vendors.
  if (ql.includes("vendor") && (ql.includes("name") || ql.includes("list") || ql.includes("which"))) {
    const vendors = uniqSorted(spend.map((t) => t.vendor));
    const sample = topN(vendors, 40);
    const body =
      `Vendors for **${entity}** (**${vendors.length}**):\n\n` +
      sample.map((v) => `- ${v}`).join("\n") +
      (vendors.length > sample.length ? `\n\n… +${vendors.length - sample.length} more` : "");
    if (deep) {
      return {
        kind: "vendors" as const,
        text: body,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const preview = sample.slice(0, 12).map((v) => `• ${v}`).join("\n");
    return {
      kind: "vendors" as const,
      text: `### Vendors · ${entity}\n\n**${vendors.length}** detected — sample below.\n\n${preview}${vendors.length > 12 ? `\n\n_Full list in details._` : ""}`,
      detailText: vendors.length > 12 ? body : undefined,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (/\b(concentration|hhi|vendor\s+share|vendor\s+dependency)\b/i.test(ql) && spend.length && uploadAnalytics) {
    const a = uploadAnalytics;
    const rows = a.vendorConcentration.topVendors.slice(0, 12).map((v, i) => ({
      Rank: i + 1,
      Vendor: v.name,
      Spend: money(v.spend),
      Share: `${v.pct.toFixed(1)}%`,
    }));
    const tableMd = `\`\`\`\n${asTable(rows, ["Rank", "Vendor", "Spend", "Share"])}\n\`\`\``;
    const headline = `### Concentration · ${entity}\n\nTop-1 **${a.vendorConcentration.top1Pct.toFixed(1)}%** · Top-5 **${a.vendorConcentration.top5Pct.toFixed(1)}%** · HHI **${a.vendorConcentration.hhi}**`;
    if (deep) {
      return {
        kind: "vendor_concentration" as const,
        text: `${headline}\n\n${tableMd}`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const leaders = a.vendorConcentration.topVendors
      .slice(0, 3)
      .map((v) => `• **${v.name}** — ${money(v.spend)} (${v.pct.toFixed(1)}%)`)
      .join("\n");
    return {
      kind: "vendor_concentration" as const,
      text: `${headline}\n\n${leaders}\n\n_Full vendor table in details._`,
      detailText: tableMd,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Overspend most.
  if ((ql.includes("overspent") || ql.includes("spend most") || ql.includes("top spend")) && spend.length) {
    const byDept = groupSum(spend, (t) => t.department || "Unassigned", (t) => t.amount);
    const top = topN(byDept, 10).map((r, i) => ({ Rank: i + 1, Department: r.key, Spend: money(r.value) }));
    const viz: Viz = {
      type: "bar",
      title: `Top departments by spend (${entity})`,
      data: topN(byDept, 8).map((r) => ({ name: r.key, value: Math.round(r.value) })),
    };
    const kpis = topN(byDept, 3).map((r) => ({
      label: r.key,
      value: money(r.value),
      hint: "Dept spend",
    }));
    const tableMd = `\`\`\`\n${asTable(top, ["Rank", "Department", "Spend"])}\n\`\`\``;
    if (deep) {
      return {
        kind: "dept_ranking" as const,
        text: `### Department spend · ${entity}\n\n${tableMd}`,
        viz,
        kpis,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const bullets = top.slice(0, 4).map((r) => `• **${r.Department}** — ${r.Spend}`);
    return {
      kind: "dept_ranking" as const,
      text: `### Department spend · ${entity}\n\n${bullets.join("\n")}\n\n_Full ranking in details._`,
      detailText: tableMd,
      viz,
      kpis,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Duplicate invoices.
  if ((ql.includes("duplicate") || ql.includes("duplicates")) && (ql.includes("invoice") || ql.includes("payment"))) {
    const dups = spend
      .filter((t) => t.flags.includes("Duplicate invoice") || t.flags.includes("Repeated payment"))
      .filter((t) => t.invoiceId || t.vendor)
      .slice(0, 40)
      .map((t) => ({
        Date: t.date || "—",
        Vendor: t.vendor || "—",
        Department: t.department || "—",
        Invoice: t.invoiceId || "—",
        Amount: money(t.amount),
        Flags: t.flags.join("; ") || "—",
      }));

    if (!dups.length) {
      return {
        kind: "no_dups" as const,
        text: `**No duplicate-invoice matches** for **${entity}** on vendor + invoice + amount keys — add reference columns if your export uses different IDs.`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }

    const tableMd = `\`\`\`\n${asTable(dups, ["Date", "Vendor", "Department", "Invoice", "Amount", "Flags"])}\n\`\`\``;
    if (deep) {
      return {
        kind: "dups" as const,
        text: `### Duplicate candidates · ${entity}\n\n${tableMd}`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const preview = dups.slice(0, 4).map((r) => `• **${r.Vendor}** · ${r.Amount} · ${r.Flags}`);
    return {
      kind: "dups" as const,
      text: `### Duplicate candidates · ${entity}\n\n${preview.join("\n")}\n\n_${dups.length} rows — expand for full table._`,
      detailText: tableMd,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Vendors needing review.
  if ((ql.includes("vendor") && (ql.includes("review") || ql.includes("risk"))) && spend.length) {
    const flagged = spend.filter((t) => t.flags.length);
    const byVendor = groupSum(flagged, (t) => t.vendor || "Unknown", (t) => t.amount);
    const top = topN(byVendor, 10).map((r, i) => ({ Rank: i + 1, Vendor: r.key, FlaggedSpend: money(r.value) }));
    const tableMd = `\`\`\`\n${asTable(top, ["Rank", "Vendor", "FlaggedSpend"])}\n\`\`\``;
    if (deep) {
      return {
        kind: "vendor_review" as const,
        text: `### Vendors to review · ${entity}\n\n${tableMd}`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const bullets = top.slice(0, 4).map((r) => `• **${r.Vendor}** — ${r.FlaggedSpend}`);
    return {
      kind: "vendor_review" as const,
      text: `### Vendors to review · ${entity}\n\n${bullets.join("\n")}\n\n_${top.length} ranked — expand for table._`,
      detailText: tableMd,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Forecast next quarter.
  if (ql.includes("forecast") && (ql.includes("quarter") || ql.includes("next"))) {
    const dated = spend.filter((t) => t.date && t.amount > 0);
    if (dated.length < 6) {
      const pilot = opts.uploadPilot?.forecastCards
        ? uploadForecastPreamble(opts.uploadPilot)
        : "";
      return {
        kind: "forecast_missing" as const,
        text:
          pilot +
          `I can’t run a dated **monthly trend** forecast yet for **${entity}** because the uploaded spend rows don’t include enough usable dates (need more dated rows).\n\n` +
          `Upload spend data with a transaction date column and ask again.`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const byMonth = groupSum(dated, (t) => monthKey(t.date), (t) => t.amount)
      .filter((m) => m.key)
      .slice(0, 24)
      .map((m) => ({ month: m.key, total: m.value }))
      .sort((a, b) => a.month.localeCompare(b.month));
    const fc = forecastNextQuarter(byMonth);
    if (!fc) {
      return {
        kind: "forecast_missing" as const,
        text: `Not enough history to forecast next quarter for **${entity}**.`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const last = topN(byMonth.slice(-6), 6).map((m) => ({ Month: m.month, TotalSpend: money(m.total) }));
    const viz: Viz = {
      type: "line",
      title: `Spend trend + forecast (${entity})`,
      data: byMonth.slice(-12).map((m) => ({ x: m.month, y: Math.round(m.total), y2: null })),
    };
    const pilotPre = opts.uploadPilot?.forecastCards ? uploadForecastPreamble(opts.uploadPilot) : "";
    const detailBody =
      `**Recent months**\n\n\`\`\`\n${asTable(last, ["Month", "TotalSpend"])}\n\`\`\`\n\n` +
      `**Next 3 months** (avg **${money(fc.avg)}**): M+1 **${money(fc.next[0])}** · M+2 **${money(fc.next[1])}** · M+3 **${money(fc.next[2])}**\n\n` +
      `_Heuristic trend — add more dated history + payroll for steadier ${orgType} projections._`;
    const detailMd = pilotPre + detailBody;
    const shortMd =
      pilotPre +
      `### Forecast · ${entity}\n\n` +
      `Next 3 months (trend): **${money(fc.next[0])}** · **${money(fc.next[1])}** · **${money(fc.next[2])}** (avg **${money(fc.avg)}**).\n\n` +
      `_Month history in details._`;
    const vizData = {
      ...viz,
      data: [
        ...viz.data,
        { x: "M+1", y: Math.round(fc.next[0]), y2: null },
        { x: "M+2", y: Math.round(fc.next[1]), y2: null },
        { x: "M+3", y: Math.round(fc.next[2]), y2: null },
      ],
    };
    if (deep) {
      return {
        kind: "forecast" as const,
        text: `${pilotPre}### Forecast · ${entity}\n\n${detailBody}`,
        viz: vizData,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    return {
      kind: "forecast" as const,
      text: shortMd,
      detailText: detailMd,
      viz: vizData,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  // Payroll anomalies.
  if (ql.includes("payroll") && (ql.includes("anomal") || ql.includes("issue") || ql.includes("risk"))) {
    const risky = payroll.filter((p) => p.risk !== "Low" || p.signals.length).slice(0, 40);
    if (!risky.length) {
      return {
        kind: "payroll_ok" as const,
        text: `**No payroll anomalies** surfaced for **${entity}** on current heuristics.`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const rows = risky.map((p) => ({
      Risk: p.risk,
      Employee: p.employeeName || "—",
      Department: p.department || "—",
      Salary: money(p.salaryCurrent),
      Signals: p.signals.join("; ") || "—",
    }));
    const tableMd = `\`\`\`\n${asTable(rows, ["Risk", "Employee", "Department", "Salary", "Signals"])}\n\`\`\``;
    if (deep) {
      return {
        kind: "payroll_anoms" as const,
        text: `### Payroll review · ${entity}\n\n${tableMd}`,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    const bullets = rows.slice(0, 4).map((r) => `• **${r.Employee}** (${r.Risk}) — ${r.Salary}`);
    return {
      kind: "payroll_anoms" as const,
      text: `### Payroll review · ${entity}\n\n${bullets.join("\n")}\n\n_${risky.length} rows — expand for full table._`,
      detailText: tableMd,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (mode === "summary_request") {
    const spendTotal = spend.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);
    const spendFlagged = spend.filter((t) => t.flags.length).length;
    const payrollHigh = payroll.filter((p) => p.risk === "High").length;
    const totalRecords = spend.length + payroll.length;
    const bullets: string[] = [];
    bullets.push(`**${totalRecords.toLocaleString()}** records in scope for **${entity}**`);
    if (spend.length) {
      if (spendTotal > 0) {
        bullets.push(`Mapped spend totals **${money(spendTotal)}** across **${spend.length.toLocaleString()}** spend rows`);
      } else {
        bullets.push(
          `No positive amounts in mapped spend fields (**${spend.length.toLocaleString()}** rows) — check column mapping`,
        );
      }
      bullets.push(
        spendFlagged
          ? `**${spendFlagged.toLocaleString()}** spend rows flagged for review`
          : `No spend rows flagged in this pass`,
      );
    } else if (payroll.length) {
      bullets.push("Spend not merged in this view — payroll-only dataset");
    }
    if (payroll.length) {
      bullets.push(
        payrollHigh
          ? `Payroll **${payroll.length.toLocaleString()}** rows · **${payrollHigh}** high-risk (heuristic)`
          : `Payroll **${payroll.length.toLocaleString()}** rows · no high-risk rows flagged`,
      );
    }
    const schema = uploadAnalytics?.schema;
    if (schema && spend.length && schema.spendDeptCoveragePct >= 40) {
      bullets.push(
        `Department coverage **${Math.round(schema.spendDeptCoveragePct)}%** — ready for department breakdown`,
      );
    }
    const exec = /\b(executive summary|board|exec)\b/i.test(ql);
    const heading = exec ? "### Executive snapshot" : "### Quick summary";
    const text = `${heading}\n\n${bullets.map((b) => `• ${b}`).join("\n")}`;
    const engine =
      uploadAnalytics && (spend.length || payroll.length) ? formatAnalyticsEngineBlock(uploadAnalytics, entity) : "";

    const kpis: Array<{ label: string; value: string; hint?: string }> = [];
    const topV = uploadAnalytics?.vendorConcentration.topVendors;
    if (topV?.length) {
      for (const v of topN(topV, 3)) {
        kpis.push({
          label: v.name.length > 18 ? `${v.name.slice(0, 18)}…` : v.name,
          value: money(v.spend),
          hint: `${v.pct.toFixed(1)}% of spend`,
        });
      }
    } else if (spend.length) {
      kpis.push({
        label: "Spend in scope",
        value: money(spendTotal),
        hint: `${spend.length.toLocaleString()} rows`,
      });
      kpis.push({
        label: "Flagged rows",
        value: spendFlagged.toLocaleString(),
        hint: "Heuristic flags",
      });
    }
    if (payroll.length && kpis.length < 3) {
      kpis.push({
        label: "Payroll rows",
        value: payroll.length.toLocaleString(),
        hint: `${payrollHigh} high risk`,
      });
    }

    if (deep && engine) {
      return {
        kind: "summary_compact" as const,
        text: `${text}\n\n### Data engine\n\n${engine}`,
        kpis: kpis.length ? kpis : undefined,
        meta: { sources, confidencePct: confidence, mode: "local" as const },
      };
    }
    return {
      kind: "summary_compact" as const,
      text,
      detailText: engine || undefined,
      kpis: kpis.length ? kpis : undefined,
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (runFinance && structured) {
    return {
      kind: "finance_engine" as const,
      text: formatStructuredAnalyticsNarrative(structured, mergedUser),
      detailText: structuredAnalyticsToJsonBlock(structured),
      meta: { sources, confidencePct: confidence, mode: "local" as const },
    };
  }

  if (runFinance && !structured) {
    return {
      kind: "finance_engine_empty" as const,
      text:
        `I can’t build the analytics engine for **${entity}** in this range — there may be no in-range rows, or files aren’t merged for this scope. ` +
        `Widen the date filter or check **Uploads** for this tenant.`,
      meta: { sources, confidencePct: 0, mode: "local" as const },
    };
  }

  const hint =
    hasAny && uploadAnalytics
      ? `\n\nQuick read: **${money(uploadAnalytics.totals.spendPositive)}** spend · top vendor **${uploadAnalytics.vendorConcentration.topVendors[0]?.name || "—"}** — try **summarize**.`
      : "";

  return {
    kind: "unknown" as const,
    text:
      (hasAny
        ? "I didn’t catch that as a data question — try **summarize**, **what looks suspicious**, or name a vendor."
        : "Upload spend or payroll, then ask the same — I won’t guess numbers without rows.") + hint,
    meta: { sources, confidencePct: confidence, mode: "local" as const },
  };
}

