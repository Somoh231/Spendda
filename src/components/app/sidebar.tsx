"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { groupedNav, navForPortalOrRole } from "./nav-items";
import { organizationShellSubtitle } from "@/lib/profile/org-adaptation";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile/client";
import { useClientSession } from "@/hooks/use-client-session";
import { formatTenantRoleLabel } from "@/lib/tenants/types";
import { loadInvestigationsRemote } from "@/lib/investigations/storage";

const SIDEBAR_COLLAPSE_KEY = "spendda_sidebar_collapsed";

function sidebarFooterLine(
  profile: ReturnType<typeof useProfile>["profile"],
  portal: boolean,
  client: ReturnType<typeof useClientSession>["client"],
): string {
  const org = profile?.orgType?.trim() || "SME";
  if (portal && client?.role) {
    return `${org} · ${formatTenantRoleLabel(client.role)}`;
  }
  const role = profile?.role?.trim() || "Member";
  return `${org} · ${role}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { client, portal } = useClientSession();
  const items = navForPortalOrRole({
    isPortal: portal,
    role: profile?.role,
    orgType: profile?.orgType,
    tenantRole: client?.role,
  });
  const groups = groupedNav(items);
  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [openAlertCount, setOpenAlertCount] = React.useState(0);

  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const meta = await loadInvestigationsRemote({ clientId: client?.clientId ?? null });
      if (!alive) return;
      const n = Object.values(meta).filter((r) => r.status !== "Closed").length;
      setOpenAlertCount(n);
    })();
    return () => {
      alive = false;
    };
  }, [client?.clientId, pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const widthClass = collapsed ? "w-[76px]" : "w-[220px]";

  const linkClass = (active: boolean) =>
    cn(
      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-[background,color] duration-200 ease-out",
      collapsed && "justify-center px-1.5",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-primary/30"
        : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
    );

  return (
    <aside
      className={cn(
        "relative hidden h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[4px_0_32px_hsl(var(--foreground)/0.06)] transition-[width] duration-300 ease-out dark:shadow-[4px_0_32px_rgba(0,0,0,0.28)] md:flex",
        widthClass,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 min-h-[4rem] items-center gap-2.5 border-b border-sidebar-border px-2.5 py-2.5",
          collapsed && "justify-center px-1.5",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-primary/20",
            collapsed ? "h-9 w-9" : "h-10 w-10",
          )}
        >
          <Image
            src="/brand/spendda-logo.png"
            alt="Spendda"
            width={40}
            height={40}
            sizes="40px"
            className={cn("object-contain p-0.5", collapsed ? "h-7 w-7" : "h-9 w-9")}
            priority
          />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">Spendda</div>
            <div className="truncate text-[10px] font-medium leading-snug text-sidebar-foreground/55">
              {client?.clientName ? client.clientName : organizationShellSubtitle(profile?.orgType)}
            </div>
          </div>
        ) : null}
      </div>

      <div className={cn("flex shrink-0 items-center justify-end px-2 py-1.5", collapsed && "justify-center")}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          disabled={!hydrated}
          className="h-7 w-7 shrink-0 rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="h-px w-full shrink-0 bg-sidebar-border" />

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto py-2 [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgba(255,255,255,0.15)_transparent]",
        )}
        style={{ scrollbarWidth: "thin" }}
      >
        <nav className="grid gap-3 px-2 pb-4 pt-1">
          {groups.map((g) => (
            <div key={g.section} className="grid gap-0.5">
              {!collapsed ? (
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
                  {g.label}
                </div>
              ) : (
                <div className="mx-auto my-1 h-px w-6 rounded-full bg-sidebar-border" aria-hidden />
              )}
              {g.items.map((item) => {
                const active =
                  pathname === item.href || (item.href !== "/app/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const isAiWorkspace = item.href === "/app/ai-workspace";
                const isAlerts = item.href === "/app/alerts";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={linkClass(active)}
                  >
                    <Icon
                      className={cn(
                        "h-[17px] w-[17px] shrink-0 opacity-90",
                        active && "text-primary",
                      )}
                    />
                    {!collapsed ? (
                      <>
                        <span className="min-w-0 flex-1 truncate text-left text-[13px] leading-snug">{item.label}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {isAiWorkspace && active ? (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_hsl(var(--sidebar)_/_0.9)]"
                              aria-hidden
                              title="Active"
                            />
                          ) : null}
                          {isAlerts && openAlertCount > 0 && !active ? (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-amber-500"
                              aria-hidden
                              title={`${openAlertCount} open`}
                            />
                          ) : null}
                        </span>
                      </>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {!collapsed ? (
        <div className="shrink-0 border-t border-sidebar-border px-3 py-3 text-[11px] leading-snug text-sidebar-foreground/55">
          <div className="truncate">{sidebarFooterLine(profile, portal, client)}</div>
        </div>
      ) : null}
    </aside>
  );
}
