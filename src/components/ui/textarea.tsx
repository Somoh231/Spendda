import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-[4.5rem] w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm shadow-ds-xs",
        "text-foreground transition-[border-color,box-shadow,background-color] duration-ds ease-ds-out outline-none",
        "placeholder:text-muted-foreground/80",
        "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25 dark:bg-input/25 dark:aria-invalid:ring-destructive/35",
        "dark:focus-visible:bg-input/30",
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

export { Textarea }
