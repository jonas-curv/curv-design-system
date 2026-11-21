"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { Card } from "./card";
import { Popover } from "./popover";
import { Skeleton } from "./skeleton";
import { Sparkline } from "./sparkline";
import { Tooltip } from "./tooltip";

/**
 * StatCard — one hero number: label, value, an optional delta, and an optional
 * sparkline. The keystone of every OS overview. Compose a row with <StatGroup>
 * (divided sections of one card) rather than a field of separate boxes.
 *
 * Direction (arrow) and sentiment (color) are separate on purpose: a *rising*
 * refund rate is `direction: "up"` but `sentiment: "negative"`.
 */
export interface StatDelta {
  /** Preformatted magnitude, e.g. "12.4%" or "$414K". */
  value: string;
  /** Arrow direction. */
  direction: "up" | "down" | "flat";
  /** Color. Defaults from direction (up→positive, down→negative, flat→neutral). */
  sentiment?: "positive" | "negative" | "neutral";
}

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: StatDelta;
  /** How the delta reads: inline colored text, or a soft tinted pill. */
  deltaStyle?: "text" | "chip";
  /** Muted context after the delta, e.g. "vs last mo". */
  caption?: React.ReactNode;
  /** Trend values for an optional sparkline under the number. */
  sparkline?: number[];
  sparklineVariant?: "line" | "area";
  /** Extra color class for the sparkline (defaults to a neutral muted line). */
  sparklineClassName?: string;
  /** An info tooltip attached to the label. */
  hint?: string;
  /** Show a skeleton in place of the value while data loads. */
  loading?: boolean;
  /**
   * Make the whole card a link to its report/page. Shows a ↗ affordance on
   * hover; rendered as a stretched overlay anchor (the hint button and
   * breakdown stay interactive above it).
   */
  href?: string;
  /**
   * Rich hover detail (the Curv pattern): period comparisons + per-brand
   * breakdown, shown in a card under the stat after a short hover, or at once
   * when the stat takes keyboard focus (Escape or moving focus away closes it).
   * Keep it to rows of label + tabular value — it's a glance, not a page.
   */
  breakdown?: React.ReactNode;
  className?: string;
}

const SENTIMENT: Record<NonNullable<StatDelta["sentiment"]>, string> = {
  positive: "text-verdict-green",
  negative: "text-verdict-red",
  neutral: "text-muted-foreground",
};
const SENTIMENT_CHIP: Record<NonNullable<StatDelta["sentiment"]>, string> = {
  positive: "bg-verdict-green-soft text-verdict-green",
  negative: "bg-verdict-red-soft text-verdict-red",
  neutral: "bg-muted text-muted-foreground",
};

/** Whether focus on `el` is keyboard focus (`:focus-visible`); true where the selector is unsupported. */
function focusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

function DeltaArrow({ direction }: { direction: StatDelta["direction"] }) {
  if (direction === "flat") {
    return (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
        <rect x="1.5" y="5.25" width="9" height="1.5" rx="0.75" />
      </svg>
    );
  }
  // Triangle: up points up, down is the same glyph flipped.
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden className={cn(direction === "down" && "rotate-180")}>
      <path d="M6 2.5 10.5 9.5H1.5z" />
    </svg>
  );
}

function Delta({ delta, style }: { delta: StatDelta; style: "text" | "chip" }) {
  const sentiment = delta.sentiment ?? (delta.direction === "up" ? "positive" : delta.direction === "down" ? "negative" : "neutral");
  const label = `${delta.direction === "up" ? "Up" : delta.direction === "down" ? "Down" : "No change"} ${delta.value}`;
  if (style === "chip") {
    return (
      <span
        className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-medium tabular-nums", SENTIMENT_CHIP[sentiment])}
        aria-label={label}
      >
        <DeltaArrow direction={delta.direction} />
        {delta.value}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption font-medium tabular-nums", SENTIMENT[sentiment])} aria-label={label}>
      <DeltaArrow direction={delta.direction} />
      {delta.value}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaStyle = "text",
  caption,
  sparkline,
  sparklineVariant = "line",
  sparklineClassName,
  hint,
  loading,
  href,
  breakdown,
  className,
}: StatCardProps) {
  // The breakdown card is open while the stat is hovered or holds keyboard
  // focus. Hover opens after a short rest and closes with a small grace so the
  // cursor can travel without flicker; focus opens and closes at once.
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const hovered = React.useRef(false);
  const focused = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const sync = (delay: number) => {
    if (!breakdown) return;
    window.clearTimeout(timer.current);
    const next = hovered.current || focused.current;
    if (delay === 0) setOpen(next);
    else timer.current = window.setTimeout(() => setOpen(next), delay);
  };
  const hover = (next: boolean) => {
    hovered.current = next;
    sync(next ? 150 : 100);
  };
  const focus = (next: boolean) => {
    focused.current = next;
    sync(0);
  };

  if (loading) {
    return (
      <div className={cn("flex min-w-0 flex-1 flex-col px-5 py-4", className)} aria-busy>
        <Skeleton width={72} height={12} />
        <Skeleton width={104} height={24} className="mt-2" />
        <Skeleton width={88} height={12} className="mt-2" />
        {sparkline && <Skeleton height={32} className="mt-3 w-full" />}
      </div>
    );
  }

  // Without a link the stat itself takes focus, so the breakdown is reachable.
  const focusable = !!breakdown && !href;

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      onFocus={(e) => {
        // Keyboard focus only: a click keeps the hover-only behaviour.
        if (focusVisible(e.target)) focus(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focus(false);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        e.stopPropagation();
        window.clearTimeout(timer.current);
        setOpen(false);
      }}
      tabIndex={focusable ? 0 : undefined}
      role={focusable ? "group" : undefined}
      aria-label={focusable && typeof label === "string" ? label : undefined}
      className={cn(
        "group/stat relative flex min-w-0 flex-1 flex-col px-5 py-4",
        focusable && "rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        className,
      )}
    >
      {/* Stretched link (sibling of content, never nested interactives). */}
      {href && (
        <a
          href={href}
          aria-label={typeof label === "string" ? `Open ${label}` : "Open report"}
          className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
      )}
      {href && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-hover/stat:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <span className="truncate text-caption font-medium text-muted-foreground">{label}</span>
        {hint ? (
          <Tooltip content={hint}>
            <button type="button" aria-label={typeof label === "string" ? `About ${label}` : "More info"} className="relative z-[2] text-muted-foreground/60 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
            </button>
          </Tooltip>
        ) : null}
      </div>

      {/* Value + delta share one row (the number the delta describes) — the
          descriptor ("vs last mo") is demoted to its own muted line below. */}
      <div className={cn("mt-1 flex gap-2", deltaStyle === "chip" ? "items-center" : "items-baseline")}>
        <span className="text-figure font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {delta && (
          <span className="shrink-0">
            <Delta delta={delta} style={deltaStyle} />
          </span>
        )}
      </div>

      {caption && <div className="mt-1 truncate text-caption text-muted-foreground">{caption}</div>}

      {sparkline && sparkline.length > 1 && (
        <Sparkline
          data={sparkline}
          variant={sparklineVariant}
          className={cn("mt-3", sparklineClassName)}
        />
      )}

      {/* The Curv breakdown card: period comparisons + per-segment rows. */}
      {breakdown && (
        <Popover
          anchor={rootRef}
          open={open}
          onOpenChange={setOpen}
          side="bottom"
          align="start"
          sideOffset={4}
          keepFocus
          className="min-w-[220px]"
        >
          <div onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
            {breakdown}
          </div>
        </Popover>
      )}
    </div>
  );
}

/**
 * BreakdownRow — one line inside a StatCard `breakdown`: label left, tabular
 * value right, optional delta.
 */
export function BreakdownRow({
  label,
  value,
  delta,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: StatDelta;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-0.5 text-caption">
      <span className="flex items-center gap-1.5 text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="font-medium tabular-nums text-foreground">{value}</span>
        {delta && <Delta delta={delta} style="text" />}
      </span>
    </div>
  );
}

/**
 * StatGroup — a row of StatCards as divided sections of ONE card (never a field
 * of nested boxes). Stacks on narrow screens, splits into columns from `sm`.
 */
export function StatGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card
      className={cn(
        "flex flex-col divide-y divide-border overflow-hidden sm:flex-row sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {children}
    </Card>
  );
}
