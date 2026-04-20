import { NextResponse } from "next/server";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";

type Doc = {
  id: string;
  filename: string;
  department: string;
  notes: string;
  uploadedBy: string;
  uploadedAt: string;
  kind: "PDF" | "CSV" | "DOCX";
};

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const dataset = await getRequestDemoDataset();

  const depts = dataset.departments;
  const pickDept = (id: string) => depts.find((d) => d.id === id)?.name || "Operations";

  const docs: Doc[] = [];

  // Seed docs from top flags and recent months to make it look “live”.
  const recentFlags = dataset.flags.slice(0, 40);
  let idx = 1000;
  for (const f of recentFlags.slice(0, 18)) {
    const dept = pickDept(f.departmentId);
    const kind: Doc["kind"] =
      f.entityType === "transaction" ? "PDF" : "CSV";
    const filename =
      kind === "PDF"
        ? `${dept.replace(/\s+/g, "_")}_Invoices_${f.date}.pdf`
        : `${dept.replace(/\s+/g, "_")}_Payroll_Export_${f.date}.csv`;
    docs.push({
      id: `DOC-${idx++}`,
      filename,
      department: dept,
      notes:
        f.entityType === "transaction"
          ? `Evidence packet for ${f.title.toLowerCase()}.`
          : `Payroll extract to review: ${f.title.toLowerCase()}.`,
      uploadedBy: "Spendda System",
      uploadedAt: f.date,
      kind,
    });
  }

  // Add a couple “leadership” docs.
  docs.push(
    {
      id: `DOC-${idx++}`,
      filename: `Executive_Brief_${iso(new Date())}.docx`,
      department: "Finance",
      notes: "Monthly executive brief exported for leadership distribution.",
      uploadedBy: "Demo User",
      uploadedAt: iso(new Date(Date.now() - 2 * 86400000)),
      kind: "DOCX",
    },
    {
      id: `DOC-${idx++}`,
      filename: `Policy_Invoice_Matching_Guidelines.pdf`,
      department: "Audit & Compliance",
      notes: "Controls documentation for procurement and invoice matching workflows.",
      uploadedBy: "Demo User",
      uploadedAt: iso(new Date(Date.now() - 12 * 86400000)),
      kind: "PDF",
    },
  );

  docs.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));

  return NextResponse.json({ total: docs.length, items: docs });
}

