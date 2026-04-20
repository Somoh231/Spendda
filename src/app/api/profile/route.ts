import { NextResponse } from "next/server";
import { z } from "zod";
import { PROFILE_COOKIE, encodeProfile } from "@/lib/profile/cookie";
import { INDUSTRY_SEGMENTS, OPERATING_LOCATIONS } from "@/lib/profile/types";
import { CLIENT_COOKIE, decodeClientSession } from "@/lib/auth/client-cookie";
import { cookies } from "next/headers";

const DEMO_PACK_IDS = [
  "default",
  "liberia-mof",
  "east-africa-university",
  "mercy-regional-hospital",
  "global-ngo-relief",
] as const;

const schema = z.object({
  orgType: z.enum(["Government", "Private Company", "University", "NGO", "Hospital", "Bank"]),
  marketType: z.enum(["Emerging Market", "Developed Market"]),
  orgSize: z.enum(["Small", "Mid-size", "Large", "Multi-entity"]),
  primaryGoals: z.array(
    z.enum([
      "Payroll oversight",
      "Procurement savings",
      "Budget forecasting",
      "Fraud / anomaly detection",
      "Executive reporting",
      "Donor fund accountability",
      "Workforce planning",
      "Multi-branch visibility",
    ]),
  ),
  dataMode: z.enum(["upload", "demo"]),
  demoPackId: z.enum(DEMO_PACK_IDS).optional(),
  industrySegment: z.enum(INDUSTRY_SEGMENTS).optional(),
  operatingLocation: z.enum(OPERATING_LOCATIONS).optional(),
  role: z.enum(["Admin", "Finance Lead", "Executive", "Auditor", "Analyst"]),
  entities: z.array(z.string().min(1)).min(1),
  activeEntity: z.string().min(1),
  createdAt: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile", issues: parsed.error.issues }, { status: 400 });
  }

  // Bind profile to the authenticated tenant (client session).
  const jar = await cookies();
  const rawClient = jar.get(CLIENT_COOKIE)?.value;
  const client = rawClient ? decodeClientSession(rawClient) : null;
  if (!client) {
    return NextResponse.json({ error: "Missing client session" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PROFILE_COOKIE, encodeProfile({ ...parsed.data, clientId: client.clientId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PROFILE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

