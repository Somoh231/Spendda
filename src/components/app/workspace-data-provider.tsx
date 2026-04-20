"use client";

import * as React from "react";

import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { WORKSPACE_DATA_CHANGED } from "@/lib/workspace/workspace-events";
import { useClientSession } from "@/hooks/use-client-session";
import { useProfile } from "@/lib/profile/client";
import { getWorkspaceDatasets, type WorkspaceDataset } from "@/lib/upload/dataset-store";
import { getUploadedInsights, type UploadedInsights } from "@/lib/upload/storage";

export type WorkspaceDataSource = "upload" | "demo" | "none";

export type WorkspaceDataSnapshot = {
  /** Post-hydration: client session resolved and scope hydrated from storage. */
  ready: boolean;
  clientId: string | null;
  primaryEntity: string;
  datasets: WorkspaceDataset[];
  uploads: UploadedInsights[];
  spendForEntity: WorkspaceDataset | null;
  payrollForEntity: WorkspaceDataset | null;
  dataSource: WorkspaceDataSource;
  /** Human-readable active file(s) for the scoped entity. */
  activeDatasetLabel: string | null;
  revision: number;
};

const WorkspaceDataContext = React.createContext<WorkspaceDataSnapshot | null>(null);

function summarizeActiveFiles(spend: WorkspaceDataset | null, payroll: WorkspaceDataset | null) {
  const names: string[] = [];
  if (spend?.kind === "spend") names.push(spend.filename);
  if (payroll?.kind === "payroll") names.push(payroll.filename);
  return names.length ? names.join(" · ") : null;
}

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {
  const { client, mounted } = useClientSession();
  const clientId = client?.clientId ?? null;
  const { profile } = useProfile();
  const { scope, hydrated: scopeHydrated } = useAnalyticsScope();

  const [datasets, setDatasets] = React.useState<WorkspaceDataset[]>([]);
  const [uploads, setUploads] = React.useState<UploadedInsights[]>([]);
  const [revision, setRevision] = React.useState(0);

  const reload = React.useCallback(() => {
    setDatasets(getWorkspaceDatasets(clientId));
    setUploads(getUploadedInsights(clientId));
    setRevision((r) => r + 1);
  }, [clientId]);

  React.useEffect(() => {
    if (!mounted) return;
    reload();
    const on = () => reload();
    window.addEventListener(WORKSPACE_DATA_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(WORKSPACE_DATA_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, [mounted, reload]);

  const primaryEntity =
    (scope.entities[0] && scope.entities[0].trim()) || profile?.activeEntity?.trim() || "HQ";

  const spendForEntity =
    datasets.find((d) => d.kind === "spend" && d.entity === primaryEntity && d.rows?.length) || null;
  const payrollForEntity =
    datasets.find((d) => d.kind === "payroll" && d.entity === primaryEntity && d.rows?.length) || null;

  const hasUploadRows = Boolean(
    (spendForEntity?.kind === "spend" && spendForEntity.rows.length) ||
      (payrollForEntity?.kind === "payroll" && payrollForEntity.rows.length),
  );

  const dataSource: WorkspaceDataSource = hasUploadRows
    ? "upload"
    : profile?.dataMode === "demo"
      ? "demo"
      : "none";

  const activeDatasetLabel = summarizeActiveFiles(spendForEntity, payrollForEntity);

  const ready = mounted && scopeHydrated;

  const value = React.useMemo<WorkspaceDataSnapshot>(
    () => ({
      ready,
      clientId,
      primaryEntity,
      datasets,
      uploads,
      spendForEntity,
      payrollForEntity,
      dataSource,
      activeDatasetLabel,
      revision,
    }),
    [
      ready,
      clientId,
      primaryEntity,
      datasets,
      uploads,
      spendForEntity,
      payrollForEntity,
      dataSource,
      activeDatasetLabel,
      revision,
    ],
  );

  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

export function useWorkspaceData(): WorkspaceDataSnapshot {
  const ctx = React.useContext(WorkspaceDataContext);
  if (!ctx) {
    throw new Error("useWorkspaceData must be used within WorkspaceDataProvider");
  }
  return ctx;
}

/** Safe optional hook for routes outside the app shell (should not happen in /app). */
export function useWorkspaceDataOptional(): WorkspaceDataSnapshot | null {
  return React.useContext(WorkspaceDataContext);
}
