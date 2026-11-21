"use client";

import * as React from "react";
import { Combobox as C } from "@base-ui/react/combobox";
import { cn } from "../lib/cn";

/**
 * MultiSelect — pick several options (the Linear filter pattern, on base-ui
 * combobox). A button trigger shows the selection (first labels + "+N" and a
 * count badge); the popover has a search box and a checkable, keyboard-navigable
 * list that stays open while you toggle. For a single choice use <Select>.
 *
 * <MultiSelect items={brands} value={sel} onValueChange={setSel} placeholder="All brands" />
 */
export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  items: MultiSelectOption[];
  /** Selected values (controlled). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  id,
  disabled,
  className,
}: MultiSelectProps) {
  const [internal, setInternal] = React.useState<string[]>(defaultValue ?? []);
  const selectedVals = value ?? internal;
  const selectedOptions = React.useMemo(
    () => items.filter((o) => selectedVals.includes(o.value)),
    [items, selectedVals],
  );
  const commit = (opts: MultiSelectOption[]) => {
    const next = opts.map((o) => o.value);
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <C.Root
      multiple
      items={items}
      value={selectedOptions}
      onValueChange={(opts) => commit(opts as MultiSelectOption[])}
      itemToStringLabel={(o: MultiSelectOption) => o.label}
      isItemEqualToValue={(a: MultiSelectOption, b: MultiSelectOption) => a.value === b.value}
      disabled={disabled}
    >
      <C.Trigger
        id={id}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-body text-foreground transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 data-[popup-open]:ring-1 data-[popup-open]:ring-foreground/20",
          className,
        )}
      >
        <C.Value>
          {(vals: MultiSelectOption[]) => {
            if (!vals || vals.length === 0) return <span className="truncate text-muted-foreground">{placeholder}</span>;
            const labels = vals.map((v) => v.label);
            return (
              <span className="truncate">
                {labels.slice(0, 2).join(", ")}
                {labels.length > 2 ? ` +${labels.length - 2}` : ""}
              </span>
            );
          }}
        </C.Value>
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          {selectedOptions.length > 0 && (
            <span className="rounded bg-muted px-1.5 text-micro font-medium tabular-nums text-foreground">{selectedOptions.length}</span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </C.Trigger>
      <C.Portal>
        <C.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <C.Popup
            className={cn(
              "max-h-[min(24rem,var(--available-height))] w-[max(var(--anchor-width),12rem)] origin-[var(--transform-origin)] overflow-hidden rounded-lg border border-border bg-popover text-body text-popover-foreground shadow-lg outline-none",
              "transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-[ending-style]:duration-100",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:scale-95 motion-safe:data-[ending-style]:scale-95",
            )}
          >
            <div className="border-b border-border p-1.5">
              <C.Input
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-md bg-transparent px-2 text-body text-foreground outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            {/* base-ui keeps Empty mounted as a live region even when there are
                results — `empty:hidden` collapses it so it doesn't leave a gap. */}
            <C.Empty className="px-2 py-6 text-center text-body text-muted-foreground empty:hidden">No results.</C.Empty>
            <C.List className="max-h-[16rem] overflow-y-auto p-1">
              {(item: MultiSelectOption) => (
                <C.Item
                  key={item.value}
                  value={item}
                  className="flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 outline-none transition-colors data-[highlighted]:bg-accent"
                >
                  {/* always-visible checkbox that fills when selected */}
                  <span className="grid size-4 shrink-0 place-items-center rounded-[4px] border border-border">
                    <C.ItemIndicator className="grid size-full place-items-center rounded-[3px] bg-foreground text-background">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </C.ItemIndicator>
                  </span>
                  <span className="truncate">{item.label}</span>
                </C.Item>
              )}
            </C.List>
          </C.Popup>
        </C.Positioner>
      </C.Portal>
    </C.Root>
  );
}
