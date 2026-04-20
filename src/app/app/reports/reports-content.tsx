"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileDown, LayoutDashboard } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

import { getUploadedInsights } from "@/lib/upload/storage";
import { buildUploadedExecutiveBriefs } from "@/lib/upload/briefs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPENDDA_INTELLIGENCE_REPORT_VERSION } from "@/lib/intelligence/constants";
import { useProfile } from "@/lib/profile/client";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { SwitchRow } from "@/components/ui/switch-row";
import { EntityMultiSelect } from "@/components/app/entity-multi-select";
import {
  DEFAULT_EXPORT_OPTIONS,
  periodLabelFromPreset,
  type EnterpriseExportOptions,
  type ReportPeriodPreset,
} from "@/lib/reports/export-options";
import { externalUpdatesToReportBullets, getRelevantExternalUpdates } from "@/lib/external-intelligence";
import { fetchReportBundle } from "@/lib/reports/report-bundle";
import { buildEnterprisePdfBlob } from "@/lib/reports/enterprise-pdf";
import { buildEnterpriseXlsxArrayBuffer } from "@/lib/reports/enterprise-xlsx";
import { buildRawDataCsvExport } from "@/lib/reports/raw-csv-export";
import { useClientSession } from "@/hooks/use-client-session";
import { appendPortalAudit, recordTenantUsage } from "@/lib/tenants/portal-audit-client";
import { planAllowsFeature } from "@/lib/tenants/subscription";
import { tenantRoleCan } from "@/lib/tenants/permissions";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { mergeWorkspaceDatasetsForAnalyticsScope } from "@/lib/workspace/merge-scope-datasets";
import { buildMonthlyExecutiveReportFromUpload } from "@/lib/reports/monthly-executive-report";
import {
  buildMonthlyAnomaliesCsv,
  buildMonthlyBoardPdfBlob,
  buildMonthlyBoardXlsxArrayBuffer,
} from "@/lib/reports/monthly-executive-board-export";
import { buildStructuredWorkspaceAnalytics } from "@/lib/analytics/structured-workspace-analytics";
import {
  buildUploadStructuredReportPdfBlob,
  uploadStructuredReportFilename,
  type UploadStructuredPdfKind,
} from "@/lib/reports/upload-structured-report-pdfs";

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resolvedExportOptions(
  base: EnterpriseExportOptions,
  periodPreset: ReportPeriodPreset,
  periodCustom: string,
): EnterpriseExportOptions {
  return {
    ...base,
    periodPreset,
    periodLabel: periodLabelFromPreset(periodPreset, periodCustom),
    periodCustom: periodPreset === "custom" ? periodCustom : undefined,
  };
}

export default function ReportsPage() {
  const [busy, setBusy] = React.useState(false);
  const { profile } = useProfile();
  const workspace = useWorkspaceData();
  const { scope } = useAnalyticsScope();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const canXlsx = planAllowsFeature(client?.planTier, "exports.xlsx");
  const canExportReports = tenantRoleCan(client?.role, "reports.export");
  const exportBusy = busy || !canExportReports;
  const [mounted, setMounted] = React.useState(false);
  const [items, setItems] = React.useState(() => [] as ReturnType<typeof getUploadedInsights>);

  React.useEffect(() => {
    setMounted(true);
    setItems(getUploadedInsights(clientId));
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith("spendda_uploaded_insights")) return;
      setItems(getUploadedInsights(clientId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clientId]);

  const briefs = React.useMemo(() => buildUploadedExecutiveBriefs(items), [items]);
  const hasUploads = mounted && items.length > 0;

  const [periodPreset, setPeriodPreset] = React.useState<ReportPeriodPreset>("last_30d");
  const [periodCustom, setPeriodCustom] = React.useState("");
  const [periodMode, setPeriodMode] = React.useState<
    "preset" | "month" | "quarter" | "year" | "range" | "label"
  >("preset");
  const [periodMonth, setPeriodMonth] = React.useState("");
  const [periodQuarter, setPeriodQuarter] = React.useState<"Q1" | "Q2" | "Q3" | "Q4">("Q1");
  const [periodYear, setPeriodYear] = React.useState(() => new Date().getUTCFullYear());
  const [periodRange, setPeriodRange] = React.useState<DateRange>({});
  const [periodLabelLocked, setPeriodLabelLocked] = React.useState(false);
  const [organizationName, setOrganizationName] = React.useState(DEFAULT_EXPORT_OPTIONS.organizationName);
  const [entity, setEntity] = React.useState(DEFAULT_EXPORT_OPTIONS.entity);
  const [entitiesSelected, setEntitiesSelected] = React.useState<string[]>([]);
  const [includeLogo, setIncludeLogo] = React.useState(DEFAULT_EXPORT_OPTIONS.includeLogo);
  const [includeCharts, setIncludeCharts] = React.useState(DEFAULT_EXPORT_OPTIONS.includeCharts);
  const [includeRawTables, setIncludeRawTables] = React.useState(DEFAULT_EXPORT_OPTIONS.includeRawTables);
  const [confidentialWatermark, setConfidentialWatermark] = React.useState(
    DEFAULT_EXPORT_OPTIONS.confidentialWatermark,
  );

  React.useEffect(() => {
    setPeriodMonth((m) => m || new Date().toISOString().slice(0, 7));
  }, []);

  React.useEffect(() => {
    if (profile?.activeEntity) setEntity(profile.activeEntity);
  }, [profile?.activeEntity]);

  React.useEffect(() => {
    // default to active entity (single) when profile changes
    if (!profile?.activeEntity) return;
    setEntitiesSelected([profile.activeEntity]);
  }, [profile?.activeEntity]);

  const entityOptions = React.useMemo(() => {
    const xs = profile?.entities?.length ? [...profile.entities] : [];
    const set = new Set(xs.filter(Boolean));
    if (entity.trim()) set.add(entity.trim());
    if (!set.size) set.add("HQ");
    return Array.from(set);
  }, [profile?.entities, entity]);

  const uploadMerge = React.useMemo(() => {
    if (workspace.dataSource !== "upload") return null;
    return mergeWorkspaceDatasetsForAnalyticsScope({
      datasets: workspace.datasets,
      scopeEntities: scope.entities,
      profileEntities: profile?.entities,
      primaryEntity: workspace.primaryEntity,
    });
  }, [
    workspace.dataSource,
    workspace.datasets,
    workspace.primaryEntity,
    workspace.revision,
    scope.entities,
    profile?.entities,
  ]);

  const canExportMonthlyUpload =
    workspace.dataSource === "upload" && Boolean(uploadMerge?.spend || uploadMerge?.payroll);

  function buildOpts(): EnterpriseExportOptions {
    const base = resolvedExportOptions(
      {
        ...DEFAULT_EXPORT_OPTIONS,
        organizationName: organizationName.trim() || DEFAULT_EXPORT_OPTIONS.organizationName,
        entity:
          entitiesSelected.length > 0
            ? entitiesSelected.join(" · ")
            : entity.trim() || DEFAULT_EXPORT_OPTIONS.entity,
        includeLogo,
        includeCharts,
        includeRawTables,
        confidentialWatermark,
      },
      periodPreset,
      periodCustom,
    );
    const marketRegulatoryBullets = externalUpdatesToReportBullets(getRelevantExternalUpdates(profile ?? null), 8);
    return { ...base, marketRegulatoryBullets };
  }

  function smartLabelFromMonth(ym: string) {
    if (!ym) return "Select month";
    const [y, m] = ym.split("-").map((x) => Number(x));
    if (!y || !m) return ym;
    const d = new Date(Date.UTC(y, m - 1, 1));
    return `${d.toLocaleString(undefined, { month: "short" })} ${y}`;
  }

  function smartLabelFromRange(r: DateRange) {
    if (!r.from && !r.to) return "";
    if (r.from && r.to) return `${r.from} → ${r.to}`;
    if (r.from) return `From ${r.from}`;
    return `Up to ${r.to}`;
  }

  // Keep the export system compatible: it still uses periodPreset + optional periodCustom label.
  React.useEffect(() => {
    if (periodMode === "preset") return;
    setPeriodPreset("custom");
    if (periodLabelLocked) return;
    if (periodMode === "month") setPeriodCustom(smartLabelFromMonth(periodMonth));
    if (periodMode === "quarter") setPeriodCustom(`${periodQuarter} ${periodYear}`);
    if (periodMode === "year") setPeriodCustom(`FY${periodYear}`);
    if (periodMode === "range") setPeriodCustom(smartLabelFromRange(periodRange));
    if (periodMode === "label") {
      // free text
    }
  }, [periodMode, periodMonth, periodQuarter, periodYear, periodRange.from, periodRange.to, periodLabelLocked]);

  const templates = [
    {
      title: "Board pack (monthly)",
      description: "Enterprise Excel workbook: Summary, Transactions, Alerts, Forecasting, Departments, Metadata.",
      primary: "Export Summary Pack (XLSX)",
      onClick: exportExcelEnterprisePack,
    },
    {
      title: "Audit-ready exceptions",
      description: "Alerts export with severity + score for triage and audit evidence packets.",
      primary: "Export Alerts (CSV)",
      onClick: exportAlertsCsv,
    },
    {
      title: "Board narrative (PDF)",
      description: "Full board pack with appendix coverage, branding, and sectioned executive storyline.",
      primary: "Export Board Pack (PDF)",
      onClick: exportBoardPackPdf,
    },
  ] as const;

  async function exportExecutiveBrief() {
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      const body = briefs
        .map((b) => `## ${b.title} (${b.audience})\n\n${b.summary}\n\n- ${b.highlights.join("\n- ")}\n`)
        .join("\n");
      downloadText("spendda-executive-brief.md", body, "text/markdown");
      toast.success("Executive brief exported", { description: "Markdown saved to your downloads." });
    } catch (e) {
      toast.error("Export failed", {
        description:
          e instanceof Error ? e.message : "Could not create the Markdown brief. Try again or use another browser.",
      });
    } finally {
      setBusy(false);
    }
  }

  /** Original single-flow PDF (unchanged) for users who prefer the prior layout. */
  async function exportExecutiveBriefPdfClassic() {
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 150));

      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const marginX = 56;
      let y = 78;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text("Spendda Intelligence Report", marginX, 48);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("Confidential – Oversight Use Only", marginX, 64);
      doc.setTextColor(0);

      const title = "Executive narrative";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(title, marginX, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
      doc.setTextColor(0);
      y += 26;

      const sections = briefs.length
        ? briefs
        : [
            {
              title: "Executive brief",
              audience: "Leadership",
              summary: "Upload spend/payroll files to generate a tailored executive brief and supporting exports.",
              highlights: [
                "Upload datasets in Upload Data",
                "Review Investigations for high-severity cases",
                "Use Spendda Intelligence Engine for structured next steps",
              ],
            },
          ];

      const maxWidth = 612 - marginX * 2;

      for (const s of sections) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`${s.title} (${s.audience})`, marginX, y);
        y += 16;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const summaryLines = doc.splitTextToSize(s.summary, maxWidth);
        doc.text(summaryLines, marginX, y);
        y += summaryLines.length * 14 + 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Highlights", marginX, y);
        y += 14;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        for (const h of s.highlights) {
          const lines = doc.splitTextToSize(`• ${h}`, maxWidth);
          doc.text(lines, marginX, y);
          y += lines.length * 13 + 2;
          if (y > 740) {
            doc.addPage();
            y = 62;
          }
        }

        y += 10;
        if (y > 740) {
          doc.addPage();
          y = 62;
        }
      }

      const pageH = doc.internal.pageSize.getHeight();
      const pageW = doc.internal.pageSize.getWidth();
      const footerY = pageH - 36;
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i += 1) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(110);
        doc.text("Generated by Spendda Intelligence Engine", marginX, footerY);
        doc.text(
          `${new Date().toISOString()} • Report v${SPENDDA_INTELLIGENCE_REPORT_VERSION}`,
          marginX,
          footerY + 12,
        );
        doc.text(`Page ${i} / ${pages}`, pageW - marginX - 72, footerY, { align: "left" });
        doc.setTextColor(0);
      }

      const blob = doc.output("blob");
      downloadBlob("spendda-executive-brief-classic.pdf", blob);
      toast.success("Classic PDF exported", { description: "Prior single-flow layout saved to downloads." });
    } catch (e) {
      toast.error("PDF export failed", {
        description:
          e instanceof Error ? e.message : "Your browser blocked the download or the report could not be built.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function exportEnterpriseExecutivePdf() {
    setBusy(true);
    try {
      const bundle = await fetchReportBundle();
      const opts = buildOpts();
      const blob = await buildEnterprisePdfBlob(bundle, briefs, items, opts, "executive");
      downloadBlob("spendda-executive-brief.pdf", blob);
      toast.success("Executive PDF ready", { description: "Branded enterprise brief saved to downloads." });
    } catch (e) {
      toast.error("Executive PDF failed", {
        description: e instanceof Error ? e.message : "Could not build the enterprise PDF.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function exportBoardPackPdf() {
    setBusy(true);
    try {
      const bundle = await fetchReportBundle();
      const opts = buildOpts();
      const blob = await buildEnterprisePdfBlob(bundle, briefs, items, opts, "board");
      downloadBlob("spendda-board-pack.pdf", blob);
      toast.success("Board pack PDF ready", { description: "Board-ready document saved to downloads." });
      void appendPortalAudit({ action: "export.pdf", detail: "board_pack" });
      void recordTenantUsage({ kind: "export" });
    } catch (e) {
      toast.error("Board pack failed", {
        description: e instanceof Error ? e.message : "Could not build the board pack PDF.",
      });
    } finally {
      setBusy(false);
    }
  }

  function buildUploadMonthlyReportOrNull() {
    if (!uploadMerge) return null;
    const opts = buildOpts();
    return buildMonthlyExecutiveReportFromUpload({
      organizationName: opts.organizationName,
      entityLabel: uploadMerge.scopeLabel,
      metricsEntity: workspace.primaryEntity,
      periodLabel: opts.periodLabel,
      range: scope.range,
      spendDataset: uploadMerge.spend,
      payrollDataset: uploadMerge.payroll,
    });
  }

  async function exportMonthlyBoardPdfUpload() {
    setBusy(true);
    try {
      const report = buildUploadMonthlyReportOrNull();
      if (!report) {
        toast.error("Nothing to export", { description: "Upload spend or payroll for the selected analytics scope." });
        return;
      }
      const opts = buildOpts();
      const blob = await buildMonthlyBoardPdfBlob(report, opts);
      downloadBlob(`spendda-monthly-executive-${new Date().toISOString().slice(0, 10)}.pdf`, blob);
      toast.success("Monthly executive PDF ready", { description: "Board-ready pack from your uploads." });
      void appendPortalAudit({ action: "export.pdf", detail: "monthly_upload_board" });
      void recordTenantUsage({ kind: "export" });
    } catch (e) {
      toast.error("PDF export failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function exportIntelligencePdf(kind: UploadStructuredPdfKind) {
    if (!uploadMerge) {
      toast.error("Nothing to export", { description: "Upload data for the selected analytics scope." });
      return;
    }
    setBusy(true);
    try {
      const opts = buildOpts();
      const structured = buildStructuredWorkspaceAnalytics({
        entity: uploadMerge.scopeLabel,
        range: scope.range,
        spendDataset: uploadMerge.spend,
        payrollDataset: uploadMerge.payroll,
      });
      const blob = await buildUploadStructuredReportPdfBlob(kind, structured, opts);
      const fn = uploadStructuredReportFilename(
        kind,
        entitiesSelected.length ? entitiesSelected.join("-") : opts.entity,
      );
      downloadBlob(fn, blob);
      toast.success("PDF ready", {
        description: structured
          ? "Charts, findings, and recommendations from your uploads."
          : "No in-range analytics — PDF explains how to fix scope.",
      });
      void appendPortalAudit({ action: "export.pdf", detail: `structured_${kind}` });
      void recordTenantUsage({ kind: "export" });
    } catch (e) {
      toast.error("PDF export failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function exportMonthlyBoardXlsxUpload() {
    if (!canXlsx) {
      toast.error("Plan upgrade required", {
        description: "Excel workbooks are included on Growth and Enterprise.",
      });
      return;
    }
    setBusy(true);
    try {
      const report = buildUploadMonthlyReportOrNull();
      if (!report) {
        toast.error("Nothing to export", { description: "Upload spend or payroll for the selected analytics scope." });
        return;
      }
      const opts = buildOpts();
      const buf = buildMonthlyBoardXlsxArrayBuffer(report, opts, SPENDDA_INTELLIGENCE_REPORT_VERSION);
      downloadBlob(
        `spendda-monthly-executive-${new Date().toISOString().slice(0, 10)}.xlsx`,
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      );
      toast.success("Monthly executive workbook ready", { description: "Multi-sheet Excel summary from uploads." });
      void appendPortalAudit({ action: "export.xlsx", detail: "monthly_upload" });
      void recordTenantUsage({ kind: "export" });
    } catch (e) {
      toast.error("Excel export failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function exportMonthlyAnomaliesCsvUpload() {
    setBusy(true);
    try {
      const report = buildUploadMonthlyReportOrNull();
      if (!report) {
        toast.error("Nothing to export", { description: "Upload spend or payroll for the selected analytics scope." });
        return;
      }
      const opts = buildOpts();
      const csv = buildMonthlyAnomaliesCsv(report, opts, SPENDDA_INTELLIGENCE_REPORT_VERSION);
      downloadText(`spendda-monthly-anomalies-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
      toast.success("Anomalies CSV ready", { description: "Flagged spend lines for audit workpapers." });
    } catch (e) {
      toast.error("CSV export failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function exportExcelEnterprisePack() {
    if (!canXlsx) {
      toast.error("Plan upgrade required", {
        description: "Excel workbooks are included on Growth and Enterprise.",
      });
      return;
    }
    setBusy(true);
    try {
      const bundle = await fetchReportBundle();
      const opts = buildOpts();
      const out = buildEnterpriseXlsxArrayBuffer(bundle, briefs, items, opts, SPENDDA_INTELLIGENCE_REPORT_VERSION);
      downloadBlob(
        "spendda-summary-pack.xlsx",
        new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      );
      toast.success("Summary pack ready", { description: "Multi-sheet enterprise workbook saved to downloads." });
      void appendPortalAudit({ action: "export.xlsx", detail: "enterprise_summary_pack" });
      void recordTenantUsage({ kind: "export" });
    } catch (e) {
      toast.error("Summary pack failed", {
        description:
          e instanceof Error ? e.message : "Could not build the Excel workbook. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  /** Original workbook (Cover, Uploads, ExecutiveBrief, Alerts) — unchanged. */
  async function exportExcelSummaryPackClassic() {
    if (!canXlsx) {
      toast.error("Plan upgrade required", {
        description: "Excel workbooks are included on Growth and Enterprise.",
      });
      return;
    }
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 150));

      const flagsRes = await fetch("/api/demo/flags?page=1&pageSize=200", { cache: "no-store" });
      if (!flagsRes.ok) throw new Error(`Alerts data unavailable (HTTP ${flagsRes.status}).`);
      const flagsJson = (await flagsRes.json()) as {
        items?: Array<{ id: string; title: string; severity: string; date: string; score: number }>;
      };
      const flagItems = flagsJson.items ?? [];

      const wb = XLSX.utils.book_new();

      const coverSheet = XLSX.utils.aoa_to_sheet([
        ["Spendda Intelligence Report"],
        ["Confidential – Oversight Use Only"],
        [],
        ["Generated by Spendda Intelligence Engine"],
        [new Date().toISOString()],
        [`Report version ${SPENDDA_INTELLIGENCE_REPORT_VERSION}`],
      ]);
      XLSX.utils.book_append_sheet(wb, coverSheet, "Cover");

      const uploadsSheet = XLSX.utils.json_to_sheet(
        items.map((x) => ({
          kind: x.kind,
          entity: x.entity,
          filename: x.filename,
          uploadedAt: x.uploadedAt,
          ...(x.kind === "spend"
            ? {
                totalTransactions: x.totalTransactions,
                totalSpend: x.totalSpend,
                flaggedCount: x.flaggedCount,
                repeatedCount: x.repeatedCount,
                unusualCount: x.unusualCount,
                topVendor: x.topVendor || "",
                topDepartment: x.topDepartment || "",
              }
            : {
                totalEmployees: x.totalEmployees,
                highRisk: x.highRisk,
                mediumRisk: x.mediumRisk,
                duplicateBankSignals: x.duplicateBankSignals,
                inactivePaidSignals: x.inactivePaidSignals,
                salarySpikeSignals: x.salarySpikeSignals,
                topDepartment: x.topDepartment || "",
              }),
        })),
      );
      XLSX.utils.book_append_sheet(wb, uploadsSheet, "Uploads");

      const briefsSheet = XLSX.utils.json_to_sheet(
        briefs.map((b) => ({
          title: b.title,
          audience: b.audience,
          summary: b.summary,
          highlights: b.highlights.join(" | "),
        })),
      );
      XLSX.utils.book_append_sheet(wb, briefsSheet, "ExecutiveBrief");

      const alertsSheet = XLSX.utils.json_to_sheet(
        flagItems.map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          date: f.date,
          score: f.score,
        })),
      );
      XLSX.utils.book_append_sheet(wb, alertsSheet, "Alerts");

      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(
        "spendda-summary-pack-classic.xlsx",
        new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      );
      toast.success("Classic workbook ready", { description: "Original four-sheet pack saved to downloads." });
      void appendPortalAudit({ action: "export.xlsx", detail: "classic_summary_pack" });
      void recordTenantUsage({ kind: "export" });
    } catch (e) {
      toast.error("Summary pack failed", {
        description:
          e instanceof Error ? e.message : "Could not build the Excel workbook. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function exportAlertsCsv() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/flags?page=1&pageSize=200", { cache: "no-store" });
      if (!res.ok) throw new Error(`Could not load alerts (HTTP ${res.status}).`);
      const json = (await res.json()) as {
        items?: Array<{ id: string; title: string; severity: string; date: string; score: number }>;
      };
      const alertRows = json.items ?? [];
      const header = "id,title,severity,date,score\n";
      const rows = alertRows
        .map((f) => `${f.id},"${String(f.title).replaceAll('"', '""')}",${f.severity},${f.date},${f.score}`)
        .join("\n");
      downloadText("spendda-alerts.csv", header + rows, "text/csv");
      toast.success("Alerts exported", { description: "CSV saved to downloads." });
    } catch (e) {
      toast.error("Alerts export failed", {
        description: e instanceof Error ? e.message : "Could not download alerts. Try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function exportRawBundleCsv() {
    setBusy(true);
    try {
      const bundle = await fetchReportBundle();
      const opts = buildOpts();
      const csv = buildRawDataCsvExport(bundle, briefs, items, opts, SPENDDA_INTELLIGENCE_REPORT_VERSION);
      downloadText("spendda-raw-export.csv", csv, "text/csv");
      toast.success("Raw export ready", { description: "Combined CSV bundle saved to downloads." });
    } catch (e) {
      toast.error("Raw export failed", {
        description: e instanceof Error ? e.message : "Could not build the raw CSV export.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Reports</h1>
          <p className="app-page-desc">
            Executive briefs and export packs for stakeholders. Enterprise PDFs, Excel packs, and raw CSV bundles honor
            your branding options below. Classic layouts remain available.
          </p>
        </div>
        <Badge variant="outline">
          <FileDown className="mr-1.5 h-3.5 w-3.5" />
          Exports
        </Badge>
      </div>

      {!canXlsx ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-950 dark:text-amber-50/95">
          Your workspace plan is <span className="font-semibold">{client?.planTier ?? "pilot"}</span>. PDF and CSV exports
          stay available; Excel workbooks unlock on Growth and Enterprise (see Client portal → Subscription readiness).
        </div>
      ) : null}

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Export document options</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Acme Health System"
            />
          </div>
          <div className="grid gap-2">
            <Label>Entity / branch</Label>
            <EntityMultiSelect
              options={entityOptions}
              value={entitiesSelected}
              onChange={(next) => {
                setEntitiesSelected(next);
                if (next.length === 1) setEntity(next[0]);
              }}
              placeholder="Select entity / branch"
            />
            <p className="text-xs text-muted-foreground">
              Multi-select supported. Exports will label the entity as a combined scope.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Reporting period</Label>
            <Select value={periodMode} onValueChange={(v) => v && setPeriodMode(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preset">Quick presets</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="range">Custom range</SelectItem>
                <SelectItem value="label">Custom label only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodMode === "preset" ? (
            <div className="grid gap-2">
              <Label>Preset</Label>
              <Select
                value={periodPreset}
                onValueChange={(v) => {
                  if (!v) return;
                  setPeriodPreset(v as ReportPeriodPreset);
                  setPeriodMode("preset");
                  setPeriodLabelLocked(false);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_30d">Last 30 days</SelectItem>
                  <SelectItem value="last_90d">Last 90 days</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                  <SelectItem value="custom">Custom label</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {periodMode === "month" ? (
            <div className="grid gap-2">
              <Label>Month</Label>
              <Input
                type="month"
                value={periodMonth}
                onChange={(e) => {
                  setPeriodLabelLocked(false);
                  setPeriodMonth(e.target.value);
                }}
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Auto-labels to {smartLabelFromMonth(periodMonth)}.</p>
            </div>
          ) : null}

          {periodMode === "quarter" ? (
            <div className="grid gap-2">
              <Label>Quarter</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={periodQuarter} onValueChange={(v) => v && setPeriodQuarter(v as any)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  inputMode="numeric"
                  value={String(periodYear)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) setPeriodYear(n);
                  }}
                  className="h-10 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">Auto-labels to {periodQuarter} {periodYear}.</p>
            </div>
          ) : null}

          {periodMode === "year" ? (
            <div className="grid gap-2">
              <Label>Year</Label>
              <Input
                inputMode="numeric"
                value={String(periodYear)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setPeriodYear(n);
                }}
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Auto-labels to FY{periodYear}.</p>
            </div>
          ) : null}

          {periodMode === "range" ? (
            <div className="grid gap-2 md:col-span-2">
              <DateRangePicker value={periodRange} onChange={(r) => { setPeriodLabelLocked(false); setPeriodRange(r); }} label="Custom range" />
              <p className="text-xs text-muted-foreground">
                Auto-labels to {smartLabelFromRange(periodRange) || "—"}.
              </p>
            </div>
          ) : null}

          <div className="grid gap-2 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="period-custom">Reporting period label</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-xl"
                onClick={() => setPeriodLabelLocked((v) => !v)}
              >
                {periodLabelLocked ? "Unlock auto-label" : "Lock label"}
              </Button>
            </div>
            <Input
              id="period-custom"
              value={periodPreset === "custom" ? periodCustom : periodCustom}
              onChange={(e) => {
                setPeriodPreset("custom");
                setPeriodMode("label");
                setPeriodLabelLocked(true);
                setPeriodCustom(e.target.value);
              }}
              placeholder="e.g. Q1 2026 Close · Jan 2026 Payroll · FY2025 Audit Review"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              This label appears on PDFs/XLSX/CSV exports. Choose Month/Quarter/Year/Range above to auto-fill.
            </p>
          </div>

          <SwitchRow
            title="Spendda logo on cover"
            description="Uses /brand/spendda-logo.png when available."
            checked={includeLogo}
            onCheckedChange={setIncludeLogo}
            className="md:col-span-2"
          />
          <SwitchRow
            title="Include charts"
            description="PDF department bar visualization."
            checked={includeCharts}
            onCheckedChange={setIncludeCharts}
          />
          <SwitchRow
            title="Include raw tables"
            description="Detailed alert and department grids in PDF."
            checked={includeRawTables}
            onCheckedChange={setIncludeRawTables}
          />
          <SwitchRow
            title="Confidential watermark"
            description="Diagonal watermark on each PDF page."
            checked={confidentialWatermark}
            onCheckedChange={setConfidentialWatermark}
            className="md:col-span-2"
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-md ring-1 ring-[var(--spendda-blue)]/10">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
              <LayoutDashboard className="h-5 w-5 text-[var(--spendda-blue)]" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Premium monthly reporting</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Board-ready pack built from <span className="font-medium text-foreground">uploaded</span> workspace data
                only — executive summary, KPIs, spend trends, payroll, risks, savings, forecast, and actions. Uses your
                global <span className="font-medium text-foreground">analytics date range</span> and entity scope (same
                as dashboards).
              </p>
            </div>
          </div>
          {canExportMonthlyUpload ? (
            <Badge variant="secondary" className="shrink-0 rounded-lg">
              Upload mode
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 rounded-lg">
              {workspace.dataSource === "upload" ? "No files in scope" : "Demo mode"}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid gap-4">
          {!canExportMonthlyUpload ? (
            <p className="text-sm text-muted-foreground">
              {workspace.dataSource === "upload"
                ? "Load spend or payroll for the selected entities, or widen the analytics date range in the app header."
                : "Switch the workspace to upload-backed data (Upload Data) to generate monthly exports from your files."}
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Scope:</span> {uploadMerge?.scopeLabel ?? "—"}
                {(scope.range.from || scope.range.to) && (
                  <>
                    {" "}
                    · <span className="font-semibold text-foreground">Dates:</span>{" "}
                    {scope.range.from && scope.range.to
                      ? `${scope.range.from} → ${scope.range.to}`
                      : scope.range.from || scope.range.to || ""}
                  </>
                )}
              </div>
              {!canExportReports ? (
                <p className="text-xs text-muted-foreground">
                  Your role can use on-screen analytics, but cannot download report files from this workspace.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button disabled={exportBusy} onClick={() => void exportMonthlyBoardPdfUpload()}>
                  <Download className="mr-2 h-4 w-4" />
                  Monthly report (PDF)
                </Button>
                <Button
                  variant="secondary"
                  disabled={exportBusy || !canXlsx}
                  onClick={() => void exportMonthlyBoardXlsxUpload()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Excel summary (XLSX)
                </Button>
                <Button variant="outline" disabled={exportBusy} onClick={() => void exportMonthlyAnomaliesCsvUpload()}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV anomalies
                </Button>
              </div>
              <Separator />
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Analytics-engine PDFs
              </div>
              <p className="text-xs text-muted-foreground">
                Same upload scope as dashboards: KPI tables, jsPDF charts (trend + bars), findings, and recommendations.
                Respects logo / charts / watermark toggles above.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={exportBusy} onClick={() => void exportIntelligencePdf("monthly_owner")}>
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                  Monthly Owner
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={exportBusy} onClick={() => void exportIntelligencePdf("board_summary")}>
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                  Board Summary
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={exportBusy} onClick={() => void exportIntelligencePdf("payroll_review")}>
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                  Payroll Review
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={exportBusy} onClick={() => void exportIntelligencePdf("savings_opportunities")}>
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                  Savings Opportunities
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={exportBusy} onClick={() => void exportIntelligencePdf("cash_pressure")}>
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                  Cash Pressure
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF uses branded cover, numbered sections, and optional watermark. Excel includes Cover, KPIs, trends,
                department ranking, payroll narrative, risks, savings, forecast, actions, and full anomaly rows.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Executive brief</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border/60 bg-muted/25 p-4 text-sm text-muted-foreground">
              {!hasUploads ? (
                <div className="grid gap-3">
                  <p>
                    No uploaded insights yet — preview below reflects the <span className="font-medium text-foreground">demo</span>{" "}
                    posture so investors always see a complete narrative.
                  </p>
                  <ul className="list-disc space-y-1.5 pl-5 text-foreground/90">
                    <li>Spend velocity is stable with isolated vendor concentration pockets.</li>
                    <li>Investigation queue is prioritized by severity and evidence strength.</li>
                    <li>Forecast cards show budget pressure with explicit scenario confidence.</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Upload spend or payroll in <strong className="text-foreground">Upload Data</strong> to replace this
                    block with file-grounded briefing text.
                  </p>
                </div>
              ) : (
                briefs[0]?.summary ?? "Uploaded insights detected. Generating an executive brief…"
              )}
            </div>
            <Separator />
            {!canExportReports ? (
              <p className="text-xs text-muted-foreground">
                Exports are off for your workspace role. Ask an Owner or Finance Lead if you need download access.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={exportExecutiveBrief} disabled={exportBusy}>
                <Download className="mr-2 h-4 w-4" />
                Export Executive Brief (MD)
              </Button>
              <Button variant="default" onClick={exportEnterpriseExecutivePdf} disabled={exportBusy}>
                <Download className="mr-2 h-4 w-4" />
                Executive PDF (enterprise)
              </Button>
              <Button variant="outline" onClick={exportBoardPackPdf} disabled={exportBusy}>
                <Download className="mr-2 h-4 w-4" />
                Board Pack (PDF)
              </Button>
              <Button variant="outline" onClick={exportAlertsCsv} disabled={exportBusy}>
                <Download className="mr-2 h-4 w-4" />
                Export Alerts (CSV)
              </Button>
              <Button variant="secondary" onClick={exportExcelEnterprisePack} disabled={exportBusy || !canXlsx}>
                <Download className="mr-2 h-4 w-4" />
                Summary Pack (XLSX)
              </Button>
              <Button variant="secondary" onClick={exportRawBundleCsv} disabled={exportBusy}>
                <Download className="mr-2 h-4 w-4" />
                Raw Data (CSV)
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                disabled={exportBusy}
                onClick={() => void exportExecutiveBriefPdfClassic()}
              >
                Classic executive PDF
              </button>
              <button
                type="button"
                className="underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                disabled={exportBusy || !canXlsx}
                onClick={() => void exportExcelSummaryPackClassic()}
              >
                Classic Excel pack (4 sheets)
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Board-ready templates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {templates.map((t) => (
              <div key={t.title} className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="mt-2 text-xs leading-6 text-muted-foreground">{t.description}</div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" disabled={exportBusy} onClick={t.onClick}>
                    {t.primary}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
