/** Fired after workspace datasets or upload insights change (localStorage). */
export const WORKSPACE_DATA_CHANGED = "spendda:workspace-data";

export function emitWorkspaceDataChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_DATA_CHANGED));
}
