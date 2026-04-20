import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_COOKIE, decodeClientSession } from "@/lib/auth/client-cookie";

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(CLIENT_COOKIE)?.value;
  const client = raw ? decodeClientSession(raw) : null;
  const portal = jar.get("spendda_portal")?.value === "1";
  return NextResponse.json({ client, portal });
}

