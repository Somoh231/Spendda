"use client";

import Link from "next/link";
import { Activity, ArrowRight, Upload } from "lucide-react";

import { AnalyticsScopeControls } from "@/components/app/analytics-scope";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DataHealthPage() {
  const ws = useWorkspaceData();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brand-primary">Data health</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          One workspace store per tenant. What you upload here is what AI Workspace, dashboards, and reports should use
          for the active entity and date range.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-[var(--spendda-blue)]" />
            Active workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Source:</span>
            <Badge variant={ws.dataSource === "upload" ? "default" : ws.dataSource === "demo" ? "secondary" : "outline"}>
              {ws.dataSource === "upload" ? "Uploaded data" : ws.dataSource === "demo" ? "Demo mode (labeled)" : "No upload"}
            </Badge>
            <span className="text-muted-foreground">Entity:</span>
            <span className="font-medium">{ws.primaryEntity}</span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datasets</div>
            <div className="mt-1 font-medium">
              {ws.activeDatasetLabel || "No spend/payroll file stored for this entity yet."}
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>
                Spend rows:{" "}
                {ws.spendForEntity?.kind === "spend" ? ws.spendForEntity.rows.length.toLocaleString() : "—"}
              </div>
              <div>
                Payroll rows:{" "}
                {ws.payrollForEntity?.kind === "payroll" ? ws.payrollForEntity.rows.length.toLocaleString() : "—"}
              </div>
            </div>
          </div>
          <Link
            href="/app/upload-data"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "inline-flex w-fit items-center gap-2")}
          >
            <Upload className="h-4 w-4" />
            Go to uploads
            <ArrowRight className="h-3.5 w-3.5 opacity-80" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsScopeControls label="Date range & entities" />
        </CardContent>
      </Card>
    </div>
  );
}
