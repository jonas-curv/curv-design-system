"use client";

import * as React from "react";
import { mobileButtonClassName, type MobileButtonStyle } from "./button-class";

export { mobileButtonClassName, type MobileButtonStyle, type MobileButtonVariant } from "./button-class";

export interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, MobileButtonStyle {
  /** The action is in flight. The label keeps its width and goes quiet under a spinner, the button says it is busy
   *  (`aria-busy`), screen readers hear `pendingLabel`, and taps and Enter do nothing (`onClick` is not called and a
   *  submit does not fire), but the button stays focusable. Clear it when the result is shown. */
  pending?: boolean;
  /** What a screen reader is told when `pending` starts. Default "Working…". Pass the app's own words ("Sending…", "Arbeider…"). */
  pendingLabel?: string;
}

/**
 * The phone's button: 50px tall, 17px semibold, 14px corners, and a 44px hit area in every state. Use it for form
 * submits, sheet footers and in-page actions instead of a desktop `Button`, which is 13px with 9.6px corners.
 * `type` defaults to "button", so nothing submits a form by accident; pass `type="submit"` where it should.
 * Next to the button it renders an empty, visually hidden live region (`role="status"`): `pending` fills it, which is what makes a
 * screen reader announce that the action is under way. It is out of flow, so it takes no space in a flex or grid parent.
 */
export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(function MobileButton(
  { variant = "primary", block, pending = false, pendingLabel = "Working…", className, type = "button", onClick, children, ...props }, ref,
) {
  return (
    <>
      <button
        {...props}
        ref={ref}
        type={type}
        className={mobileButtonClassName({ variant, block, className })}
        aria-busy={pending || undefined}
        onClick={event => {
          // A pending button stays in the tab order (a disabled one would drop the person's focus) but does nothing twice:
          // the app's handler is not called, and the click's default (a form submit) is cancelled.
          if (pending) { event.preventDefault(); return; }
          onClick?.(event);
        }}
      >
        <span className="curv-mobile-button-label">{children}</span>
      </button>
      <span className="curv-mobile-content-vh" role="status">{pending ? pendingLabel : null}</span>
    </>
  );
});
