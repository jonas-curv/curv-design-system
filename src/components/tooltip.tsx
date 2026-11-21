"use client";

import * as React from "react";
import { Tooltip as T } from "@base-ui/react/tooltip";
import { cn } from "../lib/cn";

/**
 * Tooltip — a small inverted chip anchored to its trigger (base-ui). Wrap a
 * region in <TooltipProvider> so that once one tooltip is open, scanning to an
 * adjacent trigger opens instantly (no re-delay) — the motion-system rule.
 *
 * <Tooltip content="Copy link"><IconButton …/></Tooltip>
 */
/**
 * Our delay default, resolvable from anywhere: explicit prop > provider > 300ms.
 * base-ui implements the delay as a REST timer — the cursor must hold still for
 * the full delay (movement restarts it) — so keep it short; 600ms (base-ui's
 * default) reads as "broken" to a moving cursor. 300ms is the Linear-fast feel.
 */
const DEFAULT_DELAY = 300;
const DelayContext = React.createContext<number | undefined>(undefined);

export function TooltipProvider({
  children,
  delay = DEFAULT_DELAY,
  closeDelay = 0,
}: {
  children: React.ReactNode;
  /** Hover delay before the first tooltip in the group opens (ms). */
  delay?: number;
  closeDelay?: number;
}) {
  return (
    <DelayContext.Provider value={delay}>
      <T.Provider delay={delay} closeDelay={closeDelay}>
        {children}
      </T.Provider>
    </DelayContext.Provider>
  );
}

export interface TooltipProps {
  /** The tooltip text/content. Omit to render the trigger with no tooltip. */
  content?: React.ReactNode;
  /** The trigger — a single focusable element. */
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  /** Per-tooltip hover delay override (ms). */
  delay?: number;
}

export function Tooltip({ content, children, side = "top", sideOffset = 6, delay }: TooltipProps) {
  const providerDelay = React.useContext(DelayContext);
  if (content == null || content === "") return children;
  return (
    <T.Root>
      <T.Trigger delay={delay ?? providerDelay ?? DEFAULT_DELAY} render={children} />
      <T.Portal>
        <T.Positioner side={side} sideOffset={sideOffset} className="z-50">
          <T.Popup
            className={cn(
              "origin-[var(--transform-origin)] rounded-md bg-foreground px-2 py-1 text-caption font-medium text-background shadow-card",
              // Motion: 125–200ms, ease-out, origin-aware; reduced-motion keeps
              // the fade but drops the scale (motion-safe gate).
              "transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-100",
              "motion-safe:data-[starting-style]:scale-95 motion-safe:data-[ending-style]:scale-95",
            )}
          >
            {content}
          </T.Popup>
        </T.Positioner>
      </T.Portal>
    </T.Root>
  );
}
