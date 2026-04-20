import { type NextRequest, NextResponse } from "next/server";
import { PROFILE_COOKIE } from "@/lib/profile/cookie";
import { CLIENT_COOKIE, PORTAL_COOKIE } from "@/lib/auth/client-cookie";

const PROTECTED_PREFIXES = ["/app"];
const DEMO_COOKIE = "spendda_demo";
const ONBOARDING_PATH = "/app/onboarding";
/** Primary post-auth landing (unified AI workspace). */
const APP_HOME_PATH = "/app/ai-workspace";
const PORTAL_HOME_PATH = "/app/dashboard";
const SELECT_TENANT_PATH = "/app/select-tenant";
const PORTAL_ALLOWED_PATHS = new Set([
  "/app",
  "/app/ai-workspace",
  "/app/dashboard",
  "/app/upload-data",
  "/app/data-health",
  "/app/reports",
  "/app/documents",
  "/app/alerts",
  "/app/forecasting",
  "/app/debt",
  "/app/profitability",
  "/app/cashflow",
  "/app/recommendations",
  "/app/market-updates",
  "/app/departments",
  "/app/benchmarks",
  "/app/spend-analytics",
  "/app/payroll",
  "/app/transactions",
  "/app/settings",
  "/app/settings/tenant",
  "/app/settings/integrations",
  "/app/onboarding",
  "/app/select-tenant",
]);

function hasSupabaseSessionCookie(request: NextRequest) {
  // Next/Supabase cookie names vary by project & auth mode, but typically include "sb-"
  // and/or "auth-token". For this prototype, presence of these cookies is treated as
  // "logged in" to avoid refresh-time races that cause UI flashes.
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token"),
    );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Public routes pass through.
  if (!isProtected) return NextResponse.next();

  const hasProfile = Boolean(request.cookies.get(PROFILE_COOKIE)?.value);
  const hasClient = Boolean(request.cookies.get(CLIENT_COOKIE)?.value);
  const isPortal = request.cookies.get(PORTAL_COOKIE)?.value === "1";
  const homePath = isPortal ? PORTAL_HOME_PATH : APP_HOME_PATH;
  const desiredAfterAuth = pathname === "/app" ? homePath : pathname;

  // If Supabase isn't configured, fall back to a demo-cookie session.
  if (!url || !anonKey) {
    const demo = request.cookies.get(DEMO_COOKIE)?.value;
    const isAuthed = demo === "1";

    if (!isAuthed) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirectTo", desiredAfterAuth);
      return NextResponse.redirect(loginUrl);
    }

    // Client-portal gate: require a client session (tenant) once authenticated.
    if (!hasClient) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirectTo", desiredAfterAuth);
      return NextResponse.redirect(loginUrl);
    }

    // Restrict portal navigation to the client workspace surface.
    if (isPortal && pathname.startsWith("/app") && !PORTAL_ALLOWED_PATHS.has(pathname)) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = PORTAL_HOME_PATH;
      return NextResponse.redirect(nextUrl);
    }

    // Smart gateway for /app.
    if (pathname === "/app") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = hasProfile ? homePath : ONBOARDING_PATH;
      if (!hasProfile) nextUrl.searchParams.set("redirectTo", homePath);
      return NextResponse.redirect(nextUrl);
    }

    // Require onboarding profile before entering the product.
    if (!hasProfile && pathname !== ONBOARDING_PATH) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = ONBOARDING_PATH;
      nextUrl.searchParams.set("redirectTo", desiredAfterAuth);
      return NextResponse.redirect(nextUrl);
    }

    // Prevent re-entering onboarding once completed.
    if (hasProfile && pathname === ONBOARDING_PATH) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = homePath;
      return NextResponse.redirect(nextUrl);
    }

    return NextResponse.next();
  }

  // Auth gate (prototype-safe, refresh-stable):
  // Prefer cookie presence over an async getUser() call to avoid refresh-time races.
  const isAuthed = hasSupabaseSessionCookie(request);
  if (!isAuthed) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", desiredAfterAuth);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasClient) {
    // In production mode (Supabase configured), a logged-in user must select or create a tenant
    // before entering the portal. Demo mode sets CLIENT_COOKIE via demo-login.
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = SELECT_TENANT_PATH;
    nextUrl.searchParams.set("redirectTo", desiredAfterAuth);
    return NextResponse.redirect(nextUrl);
  }

  if (isPortal && pathname.startsWith("/app") && !PORTAL_ALLOWED_PATHS.has(pathname)) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = PORTAL_HOME_PATH;
    return NextResponse.redirect(nextUrl);
  }

  // Smart gateway for /app.
  if (pathname === "/app") {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = hasProfile ? homePath : ONBOARDING_PATH;
    if (!hasProfile) nextUrl.searchParams.set("redirectTo", homePath);
    return NextResponse.redirect(nextUrl);
  }

  // Require onboarding profile before entering the product.
  if (!hasProfile && pathname !== ONBOARDING_PATH) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = ONBOARDING_PATH;
    nextUrl.searchParams.set("redirectTo", desiredAfterAuth);
    return NextResponse.redirect(nextUrl);
  }

  // Prevent re-entering onboarding once completed.
  if (hasProfile && pathname === ONBOARDING_PATH) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = homePath;
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

