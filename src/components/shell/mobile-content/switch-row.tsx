"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { hasNode } from "./shared";

export interface MobileSwitchRowProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "role" | "aria-checked" | "aria-labelledby" | "aria-describedby" | "children"> {
  /** What the switch turns on: "Notify me when a milestone is late". */
  label: React.ReactNode;
  /** One quiet line under the label that says what it does. Read as the switch's description. */
  sub?: React.ReactNode;
  checked: boolean;
  /** Called with the new state when the row is tapped. The app owns the state. */
  onCheckedChange: (checked: boolean) => void;
}

/**
 * A setting that is on or off: a 56px row with a 17px label, an optional sub-line and an iOS-sized switch (51 by 31) at the end.
 * The whole row is the button (`role="switch"`, `aria-checked`), so there is no 31px target to aim for. The label names the switch
 * and the sub-line describes it. The row draws no side padding: the sheet body or card it sits in supplies the 16px edge, as for
 * `MobileOptionRow`. `disabled` dims it and ignores taps.
 */
export const MobileSwitchRow = React.forwardRef<HTMLButtonElement, MobileSwitchRowProps>(function MobileSwitchRow(
  { label, sub, checked, onCheckedChange, className, type = "button", onClick, ...props }, ref,
) {
  const uid = React.useId();
  const labelId = `${uid}-label`;
  const subId = `${uid}-sub`;
  const hasSub = hasNode(sub);
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={hasSub ? subId : undefined}
      className={cn("curv-mobile-switch-row", className)}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
    >
      <span className="curv-mobile-switch-text">
        <span id={labelId} className="curv-mobile-switch-label">{label}</span>
        {hasSub && <span id={subId} className="curv-mobile-switch-sub">{sub}</span>}
      </span>
      <span className="curv-mobile-switch" aria-hidden="true"><span className="curv-mobile-switch-thumb" /></span>
    </button>
  );
});
