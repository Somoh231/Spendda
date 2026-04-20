"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";

import { AppToaster } from "@/components/app/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="spendda-theme"
    >
      <TooltipProvider delay={240}>
        <AppToaster />
        <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">{children}</div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

