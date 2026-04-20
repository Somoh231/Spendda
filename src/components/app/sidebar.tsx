"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { groupedNav, navForPortalOrRole } from "./nav-items";
import { organizationShellSubtitle } from "@/lib/profile/org-adaptation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile/client";
import { useClientSession } from "@/hooks/use-client-session";
import { formatTenantRoleLabel } from "@/lib/tenants/types";

const SIDEBAR_COLLAPSE_KEY = "spendda_sidebar_collapsed";

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

  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

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

  const widthClass = collapsed ? "w-[76px]" : "w-[292px]";

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background,color,box-shadow,transform] duration-200 ease-out",
      collapsed && "justify-center px-2",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-primary/35 shadow-inner dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08)]"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      "motion-safe:active:scale-[0.98]",
    );

  return (
    <aside
      className={cn(
        "relative hidden min-h-dvh min-w-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[4px_0_32px_hsl(var(--foreground)/0.06)] transition-[width] duration-300 ease-out dark:shadow-[4px_0_32px_rgba(0,0,0,0.28)] md:flex",
        widthClass,
      )}
    >
        <div
          className={cn(
            "flex min-h-[4.5rem] items-center gap-3 border-b border-sidebar-border px-3 py-3",
            collapsed && "justify-center px-2",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_40px_rgba(59,130,246,0.35)] ring-1 ring-primary/25",
              collapsed ? "h-11 w-11" : "h-[56px] w-[56px]",
            )}
          >
            <Image
              src="/brand/spendda-logo.png"
              alt="Spendda"
              width={56}
              height={56}
              sizes="56px"
              className={cn("object-contain p-0.5", collapsed ? "h-9 w-9" : "h-[52px] w-[52px]")}
              priority
            />
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">Spendda</div>
              <div className="text-[10px] font-medium leading-snug text-sidebar-foreground/55">
                {client?.clientName ? client.clientName : organizationShellSubtitle(profile?.orgType)}
              </div>
              <div className="mt-1 truncate text-xs text-sidebar-foreground/50">
                {portal && client?.role ? (
                  <>
                    <span className="text-sidebar-foreground/60">Tenant role:</span>{" "}
                    {formatTenantRoleLabel(client.role)}
                    {client.planTier ? (
                      <>
                        {" "}
                        · <span className="text-sidebar-foreground/60">Plan:</span> {client.planTier}
                      </>
                    ) : null}
                  </>
                ) : profile ? (
                  `${profile.orgType} · ${profile.activeEntity}`
                ) : (
                  "Finance & payroll signal"
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn("flex items-center justify-end px-2 py-2", collapsed && "justify-center")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            disabled={!hydrated}
            className="h-8 w-8 shrink-0 rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <div className="h-px w-full bg-sidebar-border" />

        <ScrollArea className="flex-1">
          <nav className="grid gap-4 p-2 pb-6">
            {groups.map((g) => (
              <div key={g.section} className="grid gap-1">
                {!collapsed ? (
                  <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
                    {g.label}
                  </div>
                ) : (
                  <div className="mx-auto my-1 h-px w-8 rounded-full bg-sidebar-border" aria-hidden />
                )}
                {g.items.map((item) => {
                  const active =
                    pathname === item.href || (item.href !== "/app/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={linkClass(active)}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 opacity-90",
                          active && "text-primary",
                        )}
                      />
                      {!collapsed ? (
                        <span className="min-w-0 break-words text-left leading-snug">{item.label}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {!collapsed ? (
          <div className="border-t border-sidebar-border p-4 text-xs leading-relaxed text-sidebar-foreground/50">
            {profile?.primaryGoals?.length
              ? `Optimized for: ${profile.primaryGoals.slice(0, 2).join(", ")}${profile.primaryGoals.length > 2 ? "…" : ""}`
              : "Optimized for: spend oversight, payroll narrative…"}
          </div>
        ) : null}
    </aside>
  );
}
