/** Client-side diagnostics: silent in production builds for a clean console. */
export function devError(...args: unknown[]) {
  if (process.env.NODE_ENV === "development") {
    console.error(...args);
  }
}
