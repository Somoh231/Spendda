"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

const MAIN_ID = "app-main";

function isAiWorkspacePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/app/ai-workspace" || pathname.startsWith("/app/ai-workspace/");
}

/**
 * AI Workspace must scroll only its message pane — not `main`, not `html/body`.
 * Tailwind's `overflow-y-auto` on `main` wins over ordinary CSS rules; we set inline
 * `overflow: hidden !important` while on this route. Document scroll is disabled so wheel
 * / trackpad cannot move the page and hide the composer.
 */
export function AppMainScrollLock() {
  const pathname = usePathname();

  React.useLayoutEffect(() => {
    const main = document.getElementById(MAIN_ID);
    const lock = isAiWorkspacePath(pathname);

    if (!main) return;

    if (lock) {
      main.style.setProperty("overflow", "hidden", "important");
      document.documentElement.style.setProperty("overflow", "hidden", "important");
      document.documentElement.style.setProperty("overscroll-behavior", "none", "important");
      document.body.style.setProperty("overflow", "hidden", "important");
      document.body.style.setProperty("overscroll-behavior", "none", "important");
    } else {
      main.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overscroll-behavior");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("overscroll-behavior");
    }

    return () => {
      if (!lock) return;
      main.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overscroll-behavior");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("overscroll-behavior");
    };
  }, [pathname]);

  return null;
}
