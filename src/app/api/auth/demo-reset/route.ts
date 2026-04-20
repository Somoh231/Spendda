import { NextResponse } from "next/server";

import { CLIENT_COOKIE, PORTAL_COOKIE } from "@/lib/auth/client-cookie";
import { PROFILE_COOKIE } from "@/lib/profile/cookie";

const DEMO_COOKIE = "spendda_demo";

function clear(res: NextResponse, name: string) {
  res.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clear(res, DEMO_COOKIE);
  clear(res, CLIENT_COOKIE);
  clear(res, PORTAL_COOKIE);
  clear(res, PROFILE_COOKIE);
  return res;
}

