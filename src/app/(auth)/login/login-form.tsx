"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo");
  const redirectTo = safePostAuthPath(rawRedirectTo, "/app");

  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(true);
  const [masterDemoReady, setMasterDemoReady] = React.useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      // Temporary local auth (demo credentials) for fast platform access.
      setReady(false);
      try {
        const res = await fetch("/api/auth/local-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
        // Ensure Set-Cookie (spendda_demo) is committed before entering /app.
        window.location.href = redirectTo;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Login failed");
      } finally {
        setReady(true);
      }
      return;
    }

    setReady(false);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setReady(true);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    // Avoid client-side race with session cookie refresh.
    window.location.href = redirectTo;
  }

  async function masterDemoLogin() {
    setError(null);
    setMasterDemoReady(false);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "demo@spendda.com", password: "Demo123!" }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      // Seed sample uploads instantly on first app load.
      window.localStorage.setItem("spendda_seed_demo_v1", "1");
      window.location.href = redirectTo;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start demo session");
    } finally {
      setMasterDemoReady(true);
    }
  }

  async function enterDemoPlatform() {
    setError(null);
    // Seed sample uploads instantly on first app load.
    window.localStorage.setItem("spendda_seed_demo_v1", "1");
    window.location.href = `/api/auth/demo-login?redirectTo=${encodeURIComponent("/app")}`;
  }

  return (
    <Card className="border-white/10 bg-slate-950/60 text-white shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-[-0.02em] text-white">Your business finances, finally clear.</CardTitle>
        <p className="text-sm leading-7 text-slate-300">
          Spendda connects the dots between what you spend, what you pay your team, and what's actually happening in your
          business.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@business.com"
              autoComplete="email"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              {...form.register("email")}
            />
            {form.formState.errors.email?.message ? (
              <div className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-blue-200 transition-colors hover:text-white"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              {...form.register("password")}
            />
            {form.formState.errors.password?.message ? (
              <div className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={!ready}
            className="h-11 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-[0_18px_60px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-0.5 hover:from-blue-400 hover:to-blue-300"
          >
            {ready ? "Sign in" : "Signing in…"}
          </Button>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">TRY SPENDDA INSTANTLY</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Both options use a sandbox workspace. The green button seeds sample data so you can explore the full product
              immediately — no file upload needed.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={masterDemoLogin}
            disabled={!masterDemoReady}
            className="h-11 rounded-full border-white/15 bg-white/5 text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10"
          >
            {masterDemoReady ? "Demo Login" : "Starting demo…"}
          </Button>

          <Button
            type="button"
            onClick={enterDemoPlatform}
            className="h-11 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-[0_18px_60px_rgba(16,185,129,0.35)] transition-all hover:-translate-y-0.5 hover:from-emerald-400 hover:to-emerald-300"
          >
            Full demo with sample uploads
          </Button>

          <div className="text-xs text-muted-foreground">
            No account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-blue-200 transition-colors hover:text-white"
            >
              Create one
            </Link>
            .
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

