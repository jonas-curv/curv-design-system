"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

export type MobileChartPoint = { label: string; value: number | null; display?: string };

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
  caption?: [React.ReactNode, React.ReactNode];
  /** Plot aspect. The height follows the container width, so a phone never
   *  gets a desktop pixel height. 2.4 is a phone-shaped chart. */
  ratio?: number;
  /** Touch scrubbing instead of hover. On by default when the series has depth. */
  scrub?: boolean;
  emptyMessage?: string;
  className?: string;
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
  className,
}: MobileChartProps) {
  const known = points.filter(point => point.value !== null);
  const scrubbable = (scrub ?? points.length > 2) && points.length > 1;
  const [active, setActive] = React.useState<number | null>(null);

  if (!known.length) return <figure className={cn("curv-mobile-chart", className)}><p className="curv-mobile-chart-empty">{emptyMessage}</p></figure>;

  const H = Math.round(W / ratio);
  const values = known.map(point => point.value as number);
  const referenceValues = (reference ?? []).filter((value): value is number => value !== null);
  const top = Math.max(0, ...values, ...referenceValues);
  const bottom = Math.min(0, ...values, ...referenceValues);
  const span = top - bottom || 1;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const y = (value: number) => PAD_TOP + plotH - ((value - bottom) / span) * plotH;
  const bars = variant === "bars";
  const band = (W - PAD_X * 2) / Math.max(1, points.length);
  const step = points.length > 1 ? (W - PAD_X * 2) / (points.length - 1) : 0;
  const x = (index: number) =>
    bars ? PAD_X + band * (index + 0.5) : points.length > 1 ? PAD_X + index * step : W / 2;
  const barW = Math.min(26, Math.max(5, band * 0.62));
  const zeroY = y(0);

  const shown = active === null ? null : points[active];
  const lastKnown = points.reduce((last, point, index) => (point.value === null ? last : index), -1);

  // Label every bar while they still fit; past that, only the peak and the end.
  const dense = points.length > 7;
  const peak = values.length ? points.findIndex(point => point.value === top && point.value !== null) : -1;
  const labelled = (index: number) => !dense || index === peak || index === lastKnown;

  const path = (series: (number | null)[]) => {
    let open = false;
    return series.map((value, index) => {
      if (value === null) { open = false; return ""; }
      const command = open ? "L" : "M";
      open = true;
      return `${command} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
    }).join(" ").trim();
  };

  const fillId = React.useId();

  return (
    <figure className={cn("curv-mobile-chart", className)}>
      {(headline || delta) && (
        <div className="curv-mobile-chart-head">
          {headline && <span className="curv-mobile-chart-value">{headline}</span>}
          {delta && <span className="curv-mobile-chart-delta" data-tone={deltaTone}>{delta}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {bottom < 0 && <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />}

        {reference && reference.length > 0 && (
          <path d={path(reference)} fill="none" stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.4" strokeDasharray="4 4" strokeLinejoin="round" />
        )}

        {variant === "bars"
          ? points.map((point, index) => {
              if (point.value === null) return null;
              const topY = Math.min(y(point.value), zeroY);
              const height = Math.max(2, Math.abs(y(point.value) - zeroY));
              return (
                <rect key={index} x={x(index) - barW / 2} y={topY} width={barW} height={height} rx="3"
                  fill="currentColor" fillOpacity={active === null || active === index ? 1 : 0.35} />
              );
            })
          : (
            <>
              <path d={`${path(points.map(point => point.value))} L ${x(lastKnown).toFixed(1)} ${zeroY.toFixed(1)} L ${x(points.findIndex(point => point.value !== null)).toFixed(1)} ${zeroY.toFixed(1)} Z`} fill={`url(#${fillId})`} />
              <path d={path(points.map(point => point.value))} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}

        {/* The value the reader came for, drawn into the plot. */}
        {variant === "bars"
          ? points.map((point, index) => point.value !== null && labelled(index) ? (
              <text key={index} x={x(index)} y={Math.min(y(point.value), zeroY) - 6} textAnchor="middle"
                fontSize="11" fontWeight="600" fill="currentColor" style={{ fontVariantNumeric: "tabular-nums" }}>
                {show(point, format)}
              </text>
            ) : null)
          : lastKnown >= 0 && (
              <>
                <circle cx={x(lastKnown)} cy={y(points[lastKnown].value as number)} r="3.5" fill="currentColor" stroke="var(--card, #fff)" strokeWidth="2" />
                <text x={x(lastKnown)} y={y(points[lastKnown].value as number) - 9} textAnchor="end"
                  fontSize="11" fontWeight="600" fill="currentColor" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {show(points[lastKnown], format)}
                </text>
              </>
            )}

        {shown && shown.value !== null && (
          <>
            <line x1={x(active as number)} x2={x(active as number)} y1={PAD_TOP - 8} y2={H - PAD_BOTTOM + 4} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
            <circle cx={x(active as number)} cy={y(shown.value)} r="4" fill="currentColor" stroke="var(--card, #fff)" strokeWidth="2" />
          </>
        )}

        {/* Axis labels: ends only, so they never collide on a 360px screen. */}
        <text x={PAD_X} y={H - 5} fontSize="10" fill="currentColor" fillOpacity="0.6">{points[0].label}</text>
        {points.length > 1 && (
          <text x={W - PAD_X} y={H - 5} fontSize="10" textAnchor="end" fill="currentColor" fillOpacity="0.6">{points[points.length - 1].label}</text>
        )}
      </svg>

      {scrubbable && (
        <>
          <input type="range" className="curv-mobile-chart-scrub" min={0} max={points.length - 1} step={1}
            value={active ?? lastKnown}
            aria-label={`Inspect ${label} by period`}
            aria-valuetext={`${(shown ?? points[lastKnown]).label}: ${show(shown ?? points[lastKnown], format)}`}
            onChange={event => setActive(Number(event.target.value))} />
          <div className="curv-mobile-chart-readout" aria-live="polite">
            <span>{(shown ?? points[lastKnown]).label}</span>
            <strong>{show(shown ?? points[lastKnown], format)}</strong>
          </div>
        </>
      )}

      {caption && <figcaption><span>{caption[0]}</span><span>{caption[1]}</span></figcaption>}
    </figure>
  );
}
