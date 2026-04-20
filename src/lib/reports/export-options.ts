export type ReportPeriodPreset = "last_30d" | "last_90d" | "ytd" | "custom";

export type EnterpriseExportOptions = {
  organizationName: string;
  entity: string;
  periodLabel: string;
  /** When preset is custom, user-facing range text */
  periodCustom?: string;
  periodPreset: ReportPeriodPreset;
  includeLogo: boolean;
  includeCharts: boolean;
  includeRawTables: boolean;
  confidentialWatermark: boolean;
  /** Optional appendix lines (client-filtered market & regulatory intelligence). */
  marketRegulatoryBullets?: string[];
};

export const DEFAULT_EXPORT_OPTIONS: EnterpriseExportOptions = {
  organizationName: "Organization",
  entity: "HQ",
  periodLabel: "Last 30 days",
  periodPreset: "last_30d",
  includeLogo: true,
  includeCharts: true,
  includeRawTables: true,
  confidentialWatermark: true,
};

export function periodLabelFromPreset(p: ReportPeriodPreset, custom?: string): string {
  switch (p) {
    case "last_30d":
      return "Last 30 days";
    case "last_90d":
      return "Last 90 days";
    case "ytd":
      return "Year to date";
    case "custom":
      return custom?.trim() || "Custom period";
    default:
      return "Last 30 days";
  }
}
