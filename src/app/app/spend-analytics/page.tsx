"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SpendAnalyticsSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading spend analytics">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 max-w-2xl" />
      </div>
      <Card className="min-w-0 border-border/40">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const SpendAnalyticsContent = dynamic(() => import("./spend-analytics-content"), {
  loading: () => <SpendAnalyticsSkeleton />,
});

export default function SpendAnalyticsPage() {
  return <SpendAnalyticsContent />;
}
