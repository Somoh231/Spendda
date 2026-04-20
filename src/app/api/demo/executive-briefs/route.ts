import { NextResponse } from "next/server";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";
import { buildExecutiveBriefs } from "@/lib/demo-data/executive";

export async function GET() {
  const dataset = await getRequestDemoDataset();
  const briefs = buildExecutiveBriefs(dataset);
  return NextResponse.json({ org: dataset.org, briefs, generatedAt: dataset.generatedAt });
}

