"use client";

// The toolbar pieces. The card's built-in toolbar is made of them, and a page
// that owns its control row (views · search · filter · spacer · columns ·
// Export · primary) places them itself, inside a `DataTableProvider`, with
// `<DataTable toolbar="external" />` below.

import * as React from "react";
import { cn } from "../../lib/cn";
import { Button, type ButtonProps } from "../button";
import { Checkbox, type CheckboxProps } from "../checkbox";
import { Input } from "../input";
import { Menu, MenuItem } from "../menu";
import { Popover } from "../popover";
import { SegmentedControl } from "../segmented-control";
import { FilterButton } from "./filter-bar";
import type { CheckState } from "./layout";
import { useDataTableModelContext } from "./model";

/* ---------- icons ---------- */

function IconSearch({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
export function IconChevronDown({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconColumns() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </svg>
  );
}

/* ---------- pieces ---------- */

/** The table's view tabs as a segmented control (h-9), each with its row count. Renders nothing without `tabs`. */
export function DataTableViews({ className }: { className?: string }) {
  const m = useDataTableModelContext("DataTableViews");
  const tabs = m.props.tabs;
  if (!tabs?.length) return null;
  return (
    <SegmentedControl
      aria-label="View"
      value={m.activeTab}
      onValueChange={m.setActiveTab}
      className={className}
      items={tabs.map((t) => ({
        value: t.key,
        label: t.label,
        // undefined → auto; a number → override; null → hidden (?? would treat null as auto).
        count: t.count === null ? undefined : (t.count ?? m.tabCounts[t.key]),
      }))}
    />
  );
}

/** The search box (240 wide, full width on phones). */
export function DataTableSearch({ className }: { className?: string }) {
  const m = useDataTableModelContext("DataTableSearch");
  const placeholder = m.props.searchPlaceholder ?? "Search…";
  return (
    <div className={cn("relative w-full sm:w-60", className)}>
      <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input value={m.query} onChange={(e) => m.setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-8" />
    </div>
  );
}

/** The Filter button over the table's `filters`. Renders nothing without filters. */
export function DataTableFilterButton() {
  const m = useDataTableModelContext("DataTableFilterButton");
  const defs = m.props.filters;
  if (!defs?.length) return null;
  return <FilterButton defs={defs} values={m.filterValues} onChange={m.setFilterValues} />;
}

/** The Columns picker: every column with a checkbox. The identity column (and sticky ones) stay on. */
export function DataTableColumnsButton() {
  const m = useDataTableModelContext("DataTableColumnsButton");
  const options = m.columns.filter((c) => c.col.hideable !== false || c.locked);
  return (
    <Popover
      align="end"
      className="w-56 max-w-none p-1"
      trigger={
        <Button variant="outline" size="icon" aria-label="Columns" className="text-muted-foreground hover:text-foreground data-[popup-open]:bg-accent data-[popup-open]:text-foreground">
          <IconColumns />
        </Button>
      }
    >
      <div role="group" aria-label="Columns" className="flex max-h-80 flex-col overflow-y-auto">
        {options.map((c) => (
          <label
            key={c.key}
            className={cn(
              "flex h-8 shrink-0 items-center gap-2 rounded px-2 text-[13px] transition-colors",
              c.locked ? "text-muted-foreground" : "cursor-pointer text-foreground hover:bg-accent",
            )}
          >
            <Checkbox checked={m.isVisible(c.key)} disabled={c.locked} onCheckedChange={(on) => m.setVisible(c.key, on)} aria-label={c.col.header} />
            <span className="truncate">{c.col.header}</span>
          </label>
        ))}
      </div>
    </Popover>
  );
}

/** The Export menu (CSV, PDF) over the rows in view and the shown columns. */
export function DataTableExportMenu() {
  const m = useDataTableModelContext("DataTableExportMenu");
  return (
    <Menu
      align="end"
      trigger={
        <Button variant="outline" className="pl-3 pr-2.5 data-[popup-open]:bg-accent">
          Export
          <IconChevronDown size={14} className="text-muted-foreground" />
        </Button>
      }
    >
      <MenuItem onClick={() => m.runExport("csv")}>Export CSV</MenuItem>
      <MenuItem onClick={() => m.runExport("pdf")}>Export PDF</MenuItem>
    </Menu>
  );
}

/** A bulk-bar action: the 28px in-table button. */
export const DataTableBulkAction = React.forwardRef<HTMLButtonElement, ButtonProps>(function DataTableBulkAction(
  { className, variant = "outline", ...props },
  ref,
) {
  return <Button ref={ref} variant={variant} size="sm" className={cn("h-7 px-2.5 sm:h-7", className)} {...props} />;
});

/** The card's own toolbar: views · search · filter · actions · spacer · summary · columns · Export. */
export function DataTableToolbar() {
  const m = useDataTableModelContext("DataTableToolbar");
  const p = m.props;
  const hasTabs = !!p.tabs?.length;
  const hasFilters = !!p.filters?.length;
  const end = p.summary != null || m.columnPicker || !!p.exportFilename;
  if (!hasTabs && !p.searchable && !hasFilters && p.toolbarActions == null && !end) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      {hasTabs && (
        // Phones: a long set of tabs scrolls rather than overflowing the card.
        <div className="max-w-full overflow-x-auto">
          <DataTableViews />
        </div>
      )}
      {p.searchable && <DataTableSearch />}
      {hasFilters && <DataTableFilterButton />}
      {p.toolbarActions}
      {end && (
        <div className="ml-auto flex items-center gap-2">
          {p.summary != null && <div className="mr-1 flex items-center">{p.summary}</div>}
          {m.columnPicker && <DataTableColumnsButton />}
          {p.exportFilename && <DataTableExportMenu />}
        </div>
      )}
    </div>
  );
}

/* ---------- selection checkbox ---------- */

// The design system's Checkbox has no mixed state of its own: the mixed look
// (a bar on the filled box) and `aria-checked="mixed"` are layered on here. The
// spread comes last inside Checkbox, so it overrides its aria-checked.
const MIXED = { "aria-checked": "mixed" } as unknown as Partial<CheckboxProps>;

/** The Checkbox with a mixed state and a 40px hit area, for the selection column and the bulk bar. */
export function SelectionCheckbox({
  state,
  onCheckedChange,
  label,
  tabIndex,
  disabled,
}: {
  state: CheckState;
  onCheckedChange: (on: boolean) => void;
  label: string;
  tabIndex?: number;
  disabled?: boolean;
}) {
  const mixed = state === "some";
  return (
    <Checkbox
      checked={state === "all"}
      disabled={disabled}
      // Mixed → all, the WAI tri-state convention.
      onCheckedChange={(next) => onCheckedChange(mixed ? true : next)}
      aria-label={label}
      className={cn(
        // A 34 × 40 hit area that stays inside the 40px column.
        "relative after:absolute after:-inset-y-3 after:-left-4 after:-right-2",
        mixed && "border-primary bg-primary before:h-0.5 before:w-2 before:rounded-full before:bg-primary-foreground",
      )}
      {...(mixed ? MIXED : null)}
      {...(tabIndex !== undefined ? ({ tabIndex } as unknown as Partial<CheckboxProps>) : null)}
    />
  );
}
