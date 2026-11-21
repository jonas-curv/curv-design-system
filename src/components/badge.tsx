import * as React from "react";
import { cn } from "../lib/cn";

/**
 * The status/label pill. Soft-tint (not filled) verdict variants + a neutral,
 * matching design-system.md. One badge for statuses, tags, and counts.
 */
type BadgeVariant = "neutral" | "green" | "amber" | "red" | "outline";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  green: "bg-verdict-green-soft text-verdict-green",
  amber: "bg-verdict-amber-soft text-verdict-amber",
  red: "bg-verdict-red-soft text-verdict-red",
  outline: "border border-border text-muted-foreground",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2 text-caption font-medium",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
