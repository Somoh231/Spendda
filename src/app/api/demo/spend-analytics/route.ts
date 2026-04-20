import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";

const schema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  departmentId: z.string().optional(),
  ministryId: z.string().optional(),
  countyId: z.string().optional(),
  counties: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const dataset = await getRequestDemoDataset();
  const { q, from, to, departmentId, ministryId, countyId, counties } = parsed.data;

  const needle = (q || "").trim().toLowerCase();
  let items = dataset.transactions;
  if (from) items = items.filter((t) => t.date >= from);
  if (to) items = items.filter((t) => t.date <= to);
  if (departmentId) items = items.filter((t) => t.departmentId === departmentId);
  if (ministryId) items = items.filter((t) => t.ministryId === ministryId);
  if (countyId) items = items.filter((t) => t.countyId === countyId);
  if (counties) {
    const set = new Set(
      counties
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    );
    if (set.size) {
      const ids = new Set(dataset.counties.filter((c) => set.has(c.name)).map((c) => c.id));
      items = items.filter((t) => ids.has(t.countyId));
    }
  }
  if (needle) {
    items = items.filter(
      (t) =>
        t.vendorName.toLowerCase().includes(needle) ||
        t.category.toLowerCase().includes(needle) ||
        t.invoiceId.toLowerCase().includes(needle),
    );
  }

  // Compute aggregates.
  const byCategory = new Map<string, number>();
  const byVendor = new Map<string, number>();
  const byDept = new Map<string, number>();
  const amounts = items.map((t) => t.amount).slice().sort((a, b) => a - b);
  const p95 = amounts.length ? amounts[Math.floor(0.95 * (amounts.length - 1))] : 0;

  // repeated payments key counts
  const repeatedCounts = new Map<string, number>();
  for (const t of items) {
    const key = `${t.vendorId}|${t.departmentId}|${t.amount}`;
    repeatedCounts.set(key, (repeatedCounts.get(key) || 0) + 1);
  }

  const unusual: Array<{ vendor: string; department: string; amount: number; flags: string[]; id: string }> = [];
  const repeated: Array<{ vendor: string; category: string; amount: number; id: string }> = [];

  for (const t of items) {
    byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
    byVendor.set(t.vendorName, (byVendor.get(t.vendorName) || 0) + t.amount);
    const deptName =
      dataset.departments.find((d) => d.id === t.departmentId)?.name || "Department";
    byDept.set(deptName, (byDept.get(deptName) || 0) + t.amount);

    const flags: string[] = [];
    const key = `${t.vendorId}|${t.departmentId}|${t.amount}`;
    if ((repeatedCounts.get(key) || 0) >= 3) flags.push("Repeated payment");
    if (p95 > 0 && t.amount >= p95) flags.push("Unusually large");
    if (flags.includes("Unusually large") && unusual.length < 12) {
      unusual.push({
        id: t.id,
        vendor: t.vendorName,
        department: deptName,
        amount: t.amount,
        flags,
      });
    }
    if ((repeatedCounts.get(key) || 0) >= 3 && repeated.length < 12) {
      repeated.push({
        id: t.id,
        vendor: t.vendorName,
        category: t.category,
        amount: t.amount,
      });
    }
  }

  const topCategories = [...byCategory.entries()]
    .map(([name, spend]) => ({ name, spend: Math.round(spend) }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);
  const topVendors = [...byVendor.entries()]
    .map(([vendor, spend]) => ({ vendor, spend: Math.round(spend) }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);
  const deptRanking = [...byDept.entries()]
    .map(([department, spend]) => ({ department, spend: Math.round(spend) }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);

  return NextResponse.json({
    total: items.length,
    topCategories,
    topVendors,
    deptRanking,
    unusual,
    repeated,
    meta: {
      ministries: dataset.ministries,
      counties: dataset.counties,
      departments: dataset.departments,
    },
  });
}

