"use client";

import * as React from "react";
import { Dialog as D } from "@base-ui/react/dialog";
import { cn } from "../lib/cn";
import { Button } from "./button";

/**
 * Modal dialog (base-ui) — a centered `rounded-xl` surface over a themed scrim
 * (`bg-overlay`). Focus is trapped while open and restored to the trigger on
 * close. Unlike a popover, a modal is NOT origin-aware — it scales from center.
 *
 * <Dialog
 *   trigger={<Button variant="destructive">Delete</Button>}
 *   title="Delete deal?"
 *   description="This can't be undone."
 *   footer={<><DialogClose>Cancel</DialogClose><Button variant="destructive" onClick={remove}>Delete</Button></>}
 * />
 *
 * For a destructive confirm, see the accessibility rule: irreversible actions
 * always route through a dialog, never a bare one-click button.
 */
export interface DialogProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional trigger for the uncontrolled case. */
  trigger?: React.ReactElement;
  /** Body content below the header. */
  children?: React.ReactNode;
  /** Footer actions — right-aligned. */
  footer?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({
  title,
  description,
  trigger,
  children,
  footer,
  open,
  defaultOpen,
  onOpenChange,
}: DialogProps) {
  return (
    <D.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <D.Trigger render={trigger} /> : null}
      <D.Portal>
        <D.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-overlay",
            "transition-opacity duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-150",
          )}
        />
        <D.Popup
          className={cn(
            "fixed max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card outline-none",
            // Modals scale from center (not the trigger); exit is quicker.
            "transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-150",
            "motion-safe:data-[starting-style]:scale-95 motion-safe:data-[ending-style]:scale-95",
          )}
        >
          <D.Title className="text-[15px] font-semibold tracking-tight text-foreground text-balance">
            {title}
          </D.Title>
          {description ? (
            <D.Description className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground text-pretty">
              {description}
            </D.Description>
          ) : null}
          {children ? <div className="mt-4 text-[13px] text-foreground">{children}</div> : null}
          {footer ? <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{footer}</div> : null}
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}

/**
 * A close control for a dialog footer. Renders a secondary button by default;
 * pass `render` to close from any element (e.g. a confirm button that also runs
 * an action).
 */
export function DialogClose({
  children = "Cancel",
  render,
}: {
  children?: React.ReactNode;
  render?: React.ReactElement;
}) {
  if (render) return <D.Close render={render} />;
  return <D.Close render={<Button variant="secondary">{children}</Button>} />;
}
