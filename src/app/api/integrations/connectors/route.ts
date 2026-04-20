import { NextResponse } from "next/server";

import { listConnectorDefinitions } from "@/lib/integrations/connectors";

export async function GET() {
  return NextResponse.json({
    connectors: listConnectorDefinitions(),
    note: "Registry only — OAuth and sync jobs are not enabled in this build.",
  });
}
