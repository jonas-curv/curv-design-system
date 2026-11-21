import * as React from "react";
import { cn } from "../lib/cn";

/** Checkbox — controlled via `checked` / `onCheckedChange`. role=checkbox for a11y. */
export interface CheckboxProps {
  checked?: boolean;
  /**
   * The mixed state (some, not all): a bar on the filled box and
   * `aria-checked="mixed"`. A click reports `true`, the tri-state convention.
   */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  tabIndex?: number;
  className?: string;
  "aria-label"?: string;
}

export function Checkbox({ checked = false, indeterminate = false, onCheckedChange, disabled, id, tabIndex, className, ...aria }: CheckboxProps) {
  const filled = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      id={id}
      tabIndex={tabIndex}
      disabled={disabled}
      onClick={() => onCheckedChange?.(indeterminate ? true : !checked)}
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        filled ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        className,
      )}
      {...aria}
    >
      {indeterminate ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
          <path d="M6 12h12" />
        </svg>
      ) : checked ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
    </button>
  );
}
