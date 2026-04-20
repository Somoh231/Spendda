"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Send, ShieldCheck } from "lucide-react";

import { type CsvRow } from "@/lib/csv";
import { loadSampleCsv, parseUploadFile } from "@/lib/upload/parse";
import { pickHeader } from "@/lib/upload/headers";
import { upsertUploadedInsights } from "@/lib/upload/storage";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile/client";
import { useClientSession } from "@/hooks/use-client-session";
import { saveFileToClientDocuments } from "@/lib/documents/ingest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropzone } from "@/components/file-dropzone";

type Risk = "Low" | "Medium" | "High";

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

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function money(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function getFirst(row: CsvRow, keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find((h) => normalize(h) === normalize(k));
    if (found) return row[found];
  }
  return "";
}

type PayrollMapping = {
  employeeId?: string;
  name?: string;
  department?: string;
  bankAccount?: string;
  status?: string;
  salary?: string;
  salaryPrevious?: string;
};

function getMapped(row: CsvRow, mapping: PayrollMapping, key: keyof PayrollMapping, aliases: string[]) {
  const mappedHeader = mapping[key];
  if (mappedHeader && Object.prototype.hasOwnProperty.call(row, mappedHeader)) return row[mappedHeader] || "";
  return getFirst(row, aliases);
}

function RiskBadge({ risk }: { risk: Risk }) {
  const variant =
    risk === "High" ? "destructive" : risk === "Medium" ? "secondary" : "outline";
  return <Badge variant={variant}>{risk}</Badge>;
}

export default function PayrollPage() {
  const { profile } = useProfile();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
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
  const [demo, setDemo] = React.useState<{
    total: number;
    page: number;
    pageSize: number;
    riskBreakdown: { risk: Risk; value: number }[];
    items: Array<{
      id: string;
      employeeName: string;
      bankAccount: string;
      department: string;
      status: string;
      salaryMonthly: number;
      signals: string[];
      risk: Risk;
    }>;
  } | null>(null);
  const [demoError, setDemoError] = React.useState<string | null>(null);
  const [demoPage, setDemoPage] = React.useState(1);
  const [demoRisk, setDemoRisk] = React.useState<Risk | "all">("all");
  const [demoQ, setDemoQ] = React.useState("");
  const demoPageSize = 50;

  const [rows, setRows] = React.useState<CsvRow[]>([]);
  const [filename, setFilename] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const headers = React.useMemo(() => Object.keys(rows[0] || {}), [rows]);
  const [mapping, setMapping] = React.useState<PayrollMapping>({});

  React.useEffect(() => {
    if (headers.length === 0) return;
    setMapping((m) => ({
      ...m,
      employeeId: m.employeeId ?? pickHeader(headers, ["employee_id", "emp_id", "employee number", "staff_id", "staff number", "person_id", "id"]),
      name: m.name ?? pickHeader(headers, ["name", "employee_name", "employee name", "full_name", "staff_name", "staff name", "employee"]),
      department: m.department ?? pickHeader(headers, ["department", "dept", "division", "directorate", "unit", "cost_center", "cost centre", "costcenter"]),
      bankAccount: m.bankAccount ?? pickHeader(headers, ["bank_account", "bank account", "bank acct", "account", "account_number", "account number", "bankaccountnumber"]),
      status: m.status ?? pickHeader(headers, ["status", "employment_status", "employment status", "active", "employee_status"]),
      salary: m.salary ?? pickHeader(headers, ["salary", "monthly_salary", "monthly salary", "gross_salary", "gross salary", "gross pay", "gross_pay", "net_pay", "net pay", "amount"]),
      salaryPrevious: m.salaryPrevious ?? pickHeader(headers, ["salary_previous", "previous_salary", "previous salary", "prev_salary", "prior_salary", "prior salary"]),
    }));
  }, [headers]);

  React.useEffect(() => {
    if (mode !== "demo") return;
    let alive = true;
    (async () => {
      try {
        setDemoError(null);
        setDemo(null);
        const url = new URL("/api/demo/payroll", window.location.origin);
        url.searchParams.set("page", String(demoPage));
        url.searchParams.set("pageSize", String(demoPageSize));
        if (demoQ.trim()) url.searchParams.set("q", demoQ.trim());
        if (demoRisk !== "all") url.searchParams.set("risk", demoRisk);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as NonNullable<typeof demo>;
        if (!alive) return;
        setDemo(json);
      } catch (e) {
        if (!alive) return;
        setDemoError(e instanceof Error ? e.message : "Failed to load payroll demo");
      }
    })();
    return () => {
      alive = false;
    };
  }, [demoPage, demoQ, demoRisk, mode]);

  const enriched = React.useMemo(() => {
    const items = rows.map((r, idx) => {
      const employeeId = getMapped(r, mapping, "employeeId", ["employee_id", "employeeid", "id", "emp_id"]);
      const employeeName = getMapped(r, mapping, "name", ["name", "employee_name", "employee"]);
      const department = getMapped(r, mapping, "department", ["department", "dept", "cost_center", "cost centre"]);
      const bankAccount = getMapped(r, mapping, "bankAccount", ["bank_account", "bank", "account"]);
      const status = getMapped(r, mapping, "status", ["status", "employment_status"]).toLowerCase();
      const salaryCurrent = Number(
        getMapped(r, mapping, "salary", ["salary", "salary_current", "gross_salary", "gross"]).replace(
          /[^0-9.-]/g,
          "",
        ),
      );
      const salaryPrevious = Number(
        getMapped(r, mapping, "salaryPrevious", ["salary_previous", "prev_salary", "previous_salary"]).replace(
          /[^0-9.-]/g,
          "",
        ),
      );

      const salaryIncreasePct =
        Number.isFinite(salaryCurrent) &&
        Number.isFinite(salaryPrevious) &&
        salaryPrevious > 0
          ? ((salaryCurrent - salaryPrevious) / salaryPrevious) * 100
          : null;

      return {
        idx,
        raw: r,
        employeeId,
        employeeName,
        department,
        bankAccount,
        status,
        salaryCurrent,
        salaryIncreasePct,
      };
    });

    const nameCounts = new Map<string, number>();
    const bankCounts = new Map<string, number>();
    items.forEach((i) => {
      const n = normalize(i.employeeName);
      const b = normalize(i.bankAccount);
      if (n) nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
      if (b) bankCounts.set(b, (bankCounts.get(b) || 0) + 1);
    });

    return items.map((i) => {
      const signals: string[] = [];
      const isDupName = i.employeeName && (nameCounts.get(normalize(i.employeeName)) || 0) > 1;
      const isDupBank = i.bankAccount && (bankCounts.get(normalize(i.bankAccount)) || 0) > 1;

      if (isDupName) signals.push("Duplicate name");
      if (isDupBank) signals.push("Duplicate bank account");

      if (i.salaryIncreasePct !== null && i.salaryIncreasePct >= 20) {
        signals.push(`Unusual salary increase (+${i.salaryIncreasePct.toFixed(0)}%)`);
      }

      if ((i.status === "inactive" || i.status === "terminated") && i.salaryCurrent > 0) {
        signals.push("Inactive employee still paid");
      }

      const risk: Risk =
        signals.includes("Duplicate bank account") ||
        signals.includes("Inactive employee still paid")
          ? "High"
          : signals.length > 0
            ? "Medium"
            : "Low";

      return { ...i, risk, signals };
    });
  }, [mapping, rows]);

  React.useEffect(() => {
    if (mode !== "upload") return;
    if (!filename || rows.length === 0) return;
    const entity = profile?.activeEntity || "HQ";
    const total = enriched.length;
    const high = enriched.filter((e) => e.risk === "High").length;
    const medium = enriched.filter((e) => e.risk === "Medium").length;
    const dupBank = enriched.filter((e) => e.signals.includes("Duplicate bank account")).length;
    const inactivePaid = enriched.filter((e) => e.signals.includes("Inactive employee still paid")).length;
    const spikes = enriched.filter((e) => e.signals.some((s) => s.toLowerCase().includes("salary increase"))).length;

    const topDept = (() => {
      const by = new Map<string, number>();
      enriched.forEach((e) => {
        if (!e.department) return;
        by.set(e.department, (by.get(e.department) || 0) + 1);
      });
      return [...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    })();

    upsertUploadedInsights(
      {
      kind: "payroll",
      entity,
      filename,
      uploadedAt: new Date().toISOString(),
      totalEmployees: total,
      highRisk: high,
      mediumRisk: medium,
      duplicateBankSignals: dupBank,
      inactivePaidSignals: inactivePaid,
      salarySpikeSignals: spikes,
      topDepartment: topDept,
      },
      clientId,
    );
  }, [enriched, filename, mode, profile?.activeEntity, rows.length]);

  const uploadExecutiveSummary = React.useMemo(() => {
    if (rows.length === 0) return null;
    const total = enriched.length;
    const high = enriched.filter((e) => e.risk === "High").length;
    const med = enriched.filter((e) => e.risk === "Medium").length;
    const dupBank = enriched.filter((e) => e.signals.includes("Duplicate bank account")).length;
    const inactivePaid = enriched.filter((e) => e.signals.includes("Inactive employee still paid")).length;
    const spikes = enriched.filter((e) => e.signals.some((s) => s.toLowerCase().includes("salary increase"))).length;
    const topDept = (() => {
      const by = new Map<string, number>();
      enriched.forEach((e) => {
        if (!e.department) return;
        by.set(e.department, (by.get(e.department) || 0) + 1);
      });
      return [...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    })();

    return {
      kpis: [
        { label: "Employees", value: total.toLocaleString() },
        { label: "High risk", value: high.toLocaleString() },
        { label: "Medium risk", value: med.toLocaleString() },
      ],
      bullets: [
        topDept ? `Largest department in file: ${topDept}.` : "Largest department identified from uploaded payroll.",
        `Detected ${dupBank.toLocaleString()} duplicate bank-account signals and ${inactivePaid.toLocaleString()} inactive/terminated employees still paid.`,
        `Detected ${spikes.toLocaleString()} salary spike signals (≥ 20% increase).`,
      ],
    };
  }, [enriched, rows.length]);

  function exportPayrollReport() {
    if (mode === "demo") {
      if (!demo?.items.length) {
        toast.message("Nothing to export", { description: "Load the demo table first." });
        return;
      }
      const header =
        "id,employeeName,department,status,bankAccount,salaryMonthly,risk,signals\n";
      const rows = demo.items
        .map((e) => {
          const sig = e.signals.map((s) => s.replaceAll('"', '""')).join("; ");
          return `${e.id},"${e.employeeName.replaceAll('"', '""')}","${e.department}","${e.status}",${e.bankAccount},${e.salaryMonthly},${e.risk},"${sig}"`;
        })
        .join("\n");
      downloadText(`spendda-payroll-demo-page-${demoPage}.csv`, header + rows, "text/csv");
      toast.success("Export ready", { description: "Current page of demo payroll saved as CSV." });
      return;
    }
    if (!enriched.length) {
      toast.message("Nothing to export", { description: "Upload and map a payroll file first." });
      return;
    }
    const header =
      "employeeId,employeeName,department,status,bankAccount,salaryCurrent,risk,signals\n";
    const rows = enriched
      .map((e) => {
        const sig = e.signals.map((s) => s.replaceAll('"', '""')).join("; ");
        return `"${e.employeeId.replaceAll('"', '""')}","${e.employeeName.replaceAll('"', '""')}","${e.department}","${e.status}",${e.bankAccount},${e.salaryCurrent},${e.risk},"${sig}"`;
      })
      .join("\n");
    downloadText("spendda-payroll-upload-export.csv", header + rows, "text/csv");
    toast.success("Export ready", { description: "Mapped upload rows saved as CSV." });
  }

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
      setUploadFlow({ stage: "analyzing", progressPct: 72, message: "Analyzing…", detail: "Computing risk signals and duplicates" });
      setFilename(parsed.filename);
      setRows(parsed.rows);

      let savedToDocs = false;
      if (clientId) {
        void saveFileToClientDocuments({
          clientId,
          file,
          reportingPeriod: "Payroll upload",
          status: "Ready",
        });
        savedToDocs = true;
      }

      const entity = profile?.activeEntity || "HQ";
      setUploadFlow({ stage: "success", progressPct: 100, message: "Upload complete", detail: "Saved to Documents + Uploads" });
      toast.success("Payroll file analyzed", {
        description: `Rows: ${parsed.rows.length.toLocaleString()} · Ready for AI follow-ups`,
      });
      const prompt = `I uploaded ${parsed.filename} (payroll). Summarize high-risk signals (duplicate bank accounts, inactive paid, salary spikes) and recommend the first 5 investigations to open for ${entity}.`;
      setLastUpload({
        filename: parsed.filename,
        rows: parsed.rows.length,
        prompt,
        savedToDocs,
        note: "Next: open AI Workspace for follow-ups, or review mapping and risk rows below.",
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
          <h1 className="app-page-title">Payroll</h1>
          <p className="app-page-desc">
            Live demo payroll risk detection, plus optional CSV or Excel upload for pilot onboarding.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="rounded-xl shadow-sm"
            disabled={mode === "upload" ? enriched.length === 0 : !demo}
            onClick={() =>
              toast.success("Approval recorded (pilot)", {
                description: "In production this would post to your HRIS / workflow engine.",
              })
            }
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            className="rounded-xl shadow-sm"
            disabled={mode === "upload" ? enriched.length === 0 : !demo}
            onClick={() =>
              toast.message("Sent for review (pilot)", {
                description: "Routing rules would notify payroll ops and attach evidence.",
              })
            }
          >
            <Send className="mr-2 h-4 w-4" />
            Send for Review
          </Button>
          <Button
            variant="outline"
            className="rounded-xl shadow-sm"
            disabled={mode === "upload" ? enriched.length === 0 : !demo}
            onClick={exportPayrollReport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
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
          <TabsTrigger value="demo" className="rounded-lg px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Live demo dataset
          </TabsTrigger>
          <TabsTrigger value="upload" className="rounded-lg px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Upload CSV / Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Payroll risk detection</CardTitle>
                <div className="mt-1 text-xs text-muted-foreground">
                  {demo ? `${demo.total.toLocaleString()} employees` : "Loading…"}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <div className="w-full sm:w-[280px]">
                  <Label className="sr-only">Search</Label>
                  <Input
                    value={demoQ}
                    onChange={(e) => {
                      setDemoPage(1);
                      setDemoQ(e.target.value);
                    }}
                    placeholder="Search employee, dept, id…"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDemoPage(1);
                    setDemoRisk("all");
                    setDemoQ("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {demoError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Failed to load: {demoError}
                </div>
              ) : null}

              {!demo ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {demo.riskBreakdown.map((r) => (
                    <div key={r.risk} className="rounded-xl border bg-background p-4 shadow-sm">
                      <div className="text-xs text-muted-foreground">{r.risk} risk</div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">{r.value}</div>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDemoPage(1);
                            setDemoRisk(r.risk);
                          }}
                        >
                          Filter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="data-table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bank account</TableHead>
                      <TableHead className="text-right">Salary</TableHead>
                      <TableHead>Signals</TableHead>
                      <TableHead className="text-right">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!demo
                      ? Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      : demo.items.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">
                              {e.employeeName}
                              <div className="text-xs text-muted-foreground">{e.id}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{e.department}</TableCell>
                            <TableCell className="text-muted-foreground">{e.status}</TableCell>
                            <TableCell className="text-muted-foreground">{e.bankAccount}</TableCell>
                            <TableCell className="text-right">{money(e.salaryMonthly)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {e.signals.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">No issues</span>
                                ) : (
                                  e.signals.map((s) => (
                                    <Badge key={s} variant="outline">
                                      {s}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <RiskBadge risk={e.risk} />
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setDemoPage((p) => Math.max(1, p - 1))}
                  disabled={demoPage <= 1}
                >
                  Previous
                </Button>
                <div className="text-xs text-muted-foreground">
                  Page <span className="font-medium text-foreground">{demoPage}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setDemoPage((p) => p + 1)}
                  disabled={!demo || demo.items.length < demoPageSize}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Upload payroll file</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FileDropzone
                title={filename ? filename : "Choose a CSV or Excel file"}
                subtitle="Expected columns: name, bank_account, salary, status (optional: salary_previous)"
                onFile={onFile}
                multiple
                workflow={uploadFlow}
                sample={{
                  label: "Load sample",
                  onClick: async () => {
                    setError(null);
                    const loaded = await loadSampleCsv("/samples/payroll-sample.csv");
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
                          window.location.href = `/app/ai-workspace?afterUpload=1&kind=payroll&prompt=${encodeURIComponent(
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

              {enriched.length === 0 ? (
                <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Upload a payroll CSV or Excel file to see employee rows, risk badges, and detected anomalies.
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
                          ["employeeId", "Employee ID (optional)"],
                          ["name", "Employee name"],
                          ["department", "Department (optional)"],
                          ["bankAccount", "Bank account"],
                          ["status", "Status (optional)"],
                          ["salaryPrevious", "Previous salary (optional)"],
                          ["salary", "Salary"],
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
                          Tip: map the correct headers for <span className="font-medium text-foreground">Salary</span> and <span className="font-medium text-foreground">Bank account</span> to get accurate risk signals.
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
                  <div className="overflow-hidden rounded-xl border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Dept</TableHead>
                          <TableHead>Bank account</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Signals</TableHead>
                          <TableHead className="text-right">Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enriched.slice(0, 50).map((r) => (
                          <TableRow key={r.idx}>
                            <TableCell className="font-medium">
                              {r.employeeName || "—"}
                              {r.employeeId ? (
                                <div className="text-xs text-muted-foreground">{r.employeeId}</div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {r.department || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {r.bankAccount || "—"}
                            </TableCell>
                            <TableCell>{money(r.salaryCurrent)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {r.signals.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    No issues detected
                                  </span>
                                ) : (
                                  r.signals.map((s) => (
                                    <Badge key={s} variant="outline">
                                      {s}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <RiskBadge risk={r.risk} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Showing first 50 rows.
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

