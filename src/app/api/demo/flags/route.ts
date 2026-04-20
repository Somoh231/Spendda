import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  severity: z.enum(["Low", "Medium", "High"]).optional(),
  entityType: z.enum(["transaction", "employee"]).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const { page, pageSize, severity, entityType } = parsed.data;
  const dataset = await getRequestDemoDataset();

  const countyById = new Map(dataset.counties.map((c) => [c.id, c.name]));
  const ministryById = new Map(dataset.ministries.map((m) => [m.id, m.name]));
  const deptById = new Map(dataset.departments.map((d) => [d.id, d.name]));

  let items = dataset.flags;
  if (severity) items = items.filter((f) => f.severity === severity);
  if (entityType) items = items.filter((f) => f.entityType === entityType);

  items = items.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return NextResponse.json({
    total,
    page,
    pageSize,
    items: paged.map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      date: f.date,
      score: f.score,
      entity:
        countyById.get(f.countyId) ||
        ministryById.get(f.ministryId) ||
        deptById.get(f.departmentId) ||
        "HQ",
    })),
  });
}

