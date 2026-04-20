import { NextResponse } from "next/server";
import { z } from "zod";

const DEMO_COOKIE = "spendda_demo";
const ENABLE_LOCAL_DEMO_AUTH = process.env.SPENDDA_ENABLE_LOCAL_DEMO_AUTH === "1";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function getDemoCreds() {
  const email = process.env.SPENDDA_DEMO_EMAIL;
  const password = process.env.SPENDDA_DEMO_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export async function POST(request: Request) {
  if (!ENABLE_LOCAL_DEMO_AUTH) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Local demo auth is disabled. Configure Supabase auth, or enable SPENDDA_ENABLE_LOCAL_DEMO_AUTH=1 with demo credentials.",
      },
      { status: 403 },
    );
  }

  const creds = getDemoCreds();
  if (!creds) {
    return NextResponse.json(
      { ok: false, error: "Missing SPENDDA_DEMO_EMAIL / SPENDDA_DEMO_PASSWORD." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ok = email.toLowerCase() === creds.email.toLowerCase() && password === creds.password;
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

