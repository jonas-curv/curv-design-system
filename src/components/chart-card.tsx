"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { Card } from "./card";
import { Skeleton } from "./skeleton";
import type { StatDelta } from "./stat-card";

/** State handed to a render-prop `children` for legend show/hide. */
export interface ChartCardState {
  /** Keys of legend items the user has toggled off. */
  hidden: Set<string>;
}

/**
 * ChartCard — the reusable reporting-chart shell: title + hero value + delta on
 * the left, a `controls` slot on the right (drop a Select / SegmentedControl /
 * DateRangePicker to switch metric, compare, or period), the chart itself, and
 * an optional legend. Keeps the chart primitive dumb — the card owns the layout
 * and hosts the composed controls.
 */
export interface ChartLegendItem {
  label: string;
  /** Colour via a `text-*` class (currentColor). */
  className?: string;
  variant?: "solid" | "dashed" | "dotted";
  /** Stable key — set on every item to make the legend toggle series on/off. */
  key?: string;
}

export interface ChartCardProps {
  title?: React.ReactNode;
  /** Hero value (tabular). */
  value?: React.ReactNode;
  delta?: StatDelta;
  /** Right-aligned controls (metric dropdown, compare toggle, period, export). */
  controls?: React.ReactNode;
  legend?: ChartLegendItem[];
  /** Skeleton the value + chart area while data loads. */
  loading?: boolean;
  /** Chart-area height for the loading skeleton (match your chart's height). */
  chartHeight?: number;
  /**
   * The chart. A plain node for a static chart, OR a render function
   * `({ hidden }) => …` — when a function AND legend items carry a `key`, the
   * legend becomes clickable and hands you the hidden keys so you filter/dim
   * the series you pass the chart (keeps the chart a dumb primitive).
   */
  children: React.ReactNode | ((state: ChartCardState) => React.ReactNode);
  className?: string;
}

function DeltaTag({ delta }: { delta: StatDelta }) {
  const sentiment = delta.sentiment ?? (delta.direction === "up" ? "positive" : delta.direction === "down" ? "negative" : "neutral");
  const color = sentiment === "positive" ? "text-verdict-green" : sentiment === "negative" ? "text-verdict-red" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption font-medium tabular-nums", color)}>
      {delta.direction === "flat" ? (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden><rect x="1.5" y="5.25" width="9" height="1.5" rx="0.75" /></svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden className={cn(delta.direction === "down" && "rotate-180")}><path d="M6 2.5 10.5 9.5H1.5z" /></svg>
      )}
      {delta.value}
    </span>
  );
}

function LegendSwatch({ variant = "solid", className }: { variant?: ChartLegendItem["variant"]; className?: string }) {
  // A small dot, not a line. A comparison series (dashed/dotted) uses a hollow
  // ring so the "this is the comparison" distinction survives the dot.
  if (variant === "solid") return <span className={cn("size-2 rounded-full bg-current", className)} />;
  return <span className={cn("size-2 rounded-full border-[1.5px] border-current", className)} />;
}

export function ChartCard({ title, value, delta, controls, legend, loading, chartHeight = 240, children, className }: ChartCardProps) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleable = typeof children === "function" && !!legend?.some((l) => l.key);
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Card className={cn("p-5", className)} aria-busy={loading || undefined}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {title && <div className="text-body text-muted-foreground">{title}</div>}
          {loading ? (
            <Skeleton width={128} height={26} className="mt-1" />
          ) : (
            (value || delta) && (
              <div className="mt-0.5 flex items-baseline gap-2">
                {value && <span className="text-figure font-semibold leading-tight tracking-tight tabular-nums text-foreground">{value}</span>}
                {delta && <DeltaTag delta={delta} />}
              </div>
            )
          )}
        </div>
        {controls && <div className="flex shrink-0 items-center gap-2">{controls}</div>}
      </div>

      {loading ? (
        <Skeleton height={chartHeight} className="w-full" />
      ) : typeof children === "function" ? (
        children({ hidden })
      ) : (
        children
      )}

      {legend && legend.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-caption text-muted-foreground">
          {legend.map((l, i) => {
            const off = l.key ? hidden.has(l.key) : false;
            const inner = (
              <>
                <LegendSwatch variant={l.variant} className={cn(l.className, off && "opacity-40")} />
                <span className={cn(off && "line-through opacity-60")}>{l.label}</span>
              </>
            );
            return toggleable && l.key ? (
              <button
                key={l.key}
                type="button"
                onClick={() => toggle(l.key!)}
                aria-pressed={!off}
                className="inline-flex items-center gap-1.5 rounded transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
              >
                {inner}
              </button>
            ) : (
              <span key={i} className="inline-flex items-center gap-1.5">
                {inner}
              </span>
            );
          })}
        </div>
      )}
    </Card>
  );
}
