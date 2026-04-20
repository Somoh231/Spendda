"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Flag = {
  id: string;
  entityType: "transaction" | "employee";
  entityId: string;
  date: string;
  title: string;
  ruleId: string;
  severity: "Low" | "Medium" | "High";
  score: number;
  amount?: number;
};

type FlagsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: Flag[];
};

function SeverityBadge({ s }: { s: Flag["severity"] }) {
  const variant = s === "High" ? "destructive" : s === "Medium" ? "secondary" : "outline";
  return <Badge variant={variant}>{s}</Badge>;
}

export default function FlagsPage() {
  const [severity, setSeverity] = React.useState<string>("all");
  const [entityType, setEntityType] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<FlagsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const pageSize = 50;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        setData(null);
        const url = new URL("/api/demo/flags", window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(pageSize));
        if (severity !== "all") url.searchParams.set("severity", severity);
        if (entityType !== "all") url.searchParams.set("entityType", entityType);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as FlagsResponse;
        if (!alive) return;
        setData(json);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load flags");
      }
    })();
    return () => {
      alive = false;
    };
  }, [entityType, page, severity]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Flags</h1>
          <p className="app-page-desc">
            Exceptions raised by fraud/anomaly detection rules on the synthetic dataset.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={severity}
            onValueChange={(v) => {
              setPage(1);
              if (!v) return;
              setSeverity(v);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-card/80 shadow-sm sm:w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={entityType}
            onValueChange={(v) => {
              setPage(1);
              if (!v) return;
              setEntityType(v);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-card/80 shadow-sm sm:w-[180px]">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="transaction">Transactions</SelectItem>
              <SelectItem value="employee">Employees</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setPage(1);
              setSeverity("all");
              setEntityType("all");
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load: {error}
        </div>
      ) : null}

      <Card className="border-border/60 shadow-md">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Latest flags</CardTitle>
          <div className="text-xs text-muted-foreground">
            {data ? (
              <>
                <span className="font-medium text-foreground">
                  {(data.page - 1) * pageSize + 1}–{Math.min(data.page * pageSize, data.total)}
                </span>{" "}
                of <span className="font-medium text-foreground">{data.total.toLocaleString()}</span>
                {" · "}
                Page <span className="font-medium text-foreground">{data.page}</span> / {totalPages}
              </>
            ) : (
              "Loading…"
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="data-table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                          No flags match these filters. Reset filters or try another page.
                        </TableCell>
                      </TableRow>
                    )
                  : data.items.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.id}</TableCell>
                        <TableCell>{f.title}</TableCell>
                        <TableCell className="text-muted-foreground">{f.ruleId}</TableCell>
                        <TableCell className="text-muted-foreground">{f.entityType}</TableCell>
                        <TableCell className="text-muted-foreground">{f.date}</TableCell>
                        <TableCell className="text-right">{f.score}</TableCell>
                        <TableCell className="text-right">
                          <SeverityBadge s={f.severity} />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={data ? page >= totalPages : true}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

