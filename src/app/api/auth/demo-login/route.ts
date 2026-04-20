import { NextResponse } from "next/server";
import { z } from "zod";

import { safePostAuthPath } from "@/lib/safe-redirect";
import { CLIENT_COOKIE, PORTAL_COOKIE, encodeClientSession } from "@/lib/auth/client-cookie";
import { PROFILE_COOKIE, encodeProfile } from "@/lib/profile/cookie";

const DEMO_COOKIE = "spendda_demo";
const MASTER_DEMO_EMAIL = "demo@spendda.com";
const MASTER_DEMO_PASSWORD = "Demo123!";

const masterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

function setDemoCookies(res: NextResponse, opts?: { clientId?: string; clientName?: string }) {
  const clientId = opts?.clientId || "demo_master";
  const clientName = opts?.clientName || "Spendda Master Demo";

  res.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  res.cookies.set(
    CLIENT_COOKIE,
    encodeClientSession({
      clientId,
      clientName,
      role: "owner",
      planTier: "enterprise",
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );

  res.cookies.set(PORTAL_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Skip onboarding and force demo data mode.
  res.cookies.set(
    PROFILE_COOKIE,
    encodeProfile({
      clientId,
      orgType: "Government",
      marketType: "Emerging Market",
      orgSize: "Multi-entity",
      primaryGoals: ["Fraud / anomaly detection", "Executive reporting", "Payroll oversight"],
      dataMode: "demo",
      demoPackId: "default",
      role: "Executive",
      entities: ["HQ", "Region A", "Region B"],
      activeEntity: "HQ",
      createdAt: new Date().toISOString(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = safePostAuthPath(url.searchParams.get("redirectTo"), "/app");
  const clientId = url.searchParams.get("clientId") || "pilot_acme";
  const clientName = url.searchParams.get("clientName") || "Acme Public Sector Pilot";
  const res = NextResponse.redirect(new URL(redirectTo, url.origin));
  setDemoCookies(res, { clientId, clientName });
  return res;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = masterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });

  const ok =
    parsed.data.email.toLowerCase() === MASTER_DEMO_EMAIL.toLowerCase() &&
    parsed.data.password === MASTER_DEMO_PASSWORD;
  if (!ok) return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  setDemoCookies(res);
  // Redirect is handled client-side to ensure Set-Cookie commits before navigation.
  return res;
}

