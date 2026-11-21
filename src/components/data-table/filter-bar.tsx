"use client";

// Linear-style filter bar: a "Filter" button that adds filters by property, each
// active filter shown as an editable/removable chip ("AE is Rob ✕"). Two facet
// kinds — a multi-select checklist, or a numeric Min/Max range with preset chips.
// Generic over the row type: each facet carries a `get(row)` accessor, so the
// DataTable filters entirely on its own.

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "../../lib/cn";
import { Popover } from "../popover";

/* ---------- inline icons ---------- */
function IconCheck({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function IconCaret({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function IconFunnel({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 4h18l-7 8v6l-4 2v-8z" />
    </svg>
  );
}
function IconPlus({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconX({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/* ---------- types ---------- */

const MENU_POPUP =
  "z-50 min-w-[190px] rounded-lg border border-border bg-popover p-1 text-body text-foreground shadow-lg outline-none";
const MENU_ROW =
  "flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 outline-none transition-colors data-[highlighted]:bg-accent data-[popup-open]:bg-accent";

export type FilterOption = { value: string; label: string };
export type RangeValue = { min: number | null; max: number | null };
export type RangePreset = { label: string; min: number | null; max: number | null };

/** A facet is a multi-select checklist or a numeric range. `get` reads the row. */
export type FilterDef<Row> =
  | {
      key: string;
      label: string;
      kind?: "select";
      options: FilterOption[];
      get: (row: Row) => string | number | null | undefined;
    }
  | {
      key: string;
      label: string;
      kind: "range";
      format?: (n: number) => string;
      presets?: RangePreset[];
      get: (row: Row) => number | null | undefined;
    };

export type FilterValue = string[] | RangeValue;
export type FilterValues = Record<string, FilterValue | undefined>;

const isRangeDef = <Row,>(d: FilterDef<Row>): d is Extract<FilterDef<Row>, { kind: "range" }> =>
  d.kind === "range";
const asSelect = (v: FilterValue | undefined): string[] => (Array.isArray(v) ? v : []);
const asRange = (v: FilterValue | undefined): RangeValue | null =>
  v != null && !Array.isArray(v) ? v : null;
const rangeEmpty = (r: RangeValue) => r.min == null && r.max == null;

function hasValue<Row>(def: FilterDef<Row>, v: FilterValue | undefined): boolean {
  return isRangeDef(def) ? asRange(v) != null : asSelect(v).length > 0;
}

/** Whether a numeric value passes a Min/Max range. Empty range passes everything. */
export function matchesRange(val: number | null | undefined, r: RangeValue): boolean {
  if (rangeEmpty(r)) return true;
  if (val == null) return false;
  if (r.min != null && val < r.min) return false;
  if (r.max != null && val > r.max) return false;
  return true;
}

/** Does a row pass all active facets? Used by DataTable to filter internally. */
export function rowMatchesFilters<Row>(
  row: Row,
  defs: FilterDef<Row>[],
  values: FilterValues,
): boolean {
  for (const def of defs) {
    const v = values[def.key];
    if (!hasValue(def, v)) continue;
    if (isRangeDef(def)) {
      const n = def.get(row);
      if (!matchesRange(n ?? null, asRange(v)!)) return false;
    } else {
      const raw = def.get(row);
      if (!asSelect(v).includes(String(raw ?? ""))) return false;
    }
  }
  return true;
}

function rangeChipText<Row>(def: Extract<FilterDef<Row>, { kind: "range" }>, r: RangeValue): string {
  const fmt = def.format ?? ((n: number) => String(n));
  if (r.min != null && r.max != null) return `${fmt(r.min)}–${fmt(r.max)}`;
  if (r.min != null) return `≥ ${fmt(r.min)}`;
  if (r.max != null) return `≤ ${fmt(r.max)}`;
  return "any";
}

/* ---------- editors ---------- */

function ValueList<Row>({
  def,
  selected,
  onToggle,
}: {
  def: Extract<FilterDef<Row>, { kind?: "select" }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (def.options.length === 0) {
    return <div className="px-2.5 py-2 text-body text-muted-foreground">No options</div>;
  }
  return (
    <div className="max-h-72 overflow-y-auto p-1">
      {def.options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-body text-foreground transition hover:bg-accent"
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border",
                checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {checked && <IconCheck className="size-3" />}
            </span>
            <span className="flex-1 truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NumInput({
  value,
  placeholder,
  format,
  onCommit,
}: {
  value: number | null;
  placeholder?: string;
  format?: (n: number) => string;
  onCommit: (n: number | null) => void;
}) {
  const [text, setText] = React.useState(value != null ? String(value) : "");
  const commit = () => {
    const cleaned = text.replace(/[^0-9.-]/g, "");
    onCommit(cleaned.trim() === "" || cleaned === "-" ? null : Number(cleaned));
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      className="w-full flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/20"
    />
  );
}

function RangeEditor<Row>({
  def,
  value,
  onChange,
}: {
  def: Extract<FilterDef<Row>, { kind: "range" }>;
  value: RangeValue;
  onChange: (next: RangeValue) => void;
}) {
  const presetActive = (p: RangePreset) => value.min === p.min && value.max === p.max;
  return (
    <div className="flex w-64 flex-col gap-2 p-2.5">
      <div className="flex items-center gap-1.5">
        <NumInput value={value.min} placeholder="Min" format={def.format} onCommit={(n) => onChange({ ...value, min: n })} />
        <span className="text-muted-foreground">–</span>
        <NumInput value={value.max} placeholder="Max" format={def.format} onCommit={(n) => onChange({ ...value, max: n })} />
      </div>
      {def.presets && def.presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {def.presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ min: p.min, max: p.max })}
              className={cn(
                "rounded-full border px-2 py-0.5 text-micro font-medium transition",
                presetActive(p)
                  ? "border-border bg-accent text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip<Row>({
  def,
  value,
  onChange,
  onRemove,
}: {
  def: FilterDef<Row>;
  value: FilterValue | undefined;
  onChange: (next: FilterValue) => void;
  onRemove: () => void;
}) {
  const range = isRangeDef(def) ? (asRange(value) ?? { min: null, max: null }) : null;
  const [open, setOpen] = React.useState(() => range != null && rangeEmpty(range));

  let connector = "";
  let display: string;
  let editor: React.ReactNode;
  if (isRangeDef(def) && range) {
    display = rangeChipText(def, range);
    editor = <RangeEditor def={def} value={range} onChange={(r) => onChange(r)} />;
  } else if (!isRangeDef(def)) {
    const selected = asSelect(value);
    const labelFor = (v: string) => def.options.find((o) => o.value === v)?.label ?? v;
    connector = "is";
    display = selected.length <= 2 ? selected.map(labelFor).join(", ") : `${selected.length} selected`;
    const toggle = (v: string) =>
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    editor = <ValueList def={def} selected={selected} onToggle={toggle} />;
  } else {
    display = "any";
    editor = null;
  }

  return (
    <div className="inline-flex h-7 items-center rounded-md border border-border bg-card text-body">
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="start"
        sideOffset={6}
        className="w-auto max-w-none p-0"
        trigger={
          <button
            type="button"
            className="inline-flex h-full max-w-[260px] items-center gap-1.5 rounded-l-md px-2 transition hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className="text-muted-foreground">{def.label}</span>
            {connector && <span className="text-muted-foreground/50">{connector}</span>}
            <span className="truncate font-medium text-foreground">{display}</span>
          </button>
        }
      >
        {editor}
      </Popover>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${def.label} filter`}
        className="inline-flex h-full items-center rounded-r-md border-l border-border px-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <IconX className="size-3.5" />
      </button>
    </div>
  );
}

function AddFilterMenu<Row>({
  defs,
  values,
  onChange,
  mode,
}: {
  defs: FilterDef<Row>[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  mode: "filter" | "add";
}) {
  const toggle = (key: string, v: string) => {
    const cur = asSelect(values[key]);
    onChange({ ...values, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const addRange = (key: string) => {
    if (asRange(values[key])) return;
    onChange({ ...values, [key]: { min: null, max: null } });
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={mode === "filter" ? "Filter" : "Add filter"}
        className={cn(
          "inline-flex items-center justify-center rounded-md border text-body text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-accent data-[popup-open]:text-foreground",
          // The toolbar's Filter is a 36px icon button, like Columns; the "+"
          // in the active-filter band is a 28px in-table control.
          mode === "filter"
            ? "size-11 border-border bg-card sm:size-9"
            : "h-7 border-transparent px-1.5 hover:border-border",
        )}
      >
        {mode === "filter" ? <IconFunnel className="size-4" /> : <IconPlus className="size-3.5" />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Menu.Popup className={MENU_POPUP}>
            {defs.map((def) =>
              isRangeDef(def) ? (
                <Menu.Item key={def.key} onClick={() => addRange(def.key)} className={MENU_ROW}>
                  {def.label}
                </Menu.Item>
              ) : (
                <Menu.SubmenuRoot key={def.key}>
                  <Menu.SubmenuTrigger className={cn(MENU_ROW, "justify-between")}>
                    {def.label}
                    <IconCaret className="size-3.5 text-muted-foreground" />
                  </Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner side="inline-end" align="start" sideOffset={2} className="z-50">
                      <Menu.Popup className={cn(MENU_POPUP, "max-h-72 overflow-y-auto")}>
                        {def.options.length === 0 ? (
                          <div className="px-2 py-1.5 text-muted-foreground">No options</div>
                        ) : (
                          def.options.map((opt) => (
                            <Menu.CheckboxItem
                              key={opt.value}
                              checked={asSelect(values[def.key]).includes(opt.value)}
                              onCheckedChange={() => toggle(def.key, opt.value)}
                              closeOnClick={false}
                              className={cn(MENU_ROW, "group")}
                            >
                              <span className="flex size-4 shrink-0 items-center justify-center rounded border border-border text-transparent group-data-[checked]:border-primary group-data-[checked]:bg-primary group-data-[checked]:text-primary-foreground">
                                <IconCheck className="size-3" />
                              </span>
                              <span className="flex-1 truncate">{opt.label}</span>
                            </Menu.CheckboxItem>
                          ))
                        )}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** The primary "Filter" button (opens the property menu). */
export function FilterButton<Row>(props: {
  defs: FilterDef<Row>[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
}) {
  return <AddFilterMenu {...props} mode="filter" />;
}

/** Active-filters band below the toolbar (Linear pattern). Renders nothing when empty. */
export function ActiveFilterBar<Row>({
  defs,
  values,
  onChange,
}: {
  defs: FilterDef<Row>[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
}) {
  const active = defs.filter((d) => hasValue(d, values[d.key]));
  if (active.length === 0) return null;
  const clearAll = () =>
    onChange(Object.fromEntries(defs.map((d) => [d.key, isRangeDef(d) ? undefined : []])));

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2">
      {active.map((def) => (
        <FilterChip
          key={def.key}
          def={def}
          value={values[def.key]}
          onChange={(next) => onChange({ ...values, [def.key]: next })}
          onRemove={() => onChange({ ...values, [def.key]: isRangeDef(def) ? undefined : [] })}
        />
      ))}
      <AddFilterMenu defs={defs} values={values} onChange={onChange} mode="add" />
      <button
        type="button"
        onClick={clearAll}
        className="ml-auto text-body text-muted-foreground transition hover:text-foreground"
      >
        Clear
      </button>
    </div>
  );
}
