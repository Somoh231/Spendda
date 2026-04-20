"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Mail, Sparkles } from "lucide-react";

import { buildUploadedExecutiveBriefs } from "@/lib/upload/briefs";
import { getUploadedInsights } from "@/lib/upload/storage";
import { useProfile } from "@/lib/profile/client";
import { useClientSession } from "@/hooks/use-client-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Report = {
  title: string;
  audience: "Executive" | "CFO" | "Controller";
  summary: string;
  highlights: string[];
};

type BriefResponse = { briefs: Report[] };

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

export default function AiReportsPage() {
  const router = useRouter();
  const [reports, setReports] = React.useState<Report[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<"upload" | "demo">("demo");
  const { profile } = useProfile();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;

  const load = React.useCallback(async () => {
    setError(null);
    const uploaded = getUploadedInsights(clientId);
    if (uploaded.length > 0) {
      setSource("upload");
      setReports(buildUploadedExecutiveBriefs(uploaded, { entity: profile?.activeEntity }));
      return;
    }

    setSource("demo");
    const res = await fetch("/api/demo/executive-briefs", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as BriefResponse;
    setReports(json.briefs);
  }, [clientId, profile?.activeEntity]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load briefs");
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  async function generate() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 750));
    setBusy(false);
    try {
      await load();
      toast.success("Reports refreshed", { description: "Briefs updated from uploads or demo data." });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh briefs");
    }
  }

  async function exportAllPdf() {
    if (!reports?.length) return;
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      let y = 56;
      const margin = 48;
      const maxW = 612 - margin * 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Spendda — AI Reports pack", margin, y);
      y += 28;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const r of reports) {
        doc.setFont("helvetica", "bold");
        doc.text(`${r.title} (${r.audience})`, margin, y);
        y += 16;
        doc.setFont("helvetica", "normal");
        const body = doc.splitTextToSize(r.summary, maxW);
        doc.text(body, margin, y);
        y += body.length * 13 + 8;
        for (const h of r.highlights) {
          const lines = doc.splitTextToSize(`• ${h}`, maxW);
          doc.text(lines, margin, y);
          y += lines.length * 13 + 4;
          if (y > 720) {
            doc.addPage();
            y = 48;
          }
        }
        y += 12;
        if (y > 700) {
          doc.addPage();
          y = 48;
        }
      }
      doc.save("spendda-ai-reports.pdf");
      toast.success("PDF exported", { description: "Combined brief pack saved to downloads." });
    } catch (e) {
      toast.error("PDF export failed", {
        description: e instanceof Error ? e.message : "Could not build PDF.",
      });
    } finally {
      setBusy(false);
    }
  }

  function exportReportMd(r: Report) {
    const body = [`## ${r.title}`, `Audience: ${r.audience}`, "", r.summary, "", ...r.highlights.map((h) => `- ${h}`)].join(
      "\n",
    );
    const safe = r.title.replace(/[^\w\-]+/g, "-").toLowerCase();
    downloadText(`spendda-brief-${safe}.md`, body, "text/markdown");
    toast.success("Brief exported", { description: `${r.title} saved as Markdown.` });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">AI Reports</h1>
          <p className="app-page-desc">
            Executive-ready narratives generated from uploaded files (or demo data if no uploads yet).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl shadow-sm" onClick={generate} disabled={busy}>
            <Sparkles className="mr-2 h-4 w-4" />
            {busy ? "Generating..." : "Generate Report"}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl shadow-sm"
            disabled={!reports || reports.length === 0}
            onClick={() =>
              toast.message("Email (pilot)", {
                description: "Connect your mail provider to send leadership packs from this screen.",
              })
            }
          >
            <Mail className="mr-2 h-4 w-4" />
            Email Leadership
          </Button>
          <Button
            variant="outline"
            className="rounded-xl shadow-sm"
            disabled={!reports || reports.length === 0 || busy}
            onClick={() => void exportAllPdf()}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          AI briefs failed to load: {error}
        </div>
      ) : null}

      {reports ? (
        <div className="text-xs text-muted-foreground">
          Source:{" "}
          <span className="font-medium text-foreground">
            {source === "upload" ? "Uploaded files" : "Synthetic demo dataset"}
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {!reports
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border/60 shadow-md">
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-3 h-5 w-20" />
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          : reports.map((r) => (
              <Card key={r.title} className="border-border/60 shadow-md transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">{r.title}</CardTitle>
                      <div className="mt-2">
                        <Badge variant="outline">{r.audience}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {r.summary}
                  </p>
                  <Separator />
                  <div className="grid gap-2">
                    {r.highlights.map((h) => (
                      <div
                        key={h}
                        className="rounded-xl border bg-background px-3 py-2 text-xs"
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 rounded-xl"
                      onClick={() => router.push("/app/reports")}
                    >
                      View
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => exportReportMd(r)}>
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}

