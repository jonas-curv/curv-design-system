"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

export type MobileChartPoint = {
  label: string;
  value: number | null;
  display?: string;
  /** The period is not over ("so far today"). Drawn dashed with a hollow end point so it is never read as final. */
  partial?: boolean;
};

export interface MobileChartProps {
  /** Ordered series. A null value is "not known", never zero. */
  points: MobileChartPoint[];
  variant?: "bars" | "line";
  /** Same length as points. Drawn dashed behind the series — last period, plan, target. */
  reference?: (number | null)[];
  referenceLabel?: string;
  /** The number the screen is actually about. Sits above the plot, never inside it. */
  headline?: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: "up" | "down" | "flat";
  format?: (value: number) => string;
  /** Describes the series for screen readers. Required — the plot is not self-describing. */
  label: string;
  /** A note under the plot — freshness, source, coverage. The axis ends are
   *  already drawn inside the plot, so do not repeat them here. */
  caption?: [React.ReactNode, React.ReactNode];
  /** Plot aspect. The height follows the container width, so a phone never
   *  gets a desktop pixel height. 2.4 is a phone-shaped chart. */
  ratio?: number;
  /** Touch scrubbing instead of hover. On by default for a line without future slots; with future slots the input
   *  is sized to the plotted part of the x axis. */
  scrub?: boolean;
  emptyMessage?: string;
  className?: string;
  /** "dark" is for the hero panel on the black header: dark gridlines, a blue line, light labels. */
  tone?: "light" | "dark";
  /** A dashed horizontal comparison, e.g. last month's average. Drawn as "{label} {value}" above the line, at its right end
   *  when future slots leave that side empty and at its left end otherwise. */
  referenceLine?: { value: number; label: string; display?: string };
  /** Empty slots after the last point, so the rest of the period stays on the x axis. */
  futureSlots?: number;
  /** The right-hand axis label. Defaults to the last point's label; with future slots it defaults to none. */
  endLabel?: string;
  /** Horizontal gridlines. On by default for the dark tone. */
  grid?: boolean;
  /** Said after the label of a partial point in the readout and the screen-reader text. Default "so far". */
  partialLabel?: string;
}

const W = 260;
const PAD_X = 6;
const PAD_TOP = 20;
const PAD_BOTTOM = 20;
const defaultFormat = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const show = (point: MobileChartPoint, format: (value: number) => string) =>
  point.display ?? (point.value === null ? "—" : format(point.value));

/**
 * A chart sized by viewBox, not by measurement: it paints on the first frame
 * with no ResizeObserver and no fixed pixel height, and it scales down with
 * the phone instead of pushing the headline off screen. Values are drawn into
 * the plot because a finger cannot hover a tooltip.
 */
export function MobileChart({
  points, variant = "bars", reference, referenceLabel, headline, delta, deltaTone = "flat",
  format = defaultFormat, label, caption, ratio = 2.4, scrub, emptyMessage = "No data for this period.",
  className, tone = "light", referenceLine, futureSlots = 0, endLabel, grid, partialLabel = "so far",
}: MobileChartProps) {
  // Every hook sits above the early return: a series can go from data to all-null and back without changing the hook count.
  const fillId = React.useId();
  const [pointer, setActive] = React.useState<number | null>(null);
  const known = points.filter(point => point.value !== null);
  const future = Math.max(0, Math.floor(futureSlots));
  // Scrubbing a series that stops short of the axis would put the thumb at the far right, away from the last point.
  const scrubbable = (scrub ?? (variant === "line" && future === 0)) && points.length > 1;
  // A different series can be shorter than the one that was being scrubbed.
  const active = pointer !== null && pointer < points.length ? pointer : null;

  const dark = tone === "dark";
  const figureClass = cn("curv-mobile-chart", dark && "curv-mobile-chart-dark", className);
  if (!known.length) return <figure className={figureClass}><p className="curv-mobile-chart-empty">{emptyMessage}</p></figure>;

  const H = Math.round(W / ratio);
  const values = known.map(point => point.value as number);
  const referenceValues = (reference ?? []).filter((value): value is number => value !== null);
  const lineValue = referenceLine ? [referenceLine.value] : [];
  const top = Math.max(0, ...values, ...referenceValues, ...lineValue);
  const bottom = Math.min(0, ...values, ...referenceValues, ...lineValue);
  const span = top - bottom || 1;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const y = (value: number) => PAD_TOP + plotH - ((value - bottom) / span) * plotH;
  const bars = variant === "bars";
  const slots = points.length + future;
  const band = (W - PAD_X * 2) / Math.max(1, slots);
  const step = slots > 1 ? (W - PAD_X * 2) / (slots - 1) : 0;
  const x = (index: number) =>
    bars ? PAD_X + band * (index + 0.5) : slots > 1 ? PAD_X + index * step : W / 2;
  const barW = Math.min(26, Math.max(5, band * 0.62));
  const zeroY = y(0);

  const shown = active === null ? null : points[active];
  const lastKnown = points.reduce((last, point, index) => (point.value === null ? last : index), -1);

  // Label every bar while the labels actually fit their band; past that, only
  // the peak and the latest value. Counting points was wrong: "$52,800" needs
  // four times the room of "12".
  const FONT = 11;
  const textWidth = (text: string) => text.length * FONT * 0.58;
  const slot = bars ? band : step;
  const fitsAll = points.every(point => point.value === null || textWidth(show(point, format)) <= slot - 2);
  const peak = points.findIndex(point => point.value !== null && point.value === top);
  // With only two labels left, drop the peak when it would sit on the latest.
  const peakClear = peak >= 0 && peak !== lastKnown
    && Math.abs(x(peak) - x(lastKnown)) > (textWidth(show(points[peak], format)) + textWidth(show(points[lastKnown], format))) / 2 + 4;
  const labelled = (index: number) => fitsAll || index === lastKnown || (index === peak && peakClear);
  // Keep the outermost labels inside the viewBox instead of hanging off the card.
  const anchorAt = (index: number, width: number): { anchor: "start" | "middle" | "end"; at: number } => {
    const centre = x(index);
    if (centre - width / 2 < 0) return { anchor: "start", at: 0 };
    if (centre + width / 2 > W) return { anchor: "end", at: W };
    return { anchor: "middle", at: centre };
  };

  const path = (series: (number | null)[]) => {
    let open = false;
    return series.map((value, index) => {
      if (value === null) { open = false; return ""; }
      const command = open ? "L" : "M";
      open = true;
      return `${command} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
    }).join(" ").trim();
  };

  // A partial last point is the period still in progress: a dashed segment into a hollow dot, never a solid "final".
  const partialAt = lastKnown >= 0 && points[lastKnown].partial ? lastKnown : -1;
  const solidSeries = points.map((point, index) => (index === partialAt ? null : point.value));
  const partialFrom = partialAt > 0 && points[partialAt - 1].value !== null ? partialAt - 1 : -1;
  const spoken = (point: MobileChartPoint) => point.partial ? `${point.label} ${partialLabel}` : point.label;
  const gridOn = grid ?? dark;
  const lineText = referenceLine ? `${referenceLine.label} ${referenceLine.display ?? format(referenceLine.value)}` : null;
  const partialText = partialAt >= 0 ? `Latest period, ${spoken(points[partialAt])}` : null;
  const summary = [label, lineText, partialText].filter(Boolean).join(". ");
  // The input spans the plotted part of the axis: the last point's slot, not the whole width.
  const plotted = bars ? PAD_X + band * points.length : x(points.length - 1) + PAD_X;
  const scrubWidth = future > 0 ? `${Math.min(100, (plotted / W) * 100).toFixed(2)}%` : undefined;
  const readout = shown ?? points[lastKnown];
  const lineY = referenceLine ? y(referenceLine.value) : 0;
  const endText = endLabel ?? (future > 0 ? undefined : points.length > 1 ? points[points.length - 1].label : undefined);

  return (
    <figure className={figureClass}>
      {(headline || delta) && (
        <div className="curv-mobile-chart-head">
          {headline && <span className="curv-mobile-chart-value">{headline}</span>}
          {delta && <span className="curv-mobile-chart-delta" data-tone={deltaTone}>{delta}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop className="curv-mobile-chart-area-top" offset="0" stopColor="currentColor" stopOpacity="0.18" />
            <stop className="curv-mobile-chart-area-bottom" offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridOn && [0, 0.5, 1].map(fraction => {
          const gy = PAD_TOP + plotH * fraction;
          return <line key={fraction} className="curv-mobile-chart-grid" x1="0" x2={W} y1={gy} y2={gy} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />;
        })}
        {bottom < 0 && <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />}

        {reference && reference.length > 0 && (
          <path className="curv-mobile-chart-ref" d={path(reference)} fill="none" stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.4" strokeDasharray="4 4" strokeLinejoin="round" />
        )}

        {referenceLine && (
          <>
            <line className="curv-mobile-chart-ref" x1={PAD_X} x2={W - PAD_X} y1={lineY} y2={lineY} stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.4" strokeDasharray="4 4" />
            <text className="curv-mobile-chart-ref-label" x={future > 0 ? W - PAD_X : PAD_X} y={lineY - 5 < 10 ? lineY + 13 : lineY - 5} textAnchor={future > 0 ? "end" : "start"} fontSize="10" fill="currentColor" fillOpacity="0.6" style={{ fontVariantNumeric: "tabular-nums" }}>{lineText}</text>
          </>
        )}

        {variant === "bars"
          ? points.map((point, index) => {
              if (point.value === null) return null;
              const topY = Math.min(y(point.value), zeroY);
              const height = Math.max(2, Math.abs(y(point.value) - zeroY));
              return (
                <rect key={index} x={x(index) - barW / 2} y={topY} width={barW} height={height} rx="3"
                  fill="currentColor" fillOpacity={point.partial ? 0.28 : active === null || active === index ? 1 : 0.35}
                  {...(point.partial ? { stroke: "currentColor", strokeWidth: 1.2, strokeDasharray: "3 2" } : {})} />
              );
            })
          : (
            <>
              <path d={`${path(points.map(point => point.value))} L ${x(lastKnown).toFixed(1)} ${zeroY.toFixed(1)} L ${x(points.findIndex(point => point.value !== null)).toFixed(1)} ${zeroY.toFixed(1)} Z`} fill={`url(#${fillId})`} />
              <path className="curv-mobile-chart-line" d={path(solidSeries)} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
              {partialFrom >= 0 && (
                <path className="curv-mobile-chart-line curv-mobile-chart-line-partial" d={`M ${x(partialFrom).toFixed(1)} ${y(points[partialFrom].value as number).toFixed(1)} L ${x(partialAt).toFixed(1)} ${y(points[partialAt].value as number).toFixed(1)}`} fill="none" stroke="currentColor" strokeWidth="2.25" strokeDasharray="3 4" strokeLinecap="round" />
              )}
            </>
          )}

        {/* The value the reader came for, drawn into the plot. */}
        {variant === "bars"
          ? points.map((point, index) => {
              if (point.value === null || !labelled(index)) return null;
              const text = show(point, format);
              const { anchor, at } = anchorAt(index, textWidth(text));
              return (
                <text key={index} className="curv-mobile-chart-label" x={at} y={Math.min(y(point.value), zeroY) - 6} textAnchor={anchor}
                  fontSize={FONT} fontWeight="600" fill="currentColor" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {text}
                </text>
              );
            })
          : lastKnown >= 0 && (
              <>
                {partialAt === lastKnown
                  ? <circle className="curv-mobile-chart-dot curv-mobile-chart-dot-partial" cx={x(lastKnown)} cy={y(points[lastKnown].value as number)} r="3.5" fill="var(--card, #fff)" stroke="currentColor" strokeWidth="2" />
                  : <circle className="curv-mobile-chart-dot" cx={x(lastKnown)} cy={y(points[lastKnown].value as number)} r="3.5" fill="currentColor" stroke="var(--card, #fff)" strokeWidth="2" />}
                <text className="curv-mobile-chart-label" x={Math.min(W, x(lastKnown) + 2)} y={Math.max(FONT, y(points[lastKnown].value as number) - 9)} textAnchor="end"
                  fontSize={FONT} fontWeight="600" fill="currentColor" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {show(points[lastKnown], format)}
                </text>
              </>
            )}

        {shown && shown.value !== null && (
          <>
            <line x1={x(active as number)} x2={x(active as number)} y1={PAD_TOP - 8} y2={H - PAD_BOTTOM + 4} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
            <circle className="curv-mobile-chart-dot" cx={x(active as number)} cy={y(shown.value)} r="4" fill="currentColor" stroke="var(--card, #fff)" strokeWidth="2" />
          </>
        )}

        {/* Axis labels: ends only, so they never collide on a 360px screen. */}
        <text className="curv-mobile-chart-axis" x={PAD_X} y={H - 5} fontSize="10" fill="currentColor" fillOpacity="0.6">{points[0].label}</text>
        {endText && (
          <text className="curv-mobile-chart-axis" x={W - PAD_X} y={H - 5} fontSize="10" textAnchor="end" fill="currentColor" fillOpacity="0.6">{endText}</text>
        )}
      </svg>

      {scrubbable && (
        <>
          <input type="range" className="curv-mobile-chart-scrub" min={0} max={points.length - 1} step={1}
            value={active ?? lastKnown}
            style={scrubWidth ? { width: scrubWidth } : undefined}
            aria-label={`Inspect ${label} by period`}
            aria-valuetext={`${spoken(readout)}: ${show(readout, format)}`}
            onChange={event => setActive(Number(event.target.value))} />
          <div className="curv-mobile-chart-readout" aria-live="polite">
            <span>{spoken(readout)}</span>
            <strong>{show(readout, format)}</strong>
          </div>
        </>
      )}

      {caption && <figcaption><span>{caption[0]}</span><span>{caption[1]}</span></figcaption>}
    </figure>
  );
}
