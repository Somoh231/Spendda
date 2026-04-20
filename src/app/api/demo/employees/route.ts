import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  q: z.string().optional(),
  ministryId: z.string().optional(),
  countyId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Terminated"]).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }
  const { page, pageSize, q, ministryId, countyId, departmentId, status } = parsed.data;
  const dataset = await getRequestDemoDataset();

  const needle = (q || "").trim().toLowerCase();
  let items = dataset.employees;
  if (ministryId) items = items.filter((e) => e.ministryId === ministryId);
  if (countyId) items = items.filter((e) => e.countyId === countyId);
  if (departmentId) items = items.filter((e) => e.departmentId === departmentId);
  if (status) items = items.filter((e) => e.status === status);
  if (needle) items = items.filter((e) => e.fullName.toLowerCase().includes(needle) || e.id.toLowerCase().includes(needle));

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

