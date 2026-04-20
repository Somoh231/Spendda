import type { DateRange } from "@/components/ui/date-range-picker";
import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";
import { computeUploadDashboardMetrics } from "@/lib/workspace/upload-dashboard-metrics";

export type BenchmarkSummarySource = "upload";

export type UploadBenchmarkSummary = {
  source: BenchmarkSummarySource;
  deptSpend30d: Array<{ department: string; spend: number }>;
  monthlySpend24m: Array<{ month: string; spend: number }>;
};

export function resolveBenchmarkEntityList(opts: {
  scopeEntities: string[];
  profileEntities: string[] | undefined;
  primaryEntity: string;
  datasets: WorkspaceDataset[];
}): string[] {
  const trimmed = opts.scopeEntities.map((e) => e.trim()).filter(Boolean);
  if (trimmed.length) return [...new Set(trimmed)];
  const fromDs = [...new Set(opts.datasets.map((d) => d.entity).filter(Boolean))];
  if (fromDs.length) return fromDs;
  const pe = (opts.profileEntities || []).map((e) => e.trim()).filter(Boolean);
  if (pe.length) return [...new Set(pe)];
  return [opts.primaryEntity.trim() || "HQ"];
}

/**
 * Department + monthly series for Benchmarks when the workspace is upload-backed
 * (same rollups as the dashboard upload metrics, merged across scoped entities).
 */
export function buildUploadBenchmarkSummary(opts: {
  datasets: WorkspaceDataset[];
  scopeEntities: string[];
  profileEntities: string[] | undefined;
  primaryEntity: string;
  range: DateRange;
}): UploadBenchmarkSummary | null {
  const entities = resolveBenchmarkEntityList({
    scopeEntities: opts.scopeEntities,
    profileEntities: opts.profileEntities,
    primaryEntity: opts.primaryEntity,
    datasets: opts.datasets,
  });
  const want = new Set(entities);

  const spendRows: SpendTxn[] = [];
  const payrollRows: PayrollRow[] = [];
  for (const d of opts.datasets) {
    if (!want.has(d.entity)) continue;
    if (d.kind === "spend" && d.rows?.length) spendRows.push(...(d.rows as SpendTxn[]));
    if (d.kind === "payroll" && d.rows?.length) payrollRows.push(...(d.rows as PayrollRow[]));
  }

  const metrics = computeUploadDashboardMetrics({
    entity: opts.primaryEntity,
    range: opts.range,
    spendRows: spendRows.length ? spendRows : undefined,
    payrollRows: payrollRows.length ? payrollRows : undefined,
  });
  if (!metrics) return null;

  return {
    source: "upload",
    deptSpend30d: metrics.departmentSpend30d.map((d) => ({ department: d.department, spend: d.value })),
    monthlySpend24m: metrics.monthlySpend.slice(-24).map((m) => ({ month: m.month, spend: m.value })),
  };
}
