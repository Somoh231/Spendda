import { Suspense } from "react";
import { SelectTenantClient } from "./select-tenant-client";

export default function SelectTenantPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <SelectTenantClient />
    </Suspense>
  );
}

