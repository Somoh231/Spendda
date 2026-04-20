"use client";

import * as React from "react";

/**
 * Ease-out cubic: quick start, smooth landing — readable for KPIs.
 */
function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Animates from 0 → target when `target` changes (e.g. data load). */
export function useAnimatedNumber(target: number | null | undefined, durationMs = 720) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (target == null || !Number.isFinite(target)) {
      setValue(0);
      return;
    }
    setValue(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return target == null || !Number.isFinite(target) ? null : value;
}
