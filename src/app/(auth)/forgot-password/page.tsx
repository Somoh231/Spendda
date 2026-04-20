"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [status, setStatus] = React.useState<"idle" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError(
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth.",
      );
      return;
    }

    setReady(false);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      values.email,
      {
        redirectTo:
          typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`,
      },
    );
    setReady(true);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <Card className="border-white/10 bg-slate-950/60 text-white shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-[-0.02em] text-white">
          Reset password
        </CardTitle>
        <p className="text-sm leading-7 text-slate-300">
          We’ll email a reset link if the account exists.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        {status === "sent" ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
              If an account exists for that email, you’ll receive a reset link
              shortly.
            </div>
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-200 transition-colors hover:text-white"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@org.gov"
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
              {ready ? "Send reset link" : "Sending..."}
            </Button>

            <div className="text-xs text-muted-foreground">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-200 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              .
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

