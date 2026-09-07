"use client";

import * as React from "react";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { cn } from "../lib/cn";

/**
 * Segmented control — the pill toggle for **≤3 mutually-exclusive options that
 * switch a mode/parameter of the current view** (money-state All/Confirmed,
 * Summary/Monthly, compare basis). Not navigation — if it changes *what
 * page-view you're looking at*, use <Tabs>; if it picks from ≥4 options or is
 * set-and-forget, use <Select>. (design-system.md → Choosing a control.)
 *
 * Built on a radio group (exactly-one-of-N semantics, arrow-key selection).
 * Recipe is fixed by the doc: bg-muted track, raised bg-card active pill,
 * concentric 8px/6px radii. Deliberately not animated — a control switched
 * dozens of times a day should feel instant, not slide (motion-system).
 */
export interface SegmentedItem {
  value: string;
  label: React.ReactNode;
  /** Optional trailing count (e.g. the filtered row total on a view switcher). */
  count?: number;
}

export interface SegmentedControlProps {
  items: SegmentedItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `default` = the h-9 (36px) toolbar band; `sm` = h-8 (32px) card header. */
  size?: "sm" | "default";
  disabled?: boolean;
  /** Accessible name for the group (e.g. "Money state"). */
  "aria-label"?: string;
  className?: string;
}

export function SegmentedControl({
  items,
  value,
  defaultValue,
  onValueChange,
  size = "default",
  disabled,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  return (
    <RadioGroup
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v) => onValueChange(String(v)) : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        // Fixed height on the track (border-box) so the whole control lands on
        // the toolbar band; `items-stretch` makes each segment fill it. The doc
        // names segmented toggles as h-9 controls (design-system.md → Control
        // height), so a default SegmentedControl aligns with Select/Button.
        "inline-flex items-stretch gap-0.5 rounded-[8px] border border-border bg-muted p-0.5",
        size === "sm" ? "h-11 sm:h-8" : "h-11 sm:h-9",
        disabled && "opacity-50",
        className,
      )}
    >
      {items.map((it) => (
        <Radio.Root
          key={it.value}
          value={it.value}
          className={cn(
            "group inline-flex select-none items-center justify-center gap-1.5 rounded-[6px] px-3 font-medium outline-none transition-colors",
            "text-muted-foreground hover:text-foreground",
            "data-[checked]:bg-card data-[checked]:text-foreground data-[checked]:shadow-sm",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
            "disabled:pointer-events-none",
            size === "sm" ? "text-[12px]" : "text-[13px]",
          )}
        >
          {it.label}
          {it.count != null && (
            <span className="text-[12px] tabular-nums text-muted-foreground/60 group-data-[checked]:text-muted-foreground">
              {it.count}
            </span>
          )}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
