import * as React from "react";
import { cn } from "../lib/cn";

/**
 * EmptyState — the centered "nothing here yet / not connected" block for empty
 * regions, unconnected data sources, or zero-result panels. `sm` for inline
 * card tiles, `md` for a full content region.
 */
export interface EmptyStateProps {
  /** A muted glyph, shown in a soft recessed circle. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons/links under the copy. */
  actions?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({ icon, title, description, actions, size = "md", className }: EmptyStateProps) {
  const sm = size === "sm";
  return (
    <div className={cn("flex flex-col items-center text-center", sm ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-12", className)}>
      {icon && (
        <span className={cn("mb-1 grid shrink-0 place-items-center rounded-full bg-muted text-muted-foreground", sm ? "size-8" : "size-10")}>
          {icon}
        </span>
      )}
      <p className={cn("font-medium text-foreground text-balance", sm ? "text-body" : "text-sm")}>{title}</p>
      {description && (
        <p className={cn("max-w-sm text-muted-foreground text-pretty", sm ? "text-caption" : "text-body")}>{description}</p>
      )}
      {actions && <div className={cn("flex items-center gap-2", sm ? "mt-1.5" : "mt-3")}>{actions}</div>}
    </div>
  );
}
