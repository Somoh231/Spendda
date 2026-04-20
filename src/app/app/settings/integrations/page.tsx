"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, Database, Layers, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listConnectorDefinitions } from "@/lib/integrations/connectors";

const connectors = listConnectorDefinitions();

function categoryLabel(c: (typeof connectors)[number]["category"]) {
  switch (c) {
    case "accounting":
      return "Accounting";
    case "payroll":
      return "Payroll";
    case "banking":
      return "Banking";
    case "erp":
      return "ERP";
    case "hr":
      return "HR";
    default:
      return c;
  }
}

export default function IntegrationsSettingsPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/settings"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2 inline-flex h-8 gap-1 px-2 text-muted-foreground",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>
          <h1 className="app-page-title">Integrations</h1>
          <p className="app-page-desc max-w-2xl">
            Planned connectors will sync vendor data into a <strong className="font-medium text-foreground">raw</strong>{" "}
            layer, then normalize into the same analytics shapes as manual uploads. Today, CSV and spreadsheet uploads
            remain the supported path.
          </p>
        </div>
        <Link href="/app/upload-data" className={cn(buttonVariants(), "rounded-xl")}>
          <Upload className="mr-2 h-4 w-4" />
          Upload data
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-md md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Raw source layer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Opaque vendor payloads and cursors (JSON, CSV, webhooks). Not consumed directly by dashboards.
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-md md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-muted-foreground" />
              Normalized analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Validated rows aligned with manual upload types so spend, payroll, and intelligence stay one pipeline.
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-md md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Scheduled sync
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Job specs and a queue placeholder are in code; hourly or daily runs will wire in when connectors ship.
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Connectors</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each row is defined in <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/integrations</code>.
            API: <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/integrations/connectors</code>
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {connectors.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/10 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{c.displayName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {categoryLabel(c.category)}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {c.availability}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Auth: {c.authKind.replace("_", " ")} · Scheduled:{" "}
                  {c.capabilities.supportsScheduledSync ? "yes" : "no"} · Incremental:{" "}
                  {c.capabilities.supportsIncrementalSync ? "yes" : "no"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl" disabled>
                Connect
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
