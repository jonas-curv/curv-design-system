"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { MobileFigure } from "./mobile-content/rows";
import type { MobileChartPoint, MobileChartProps } from "./mobile-chart";

/** A touch has to travel this far (px) before it is a drag; sideways it scrubs, mostly vertical the page scrolls. */
const SCRUB_SLOP = 6;
/** Assumed plot width for thinning axis labels: a phone's content width. The labels are real 12px text, never scaled. */
const PLOT_PX = 300;
const AXIS_PX_PER_CHAR = 7;
const defaultFormat = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

/**
 * The phone's chart (docs/mobile.md): a readout over scrubbable bars. One series, no second axis, no legend. Bars are drawn
 * as plain boxes, not scaled SVG, so axis text is true 12px and never shrinks with the card. The readout says the value and
 * the period of the bar under the finger and goes back to the current period when nothing is picked.
 */
export function MobileReadoutChart({
  points, referenceLine, readout, format = defaultFormat, label, caption, ratio = 2.4, emptyMessage = "No data for this period.",
  className, tone = "light", partialLabel = "so far", endLabel,
}: MobileChartProps) {
  const [pointer, setActive] = React.useState<number | null>(null);
  const gesture = React.useRef<{ id: number; x: number; y: number; scrubbing: boolean; moved: boolean; prior: number | null } | null>(null);
  const active = pointer !== null && pointer < points.length ? pointer : null;
  const figureClass = cn("curv-mobile-chart curv-mobile-chart-bars", tone === "dark" && "curv-mobile-chart-dark", className);
  const known = points.filter(point => point.value !== null);
  if (!known.length) return <figure className={figureClass}><p className="curv-mobile-chart-empty">{emptyMessage}</p></figure>;

  const show = (point: MobileChartPoint) => point.display ?? (point.value === null ? "—" : format(point.value));
  const spoken = (point: MobileChartPoint) => ((point.bar ?? (point.partial ? "partial" : "fill")) === "partial" ? `${point.label} ${partialLabel}` : point.label);
  const lastKnown = points.reduce((last, point, index) => (point.value === null ? last : index), -1);
  const explicit = points.findIndex(point => point.bar === "current");
  const current = explicit >= 0 ? explicit : lastKnown;

  const values = known.map(point => point.value as number);
  const top = Math.max(0, ...values, ...(referenceLine ? [referenceLine.value] : []));
  const bottom = Math.min(0, ...values, ...(referenceLine ? [referenceLine.value] : []));
  const span = top - bottom || 1;
  const pct = (value: number) => ((value - bottom) / span) * 100;
  const zero = pct(0);
  const count = points.length;

  const resting = points[current];
  const shown = active === null ? null : points[active];
  const readValue = shown ? show(shown) : readout && typeof readout === "object" && readout.value != null ? readout.value : show(resting);
  const readPeriod = shown ? spoken(shown) : readout && typeof readout === "object" && readout.period != null ? readout.period : spoken(resting);

  // Axis labels: as many as fit at 12px, anchored on the latest so it is always one of them. The label of a bar being read is always shown.
  const widest = Math.max(...points.map(point => point.label.length));
  const every = Math.max(1, Math.ceil((widest * AXIS_PX_PER_CHAR + 8) / (PLOT_PX / count)));
  const labelled = (index: number) => (count - 1 - index) % every === 0 || index === active;
  const lastLabel = endLabel ?? undefined;

  const lineText = referenceLine ? `${referenceLine.label} ${referenceLine.display ?? format(referenceLine.value)}` : null;
  const summary = [label, lineText].filter(Boolean).join(". ");
  const spokenCurrent = `${spoken(resting)}: ${show(resting)}`;

  const indexAt = (clientX: number, box: Element) => {
    const rect = box.getBoundingClientRect();
    if (!rect.width) return null;
    return Math.min(count - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * count)));
  };
  const grab = (event: React.PointerEvent<HTMLDivElement>) => { try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* the pointer may be gone */ } };
  const pick = (event: React.PointerEvent<HTMLDivElement>) => { const index = indexAt(event.clientX, event.currentTarget); if (index !== null) setActive(index); };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const direct = event.pointerType !== "touch";
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, scrubbing: direct, moved: false, prior: active };
    if (direct) { grab(event); pick(event); }
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const press = gesture.current;
    if (!press || press.id !== event.pointerId) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (Math.hypot(dx, dy) < SCRUB_SLOP) return;
    if (!press.scrubbing) {
      if (Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
      press.scrubbing = true;
      grab(event);
    }
    press.moved = true;
    pick(event);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const press = gesture.current;
    if (!press || press.id !== event.pointerId) return;
    gesture.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    if (press.moved) return;
    const index = indexAt(event.clientX, event.currentTarget);
    if (index !== null) setActive(index === press.prior ? null : index);
  };
  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => { if (gesture.current?.id === event.pointerId) gesture.current = null; };

  return (
    <figure className={figureClass} data-scrub="true">
      <MobileFigure value={readValue} label={readPeriod} live />
      <div
        className="curv-mobile-chart-plot"
        style={{ aspectRatio: String(ratio) }}
        role="img"
        aria-label={summary}
        data-picked={active !== null || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {bottom < 0 && <i className="curv-mobile-chart-zero" style={{ bottom: `${zero}%` }} />}
        {points.map((point, index) => {
          const plan = point.bar ?? (point.partial ? "partial" : "fill");
          const isCurrent = index === current;
          const barBottom = point.value === null ? zero : Math.min(pct(point.value), zero);
          const barHeight = point.value === null ? 0 : Math.abs(pct(point.value) - zero);
          return (
            <span key={index} className="curv-mobile-chart-col" style={{ left: `${(index / count) * 100}%`, width: `${100 / count}%` }}
              data-picked={active === index || undefined} data-dim={active !== null && active !== index ? true : undefined}>
              {point.value !== null && (
                <i className="curv-mobile-chart-bar" data-plan={plan === "current" ? "fill" : plan} data-current={isCurrent || undefined} style={{ bottom: `${barBottom}%`, height: `${barHeight}%` }} />
              )}
            </span>
          );
        })}
        {referenceLine && <i className="curv-mobile-chart-compare" style={{ bottom: `${pct(referenceLine.value)}%` }} />}
      </div>
      <div className="curv-mobile-chart-xaxis" aria-hidden="true">
        {points.map((point, index) => (
          <span key={index} data-picked={active === index || undefined}>{labelled(index) ? (index === count - 1 && lastLabel ? lastLabel : point.label) : ""}</span>
        ))}
      </div>

      {/* Keyboard and screen-reader users scrub with this: visually hidden, the readout above says where it is. */}
      <input type="range" className="curv-mobile-chart-scrub" min={0} max={count - 1} step={1}
        value={active ?? current}
        aria-label={`Inspect ${label} by period`}
        aria-valuetext={shown ? `${spoken(shown)}: ${show(shown)}` : spokenCurrent}
        onChange={event => setActive(Number(event.target.value))}
        onKeyDown={event => { if (event.key === "Escape" && active !== null) { event.stopPropagation(); setActive(null); } }} />

      {caption && <figcaption><span>{caption[0]}</span><span>{caption[1]}</span></figcaption>}
    </figure>
  );
}
