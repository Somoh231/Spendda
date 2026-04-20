import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  q: z.string().optional(),
  ministryId: z.string().optional(),
  countyId: z.string().optional(),
  counties: z.string().optional(), // comma-separated county names
  departmentId: z.string().optional(),
  vendorId: z.string().optional(),
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }
  const { page, pageSize, q, ministryId, countyId, counties, departmentId, vendorId, from, to, minAmount, maxAmount } =
    parsed.data;

  const dataset = await getRequestDemoDataset();

  const countyById = new Map(dataset.counties.map((c) => [c.id, c.name]));
  const countyScope = counties
    ? new Set(counties.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const needle = (q || "").trim().toLowerCase();

  let items = dataset.transactions;
  if (ministryId) items = items.filter((t) => t.ministryId === ministryId);
  if (countyId) items = items.filter((t) => t.countyId === countyId);
  if (countyScope) items = items.filter((t) => countyScope.has(countyById.get(t.countyId) || ""));
  if (departmentId) items = items.filter((t) => t.departmentId === departmentId);
  if (vendorId) items = items.filter((t) => t.vendorId === vendorId);
  if (from) items = items.filter((t) => t.date >= from);
  if (to) items = items.filter((t) => t.date <= to);
  if (typeof minAmount === "number") items = items.filter((t) => t.amount >= minAmount);
  if (typeof maxAmount === "number") items = items.filter((t) => t.amount <= maxAmount);
  if (needle) {
    items = items.filter(
      (t) =>
        t.vendorName.toLowerCase().includes(needle) ||
        t.invoiceId.toLowerCase().includes(needle) ||
        t.category.toLowerCase().includes(needle),
    );
  }

  // Newest first
  items = items.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return NextResponse.json({
    total,
    page,
    pageSize,
    items: paged,
    meta: {
      ministries: dataset.ministries,
      counties: dataset.counties,
      departments: dataset.departments,
    },
  });
}

