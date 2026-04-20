import { NextResponse } from "next/server";

import { safePostAuthPath } from "@/lib/safe-redirect";
import { CLIENT_COOKIE, PORTAL_COOKIE, encodeClientSession } from "@/lib/auth/client-cookie";

const DEMO_COOKIE = "spendda_demo";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = safePostAuthPath(url.searchParams.get("redirectTo"), "/app");
  const clientId = url.searchParams.get("clientId") || "pilot_acme";
  const clientName = url.searchParams.get("clientName") || "Acme Public Sector Pilot";
  const res = NextResponse.redirect(new URL(redirectTo, url.origin));
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
  return res;
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
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
      clientId: "pilot_acme",
      clientName: "Acme Public Sector Pilot",
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
  return res;
}

