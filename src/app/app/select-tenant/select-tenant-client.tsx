"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { safePostAuthPath } from "@/lib/safe-redirect";
import { formatTenantRoleLabel } from "@/lib/tenants/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type TenantRow = { tenantId: string; name: string; role: string };

const schema = z.object({ name: z.string().min(2).max(120) });
type FormValues = z.infer<typeof schema>;

export function SelectTenantClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safePostAuthPath(searchParams.get("redirectTo"), "/app");

  const [tenants, setTenants] = React.useState<TenantRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  async function refreshList() {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { tenants?: TenantRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setTenants(json.tenants || []);
    } catch (e) {
      setTenants([]);
      toast.error("Could not load tenants", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activate(tenantId: string) {
    try {
      const res = await fetch("/api/tenants/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      window.location.href = redirectTo;
    } catch (e) {
      toast.error("Could not enter tenant", { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  async function onCreate(values: FormValues) {
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; tenant?: { id: string } };
      if (!res.ok || !json.ok || !json.tenant?.id) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success("Tenant created", { description: "Entering workspace…" });
      await activate(json.tenant.id);
    } catch (e) {
      toast.error("Could not create tenant", { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="app-page-title">Select a workspace</div>
        <div className="app-page-desc">
          Choose the tenant you want to work in. Your data and settings are isolated per workspace.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your workspaces</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : tenants && tenants.length ? (
              <div className="grid gap-2">
                {tenants.map((t) => (
                  <button
                    key={t.tenantId}
                    type="button"
                    onClick={() => activate(t.tenantId)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/20"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">Tenant ID: {t.tenantId}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {formatTenantRoleLabel(t.role)}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                No tenants yet. Create your first workspace to continue.
              </div>
            )}

            <div className="pt-2 text-xs text-muted-foreground">
              If you expected a workspace and don’t see it, sign out and back in or ask an admin for an invite.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Create a new workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={form.handleSubmit(onCreate)}>
              <div className="grid gap-2">
                <Label htmlFor="name">Workspace name</Label>
                <Input id="name" placeholder="Acme Public Sector Pilot" {...form.register("name")} />
                {form.formState.errors.name?.message ? (
                  <div className="text-xs text-destructive">{form.formState.errors.name.message}</div>
                ) : null}
              </div>

              <Button type="submit" className="rounded-xl">
                Create workspace
              </Button>

              <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.refresh()}>
                Refresh
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

