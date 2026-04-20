"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "done">("idle");
  const [ready, setReady] = React.useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setReady(false);
    const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
    setReady(true);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStatus("done");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 600);
  }

  return (
    <Card className="border-white/10 bg-slate-950/60 text-white shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-[-0.02em] text-white">Choose a new password</CardTitle>
        <p className="text-sm leading-7 text-slate-300">
          This completes the password reset flow.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        {status === "done" ? (
          <div className="grid gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
              Password updated. Redirecting to sign in…
            </div>
            <Link href="/login" className="text-sm font-semibold text-blue-200 transition-colors hover:text-white">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                {...form.register("password")}
              />
              {form.formState.errors.password?.message ? (
                <div className="text-xs text-destructive">{form.formState.errors.password.message}</div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword?.message ? (
                <div className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</div>
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
              {ready ? "Update password" : "Updating..."}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

