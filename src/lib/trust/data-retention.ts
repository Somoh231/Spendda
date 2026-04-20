/** Browser-local retention preference per tenant (pilot). Production: sync to tenant policy in Postgres. */

export const DATA_RETENTION_PRESETS = ["30", "90", "180", "365", "forever"] as const;
export type DataRetentionPreset = (typeof DATA_RETENTION_PRESETS)[number];

const LS_PREFIX = "spendda_data_retention_v1:";

export function dataRetentionStorageKey(clientId: string | null | undefined) {
  const id = clientId?.trim();
  return id ? `${LS_PREFIX}${id}` : `${LS_PREFIX}default`;
}

export function isDataRetentionPreset(v: string): v is DataRetentionPreset {
  return (DATA_RETENTION_PRESETS as readonly string[]).includes(v);
}

export function readDataRetentionLocal(clientId: string | null | undefined): DataRetentionPreset {
  if (typeof window === "undefined") return "90";
  try {
    const raw = window.localStorage.getItem(dataRetentionStorageKey(clientId));
    if (raw && isDataRetentionPreset(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "90";
}

export function writeDataRetentionLocal(clientId: string | null | undefined, preset: DataRetentionPreset) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dataRetentionStorageKey(clientId), preset);
  } catch {
    /* ignore */
  }
}

export function retentionLabel(preset: DataRetentionPreset): string {
  switch (preset) {
    case "30":
      return "30 days";
    case "90":
      return "90 days";
    case "180":
      return "180 days";
    case "365":
      return "1 year";
    case "forever":
      return "Until manually deleted";
    default:
      return preset;
  }
}
