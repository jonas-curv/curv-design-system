"use client";

import * as React from "react";
import { DayPicker, type DateRange as RdpRange } from "react-day-picker";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears,
  getQuarter, setQuarter, format, isSameDay,
} from "date-fns";
import { cn } from "../lib/cn";
import { Popover } from "./popover";

/**
 * DateRangePicker — the reporting date control. A pill trigger showing the
 * preset name + resolved range, opening a two-pane popover: presets on the left
 * (each showing what it resolves to right now — "Quarter to date · Q3"), a
 * range calendar on the right (react-day-picker, skinned to our tokens).
 */
export interface DateRange {
  from: Date;
  to: Date;
}
export interface DateRangeValue {
  range: DateRange;
  /** The preset that produced the range, or undefined for a custom selection. */
  presetKey?: string;
}

/**
 * A custom preset a consumer can add to the left pane (e.g. "Since launch")
 * without forking. Same shape as the built-in presets: `value` is the optional
 * right-aligned hint (a month/quarter/year), `from`/`to` the resolved range.
 */
export interface DateRangePreset {
  key: string;
  label: string;
  value?: string;
  from: Date;
  to: Date;
}

export interface DateRangePickerProps {
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  onValueChange?: (value: DateRangeValue) => void;
  /** Reference "now" for resolving presets (defaults to today). */
  today?: Date;
  /** 0 = Sunday, 1 = Monday (business default). */
  weekStartsOn?: 0 | 1;
  align?: "start" | "end";
  /** Custom presets shown as a first section above the built-in "Today". */
  presets?: DateRangePreset[];
  className?: string;
}

type Preset = DateRangePreset;

function buildPresets(now: Date, weekStartsOn: 0 | 1) {
  const w = { weekStartsOn };
  const toDate: Preset[] = [
    { key: "today", label: "Today", from: now, to: now },
    { key: "wtd", label: "Week to date", from: startOfWeek(now, w), to: now },
    { key: "mtd", label: "Month to date", value: format(now, "MMM"), from: startOfMonth(now), to: now },
    { key: "qtd", label: "Quarter to date", value: `Q${getQuarter(now)}`, from: startOfQuarter(now), to: now },
    { key: "ytd", label: "Year to date", value: `${now.getFullYear()}`, from: startOfYear(now), to: now },
  ];
  const y = subDays(now, 1), lw = subWeeks(now, 1), lm = subMonths(now, 1), lq = subQuarters(now, 1), ly = subYears(now, 1);
  const relative: Preset[] = [
    { key: "yesterday", label: "Yesterday", from: y, to: y },
    { key: "lastWeek", label: "Last week", from: startOfWeek(lw, w), to: endOfWeek(lw, w) },
    { key: "lastMonth", label: "Last month", value: format(lm, "MMM"), from: startOfMonth(lm), to: endOfMonth(lm) },
    { key: "lastQuarter", label: "Last quarter", value: `Q${getQuarter(lq)}`, from: startOfQuarter(lq), to: endOfQuarter(lq) },
    { key: "lastYear", label: "Last year", value: `${ly.getFullYear()}`, from: startOfYear(ly), to: endOfYear(ly) },
  ];
  const quarters: Preset[] = [1, 2, 3, 4].map((q) => {
    const d = setQuarter(now, q);
    return { key: `q${q}`, label: `Q${q}`, from: startOfQuarter(d), to: endOfQuarter(d) };
  });
  return { toDate, relative, quarters };
}

function formatRange(from: Date, to: Date): string {
  if (isSameDay(from, to)) return format(from, "MMM d, yyyy");
  if (from.getFullYear() === to.getFullYear()) {
    if (from.getMonth() === to.getMonth()) return `${format(from, "MMM d")} – ${format(to, "d, yyyy")}`;
    return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
  }
  return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
}

const dayCalendarClassNames = {
  months: "relative",
  month: "",
  month_caption: "flex h-8 items-center px-1",
  caption_label: "text-body font-medium text-foreground",
  nav: "absolute right-0 top-0 flex items-center gap-1",
  button_previous: "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40",
  button_next: "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40",
  month_grid: "mt-1 w-full border-collapse",
  weekdays: "",
  weekday: "size-8 text-micro font-normal text-muted-foreground",
  week: "",
  day: "p-0 text-center align-middle",
  day_button: "grid size-8 place-items-center rounded-full text-body text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 aria-selected:hover:bg-transparent",
  // Today: a small dot under the number. `bg-current` adapts — dark on a normal
  // day, white when today is the selected range endpoint.
  today: "[&>button]:relative [&>button]:font-semibold [&>button]:text-foreground [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-current [&>button]:after:content-['']",
  outside: "[&>button]:text-muted-foreground/40",
  disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
  hidden: "invisible",
  // Range: a visible gray band on the cells, black circles at the ends.
  range_middle: "bg-muted [&>button]:rounded-none [&>button]:hover:bg-accent",
  range_start: "rounded-l-full bg-muted [&>button]:rounded-full [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
  range_end: "rounded-r-full bg-muted [&>button]:rounded-full [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
  selected: "",
};

function Chevron({ orientation }: { orientation?: "left" | "right" | "up" | "down" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn(orientation === "left" && "rotate-180")}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PresetRow({ preset, active, onClick }: { preset: Preset; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between gap-6 rounded-md px-2.5 py-1.5 text-left text-body transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
      )}
    >
      <span>{preset.label}</span>
      {preset.value ? (
        <span className={cn("tabular-nums", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{preset.value}</span>
      ) : null}
    </button>
  );
}

export function DateRangePicker({
  value,
  defaultValue,
  onValueChange,
  today,
  weekStartsOn = 1,
  align = "end",
  presets: customPresets,
  className,
}: DateRangePickerProps) {
  const now = React.useMemo(() => today ?? new Date(), [today]);
  const presets = React.useMemo(() => buildPresets(now, weekStartsOn), [now, weekStartsOn]);

  const fallback: DateRangeValue = defaultValue ?? {
    range: { from: presets.toDate[2].from, to: presets.toDate[2].to },
    presetKey: "mtd",
  };
  const [internal, setInternal] = React.useState<DateRangeValue>(fallback);
  const current = value ?? internal;

  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<RdpRange | undefined>(current.range);
  const [month, setMonth] = React.useState<Date>(current.range.to);
  // True once the user has clicked a start day and is picking the end.
  const [picking, setPicking] = React.useState(false);

  // Re-sync the working selection from the committed value each time the panel
  // opens (intentionally keyed on `open` only — we don't want external value
  // churn to reset an in-progress selection).
  React.useEffect(() => {
    if (open) {
      setRange(current.range);
      setMonth(current.range.to);
      setPicking(false);
    }
  }, [open]);

  const commit = (v: DateRangeValue) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };

  const pickPreset = (p: Preset) => {
    setPicking(false);
    setRange({ from: p.from, to: p.to });
    setMonth(p.to);
    commit({ range: { from: p.from, to: p.to }, presetKey: p.key });
    setOpen(false);
  };

  // Own the range logic so every sequence is a clean start→end (RDP's default
  // addToRange would *edit* an existing range on a click inside it).
  const onDayClick = (day: Date) => {
    if (!picking || !range?.from) {
      setRange({ from: day, to: undefined });
      setPicking(true);
      return;
    }
    const from = range.from;
    const [a, b] = day < from ? [day, from] : [from, day];
    setRange({ from: a, to: b });
    setPicking(false);
    commit({ range: { from: a, to: b }, presetKey: undefined });
    setMonth(b);
    setOpen(false);
  };

  const label = current.presetKey
    ? [...(customPresets ?? []), ...presets.toDate, ...presets.relative, ...presets.quarters].find((p) => p.key === current.presetKey)?.label ?? "Custom"
    : "Custom";

  const trigger = (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-body transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 data-[popup-open]:ring-1 data-[popup-open]:ring-foreground/20",
        className,
      )}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-muted-foreground">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <span className="font-medium text-foreground">{label}</span>
      <span className="tabular-nums text-muted-foreground">{formatRange(current.range.from, current.range.to)}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-muted-foreground">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );

  return (
    <Popover trigger={trigger} open={open} onOpenChange={setOpen} align={align} className="w-auto max-w-none p-0">
      <div className="flex">
        <div className="flex w-[188px] flex-col gap-0.5 border-r border-border p-2">
          {customPresets?.length ? (
            <>
              {customPresets.map((p) => (
                <PresetRow key={p.key} preset={p} active={current.presetKey === p.key} onClick={() => pickPreset(p)} />
              ))}
              <div role="separator" className="my-1 h-px bg-border" />
            </>
          ) : null}
          {presets.toDate.map((p) => (
            <PresetRow key={p.key} preset={p} active={current.presetKey === p.key} onClick={() => pickPreset(p)} />
          ))}
          <div role="separator" className="my-1 h-px bg-border" />
          {presets.relative.map((p) => (
            <PresetRow key={p.key} preset={p} active={current.presetKey === p.key} onClick={() => pickPreset(p)} />
          ))}
          <div role="separator" className="my-1 h-px bg-border" />
          <div className="grid grid-cols-4 gap-1 px-0.5">
            {presets.quarters.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => pickPreset(p)}
                aria-pressed={current.presetKey === p.key}
                className={cn(
                  "rounded-md py-1 text-caption font-medium tabular-nums transition-colors",
                  current.presetKey === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3">
          <DayPicker
            mode="range"
            selected={range}
            onDayClick={onDayClick}
            month={month}
            onMonthChange={setMonth}
            weekStartsOn={weekStartsOn}
            showOutsideDays={false}
            components={{ Chevron }}
            classNames={dayCalendarClassNames}
          />
        </div>
      </div>
    </Popover>
  );
}
