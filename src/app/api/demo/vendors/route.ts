import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";

const schema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(10).max(200).default(50),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const { q, limit } = parsed.data;
  const dataset = await getRequestDemoDataset();

  const needle = (q || "").trim().toLowerCase();
  const items = dataset.vendors
    .filter((v) => (needle ? v.name.toLowerCase().includes(needle) : true))
    .slice(0, limit);

  return NextResponse.json({ total: dataset.vendors.length, items });
}

