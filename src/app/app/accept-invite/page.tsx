import { Suspense } from "react";
import { AcceptInviteClient } from "./accept-invite-client";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <AcceptInviteClient />
    </Suspense>
  );
}

