import * as React from "react";
import { cn } from "../../lib/cn";

const MAX_WIDTH = {
  narrow: "max-w-3xl",       // forms, focused reading
  default: "max-w-[1200px]", // most pages
  wide: "max-w-[1600px]",    // dense dashboards
} as const;

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max-width preset for the centered (level-2) container. Ignored when `bleed`. */
  size?: keyof typeof MAX_WIDTH;
  /** Full-width (level-1) — edge-to-edge content like a wide table. */
  bleed?: boolean;
}

/**
 * The content container. Two levels, per design-system.md → Page container:
 *   • default  → centered, capped width (level 2) — most pages.
 *   • bleed    → full width (level 1) — wide tables / boards.
 * Consistent horizontal + vertical padding either way.
 */
export function PageContainer({
  size = "default",
  bleed = false,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "px-4 py-5 sm:px-6 sm:py-8",
        bleed ? "w-full" : cn("mx-auto w-full", MAX_WIDTH[size]),
        className,
      )}
      {...props}
    />
  );
}
