"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ReportsSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading reports">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 max-w-full" />
        <Skeleton className="h-4 max-w-xl" />
      </div>
      <Card className="border-border/40">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

const ReportsContent = dynamic(() => import("./reports-content"), {
  loading: () => <ReportsSkeleton />,
});

export default function ReportsPage() {
  return <ReportsContent />;
}
