export type Rng = {
  next: () => number; // [0, 1)
  int: (minInclusive: number, maxInclusive: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  bool: (p?: number) => boolean;
  normal: (mean: number, stdDev: number) => number;
};

// Deterministic PRNG (mulberry32).
export function createRng(seed: number): Rng {
  let t = seed >>> 0;
  const next = () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  const int = (minInclusive: number, maxInclusive: number) => {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T,>(arr: readonly T[]) => arr[int(0, arr.length - 1)];

  const bool = (p = 0.5) => next() < p;

  // Box–Muller transform.
  const normal = (mean: number, stdDev: number) => {
    let u = 0;
    let v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stdDev;
  };

  return { next, int, pick, bool, normal };
}

