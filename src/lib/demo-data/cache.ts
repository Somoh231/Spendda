import type { DemoDataset } from "./types";
import { generateDemoDataset, type GenerateOptions } from "./generate";

declare global {
  var __spenddaDemoDataset: DemoDataset | undefined;
  var __spenddaDemoDatasetKey: string | undefined;
}

function cacheKey(options?: GenerateOptions): string {
  const o = {
    seed: options?.seed ?? 1337,
    months: options?.months ?? 24,
    transactions: options?.transactions ?? 100_000,
    employees: options?.employees ?? 10_000,
    vendors: options?.vendors ?? 200,
    currency: options?.currency ?? "USD",
    organizationName: options?.organizationName ?? "",
    sector: options?.sector ?? "Government",
    demoPackId: options?.demoPackId ?? "",
    tenantKey: options?.tenantKey ?? "",
  };
  return JSON.stringify(o);
}

export function getDemoDataset(options?: GenerateOptions): DemoDataset {
  const key = cacheKey(options);
  if (!globalThis.__spenddaDemoDataset || globalThis.__spenddaDemoDatasetKey !== key) {
    globalThis.__spenddaDemoDatasetKey = key;
    globalThis.__spenddaDemoDataset = generateDemoDataset({
      months: 24,
      transactions: 100_000,
      employees: 10_000,
      vendors: 200,
      currency: "USD",
      ...options,
    });
  }
  return globalThis.__spenddaDemoDataset;
}

export function resetDemoDataset() {
  globalThis.__spenddaDemoDataset = undefined;
  globalThis.__spenddaDemoDatasetKey = undefined;
}

