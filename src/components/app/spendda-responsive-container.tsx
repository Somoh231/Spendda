"use client";

import * as React from "react";
import { ResponsiveContainer, type ResponsiveContainerProps } from "recharts";

/**
 * Recharts warns (and can mis-measure) when the container is 0×0 during SSR / static
 * generation. We seed dimensions until ResizeObserver runs — no visual change in browser.
 */
function defaultInitialDimension(props: ResponsiveContainerProps): { width: number; height: number } {
  if (props.initialDimension) return props.initialDimension;
  if (typeof props.height === "number" && props.height > 0) {
    return { width: 720, height: props.height };
  }
  return { width: 720, height: 360 };
}

export function SpenddaResponsiveContainer(props: ResponsiveContainerProps) {
  const initialDimension = defaultInitialDimension(props);
  return <ResponsiveContainer {...props} initialDimension={initialDimension} />;
}
