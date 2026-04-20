"use client";

import * as React from "react";
import { toast } from "sonner";
import { TrendingUp, AlertTriangle, Download } from "lucide-react";

import { formatMoney } from "@/lib/mock/demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function RiskBadge({ risk }: { risk: "Low" | "Medium" | "High" }) {
  const variant = risk === "High" ? "destructive" : risk === "Medium" ? "secondary" : "outline";
  return <Badge variant={variant}>{risk}</Badge>;
}

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

export default function ProcurementPage() {
  const [vendors, setVendors] = React.useState<
    Array<{
      vendor: string;
      spend: number;
      concentrationRisk: "Low" | "Medium" | "High";
      last30dChangePct: number;
    }> | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/demo/summary", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          summary: { topVendors30d: NonNullable<typeof vendors> };
        };
        if (!alive) return;
        setVendors(json.summary.topVendors30d);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load procurement demo");
        setVendors([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function exportVendorsCsv() {
    if (!vendors?.length) {
      toast.message("Nothing to export", { description: "Load vendor data first." });
      return;
    }
    const header = "vendor,spend,concentrationRisk,last30dChangePct\n";
    const rows = vendors
      .map(
        (v) =>
          `"${v.vendor.replaceAll('"', '""')}",${v.spend},${v.concentrationRisk},${v.last30dChangePct}`,
      )
      .join("\n");
    downloadText("spendda-procurement-vendors.csv", header + rows, "text/csv");
    toast.success("Export ready", { description: "Vendor table saved as CSV." });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Procurement</h1>
          <p className="app-page-desc">
            Vendor concentration risk, duplicate invoices, spikes, and contract summaries from the demo dataset.
          </p>
        </div>
        <Button variant="outline" className="rounded-xl shadow-sm" disabled={!vendors?.length} onClick={exportVendorsCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Procurement demo failed to load: {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Concentration risk</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Top vendor represents{" "}
              <span className="font-semibold text-foreground">
                {vendors ? vendors[0]?.concentrationRisk ?? "—" : "—"}
              </span>{" "}
              concentration risk.
            </div>
            <div className="mt-3 rounded-xl border bg-background p-3 text-xs">
              Recommendation: cap single-vendor exposure and review procurement controls.
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Duplicate invoices</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Detected <span className="font-semibold text-foreground">9</span> probable duplicates in last 30 days.
            </div>
            <div className="mt-3 rounded-xl border bg-background p-3 text-xs">
              Focus: Operations and Facilities.
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Suspicious spikes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              3 vendors show unusual month-over-month growth.
            </div>
            <div className="mt-3 rounded-xl border bg-background p-3 text-xs">
              Suggested action: verify contract milestones and invoice approvals.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="data-table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">30d change</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!vendors
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : vendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                          No vendor rows in this snapshot.
                        </TableCell>
                      </TableRow>
                    )
                  : vendors.map((v) => (
                      <TableRow key={v.vendor}>
                        <TableCell className="font-medium">{v.vendor}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(v.spend)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              v.last30dChangePct >= 0
                                ? "text-accent-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {v.last30dChangePct >= 0 ? "+" : ""}
                            {v.last30dChangePct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <RiskBadge risk={v.concentrationRisk} />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

