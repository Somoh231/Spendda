"use client";

import * as React from "react";
import { useDeferredValue } from "react";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/mock/demo";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { EntityMultiSelect } from "@/components/app/entity-multi-select";
import { useProfile } from "@/lib/profile/client";
import { useAnalyticsScope } from "@/components/app/analytics-scope";

type Tx = {
  id: string;
  vendorName: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  invoiceId: string;
  paymentMethod: string;
};

type TxResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: Tx[];
};

export default function TransactionsPage() {
  const { profile } = useProfile();
  const [q, setQ] = React.useState("");
  const deferredQ = useDeferredValue(q.trim());
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<TxResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const pageSize = 50;
  const { scope, options, setEntities, setRange } = useAnalyticsScope();
  const range = scope.range;

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    if (initial) {
      setQ(initial);
      setPage(1);
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        setData(null);
        const url = new URL("/api/demo/transactions", window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(pageSize));
        if (deferredQ) url.searchParams.set("q", deferredQ);
        if (range.from) url.searchParams.set("from", range.from);
        if (range.to) url.searchParams.set("to", range.to);
        if (scope.entities.length) url.searchParams.set("counties", scope.entities.join(","));
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as TxResponse;
        if (!alive) return;
        setData(json);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load transactions");
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, deferredQ, scope.entities, range.from, range.to]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const rangeStart = data && data.items.length > 0 ? (data.page - 1) * pageSize + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * pageSize, data.total) : 0;
  const searchPending = q.trim() !== deferredQ;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Transactions</h1>
          <p className="app-page-desc">
            Paginated view of the 100k synthetic transactions dataset. Press Enter in the top bar search to land here
            with a query.
          </p>
        </div>
        <div className="relative w-full sm:w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search vendor, invoice, category…"
            className="h-10 rounded-xl border-border/70 bg-card/70 pl-9 pr-3 shadow-sm transition-opacity"
            aria-busy={searchPending}
          />
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <DateRangePicker value={range} onChange={setRange} />
          <div className="grid gap-2">
            <div className="text-sm font-semibold">Entity scope</div>
            <EntityMultiSelect
              options={options}
              value={scope.entities}
              onChange={setEntities}
              placeholder="All entities"
            />
            <div className="text-xs text-muted-foreground">
              Filters transactions by county/region in the demo dataset.
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load: {error}
        </div>
      ) : null}

      <Card className="border-border/60 shadow-md">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Latest transactions</CardTitle>
          <div className="text-xs text-muted-foreground">
            {data ? (
              <>
                <span className="font-medium text-foreground">
                  {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}
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
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-14">
                          <div className="flex flex-col items-center justify-center gap-3 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
                              <Inbox className="h-6 w-6" aria-hidden />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">No rows in this slice</p>
                              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                                {deferredQ
                                  ? "No transactions match this search. Try another keyword or clear the search box."
                                  : "Adjust the date range or entity scope, or try a search from the top bar."}
                              </p>
                            </div>
                            {deferredQ ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => {
                                  setQ("");
                                  setPage(1);
                                }}
                              >
                                Clear search
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  : data.items.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground">
                          {t.date}
                        </TableCell>
                        <TableCell className="font-medium">
                          {t.vendorName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.category}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.invoiceId}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(t.amount, t.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {data ? (
                <>
                  Showing <span className="font-medium text-foreground">{data.items.length}</span> rows on this page
                  {searchPending ? <span className="ml-2 text-amber-600 dark:text-amber-400">· Updating…</span> : null}
                </>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

