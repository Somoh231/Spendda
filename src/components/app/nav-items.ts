import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  FileDown,
  FileText,
  Gauge,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  MessageSquare,
  Percent,
  Settings,
  Shield,
  Upload,
  Waves,
} from "lucide-react";

import type { OrgType } from "@/lib/profile/types";
import { entityNavLabel } from "@/lib/profile/org-adaptation";
import { tenantRoleCan } from "@/lib/tenants/permissions";
import type { TenantRole } from "@/lib/tenants/types";

export type NavSection = "overview" | "data" | "intelligence" | "finance" | "organization" | "admin";

export const NAV_SECTION_ORDER: NavSection[] = ["overview", "data", "intelligence", "finance", "organization", "admin"];

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  overview: "Overview",
  data: "Data",
  intelligence: "Intelligence",
  finance: "Finance",
  organization: "Organization",
  admin: "Administration",
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: NavSection;
};

function departmentsNavLabel(orgType?: OrgType): string {
  if (orgType === "Home Care Agency") return "Service lines";
  if (orgType === "Restaurant Group") return "Departments / Locations";
  return entityNavLabel(orgType);
}

export function portalNavItems(orgType?: OrgType): NavItem[] {
  const entityLabel = departmentsNavLabel(orgType);
  return [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
    { href: "/app/reports", label: "Reports", icon: FileDown, section: "overview" },
    { href: "/app/upload-data", label: "Uploads", icon: Upload, section: "data" },
    { href: "/app/data-health", label: "Data health", icon: Activity, section: "data" },
    { href: "/app/documents", label: "Documents", icon: FileText, section: "data" },
    { href: "/app/ai-workspace", label: "AI workspace", icon: MessageSquare, section: "intelligence" },
    { href: "/app/alerts", label: "Alerts", icon: Bell, section: "intelligence" },
    { href: "/app/recommendations", label: "Action items", icon: Lightbulb, section: "intelligence" },
    { href: "/app/profitability", label: "Profitability", icon: Percent, section: "finance" },
    { href: "/app/debt", label: "Cash runway", icon: Landmark, section: "finance" },
    { href: "/app/cashflow", label: "Cash flow", icon: Waves, section: "finance" },
    { href: "/app/forecasting", label: "Forecasting", icon: Gauge, section: "finance" },
    { href: "/app/departments", label: entityLabel, icon: Building2, section: "organization" },
    { href: "/app/benchmarks", label: "Industry benchmarks", icon: LineChart, section: "organization" },
    { href: "/app/settings", label: "Settings", icon: Settings, section: "admin" },
  ];
}

export function primaryNavItems(orgType?: OrgType): NavItem[] {
  const entityLabel = departmentsNavLabel(orgType);
  return [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
    { href: "/app/reports", label: "Reports", icon: FileDown, section: "overview" },
    { href: "/app/upload-data", label: "Uploads", icon: Upload, section: "data" },
    { href: "/app/data-health", label: "Data health", icon: Activity, section: "data" },
    { href: "/app/documents", label: "Documents", icon: FileText, section: "data" },
    { href: "/app/ai-workspace", label: "AI workspace", icon: MessageSquare, section: "intelligence" },
    { href: "/app/alerts", label: "Alerts", icon: Bell, section: "intelligence" },
    { href: "/app/recommendations", label: "Action items", icon: Lightbulb, section: "intelligence" },
    { href: "/app/profitability", label: "Profitability", icon: Percent, section: "finance" },
    { href: "/app/debt", label: "Cash runway", icon: Landmark, section: "finance" },
    { href: "/app/cashflow", label: "Cash flow", icon: Waves, section: "finance" },
    { href: "/app/forecasting", label: "Forecasting", icon: Gauge, section: "finance" },
    { href: "/app/departments", label: entityLabel, icon: Building2, section: "organization" },
    { href: "/app/benchmarks", label: "Industry benchmarks", icon: LineChart, section: "organization" },
    { href: "/app/settings", label: "Settings", icon: Settings, section: "admin" },
  ];
}

export function groupedNav(allowed: NavItem[]) {
  return NAV_SECTION_ORDER.map((section) => ({
    section,
    label: NAV_SECTION_LABELS[section],
    items: allowed.filter((i) => i.section === section),
  })).filter((g) => g.items.length > 0);
}

/** Tenant RBAC for the client portal nav (Supabase membership role). */
export function filterPortalNavByTenantRole(items: NavItem[], tenantRole?: TenantRole | string): NavItem[] {
  const out = items.filter((i) => {
    if (i.href === "/app/upload-data") return tenantRoleCan(tenantRole, "data.upload");
    return true;
  });
  if (tenantRoleCan(tenantRole, "tenant.branding.read")) {
    out.push({ href: "/app/settings/tenant", label: "Client portal", icon: Shield, section: "admin" });
  }
  return out;
}

export function navForRole(role: string | undefined, orgType?: OrgType): NavItem[] {
  const items = primaryNavItems(orgType);
  const pick = (hrefs: string[]) => items.filter((i) => hrefs.includes(i.href));

  switch (role) {
    case "Executive":
      return pick([
        "/app/dashboard",
        "/app/reports",
        "/app/data-health",
        "/app/ai-workspace",
        "/app/alerts",
        "/app/recommendations",
        "/app/profitability",
        "/app/debt",
        "/app/cashflow",
        "/app/forecasting",
        "/app/benchmarks",
        "/app/settings",
      ]);
    case "Finance Lead":
      return pick([
        "/app/dashboard",
        "/app/reports",
        "/app/upload-data",
        "/app/data-health",
        "/app/documents",
        "/app/ai-workspace",
        "/app/alerts",
        "/app/forecasting",
        "/app/debt",
        "/app/profitability",
        "/app/cashflow",
        "/app/recommendations",
        "/app/departments",
        "/app/benchmarks",
        "/app/settings",
      ]);
    case "Auditor":
      return pick([
        "/app/dashboard",
        "/app/reports",
        "/app/data-health",
        "/app/ai-workspace",
        "/app/alerts",
        "/app/documents",
        "/app/recommendations",
        "/app/profitability",
        "/app/debt",
        "/app/cashflow",
        "/app/forecasting",
        "/app/benchmarks",
        "/app/settings",
      ]);
    case "Analyst":
      return pick([
        "/app/dashboard",
        "/app/reports",
        "/app/upload-data",
        "/app/data-health",
        "/app/ai-workspace",
        "/app/alerts",
        "/app/recommendations",
        "/app/profitability",
        "/app/debt",
        "/app/cashflow",
        "/app/forecasting",
        "/app/departments",
        "/app/benchmarks",
        "/app/settings",
      ]);
    case "Admin":
    default:
      return [...items];
  }
}

export function navForPortalOrRole(opts: {
  isPortal: boolean;
  role?: string;
  orgType?: OrgType;
  tenantRole?: TenantRole | string;
}) {
  if (opts.isPortal) return filterPortalNavByTenantRole(portalNavItems(opts.orgType), opts.tenantRole);
  return navForRole(opts.role, opts.orgType);
}
