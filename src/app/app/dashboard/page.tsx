"use client";

import dynamic from "next/dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="min-w-0 border-border/40">
            <CardContent className="space-y-3 p-4 pt-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const DashboardContent = dynamic(() => import("./dashboard-content"), {
  loading: () => <DashboardSkeleton />,
});

export default function DashboardPage() {
  return <DashboardContent />;
}
