"use client";

import * as React from "react";
import { Dialog as D } from "@base-ui/react/dialog";
import { cn } from "../lib/cn";

/**
 * Drawer — a side sheet that slides in from the edge (record detail, filters,
 * a peek). Built on base-ui Dialog, so it traps focus, closes on Escape/outside
 * click, and restores focus to the trigger. Uncontrolled via `trigger`, or
 * controlled via `open`/`onOpenChange`.
 */
export interface DrawerProps {
  /** Optional trigger for uncontrolled use. */
  trigger?: React.ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "right" | "left";
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Actions rendered beside Close without becoming part of the dialog title. */
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  /** Pinned footer (actions). */
  footer?: React.ReactNode;
  /** Extra classes on the panel (e.g. a wider `w-*`). */
  className?: string;
}

export function Drawer({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  side = "right",
  title,
  description,
  headerActions,
  children,
  footer,
  className,
}: DrawerProps) {
  return (
    <D.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && <D.Trigger render={trigger} />}
      <D.Portal>
        <D.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <D.Popup
          className={cn(
            "fixed inset-y-0 z-50 flex h-dvh w-[26rem] max-w-[calc(100vw-3rem)] flex-col bg-card shadow-card outline-none",
            side === "right" ? "right-0" : "left-0",
            // Slide from the anchored edge; exit a touch faster. Reduced-motion
            // keeps the fade, drops the slide.
            "transition-transform duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] data-[ending-style]:duration-200",
            side === "right"
              ? "motion-safe:data-[starting-style]:translate-x-full motion-safe:data-[ending-style]:translate-x-full"
              : "motion-safe:data-[starting-style]:-translate-x-full motion-safe:data-[ending-style]:-translate-x-full",
            className,
          )}
        >
          {(title || description || headerActions) && (
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0 flex-1">
                {title && <D.Title className="truncate text-[15px] font-semibold text-foreground">{title}</D.Title>}
                {description && <D.Description className="mt-0.5 text-[13px] text-muted-foreground">{description}</D.Description>}
              </div>
              <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-1">
                {headerActions}
                <D.Close
                  aria-label="Close"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                </D.Close>
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px] text-foreground">{children}</div>
          {footer && <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}

/** Close the drawer from inside (e.g. a Cancel button). */
export const DrawerClose = D.Close;
