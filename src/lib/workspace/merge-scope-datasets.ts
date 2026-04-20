import type { PayrollRow, SpendTxn, WorkspaceDataset } from "@/lib/upload/dataset-store";
import { resolveBenchmarkEntityList } from "@/lib/workspace/upload-benchmark-summary";

export type MergedScopeWorkspaceDatasets = {
  resolvedEntities: string[];
  /** Label for UI and assistant copy (matches analytics / Benchmarks scope). */
  scopeLabel: string;
  spend: WorkspaceDataset | null;
  payroll: WorkspaceDataset | null;
};

function reindexSpend(rows: SpendTxn[]): SpendTxn[] {
  return rows.map((r, i) => ({ ...r, idx: i }));
}

function reindexPayroll(rows: PayrollRow[]): PayrollRow[] {
  return rows.map((r, i) => ({ ...r, idx: i }));
}

/**
 * Merge workspace spend/payroll files across the same entity list as Benchmarks upload mode
 * (`resolveBenchmarkEntityList`), so AI answers match scoped charts.
 */
export function mergeWorkspaceDatasetsForAnalyticsScope(opts: {
  datasets: WorkspaceDataset[];
  scopeEntities: string[];
  profileEntities: string[] | undefined;
  primaryEntity: string;
}): MergedScopeWorkspaceDatasets {
  const resolvedEntities = resolveBenchmarkEntityList({
    scopeEntities: opts.scopeEntities,
    profileEntities: opts.profileEntities,
    primaryEntity: opts.primaryEntity,
    datasets: opts.datasets,
  });
  const want = new Set(resolvedEntities);
  const pe = opts.primaryEntity.trim() || "HQ";

  const spendRows: SpendTxn[] = [];
  const payrollRows: PayrollRow[] = [];
  const spendFilenames = new Set<string>();
  const payrollFilenames = new Set<string>();

  for (const d of opts.datasets) {
    if (!want.has(d.entity)) continue;
    if (d.kind === "spend" && d.rows?.length) {
      spendRows.push(...(d.rows as SpendTxn[]));
      spendFilenames.add(d.filename);
    }
    if (d.kind === "payroll" && d.rows?.length) {
      payrollRows.push(...(d.rows as PayrollRow[]));
      payrollFilenames.add(d.filename);
    }
  }

  const uploadedAt = new Date().toISOString();

  const scopeLabel =
    resolvedEntities.length <= 1
      ? resolvedEntities[0] || pe
      : `${resolvedEntities.length} entities: ${resolvedEntities.slice(0, 4).join(" · ")}${resolvedEntities.length > 4 ? " …" : ""}`;

  let spend: WorkspaceDataset | null = null;
  if (spendRows.length) {
    spend = {
      kind: "spend",
      filename:
        resolvedEntities.length > 1
          ? `Merged spend (${resolvedEntities.length} entities)`
          : [...spendFilenames][0] || "Spend",
      uploadedAt,
      entity: pe,
      rows: reindexSpend(spendRows),
    };
  }

  let payroll: WorkspaceDataset | null = null;
  if (payrollRows.length) {
    payroll = {
      kind: "payroll",
      filename:
        resolvedEntities.length > 1
          ? `Merged payroll (${resolvedEntities.length} entities)`
          : [...payrollFilenames][0] || "Payroll",
      uploadedAt,
      entity: pe,
      rows: reindexPayroll(payrollRows),
    };
  }

  return { resolvedEntities, scopeLabel, spend, payroll };
}
