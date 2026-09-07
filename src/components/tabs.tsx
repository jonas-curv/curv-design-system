"use client";

import * as React from "react";
import { Tabs as T } from "@base-ui/react/tabs";
import { cn } from "../lib/cn";

/**
 * View-navigation tabs — switching between distinct **views of a page**
 * (Overview / All deals). Chrome, the Clerk/GitHub pattern: a full-width
 * `bg-card` bar with `border-b border-border` directly under the top bar, the
 * active view marked by an underline. This bar is ALWAYS the top-most element of
 * the content area; the page/entity header sits BELOW it, inside the active
 * panel — never above. Not for filtering data in the current view — that's
 * <SegmentedControl>; and a table's status/row filter (Active / Cut / All) is
 * the DataTable `tabs` prop in the toolbar, NOT a page Tabs bar. (design-system.md
 * → Page tabs — always at the top, full-width.)
 *
 * The tab labels align to the content's left edge: the list is pulled back by
 * one tab's padding (`-ml-3`) while the bar's border stays full-width. Pass
 * `bar={false}` to drop the bar chrome when embedding in a card header.
 *
 * <Tabs
 *   aria-label="Views"
 *   value={view}
 *   onValueChange={setView}
 *   items={[{ value: "overview", label: "Overview" }, { value: "all", label: "All deals" }]}
 * />
 */
export interface TabItem {
  value: string;
  label: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Render the full-width `bg-card` + `border-b` bar (default). */
  bar?: boolean;
  /** Accessible name for the tablist. */
  "aria-label"?: string;
  className?: string;
}

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  bar = true,
  className,
  "aria-label": ariaLabel,
}: TabsProps) {
  return (
    <T.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v) => onValueChange(String(v)) : undefined}
      className={cn(bar && "border-b border-border bg-card", className)}
    >
      <T.List aria-label={ariaLabel} className="-ml-3 flex min-w-0 items-center overflow-x-auto">
        {items.map((it) => (
          <T.Tab
            key={it.value}
            value={it.value}
            className={cn(
              "relative inline-flex shrink-0 whitespace-nowrap h-11 items-center rounded-t-md px-3 text-[13px] font-medium outline-none transition-colors",
              // NB: base-ui Tabs.Tab marks the active tab with `data-active`
              // (Select/Menu items use `data-selected` — the attribute differs).
              "text-muted-foreground hover:text-foreground data-[active]:text-foreground",
              // Hover chip: a rounded gray container behind the label, inset
              // vertically (inset-y-2) so it never touches the bar's top/bottom.
              "before:absolute before:inset-x-1 before:inset-y-2 before:rounded-md before:bg-muted before:opacity-0 before:transition-opacity hover:before:opacity-100",
              // Underline marker, aligned under the label (inset by the tab padding).
              "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground after:opacity-0 data-[active]:after:opacity-100",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            )}
          >
            <span className="relative">{it.label}</span>
          </T.Tab>
        ))}
      </T.List>
    </T.Root>
  );
}
