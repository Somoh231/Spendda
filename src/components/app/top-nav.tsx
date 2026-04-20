"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Bell, FileText, Gauge, Menu, Moon, Search, ShieldCheck, Sparkles, Sun } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/profile/client";
import type { UserRole } from "@/lib/profile/types";
import { cn } from "@/lib/utils";
import { navForPortalOrRole } from "@/components/app/nav-items";
import { useClientSession } from "@/hooks/use-client-session";
import { formatTenantRoleLabel } from "@/lib/tenants/types";

const SWITCHABLE_ROLES: UserRole[] = ["Admin", "Finance Lead", "Executive", "Auditor", "Analyst"];

/** Header icon actions — consistent 40px hit target, no boxed borders (Linear / Stripe style) */
const headerIconButtonClass =
  "relative h-10 w-10 shrink-0 rounded-xl border-0 !border-transparent bg-transparent p-0 text-foreground shadow-none transition-colors hover:bg-muted/70 active:bg-muted/50 hover:!border-transparent dark:hover:bg-white/[0.07] focus-visible:!border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-0 focus-visible:ring-offset-background";

export function TopNav() {
  const [query, setQuery] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();
  const { profile, setProfile } = useProfile();
  const { resolvedTheme, setTheme } = useTheme();
  const { client, portal } = useClientSession();

  React.useEffect(() => setMounted(true), []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      await fetch("/api/auth/demo-logout", { method: "POST" });
    }
    window.location.href = "/";
  }

  const mobileNav = navForPortalOrRole({
    isPortal: portal,
    role: profile?.role,
    orgType: profile?.orgType,
    tenantRole: client?.role,
  });

  return (
    <div
      className={cn(
        "relative flex min-h-16 min-w-0 items-center gap-2 border-b border-border/55 bg-gradient-to-r from-muted/30 via-background to-muted/25 px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-0",
        "shadow-[0_1px_0_hsl(var(--border))] dark:shadow-[0_1px_0_hsl(0_0%_100%/0.06)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--spendda-blue)]/30 to-transparent" />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={cn(headerIconButtonClass, "md:hidden")}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="font-semibold">Navigate</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {mobileNav.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.href} onSelect={() => router.push(item.href)}>
                <Icon className="text-muted-foreground" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href="/app/dashboard"
        className="flex shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-2 py-1.5 shadow-sm transition-colors hover:border-[var(--spendda-blue)]/30 hover:bg-card"
        aria-label="Spendda home"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
          <Image
            src="/brand/spendda-logo.png"
            alt=""
            width={36}
            height={36}
            sizes="36px"
            className="h-8 w-8 object-contain"
            priority
          />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">Spendda</span>
      </Link>
      {client?.clientId ? (
        <div className="hidden min-w-0 max-w-[min(280px,32vw)] shrink-0 flex-col rounded-xl border border-border/50 bg-muted/15 px-2.5 py-1.5 text-[11px] leading-tight shadow-sm sm:flex">
          <span className="truncate font-semibold text-foreground">{client.clientName}</span>
          <span className="truncate text-muted-foreground">
            Workspace · {formatTenantRoleLabel(client.role)}
          </span>
        </div>
      ) : null}
      <div className="relative mx-1 hidden min-w-0 max-w-[min(420px,46vw)] flex-1 items-center md:flex">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const t = query.trim();
            if (!t) {
              toast.message("Search", { description: "Type a keyword, then press Enter to open Transactions." });
              return;
            }
            router.push(`/app/transactions?q=${encodeURIComponent(t)}`);
          }}
          placeholder="Search vendors, employees, flags…"
          className="h-10 w-full min-w-0 rounded-xl border-border/70 bg-card/70 pl-10 pr-3 shadow-sm transition-shadow focus-visible:shadow-md"
        />
      </div>

      {profile ? (
        <div className="hidden min-w-0 shrink-0 items-center gap-2 md:flex lg:max-w-[min(100%,520px)]">
          <Select
            value={profile.activeEntity}
            onValueChange={(v) => {
              if (!v) return;
              const next = { ...profile, activeEntity: v };
              setProfile(next);
            }}
          >
            <SelectTrigger className="h-10 min-w-0 max-w-[200px] flex-1 rounded-xl border-border/70 bg-card/80 shadow-sm lg:max-w-[220px]">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent>
              {profile.entities.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
            </Select>
          <Select
            value={profile.role}
            onValueChange={(v) => {
              if (!v) return;
              setProfile({ ...profile, role: v as UserRole });
            }}
          >
            <SelectTrigger className="h-10 min-w-0 max-w-[180px] rounded-xl border-border/70 bg-card/80 shadow-sm max-md:hidden lg:max-w-[200px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {SWITCHABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge
            variant="outline"
            className="hidden border-[var(--spendda-blue)]/25 bg-gradient-to-br from-[var(--spendda-blue)]/12 to-[var(--spendda-green)]/10 px-2.5 py-1 text-xs font-semibold shadow-sm xl:inline-flex"
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-[var(--spendda-blue)]" />
            {profile.role}
          </Badge>
        </div>
      ) : null}

      <div className="ml-auto flex flex-none items-center gap-1 sm:gap-1.5 md:pl-2">
        <Link
          href="/app/ai-workspace"
          className={cn(
            buttonVariants({ variant: "secondary", size: "default" }),
            "hidden h-10 shrink-0 items-center rounded-xl border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/12 px-3 text-sm font-medium text-brand-primary shadow-none hover:bg-[var(--brand-primary)]/18 md:inline-flex",
          )}
        >
          <Sparkles className="mr-2 h-4 w-4 shrink-0" />
          AI Workspace
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className={headerIconButtonClass}
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {!mounted ? (
            <Moon className="h-4 w-4 shrink-0 opacity-80" />
          ) : resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0 opacity-90" />
          ) : (
            <Moon className="h-4 w-4 shrink-0 opacity-80" />
          )}
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className={cn(headerIconButtonClass)}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--spendda-green)] ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                toast.message("Spend spike", { description: "HR vendor cluster up 14% WoW — triage in Alerts." });
                router.push("/app/alerts");
              }}
            >
              <Bell className="mr-2 h-4 w-4 text-amber-500" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">New high-severity alert</span>
                <span className="text-xs font-normal text-muted-foreground">Duplicate payment pattern · 2m ago</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                toast.message("Forecast", { description: "Variance band crossed for Q3 projection." });
                router.push("/app/forecasting");
              }}
            >
              <Gauge className="mr-2 h-4 w-4 text-[var(--spendda-blue)]" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Forecast threshold</span>
                <span className="text-xs font-normal text-muted-foreground">Overtime pressure scenario · 18m ago</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                toast.success("Executive brief", { description: "Board pack draft is ready to export." });
                router.push("/app/reports");
              }}
            >
              <FileText className="mr-2 h-4 w-4 text-[var(--spendda-green)]" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Report ready</span>
                <span className="text-xs font-normal text-muted-foreground">Weekly accountability digest · 1h ago</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/app/alerts")}>View all in Alert Center</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            type="button"
            className="inline-flex h-10 max-w-[200px] shrink-0 items-center gap-2 rounded-full border border-border/50 bg-card/80 px-2.5 text-left text-foreground shadow-none transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-0 data-[state=open]:bg-muted/50 dark:border-white/10 dark:bg-card/60 dark:hover:bg-white/[0.06]"
          >
            <Avatar className="h-8 w-8 ring-1 ring-[var(--brand-primary)]/20">
              <AvatarFallback className="bg-[var(--brand-primary)]/15 text-[11px] font-semibold text-brand-primary">
                DU
              </AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 truncate text-sm font-medium sm:inline">Demo User</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-semibold text-foreground">Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/app/settings#profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/app/settings#organization-settings")}>
              Organization settings
            </DropdownMenuItem>
            {profile ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Switch role</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={profile.role}
                  onValueChange={(v) => {
                    if (!v) return;
                    setProfile({ ...profile, role: v as UserRole });
                  }}
                >
                  {SWITCHABLE_ROLES.map((r) => (
                    <DropdownMenuRadioItem key={r} value={r}>
                      {r}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

