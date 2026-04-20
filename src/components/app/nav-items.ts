import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  FileDown,
  FileText,
  Gauge,
  Globe2,
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

export type NavSection = "overview" | "data" | "intelligence" | "organization" | "admin";

export const NAV_SECTION_ORDER: NavSection[] = ["overview", "data", "intelligence", "organization", "admin"];

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  overview: "Overview",
  data: "Data & ingest",
  intelligence: "Intelligence",
  organization: "Organization",
  admin: "Administration",
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: NavSection;
};

export function portalNavItems(orgType?: OrgType): NavItem[] {
  const entityLabel = entityNavLabel(orgType);
  return [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
    { href: "/app/reports", label: "Reports", icon: FileDown, section: "overview" },
    { href: "/app/upload-data", label: "Uploads", icon: Upload, section: "data" },
    { href: "/app/data-health", label: "Data Health", icon: Activity, section: "data" },
    { href: "/app/documents", label: "Documents", icon: FileText, section: "data" },
    { href: "/app/ai-workspace", label: "AI Workspace", icon: MessageSquare, section: "intelligence" },
    { href: "/app/alerts", label: "Alerts", icon: Bell, section: "intelligence" },
    { href: "/app/forecasting", label: "Forecasting", icon: Gauge, section: "intelligence" },
    { href: "/app/debt", label: "Debt Intelligence", icon: Landmark, section: "intelligence" },
    { href: "/app/profitability", label: "Profitability", icon: Percent, section: "intelligence" },
    { href: "/app/cashflow", label: "Cash Flow", icon: Waves, section: "intelligence" },
    { href: "/app/recommendations", label: "Recommendations", icon: Lightbulb, section: "intelligence" },
    { href: "/app/market-updates", label: "Market updates", icon: Globe2, section: "intelligence" },
    { href: "/app/departments", label: entityLabel, icon: Building2, section: "organization" },
    { href: "/app/benchmarks", label: "Benchmarks", icon: LineChart, section: "organization" },
    { href: "/app/settings", label: "Settings", icon: Settings, section: "admin" },
  ];
}

export function primaryNavItems(orgType?: OrgType): NavItem[] {
  const entityLabel = entityNavLabel(orgType);
  return [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
    { href: "/app/reports", label: "Reports", icon: FileDown, section: "overview" },
    { href: "/app/upload-data", label: "Uploads", icon: Upload, section: "data" },
    { href: "/app/data-health", label: "Data Health", icon: Activity, section: "data" },
    { href: "/app/documents", label: "Documents", icon: FileText, section: "data" },
    { href: "/app/ai-workspace", label: "AI Workspace", icon: MessageSquare, section: "intelligence" },
    { href: "/app/alerts", label: "Alerts", icon: Bell, section: "intelligence" },
    { href: "/app/forecasting", label: "Forecasting", icon: Gauge, section: "intelligence" },
    { href: "/app/debt", label: "Debt Intelligence", icon: Landmark, section: "intelligence" },
    { href: "/app/profitability", label: "Profitability", icon: Percent, section: "intelligence" },
    { href: "/app/cashflow", label: "Cash Flow", icon: Waves, section: "intelligence" },
    { href: "/app/recommendations", label: "Recommendations", icon: Lightbulb, section: "intelligence" },
    { href: "/app/market-updates", label: "Market updates", icon: Globe2, section: "intelligence" },
    { href: "/app/departments", label: entityLabel, icon: Building2, section: "organization" },
    { href: "/app/benchmarks", label: "Benchmarks", icon: LineChart, section: "organization" },
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
        "/app/forecasting",
        "/app/debt",
        "/app/profitability",
        "/app/cashflow",
        "/app/recommendations",
        "/app/market-updates",
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
        "/app/market-updates",
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
        "/app/debt",
        "/app/profitability",
        "/app/cashflow",
        "/app/recommendations",
        "/app/market-updates",
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
        "/app/debt",
        "/app/profitability",
        "/app/cashflow",
        "/app/recommendations",
        "/app/market-updates",
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
