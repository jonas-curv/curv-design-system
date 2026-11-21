"use client";

import * as React from "react";
import { cn } from "../lib/cn";

/**
 * LineChart — the reporting trend primitive. One accent series, optional
 * muted/dashed comparison and dotted partial-period series (design-system.md →
 * Charts). The y-axis is capped to a few "nice-number" gridlines (the Shopify
 * rule) so it never clutters, whatever the data range. Responsive; no tooltip
 * layer yet (a follow-up).
 */
export interface ChartSeries {
  /** A `null` breaks the line into a gap (missing data) — never plotted as 0. */
  data: (number | null)[];
  label?: string;
  /** solid = current, dashed = comparison, dotted = partial/projected. */
  variant?: "solid" | "dashed" | "dotted";
  /**
   * Draw solid up to this index, then dashed after it — the "actual so far,
   * projected/partial rest" line (your Customs OS revenue chart). Overrides
   * `variant` for the split. The join index is drawn in both segments so the
   * line stays continuous.
   */
  partialFrom?: number;
  /**
   * Marks this as the comparison/baseline period (the prior window you measure
   * against). By convention it renders muted + dashed in the `chart-prev` hue
   * (override with `variant`/`className`), and it becomes the baseline for the
   * tooltip's signed "% from comparison" delta. Flag exactly one series.
   */
  comparison?: boolean;
  /**
   * Per-point labels for THIS series, shown in the tooltip row instead of the
   * shared x-axis label — so a comparison series can show its OWN dates (the
   * Shopify hover: current point "20 Jul 2026", comparison point "20 Jul 2025").
   * Length should match `data`. Only used by the `tooltipTitle` tooltip layout.
   */
  pointLabels?: string[];
  /** Line colour via a `text-*` class (defaults to the chart accent token). */
  className?: string;
}

export interface LineChartProps {
  series: ChartSeries[];
  /** X-axis category labels (e.g. months); length should match series data. */
  xLabels: string[];
  height?: number;
  /** Fill under the first series. */
  area?: boolean;
  /** Format y-axis tick values (e.g. compact currency). */
  formatY?: (n: number) => string;
  /** Format values in the hover tooltip (defaults to `formatY`). */
  formatTooltip?: (n: number) => string;
  /**
   * Tooltip title (e.g. the metric name — "Conversion rate"). When set, the
   * tooltip renders the Shopify period-over-period layout: the title, then each
   * series as its own date (from `series.pointLabels`, falling back to the
   * x-label) + value chip, with the "% from comparison" delta under the current
   * series. When omitted, the tooltip keeps the compact label→value layout.
   */
  tooltipTitle?: string;
  /** Hover crosshair + per-series dots + shared tooltip (on by default). */
  interactive?: boolean;
  /**
   * Colour of the tooltip's "% from comparison" delta when a `comparison`
   * series is present. "up-positive" (default): a rise is green (conversion,
   * revenue). "down-positive": a fall is green (CPL, CPA, cost). "neutral": no
   * colour. The arrow always points the literal direction — only the sentiment
   * (colour) flips.
   */
  deltaTone?: "up-positive" | "down-positive" | "neutral";
  /**
   * Y-axis baseline. "zero" (default) is the honest baseline — use it when
   * magnitude matters or values approach zero. "auto" starts the axis just
   * below the data's minimum so variation in large, clustered values (revenue
   * that lives at $2M–$3M) is visible instead of squashed flat. Never use a
   * non-zero baseline on a BarChart — a truncated bar lies.
   */
  yBaseline?: "zero" | "auto";
  /**
   * Hard cap on y-axis gridlines. Design rule: NEVER more than 5. 5 is the
   * target; when a clean coarser step covers the range in 3–4 lines, we take
   * that (never pad to 5). Default 5.
   */
  maxGridlines?: number;
  className?: string;
}

/**
 * Y-axis ticks on "nice" 1/2/2.5/5×10ⁿ steps, GUARANTEED ≤ maxCount lines
 * (picks the smallest clean step whose floored/ceiled range fits the cap — so
 * a clean range yields 3–4, a tight one lands at exactly 5, never 6+).
 */
function niceTicks(min: number, max: number, maxCount: number): number[] {
  if (max <= min) return [min];
  const span = max - min;
  const mag = Math.pow(10, Math.floor(Math.log10(span / Math.max(1, maxCount))));
  const steps = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map((m) => m * mag);
  let step = steps[steps.length - 1];
  for (const s of steps) {
    const lo = Math.floor(min / s) * s;
    const hi = Math.ceil(max / s) * s;
    if (Math.round((hi - lo) / s) + 1 <= maxCount) {
      step = s;
      break;
    }
  }
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 0.5; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

// Restrained categorical series colours (accent → distinct hue → neutral grays).
// NEVER verdict red/green for a category — a red segment reads as "bad".
// Consumers override per series via `className`.
const CATEGORICAL = ["text-chart", "text-chart-compare", "text-chart-3", "text-chart-4", "text-chart-5"];
const catColor = (s: ChartSeries, i: number) => cn(s.className ?? CATEGORICAL[i % CATEGORICAL.length]);

// Rectangle with only the top two corners rounded (bars: rounded top, flat base).
function topRoundedRect(x: number, yTop: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  const b = (yTop + h).toFixed(1);
  return `M${x},${b} L${x},${(yTop + rr).toFixed(1)} Q${x},${yTop} ${x + rr},${yTop} L${(x + w - rr).toFixed(1)},${yTop} Q${x + w},${yTop} ${x + w},${(yTop + rr).toFixed(1)} L${x + w},${b} Z`;
}

function useWidth() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const DASH: Record<NonNullable<ChartSeries["variant"]>, string | undefined> = {
  solid: undefined,
  dashed: "5 4",
  dotted: "1 5",
};

// A comparison series styles itself — dashed, in the muted `chart-prev` hue —
// so a page only has to flag it, not restyle it on every chart. Explicit
// variant/className still win.
const seriesClass = (s: ChartSeries) => cn(s.className ?? (s.comparison ? "text-chart-prev" : "text-chart"));
const seriesVariant = (s: ChartSeries): NonNullable<ChartSeries["variant"]> => s.variant ?? (s.comparison ? "dashed" : "solid");

/** The Shopify-style "↑ 22.4% from comparison" line under a tooltip value. */
function TooltipDelta({ cur, base, tone }: { cur: number; base: number; tone: NonNullable<LineChartProps["deltaTone"]> }) {
  if (tone === "neutral" || base === 0) return null;
  const dir = cur > base ? "up" : cur < base ? "down" : "flat";
  const pct = Math.abs((cur - base) / base) * 100;
  const positive = dir === "flat" ? null : tone === "down-positive" ? dir === "down" : dir === "up";
  const color = positive == null ? "text-muted-foreground" : positive ? "text-verdict-green" : "text-verdict-red";
  return (
    <div className="flex items-center gap-1 pl-3.5 text-micro">
      <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", color)}>
        {dir === "flat" ? (
          <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" aria-hidden><rect x="1.5" y="5.25" width="9" height="1.5" rx="0.75" /></svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" aria-hidden className={cn(dir === "down" && "rotate-180")}><path d="M6 2.5 10.5 9.5H1.5z" /></svg>
        )}
        {pct.toFixed(pct < 10 ? 1 : 0)}%
      </span>
      <span className="text-muted-foreground">from comparison</span>
    </div>
  );
}

export function LineChart({
  series,
  xLabels,
  height = 240,
  area = false,
  formatY = (n) => String(n),
  formatTooltip,
  tooltipTitle,
  interactive = true,
  yBaseline = "zero",
  maxGridlines = 5,
  deltaTone = "up-positive",
  className,
}: LineChartProps) {
  const [ref, width] = useWidth();
  const [active, setActive] = React.useState<number | null>(null);
  const fmtTip = formatTooltip ?? formatY;

  const padL = 44;
  const padB = 22;
  const padT = 8;
  const padR = 8;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = Math.max(0, height - padT - padB);

  // Nulls are gaps, not values — exclude them from the axis min/max.
  const allValues = series.flatMap((s) => s.data).filter((v): v is number => v != null);
  const dataMax = allValues.length ? Math.max(...allValues, 0) : 0;
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  // "auto" floors the axis to a nice number just below the data min so
  // variation in large clustered values isn't squashed against a zero baseline.
  const ticks = niceTicks(yBaseline === "auto" ? dataMin : 0, dataMax, maxGridlines);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1] || 1;
  const ySpan = yMax - yMin || 1;

  const n = xLabels.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - yMin) / ySpan) * innerH;

  // A `null` breaks the line: the next non-null point starts a fresh subpath (M)
  // instead of drawing a segment across the gap.
  const linePath = (data: (number | null)[]) => {
    let d = "";
    let move = true;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v == null) {
        move = true;
        continue;
      }
      d += `${move ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      move = false;
    }
    return d;
  };

  // Path over an absolute index range [from..to] (for the solid/dashed split);
  // nulls break the line into a gap here too.
  const rangePath = (data: (number | null)[], from: number, to: number) => {
    let d = "";
    let move = true;
    for (let i = Math.max(0, from); i <= Math.min(data.length - 1, to); i++) {
      const v = data[i];
      if (v == null) {
        move = true;
        continue;
      }
      d += `${move ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      move = false;
    }
    return d;
  };

  // Area fill under a series, null-safe: each contiguous non-null run is its own
  // filled region down to the baseline, so gaps in the line are gaps in the fill.
  const areaPath = (data: (number | null)[], baselineY: number) => {
    let d = "";
    let i = 0;
    while (i < data.length) {
      if (data[i] == null) {
        i++;
        continue;
      }
      const start = i;
      let end = i;
      while (end + 1 < data.length && data[end + 1] != null) end++;
      d += `M${x(start).toFixed(1)},${baselineY.toFixed(1)}`;
      for (let k = start; k <= end; k++) d += `L${x(k).toFixed(1)},${y(data[k]!).toFixed(1)}`;
      d += `L${x(end).toFixed(1)},${baselineY.toFixed(1)}Z`;
      i = end + 1;
    }
    return d;
  };

  // Thin x labels so they never collide (~64px apart minimum).
  const labelStep = Math.max(1, Math.ceil((n * 64) / Math.max(1, innerW)));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || n < 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const i = n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((mx - padL) / (innerW / (n - 1)))));
    setActive(i);
  };

  const tipRows = active != null ? series.filter((s) => s.data[active] != null) : [];
  const tipX = active != null ? x(active) : 0;

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          className="overflow-visible"
          onMouseMove={onMove}
          onMouseLeave={() => setActive(null)}
        >
          {/* gridlines + y labels */}
          {ticks.map((t) => {
            const gy = y(t);
            return (
              <g key={t}>
                <line x1={padL} x2={width - padR} y1={gy} y2={gy} className="stroke-border" strokeWidth={1} />
                <text x={padL - 8} y={gy} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-micro tabular-nums">
                  {formatY(t)}
                </text>
              </g>
            );
          })}

          {/* x labels */}
          {xLabels.map((lbl, i) =>
            i % labelStep === 0 ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-micro">
                {lbl}
              </text>
            ) : null,
          )}

          {/* area under the first series */}
          {area && series[0] && series[0].data.length > 1 && (
            <path
              d={areaPath(series[0].data, padT + innerH)}
              className={cn("opacity-[0.10]", series[0].className ?? "text-chart")}
              fill="currentColor"
              stroke="none"
            />
          )}

          {/* series lines (comparison/partial under the primary) */}
          {[...series].reverse().map((s, ri) => {
            if (s.data.length < 2) return null;
            const stroke = {
              className: seriesClass(s),
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 1.75,
              strokeLinecap: "round" as const,
              strokeLinejoin: "round" as const,
              vectorEffect: "non-scaling-stroke" as const,
            };
            // Solid → dashed split at partialFrom (the "actual then projected" line).
            if (s.partialFrom != null && s.partialFrom > 0 && s.partialFrom < s.data.length - 1) {
              return (
                <g key={ri}>
                  <path d={rangePath(s.data, 0, s.partialFrom)} {...stroke} />
                  <path d={rangePath(s.data, s.partialFrom, s.data.length - 1)} {...stroke} strokeDasharray="5 4" />
                </g>
              );
            }
            return (
              <path
                key={ri}
                d={linePath(s.data)}
                {...stroke}
                strokeDasharray={DASH[seriesVariant(s)]}
              />
            );
          })}

          {/* hover crosshair + per-series dots */}
          {active != null && (
            <g pointerEvents="none">
              <line x1={tipX} x2={tipX} y1={padT} y2={padT + innerH} className="stroke-border" strokeWidth={1} />
              {series.map((s, si) =>
                s.data[active] != null ? (
                  <circle
                    key={si}
                    cx={tipX}
                    cy={y(s.data[active]!)}
                    r={3.5}
                    className={seriesClass(s)}
                    fill={s.comparison ? "var(--card)" : "currentColor"}
                    stroke={s.comparison ? "currentColor" : "var(--card)"}
                    strokeWidth={2}
                  />
                ) : null,
              )}
            </g>
          )}
        </svg>
      )}

      {/* shared tooltip: x-label + each series value */}
      {active != null && tipRows.length > 0 && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-2 text-caption text-popover-foreground shadow-lg"
          style={{ left: Math.max(70, Math.min(width - 70, tipX)) }}
        >
          {tooltipTitle != null ? (
            /* Shopify period-over-period layout: metric title, then each series
               as its own date + value chip, with the delta under the current. */
            <>
              <div className="mb-1.5 font-medium text-foreground">{tooltipTitle}</div>
              <div className="flex flex-col gap-2">
                {tipRows.map((s, si) => {
                  const cmp = series.find((c) => c.comparison && c.data[active!] != null);
                  const showDelta = !s.comparison && cmp != null && cmp.data[active!] !== 0;
                  const dateLabel = s.pointLabels?.[active] ?? xLabels[active];
                  return (
                    <div key={si} className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            s.comparison ? "border-[1.5px] border-current" : "bg-current",
                            seriesClass(s),
                          )}
                        />
                        {dateLabel}
                      </span>
                      <span className="w-fit rounded-md bg-muted px-1.5 py-0.5 font-medium tabular-nums text-foreground">
                        {fmtTip(s.data[active]!)}
                      </span>
                      {showDelta && <TooltipDelta cur={s.data[active]!} base={cmp!.data[active!]!} tone={deltaTone} />}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 font-medium text-foreground">{xLabels[active]}</div>
              <div className="flex flex-col gap-1.5">
                {tipRows.map((s, si) => {
                  const cmp = series.find((c) => c.comparison && c.data[active!] != null);
                  const showDelta = !s.comparison && cmp != null && cmp.data[active!] !== 0;
                  return (
                    <div key={si} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              s.comparison ? "border-[1.5px] border-current" : "bg-current",
                              seriesClass(s),
                            )}
                          />
                          {s.label ?? "Value"}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">{fmtTip(s.data[active]!)}</span>
                      </div>
                      {showDelta && <TooltipDelta cur={s.data[active]!} base={cmp!.data[active!]!} tone={deltaTone} />}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * BarChart — stacked (default) or grouped vertical bars, same reporting language
 * as LineChart: nice-number y-axis cap, hover column highlight + shared tooltip
 * (per-series values + total). Colour each series with a `text-*` class.
 */
export interface BarChartProps {
  series: ChartSeries[];
  xLabels: string[];
  height?: number;
  formatY?: (n: number) => string;
  formatTooltip?: (n: number) => string;
  /** Stack series into one bar (default) or place them side by side. */
  stacked?: boolean;
  interactive?: boolean;
  maxGridlines?: number;
  className?: string;
}

export function BarChart({
  series,
  xLabels,
  height = 240,
  formatY = (n) => String(n),
  formatTooltip,
  stacked = true,
  interactive = true,
  maxGridlines = 5,
  className,
}: BarChartProps) {
  const [ref, width] = useWidth();
  const [active, setActive] = React.useState<number | null>(null);
  const fmtTip = formatTooltip ?? formatY;

  const padL = 44;
  const padB = 22;
  const padT = 8;
  const padR = 8;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = Math.max(0, height - padT - padB);
  const n = xLabels.length;

  const totals = xLabels.map((_, i) => series.reduce((s, ser) => s + (ser.data[i] ?? 0), 0));
  const dataMax = stacked ? Math.max(0, ...totals) : Math.max(0, ...series.flatMap((s) => s.data.map((v) => v ?? 0)));
  const ticks = niceTicks(0, dataMax, maxGridlines);
  const yMax = ticks[ticks.length - 1] || 1;
  const y = (v: number) => padT + innerH - (v / yMax) * innerH;

  const band = n > 0 ? innerW / n : innerW;
  const barW = Math.min(40, band * 0.62);
  const cx = (i: number) => padL + (i + 0.5) * band;
  const labelStep = Math.max(1, Math.ceil((n * 64) / Math.max(1, innerW)));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || n < 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - rect.left - padL) / band)));
    setActive(i);
  };

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          className="overflow-visible"
          onMouseMove={onMove}
          onMouseLeave={() => setActive(null)}
        >
          {ticks.map((t) => {
            const gy = y(t);
            return (
              <g key={t}>
                <line x1={padL} x2={width - padR} y1={gy} y2={gy} className="stroke-border" strokeWidth={1} />
                <text x={padL - 8} y={gy} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-micro tabular-nums">
                  {formatY(t)}
                </text>
              </g>
            );
          })}

          {active != null && (
            <rect x={cx(active) - band / 2} y={padT} width={band} height={innerH} className="fill-muted/60" pointerEvents="none" />
          )}

          {xLabels.map((lbl, i) =>
            i % labelStep === 0 ? (
              <text key={i} x={cx(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-micro">
                {lbl}
              </text>
            ) : null,
          )}

          {xLabels.map((_, i) => {
            if (stacked) {
              // The topmost non-zero segment gets the rounded top.
              let topIdx = -1;
              for (let si = 0; si < series.length; si++) if ((series[si].data[i] ?? 0) > 0) topIdx = si;
              let acc = 0;
              return (
                <g key={i}>
                  {series.map((s, si) => {
                    const v = s.data[i] ?? 0;
                    const y0 = y(acc);
                    const y1 = y(acc + v);
                    acc += v;
                    const h = Math.max(0, y0 - y1);
                    if (h <= 0) return null;
                    const bx = cx(i) - barW / 2;
                    return si === topIdx ? (
                      <path key={si} d={topRoundedRect(bx, y1, barW, h, 3)} className={catColor(s, si)} fill="currentColor" />
                    ) : (
                      <rect key={si} x={bx} y={y1} width={barW} height={h} className={catColor(s, si)} fill="currentColor" />
                    );
                  })}
                </g>
              );
            }
            const sub = barW / Math.max(1, series.length);
            return (
              <g key={i}>
                {series.map((s, si) => {
                  const v = s.data[i] ?? 0;
                  const y1 = y(v);
                  const h = Math.max(0, padT + innerH - y1);
                  return h > 0 ? (
                    <path key={si} d={topRoundedRect(cx(i) - barW / 2 + si * sub, y1, Math.max(1, sub - 1), h, 2)} className={catColor(s, si)} fill="currentColor" />
                  ) : null;
                })}
              </g>
            );
          })}
        </svg>
      )}

      {active != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-2 text-caption text-popover-foreground shadow-lg"
          style={{ left: Math.max(70, Math.min(width - 70, cx(active))) }}
        >
          <div className="mb-1 font-medium text-foreground">{xLabels[active]}</div>
          <div className="flex flex-col gap-1">
            {series.map((s, si) => (
              <div key={si} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={cn("size-2 shrink-0 rounded-[3px] bg-current", catColor(s, si))} />
                  {s.label ?? "Value"}
                </span>
                <span className="font-medium tabular-nums text-foreground">{fmtTip(s.data[active] ?? 0)}</span>
              </div>
            ))}
            {stacked && series.length > 1 && (
              <div className="mt-0.5 flex items-center justify-between gap-4 border-t border-border pt-1">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium tabular-nums text-foreground">{fmtTip(totals[active])}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
