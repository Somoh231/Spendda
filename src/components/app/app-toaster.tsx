"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      theme="system"
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            "rounded-2xl border border-border/60 bg-card/95 text-card-foreground shadow-ds-md backdrop-blur-md sm:min-w-[320px]",
          title: "font-semibold tracking-tight",
          description: "text-muted-foreground text-sm leading-snug",
          actionButton: "rounded-lg font-semibold",
          cancelButton: "rounded-lg",
        },
      }}
    />
  );
}
