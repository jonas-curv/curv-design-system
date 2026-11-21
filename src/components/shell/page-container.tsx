import * as React from "react";
import { cn } from "../../lib/cn";

const MAX_WIDTH = {
  narrow: "max-w-[720px]",   // settings, forms, prose
  default: "max-w-[1280px]", // most pages: dashboards, mixed content
  wide: "max-w-[1600px]",    // dense dashboards
} as const;

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max-width preset for the centered (level-2) container: 1280, 720 or 1600. Ignored when `bleed`. */
  size?: keyof typeof MAX_WIDTH;
  /** Full-width (level 1): edge-to-edge content like a wide table or board. */
  bleed?: boolean;
}

/**
 * The content container, on every page. Two levels, per design-system.md → Page container:
 *   • default → centered, capped width (level 2): 1280, or `narrow` 720 / `wide` 1600.
 *   • bleed   → full width (level 1): wide tables / boards.
 * One frame either way: sides 24 (16 on a phone), top and bottom 28 (20 on a phone).
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
        "px-4 py-5 sm:px-6 sm:py-7",
        bleed ? "w-full" : cn("mx-auto w-full", MAX_WIDTH[size]),
        className,
      )}
      {...props}
    />
  );
}
