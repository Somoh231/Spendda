import * as React from "react";
import { Suspense } from "react";

import { OnboardingWizard } from "./wizard";

function OnboardingFallback() {
  return (
    <div
      className="mx-auto grid w-full max-w-5xl gap-6"
      role="status"
      aria-live="polite"
      aria-label="Loading onboarding"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 w-full max-w-md animate-pulse rounded-lg bg-white/5" />
        </div>
        <div className="h-7 w-28 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-[1.25rem] border border-white/10 bg-white/[0.04]" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingWizard />
    </Suspense>
  );
}

