"use client";

/**
 * Decorative mini trend bars derived from a delta % (no chart lib).
 */
export function MiniSparkline({ trendPct }: { trendPct: number }) {
  const base = [38, 48, 44, 52, 49, 58, 55, 62];
  const skew = trendPct * 0.85;
  const pts = base.map((v, i) => {
    const t = i / Math.max(1, base.length - 1);
    return Math.min(100, Math.max(10, v + skew * t));
  });
  const max = Math.max(...pts);
  return (
    <div className="flex h-11 items-end justify-between gap-0.5 px-0.5 opacity-90">
      {pts.map((p, i) => (
        <div
          key={i}
          className="w-[3px] max-w-[6%] flex-1 rounded-sm bg-gradient-to-t from-[hsl(var(--primary))]/25 via-[hsl(var(--primary))]/75 to-[hsl(var(--accent))]/90"
          style={{ height: `${Math.max(14, (p / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}
