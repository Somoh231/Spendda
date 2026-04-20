"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Eye, FileUp, Paperclip, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { useClientSession } from "@/hooks/use-client-session";
import { tenantRoleCan } from "@/lib/tenants/permissions";
import { cn } from "@/lib/utils";
import {
  deleteClientDocument,
  docTypeFromName,
  loadClientDocuments,
  type DocumentStatus,
  type SavedDocument,
  upsertClientDocument,
} from "@/lib/documents/storage";

const MAX_PILOT_BYTES = 1_500_000; // ~1.5MB base64-safe for localStorage pilots

export default function DocumentsPage() {
  const { mounted, client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const canUploadDocs = Boolean(clientId) && tenantRoleCan(client?.role, "data.upload");
  const canDeleteDocs = Boolean(clientId) && tenantRoleCan(client?.role, "documents.delete");
  const [docs, setDocs] = React.useState<SavedDocument[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [storageMode, setStorageMode] = React.useState<"local" | "cloud">("local");
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | SavedDocument["fileType"]>("all");
  const [range, setRange] = React.useState<DateRange>({});
  const [sort, setSort] = React.useState<{ key: "uploadedAt" | "fileName" | "status" | "fileType"; dir: "asc" | "desc" }>({
    key: "uploadedAt",
    dir: "desc",
  });
  const [pageSize, setPageSize] = React.useState(12);
  const [page, setPage] = React.useState(1);
  const [reportingPeriod, setReportingPeriod] = React.useState("");
  const [status, setStatus] = React.useState<DocumentStatus>("Ready");
  const [notes, setNotes] = React.useState("");
  const [pickedName, setPickedName] = React.useState<string | null>(null);
  const [previewing, setPreviewing] = React.useState<SavedDocument | null>(null);

  React.useEffect(() => {
    if (!mounted || !clientId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/documents", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { docs?: SavedDocument[] };
          if (!alive) return;
          setDocs(Array.isArray(json.docs) ? json.docs : []);
          setStorageMode("cloud");
          return;
        }
      } catch {
        // ignore
      }
      if (!alive) return;
      setDocs(loadClientDocuments(clientId));
      setStorageMode("local");
    })();
    return () => {
      alive = false;
    };
  }, [mounted, clientId]);

  React.useEffect(() => {
    setPage(1);
  }, [query, typeFilter, range.from, range.to, sort.key, sort.dir, pageSize]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const inRange = (iso: string) => {
      const day = iso.slice(0, 10);
      if (range.from && day < range.from) return false;
      if (range.to && day > range.to) return false;
      return true;
    };
    const base = docs
      .filter((d) => (typeFilter === "all" ? true : d.fileType === typeFilter))
      .filter((d) => inRange(d.uploadedAt))
      .filter((d) => {
        if (!q) return true;
        return [d.fileName, d.fileType, d.reportingPeriod || "", d.status, d.owner || ""].some((x) =>
          String(x).toLowerCase().includes(q),
        );
      });
    const dir = sort.dir === "asc" ? 1 : -1;
    const sorted = [...base].sort((a, b) => {
      const ka = a[sort.key] ?? "";
      const kb = b[sort.key] ?? "";
      return String(ka).localeCompare(String(kb)) * dir;
    });
    return sorted;
  }, [docs, query, range.from, range.to, sort.dir, sort.key, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function toggleSort(key: typeof sort.key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  async function upload(file: File) {
    if (!clientId) {
      toast.error("No client session", { description: "Please sign in again." });
      return;
    }
    if (!canUploadDocs) {
      toast.error("Upload not permitted", { description: "Your workspace role cannot add documents." });
      return;
    }
    setLoading(true);
    try {
      const id = `DOC_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const fileType = docTypeFromName(file.name);
      setPickedName(file.name);

      let payloadBase64: string | undefined = undefined;
      if (file.size <= MAX_PILOT_BYTES) {
        payloadBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.onload = () => {
            const result = String(reader.result || "");
            // reader.result is a data URL; store only the base64 part.
            const idx = result.indexOf("base64,");
            resolve(idx >= 0 ? result.slice(idx + "base64,".length) : "");
          };
          reader.readAsDataURL(file);
        });
      }

      if (storageMode === "cloud") {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType,
            reportingPeriod: reportingPeriod.trim() ? reportingPeriod.trim() : undefined,
            status,
            owner: "Portal User",
            sizeBytes: file.size,
            mimeType: file.type || undefined,
            notes: notes.trim() ? notes.trim() : undefined,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
        const listRes = await fetch("/api/documents", { cache: "no-store" });
        const listJson = (await listRes.json().catch(() => ({}))) as { docs?: SavedDocument[] };
        setDocs(Array.isArray(listJson.docs) ? listJson.docs : []);
      } else {
        const doc: SavedDocument = {
          id,
          fileName: file.name,
          fileType,
          uploadedAt: new Date().toISOString(),
          reportingPeriod: reportingPeriod.trim() ? reportingPeriod.trim() : undefined,
          status,
          owner: "Portal User",
          sizeBytes: file.size,
          payloadBase64,
          mimeType: file.type || undefined,
        };
        const next = upsertClientDocument(clientId, doc);
        setDocs(next);
      }
      setNotes("");
      setReportingPeriod("");
      toast.success("Saved to Documents Center", {
        description:
          file.size > MAX_PILOT_BYTES
            ? "Metadata saved. File preview/download is available for smaller pilot files."
            : "File saved with preview + download.",
      });
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function buildDataUrl(doc: SavedDocument) {
    if (!doc.payloadBase64) return null;
    const mime =
      doc.mimeType ||
      (doc.fileType === "PDF"
        ? "application/pdf"
        : doc.fileType === "CSV"
          ? "text/csv"
          : doc.fileType === "XLSX"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : doc.fileType === "DOCX"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "application/octet-stream");
    return `data:${mime};base64,${doc.payloadBase64}`;
  }

  function downloadDoc(doc: SavedDocument) {
    const url = buildDataUrl(doc);
    if (!url) {
      toast.message("Not stored", { description: "This pilot file is too large to download from local storage." });
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function removeDoc(doc: SavedDocument) {
    if (!clientId) return;
    if (!canDeleteDocs) {
      toast.error("Delete not permitted", { description: "Only Owner or Finance Lead can remove documents." });
      return;
    }
    (async () => {
      if (storageMode === "cloud") {
        try {
          const res = await fetch("/api/documents", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: doc.id }),
          });
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
          const listRes = await fetch("/api/documents", { cache: "no-store" });
          const listJson = (await listRes.json().catch(() => ({}))) as { docs?: SavedDocument[] };
          setDocs(Array.isArray(listJson.docs) ? listJson.docs : []);
          toast.success("Deleted", { description: doc.fileName });
        } catch (e) {
          toast.error("Could not delete", { description: e instanceof Error ? e.message : "Try again." });
        }
      } else {
        const next = deleteClientDocument(clientId, doc.id);
        setDocs(next);
        toast.success("Deleted", { description: doc.fileName });
      }
      if (previewing?.id === doc.id) setPreviewing(null);
    })();
  }

  const previewUrl = React.useMemo(() => (previewing ? buildDataUrl(previewing) : null), [previewing]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="app-page-title">Documents</h1>
        <p className="app-page-desc">
          Your private documents center for this client workspace. Upload, search, filter, preview, download, and delete
          files.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-md lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Upload</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Reporting period</Label>
              <Input
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                placeholder="e.g. Jan 2026 · Payroll"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as DocumentStatus)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(["Uploaded", "Processing", "Ready", "Archived"] as DocumentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context for reviewers…"
              />
            </div>
            <label
              className={cn(
                "group flex items-center justify-between rounded-xl border bg-background px-4 py-4 shadow-sm",
                canUploadDocs ? "cursor-pointer hover:bg-muted/40" : "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg border bg-card p-2">
                  <FileUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {pickedName ? pickedName : "Choose a file"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    PDF, CSV, XLSX, DOCX
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground group-hover:text-foreground">
                Browse
              </div>
              <input
                type="file"
                disabled={!canUploadDocs}
                accept=".pdf,.csv,.xlsx,.docx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
            </label>
            <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
              Pilot storage: files up to ~1.5MB are saved with preview + download in this client workspace.
            </div>
            <Button variant="outline" onClick={() => setPickedName(null)} disabled={loading}>
              Clear
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">Files</CardTitle>
              <div className="relative w-full sm:w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search documents…"
                  className="h-10 rounded-xl border-border/70 bg-card/70 pl-9 shadow-sm"
                />
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <DateRangePicker value={range} onChange={setRange} />
              </div>
              <div className="grid gap-2">
                <Label>Filter by type</Label>
                <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v as any)}>
                  <SelectTrigger className="h-10 rounded-xl border-border/70 bg-card/70">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["all", "PDF", "CSV", "XLSX", "DOCX", "OTHER"] as const).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "all" ? "All types" : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid gap-2">
                  <Label>Page size</Label>
                  <Select value={String(pageSize)} onValueChange={(v) => v && setPageSize(Number(v))}>
                    <SelectTrigger className="h-10 rounded-xl border-border/70 bg-card/70">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {[12, 24, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} rows
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!clientId ? (
              <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Loading client workspace…
              </div>
            ) : null}
            <div className="data-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                    <TableHead className="min-w-[260px]">
                      <button type="button" className="hover:underline" onClick={() => toggleSort("fileName")}>
                        File
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleSort("fileType")}>
                        Type
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleSort("uploadedAt")}>
                        Uploaded
                      </button>
                    </TableHead>
                    <TableHead>Reporting Period</TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleSort("status")}>
                        Status
                      </button>
                    </TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : paged.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                            {docs.length === 0 ? "No documents yet. Upload a file on the left." : "No files match your filters or date range."}
                          </TableCell>
                        </TableRow>
                      )
                    : paged.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{d.fileName}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline">{d.id}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{d.fileType}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{d.uploadedAt.slice(0, 10)}</TableCell>
                          <TableCell className="text-muted-foreground">{d.reportingPeriod || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                d.status === "Ready"
                                  ? "border-emerald-500/30 bg-emerald-500/10"
                                  : d.status === "Processing"
                                    ? "border-amber-500/30 bg-amber-500/10"
                                    : d.status === "Archived"
                                      ? "border-slate-500/30 bg-slate-500/10"
                                      : "border-border/60 bg-muted/10"
                              }
                            >
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{d.owner || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-xl"
                                onClick={() => setPreviewing(d)}
                                disabled={!d.payloadBase64}
                                title={!d.payloadBase64 ? "Preview available for smaller pilot files" : "Preview"}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-xl"
                                onClick={() => downloadDoc(d)}
                                disabled={!d.payloadBase64}
                                title={!d.payloadBase64 ? "Download available for smaller pilot files" : "Download"}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={!canDeleteDocs}
                                title={!canDeleteDocs ? "Only Owner or Finance Lead can delete" : undefined}
                                onClick={() => removeDoc(d)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {filtered.length.toLocaleString()} files · Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-xl"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>

            {previewing ? (
              <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{previewing.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {previewing.fileType} · {previewing.uploadedAt.slice(0, 10)}
                      {previewing.reportingPeriod ? ` · ${previewing.reportingPeriod}` : ""}
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => setPreviewing(null)}>
                    Close preview
                  </Button>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-background">
                  {previewing.fileType === "PDF" && previewUrl ? (
                    <iframe title="Document preview" src={previewUrl} className="h-[520px] w-full" />
                  ) : previewing.fileType === "CSV" && previewUrl ? (
                    <CsvPreview dataUrl={previewUrl} />
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Preview is available for PDFs and CSVs stored in pilot mode.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CsvPreview({ dataUrl }: { dataUrl: string }) {
  const [text, setText] = React.useState<string>("");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        const res = await fetch(dataUrl);
        const t = await res.text();
        if (!alive) return;
        setText(t);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to preview CSV");
      }
    })();
    return () => {
      alive = false;
    };
  }, [dataUrl]);

  if (err) {
    return <div className="p-4 text-sm text-destructive">Preview failed: {err}</div>;
  }
  const lines = text.split(/\r?\n/).slice(0, 60);
  return (
    <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-relaxed text-foreground/90">
      {lines.join("\n")}
    </pre>
  );
}

