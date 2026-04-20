import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";
import { buildForecastScoped } from "@/lib/demo-data/forecast";

const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  entities: z.string().optional(),
  departments: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }
  const dataset = await getRequestDemoDataset();
  const entities = parsed.data.entities
    ? parsed.data.entities.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const dept = parsed.data.departments
    ? parsed.data.departments.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const forecast = buildForecastScoped(dataset, { from: parsed.data.from, to: parsed.data.to, entities, departments: dept });
  return NextResponse.json({ org: dataset.org, forecast, generatedAt: dataset.generatedAt });
}

