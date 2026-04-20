"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AcceptInviteClient() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [ready, setReady] = React.useState(true);
  const [done, setDone] = React.useState(false);

  async function accept() {
    setReady(false);
    try {
      const res = await fetch("/api/tenants/accept-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; tenant?: { name?: string } };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setDone(true);
      toast.success("Invite accepted", { description: `Joined ${json.tenant?.name || "workspace"}.` });
    } catch (e) {
      toast.error("Could not accept invite", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setReady(true);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Accept workspace invite</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!token ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            Missing invite token.
          </div>
        ) : done ? (
          <div className="grid gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm">
              Invite accepted. You can now select the workspace.
            </div>
            <Link href="/app/select-tenant" className="text-sm font-semibold text-primary hover:underline">
              Go to workspace selector
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground">
              You must be signed in with the invited email address. If you aren’t signed in yet,{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                sign in
              </Link>{" "}
              first.
            </div>
            <Button className="rounded-xl" onClick={accept} disabled={!ready}>
              {ready ? "Accept invite" : "Accepting…"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

