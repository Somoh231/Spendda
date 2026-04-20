import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  className?: string
  children?: ReactNode
}

/**
 * Consistent empty / zero-data surface for tables, lists, and panels.
 */
function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-14 text-center shadow-ds-xs",
        "dark:border-border/50 dark:bg-muted/10",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground shadow-ds-sm",
          "dark:bg-card/60",
        )}
      >
        <Icon className="h-6 w-6 opacity-80" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-heading text-title-md text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </div>
  )
}

export { EmptyState, type EmptyStateProps }
