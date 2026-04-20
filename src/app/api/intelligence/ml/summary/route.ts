import { NextResponse } from "next/server";

import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";
import { buildMlSummary } from "@/lib/ml/ml-summary";

export async function GET() {
  const dataset = await getRequestDemoDataset();
  const summary = buildMlSummary(dataset);
  return NextResponse.json({ org: dataset.org, summary });
}

