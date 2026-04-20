import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-ds-xs",
        "text-foreground transition-[border-color,box-shadow,background-color] duration-ds ease-ds-out outline-none",
        "placeholder:text-muted-foreground/80",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25 dark:bg-input/25 dark:aria-invalid:ring-destructive/35",
        "dark:hover:border-input dark:focus-visible:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
