import type { DemoDataset } from "@/lib/demo-data/types";
import { clamp, mean, std } from "./utils";

export type MlForecast = {
  method: "ridge-lite";
  horizonMonths: number;
  points: Array<{ month: string; projected: number; lower: number; upper: number; confidencePct: number }>;
  explain: string[];
};

function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return date.toLocaleString(undefined, { month: "short" });
}

function monthKey(date: Date) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

function addMonthsUTC(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

/**
 * Very lightweight trend model: linear regression with mild ridge shrinkage
 * on a rolling 12-month window. Confidence comes from residual variance.
 */
export function buildMlForecast(dataset: DemoDataset, horizonMonths = 6): MlForecast {
  const spendByMonth = new Map<string, number>();
  dataset.transactions.forEach((t) => {
    const key = t.date.slice(0, 7);
    spendByMonth.set(key, (spendByMonth.get(key) || 0) + t.amount);
  });
  const keys = [...spendByMonth.keys()].sort();
  const series = keys.map((k) => spendByMonth.get(k) || 0);
  const window = series.slice(-12);
  const n = window.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const y = window;

  const xBar = mean(xs);
  const yBar = mean(y);
  const sxx = xs.reduce((acc, x) => acc + (x - xBar) * (x - xBar), 0);
  const sxy = xs.reduce((acc, x, i) => acc + (x - xBar) * (y[i] - yBar), 0);

  const ridge = 2.5; // shrink slope slightly for demo stability
  const slope = sxx > 0 ? sxy / (sxx + ridge) : 0;
  const intercept = yBar - slope * xBar;

  const residuals = y.map((yy, i) => yy - (intercept + slope * xs[i]));
  const sigma = std(residuals) || Math.max(1, yBar * 0.06);

  const now = new Date();
  const baseMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const points = Array.from({ length: horizonMonths }).map((_, i) => {
    const x = n + i;
    const proj = intercept + slope * x;
    // widen bands modestly with horizon
    const band = sigma * (1 + i * 0.12);
    const conf = Math.round(clamp(92 - (band / Math.max(1, yBar)) * 260, 35, 95));
    const m = addMonthsUTC(baseMonth, i + 1);
    return {
      month: monthLabelFromKey(monthKey(m)),
      projected: Math.round(proj),
      lower: Math.round(proj - band),
      upper: Math.round(proj + band),
      confidencePct: conf,
    };
  });

  return {
    method: "ridge-lite",
    horizonMonths,
    points,
    explain: [
      "Trend model: linear regression over trailing 12 months with mild ridge shrinkage to reduce overfitting.",
      "Confidence: derived from residual variance (wider uncertainty = lower confidence).",
      "This is an assistive projection—use to prioritize review, not to auto-approve decisions.",
    ],
  };
}

