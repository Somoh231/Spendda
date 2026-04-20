import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ProductEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

/** Consistent empty / zero-data surface — use inside existing cards, not as a full-page takeover. */
export function ProductEmptyState({ icon: Icon, title, description, action, className }: ProductEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-dashed border-border/70 bg-gradient-to-br from-muted/25 via-muted/10 to-transparent px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300 motion-safe:ease-out",
        "hover:border-border motion-safe:hover:shadow-ds-sm",
        className,
      )}
    >
      <div className="flex min-w-0 gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/90 shadow-ds-xs">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-foreground">{title}</div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{action}</div> : null}
    </div>
  );
}
