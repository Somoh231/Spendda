"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Filter, Download } from "lucide-react";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { type CsvRow } from "@/lib/csv";
import { loadSampleCsv, parseUploadFile } from "@/lib/upload/parse";
import { pickHeader } from "@/lib/upload/headers";
import { upsertUploadedInsights } from "@/lib/upload/storage";
import { formatMoney } from "@/lib/mock/demo";
import { useProfile } from "@/lib/profile/client";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { useClientSession } from "@/hooks/use-client-session";
import { saveFileToClientDocuments } from "@/lib/documents/ingest";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDropzone } from "@/components/file-dropzone";

const chartTooltipStyles = {
  contentStyle: {
    background: "hsl(var(--card) / 0.98)",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    boxShadow: "0 18px 50px rgba(2, 6, 23, 0.35)",
  } as const,
  labelStyle: { fontWeight: 600, fontSize: 12, color: "hsl(var(--foreground))" } as const,
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function getFirst(row: CsvRow, keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find((h) => normalize(h) === normalize(k));
    if (found) return row[found];
  }
  return "";
}

function toNumber(s: string) {
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

type SpendMapping = {
  date?: string;
  vendor?: string;
  category?: string;
  department?: string;
  amount?: string;
  invoiceId?: string;
};

function getMapped(row: CsvRow, mapping: SpendMapping, key: keyof SpendMapping, aliases: string[]) {
  const mappedHeader = mapping[key];
  if (mappedHeader && Object.prototype.hasOwnProperty.call(row, mappedHeader)) return row[mappedHeader] || "";
  return getFirst(row, aliases);
}

type DemoSpendResponse = {
  total: number;
  topCategories: { name: string; spend: number }[];
  topVendors: { vendor: string; spend: number }[];
  deptRanking: { department: string; spend: number }[];
  unusual: { id: string; vendor: string; department: string; amount: number; flags: string[] }[];
  repeated: { id: string; vendor: string; category: string; amount: number }[];
};

export default function SpendAnalyticsPage() {
  const { profile } = useProfile();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const { scope } = useAnalyticsScope();
  const [mode, setMode] = React.useState<"demo" | "upload">("demo");
  const [uploadFlow, setUploadFlow] = React.useState<{
    stage: "idle" | "selected" | "uploading" | "parsing" | "analyzing" | "success" | "error";
    progressPct?: number;
    message?: string;
    detail?: string;
  }>({ stage: "idle" });
  const [lastUpload, setLastUpload] = React.useState<{
    filename: string;
    rows: number;
    prompt: string;
    savedToDocs: boolean;
    note: string;
  } | null>(null);

  const [demoData, setDemoData] = React.useState<DemoSpendResponse | null>(null);
  const [demoError, setDemoError] = React.useState<string | null>(null);
  const [demoQuery, setDemoQuery] = React.useState("");

  const [rows, setRows] = React.useState<CsvRow[]>([]);
  const [filename, setFilename] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState({ vendor: "", department: "" });
  const headers = React.useMemo(() => Object.keys(rows[0] || {}), [rows]);
  const [mapping, setMapping] = React.useState<SpendMapping>({});

  React.useEffect(() => {
    if (headers.length === 0) return;
    setMapping((m) => ({
      ...m,
      date: m.date ?? pickHeader(headers, ["date", "transaction_date", "txn_date"]),
      vendor: m.vendor ?? pickHeader(headers, ["vendor", "vendor_name", "supplier", "supplier_name", "merchant", "merchant_name", "payee", "payee_name", "beneficiary", "beneficiary_name"]),
      category: m.category ?? pickHeader(headers, ["category", "expense_category", "expense type", "type", "gl_category", "gl code", "account", "account_name"]),
      department: m.department ?? pickHeader(headers, ["department", "dept", "cost_center", "cost centre", "costcenter", "program", "unit", "directorate", "division"]),
      amount: m.amount ?? pickHeader(headers, ["amount", "amt", "total", "total_amount", "spend", "value", "gross_amount", "debit", "payment_amount"]),
      invoiceId: m.invoiceId ?? pickHeader(headers, ["invoice_id", "invoice", "invoiceid", "inv", "reference", "ref", "document_number", "doc_no", "voucher", "voucher_no"]),
    }));
  }, [headers]);

  React.useEffect(() => {
    if (mode !== "demo") return;
    let alive = true;
    (async () => {
      try {
        setDemoError(null);
        setDemoData(null);
        const url = new URL("/api/demo/spend-analytics", window.location.origin);
        if (scope.range.from) url.searchParams.set("from", scope.range.from);
        if (scope.range.to) url.searchParams.set("to", scope.range.to);
        if (scope.entities.length) url.searchParams.set("counties", scope.entities.join(","));
        if (demoQuery.trim()) url.searchParams.set("q", demoQuery.trim());
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DemoSpendResponse;
        if (!alive) return;
        setDemoData(json);
      } catch (e) {
        if (!alive) return;
        setDemoError(e instanceof Error ? e.message : "Failed to load spend analytics");
      }
    })();
    return () => {
      alive = false;
    };
  }, [demoQuery, mode, scope.entities, scope.range.from, scope.range.to]);

  const enriched = React.useMemo(() => {
    const tx = rows.map((r, idx) => {
      const vendor = getMapped(r, mapping, "vendor", ["vendor", "merchant", "payee", "supplier"]);
      const category = getMapped(r, mapping, "category", ["category", "expense_category", "type"]);
      const department = getMapped(r, mapping, "department", ["department", "cost_center", "cost centre", "dept"]);
      const amount = toNumber(getMapped(r, mapping, "amount", ["amount", "total", "spend", "value"]));
      const date = getMapped(r, mapping, "date", ["date", "transaction_date", "txn_date"]);
      const invoiceId = getMapped(r, mapping, "invoiceId", ["invoice_id", "invoice", "invoiceid", "reference", "ref"]);
      return { idx, vendor, category, department, amount, date, invoiceId, raw: r };
    });

    const amounts = tx.map((t) => t.amount).filter((a) => a > 0).sort((a, b) => a - b);
    const p95 =
      amounts.length === 0
        ? 0
        : amounts[Math.floor(0.95 * (amounts.length - 1))];

    const repeatedKeyCounts = new Map<string, number>();
    tx.forEach((t) => {
      const key = `${normalize(t.vendor)}|${t.amount}`;
      if (t.vendor && t.amount > 0) repeatedKeyCounts.set(key, (repeatedKeyCounts.get(key) || 0) + 1);
    });

    const withFlags = tx.map((t) => {
      const flags: string[] = [];
      const repeatKey = `${normalize(t.vendor)}|${t.amount}`;
      if ((repeatedKeyCounts.get(repeatKey) || 0) >= 3) flags.push("Repeated payment");
      if (p95 > 0 && t.amount >= p95) flags.push("Unusually large");
      return { ...t, flags };
    });

    const byCategory = new Map<string, number>();
    const byVendor = new Map<string, number>();
    const byDept = new Map<string, number>();
    withFlags.forEach((t) => {
      if (t.category) byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
      if (t.vendor) byVendor.set(t.vendor, (byVendor.get(t.vendor) || 0) + t.amount);
      if (t.department) byDept.set(t.department, (byDept.get(t.department) || 0) + t.amount);
    });

    const topCategories = [...byCategory.entries()]
      .map(([name, spend]) => ({ name, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);

    const topVendors = [...byVendor.entries()]
      .map(([vendor, spend]) => ({ vendor, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);

    const deptRanking = [...byDept.entries()]
      .map(([department, spend]) => ({ department, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);

    return {
      tx: withFlags,
      topCategories,
      topVendors,
      deptRanking,
      unusual: withFlags.filter((t) => t.flags.includes("Unusually large")).slice(0, 12),
      repeated: withFlags.filter((t) => t.flags.includes("Repeated payment")).slice(0, 12),
    };
  }, [mapping, rows]);

  React.useEffect(() => {
    if (mode !== "upload") return;
    if (!filename || rows.length === 0) return;
    const entity = profile?.activeEntity || "HQ";
    const tx = enriched.tx.filter((t) => t.amount > 0);
    const totalSpend = tx.reduce((s, t) => s + t.amount, 0);
    const flagged = tx.filter((t) => t.flags.length > 0).length;
    const repeated = tx.filter((t) => t.flags.includes("Repeated payment")).length;
    const unusual = tx.filter((t) => t.flags.includes("Unusually large")).length;
    upsertUploadedInsights(
      {
      kind: "spend",
      entity,
      filename,
      uploadedAt: new Date().toISOString(),
      totalTransactions: tx.length,
      totalSpend,
      flaggedCount: flagged,
      repeatedCount: repeated,
      unusualCount: unusual,
      topVendor: enriched.topVendors[0]?.vendor,
      topDepartment: enriched.deptRanking[0]?.department,
      },
      clientId,
    );
  }, [enriched, filename, mode, profile?.activeEntity, rows.length]);

  const uploadExecutiveSummary = React.useMemo(() => {
    if (rows.length === 0) return null;
    const tx = enriched.tx.filter((t) => t.amount > 0);
    const totalSpend = tx.reduce((s, t) => s + t.amount, 0);
    const flagged = tx.filter((t) => t.flags.length > 0);
    const topVendor = enriched.topVendors[0]?.vendor;
    const topDept = enriched.deptRanking[0]?.department;
    const repeated = tx.filter((t) => t.flags.includes("Repeated payment")).length;
    const unusual = tx.filter((t) => t.flags.includes("Unusually large")).length;

    const mappedCore = (["date", "vendor", "amount"] as const).filter((k) => Boolean(mapping[k])).length;
    const mappingBullet =
      mappedCore >= 3
        ? "Date, vendor, and amount are mapped — rollups and anomaly lists carry strong attribution for exports."
        : "Map date, vendor, and amount columns to tighten attribution in alerts and board-ready exports.";

    return {
      kpis: [
        { label: "Transactions", value: tx.length.toLocaleString() },
        { label: "Total spend", value: formatMoney(totalSpend) },
        { label: "Flagged", value: flagged.length.toLocaleString() },
      ],
      bullets: [
        topVendor ? `Top vendor by spend: ${topVendor}.` : "Top vendor identified from uploaded spend.",
        topDept ? `Highest-spend department: ${topDept}.` : "Highest-spend department identified from uploaded spend.",
        `Detected ${repeated.toLocaleString()} repeated-payment signals and ${unusual.toLocaleString()} unusually large transactions.`,
        mappingBullet,
      ],
    };
  }, [enriched, mapping, rows.length]);

  const filteredTx = React.useMemo(() => {
    return enriched.tx.filter((t) => {
      if (filters.vendor && !normalize(t.vendor).includes(normalize(filters.vendor))) return false;
      if (
        filters.department &&
        !normalize(t.department).includes(normalize(filters.department))
      )
        return false;
      return true;
    });
  }, [enriched.tx, filters.department, filters.vendor]);

  async function onFile(file: File) {
    setError(null);
    try {
      setLastUpload(null);
      setUploadFlow({
        stage: "selected",
        progressPct: 6,
        message: "File selected",
        detail: `${file.name} · ${(file.size / 1024).toFixed(0)} KB`,
      });
      setUploadFlow({ stage: "uploading", progressPct: 18, message: "Uploading…", detail: "Securing file into your workspace" });
      await new Promise((r) => setTimeout(r, 250));
      setUploadFlow({ stage: "parsing", progressPct: 42, message: "Parsing…", detail: "Detecting headers and reading rows" });
      const parsed = await parseUploadFile(file);
      if (!parsed.ok) {
        setRows([]);
        setFilename(null);
        setError(parsed.error);
        setUploadFlow({ stage: "error", progressPct: 100, message: "Upload failed", detail: parsed.error });
        return;
      }
      setUploadFlow({ stage: "analyzing", progressPct: 72, message: "Analyzing…", detail: "Computing totals and exception signals" });
      setFilename(parsed.filename);
      setRows(parsed.rows);

      // Save the uploaded file into the tenant Documents Center (pilot storage).
      let savedToDocs = false;
      if (clientId) {
        void saveFileToClientDocuments({
          clientId,
          file,
          reportingPeriod: "Spend upload",
          status: "Ready",
        });
        savedToDocs = true;
      }

      // Quick value: instant insights + handoff to AI Workspace.
      const entity = profile?.activeEntity || "HQ";
      setUploadFlow({ stage: "success", progressPct: 100, message: "Upload complete", detail: "Saved to Documents + Uploads" });
      toast.success("Spend file analyzed", {
        description: `Rows: ${parsed.rows.length.toLocaleString()} · Ready for AI follow-ups`,
      });
      const prompt = `I uploaded ${parsed.filename} (spend). Summarize top vendors, top departments, and the most suspicious repeated payments to investigate next for ${entity}.`;
      setLastUpload({
        filename: parsed.filename,
        rows: parsed.rows.length,
        prompt,
        savedToDocs,
        note: "Next: open AI Workspace for follow-up prompts, or continue mapping columns below.",
      });
    } catch (e) {
      setRows([]);
      setFilename(null);
      const msg = e instanceof Error ? e.message : "Something went wrong while reading that file.";
      setError(msg);
      setUploadFlow({ stage: "error", progressPct: 100, message: "Upload failed", detail: msg });
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="app-page-title">Spend Analytics</div>
          <div className="app-page-desc">
            Live demo dataset with drilldowns, plus optional CSV or Excel upload.
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={mode === "upload" ? rows.length === 0 : !demoData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs
        value={mode}
        onValueChange={(v) => {
          if (v === "demo" || v === "upload") setMode(v);
        }}
        className="w-full"
      >
        <TabsList className="h-11 rounded-xl border border-border/60 bg-muted/40 p-1 shadow-inner">
          <TabsTrigger
            value="demo"
            className="rounded-lg px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Live demo dataset
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            className="rounded-lg px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Upload CSV / Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Spend analytics</CardTitle>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last 30 days • {demoData ? `${demoData.total.toLocaleString()} transactions` : "Loading…"}
                </div>
              </div>
              <div className="w-full sm:w-[360px]">
                <Label className="sr-only">Search</Label>
                <Input
                  value={demoQuery}
                  onChange={(e) => setDemoQuery(e.target.value)}
                  placeholder="Search vendor, invoice, category…"
                />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {demoError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Failed to load: {demoError}
                </div>
              ) : null}

              {!demoData ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Skeleton className="h-[280px] w-full" />
                  </div>
                  <Skeleton className="h-[280px] w-full" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="shadow-sm lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base">Top categories</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[280px] min-w-0">
                        <SpenddaResponsiveContainer width="100%" height="100%">
                          <BarChart data={demoData.topCategories} margin={{ left: 8, right: 8 }}>
                            <defs>
                              <linearGradient id="catSpendFillDemo" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.92} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                              </linearGradient>
                              <filter id="catBarGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="5" result="blur" />
                                <feColorMatrix
                                  in="blur"
                                  type="matrix"
                                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.25 0"
                                />
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                            <XAxis
                              dataKey="name"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value) => formatMoney(Number(value))}
                              contentStyle={chartTooltipStyles.contentStyle}
                              labelStyle={chartTooltipStyles.labelStyle}
                              cursor={{ fill: "hsl(var(--primary))", fillOpacity: 0.08 }}
                            />
                            <Bar
                              dataKey="spend"
                              fill="url(#catSpendFillDemo)"
                              radius={[12, 12, 0, 0]}
                              barSize={30}
                              filter="url(#catBarGlow)"
                            />
                          </BarChart>
                        </SpenddaResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Top vendors</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        {demoData.topVendors.slice(0, 6).map((v) => (
                          <div key={v.vendor} className="rounded-xl border bg-background p-4 shadow-sm">
                            <div className="text-xs text-muted-foreground">{v.vendor}</div>
                            <div className="mt-2 text-lg font-semibold tracking-tight">
                              {formatMoney(v.spend)}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Unusual transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-hidden rounded-xl border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Dept</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Flags</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {demoData.unusual.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-medium">{t.vendor}</TableCell>
                                  <TableCell className="text-muted-foreground">{t.department}</TableCell>
                                  <TableCell className="text-right">{formatMoney(t.amount)}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {t.flags.map((f) => (
                                        <Badge key={f} variant="outline">
                                          {f}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Repeated payments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-hidden rounded-xl border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Flag</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {demoData.repeated.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-medium">{t.vendor}</TableCell>
                                  <TableCell className="text-muted-foreground">{t.category}</TableCell>
                                  <TableCell className="text-right">{formatMoney(t.amount)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline">Repeated payment</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Department spend ranking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {demoData.deptRanking.map((d) => (
                          <div key={d.department} className="rounded-xl border bg-background p-4 shadow-sm">
                            <div className="text-xs text-muted-foreground">{d.department}</div>
                            <div className="mt-2 text-lg font-semibold tracking-tight">
                              {formatMoney(d.spend)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Upload spend file</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FileDropzone
                title={filename ? filename : "Choose a CSV or Excel file"}
                subtitle="Expected columns: vendor, category, department, amount, date (invoice_id optional)"
                onFile={onFile}
                multiple
                workflow={uploadFlow}
                sample={{
                  label: "Load sample",
                  onClick: async () => {
                    setError(null);
                    const loaded = await loadSampleCsv("/samples/spend-sample.csv");
                    if (!loaded.ok) {
                      setError(loaded.error);
                      return;
                    }
                    setFilename(loaded.filename);
                    setRows(loaded.rows);
                  },
                }}
              />

              {lastUpload ? (
                <Card className="border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Upload summary</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{lastUpload.filename}</span> ·{" "}
                      {lastUpload.rows.toLocaleString()} rows ·{" "}
                      {lastUpload.savedToDocs ? "Saved to Documents" : "Documents unavailable (no tenant session)"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => {
                          window.location.href = `/app/ai-workspace?afterUpload=1&kind=spend&prompt=${encodeURIComponent(
                            lastUpload.prompt,
                          )}`;
                        }}
                      >
                        Open AI Workspace
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          window.location.href = "/app/documents";
                        }}
                      >
                        View Documents
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          window.location.href = "/app/dashboard";
                        }}
                      >
                        Open Dashboard
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">{lastUpload.note}</div>
                  </CardContent>
                </Card>
              ) : null}

              {error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              ) : null}

              {rows.length === 0 ? (
                <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Upload a CSV or Excel file to unlock charts, filters, and anomaly tables.
                </div>
              ) : (
                <>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Column mapping</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {(
                        [
                          ["date", "Date"],
                          ["vendor", "Vendor"],
                          ["category", "Category"],
                          ["department", "Department"],
                          ["amount", "Amount"],
                          ["invoiceId", "Invoice ID (optional)"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="grid gap-2">
                          <Label>{label}</Label>
                          <Select
                            value={mapping[key] || ""}
                            onValueChange={(v) => {
                              if (!v) return;
                              setMapping((m) => ({ ...m, [key]: v }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Auto-detect" />
                            </SelectTrigger>
                            <SelectContent>
                              {headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      <div className="sm:col-span-2 lg:col-span-3">
                        <div className="text-xs text-muted-foreground">
                          Tip: if charts look empty, map the correct headers for <span className="font-medium text-foreground">Amount</span> and <span className="font-medium text-foreground">Date</span>.
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {uploadExecutiveSummary ? (
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Executive summary (from upload)</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          {uploadExecutiveSummary.kpis.map((k) => (
                            <div key={k.label} className="rounded-xl border bg-background p-4 shadow-sm">
                              <div className="text-xs text-muted-foreground">{k.label}</div>
                              <div className="mt-2 text-xl font-semibold tracking-tight">{k.value}</div>
                            </div>
                          ))}
                        </div>
                        <ul className="grid gap-2 text-sm text-muted-foreground">
                          {uploadExecutiveSummary.bullets.map((b) => (
                            <li key={b} className="leading-7">
                              {b}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ) : null}

                  <Separator />
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="shadow-sm lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base">Top categories</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[280px] min-w-0">
                        <SpenddaResponsiveContainer width="100%" height="100%">
                          <BarChart data={enriched.topCategories} margin={{ left: 8, right: 8 }}>
                            <defs>
                              <linearGradient id="catSpendFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.92} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                              </linearGradient>
                              <filter id="catBarGlow2" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="5" result="blur" />
                                <feColorMatrix
                                  in="blur"
                                  type="matrix"
                                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.25 0"
                                />
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                            <XAxis
                              dataKey="name"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value) => formatMoney(Number(value))}
                              contentStyle={chartTooltipStyles.contentStyle}
                              labelStyle={chartTooltipStyles.labelStyle}
                              cursor={{ fill: "hsl(var(--primary))", fillOpacity: 0.08 }}
                            />
                            <Bar
                              dataKey="spend"
                              fill="url(#catSpendFill)"
                              radius={[12, 12, 0, 0]}
                              barSize={30}
                              filter="url(#catBarGlow2)"
                            />
                          </BarChart>
                        </SpenddaResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Filters</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="vendor">Vendor</Label>
                          <Input
                            id="vendor"
                            value={filters.vendor}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, vendor: e.target.value }))
                            }
                            placeholder="Search vendor…"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="dept">Department</Label>
                          <Input
                            id="dept"
                            value={filters.department}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, department: e.target.value }))
                            }
                            placeholder="Search department…"
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setFilters({ vendor: "", department: "" })}
                        >
                          <Filter className="mr-2 h-4 w-4" />
                          Reset filters
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          Showing <span className="font-medium text-foreground">{filteredTx.length}</span>{" "}
                          of {enriched.tx.length} transactions.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

