"use client";

import * as React from "react";
import { MobileSheet } from "../mobile-command";
import { MobileButton } from "./button";
import { useIsomorphicLayoutEffect } from "./shared";

export interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names what is filtered: "Filter projects". */
  title: React.ReactNode;
  /** One `MobileOptionList` per filter, each with its own `heading`. Choices apply as they are tapped: there is no Apply step. */
  children: React.ReactNode;
  /** Adds Reset to the top of the body. The app clears its filters; the sheet stays open. Leave it out for a sheet with nothing to reset. */
  onReset?: () => void;
  /** Whether Reset is shown. Pass it: true only while a filter is on, so Reset is not offered when there is nothing to reset. The default
   *  is true, which keeps a sheet that omits it working. Its row is held while it is hidden, so the lists do not move when it comes back. */
  resetVisible?: boolean;
  /** Default "Reset". */
  resetLabel?: string;
  /** The footer button: what the list will show right now, "Show 12 projects". */
  showLabel: React.ReactNode;
  /** Called when the footer button is tapped. The sheet closes itself afterwards (`onOpenChange(false)`). */
  onShow?: () => void;
  /** Dims the footer button, for a filter that matches nothing and should not be shown. */
  showDisabled?: boolean;
  /** The footer button is busy (a count being fetched): it keeps its label and width, shows a spinner and tells screen readers (`MobileButton`'s `pending`). */
  showPending?: boolean;
  /** Accessible name of the close control. Default "Close". */
  closeLabel?: string;
}

/**
 * The filter sheet of docs/mobile.md rule 7, assembled: a `MobileSheet` titled with what it filters, an optional Reset at the top
 * of the body, the option lists, and one primary `MobileButton` in the footer that says what the list will show ("Show 12 projects").
 * The sheet holds no filter state: the app's lists change as rows are tapped and the label follows.
 */
export function MobileFilterSheet({ open, onOpenChange, title, children, onReset, resetVisible = true, resetLabel = "Reset", showLabel, onShow, showDisabled, showPending, closeLabel }: MobileFilterSheetProps) {
  const reset = React.useRef<HTMLButtonElement>(null);
  const show = React.useRef<HTMLButtonElement>(null);
  // Set when Reset was tapped while it had focus; the handoff happens after the commit that hides it.
  const handoff = React.useRef(false);
  const [, tick] = React.useReducer((count: number) => count + 1, 0);
  // Reset hides itself once the filters are clear, and a keyboard or screen-reader user who was on it would be dropped to the page.
  // Focus goes to the footer button, which now says what the list shows, or, when that is disabled, to the sheet's close control.
  // It has to wait for the commit: the app's state change and Reset's unmounting only happen after the click handler returns.
  useIsomorphicLayoutEffect(() => {
    if (!handoff.current) return;
    handoff.current = false;
    if (reset.current?.isConnected) return;
    const footer = show.current;
    const target = footer && !footer.disabled ? footer : footer?.closest(".curv-mobile-sheet")?.querySelector<HTMLElement>(".curv-mobile-sheet-heading button");
    target?.focus();
  });
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={closeLabel}
      footer={
        <MobileButton ref={show} block disabled={showDisabled} pending={showPending} onClick={() => { onShow?.(); onOpenChange(false); }}>{showLabel}</MobileButton>
      }
    >
      {onReset && (
        // The row is always there, so the lists do not jump when Reset appears. A hidden Reset is not rendered at all: it is neither tabbable nor read.
        <div className="curv-mobile-filter-reset">
          {resetVisible && (
            <MobileButton
              ref={reset}
              variant="plain"
              onClick={() => {
                handoff.current = document.activeElement === reset.current;
                onReset();
                // A render of our own, so the handoff is looked at after the commit even when the app's state change is not ours.
                tick();
              }}
            >
              {resetLabel}
            </MobileButton>
          )}
        </div>
      )}
      {children}
    </MobileSheet>
  );
}
