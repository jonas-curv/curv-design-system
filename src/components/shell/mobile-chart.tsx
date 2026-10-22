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
  /** Touch scrubbing instead of hover: press or drag on the chart and it snaps to the nearest period, which says its value in the plot.
   *  On by default for a line without future slots. Keyboard and screen-reader users get the same through a visually hidden
   *  range input (arrows move it, Escape clears it). */
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
/** A touch has to travel this far (px) before it is a drag; sideways, it scrubs, and mostly downwards or upwards the page scrolls. */
const SCRUB_SLOP = 6;
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
  // The press that is being tracked on the plot. `scrubbing` is set once it is a drag (a mouse or pen is one from the start);
  // `prior` is what was selected before it, so a tap on the selected period can clear it.
  const gesture = React.useRef<{ id: number; x: number; y: number; scrubbing: boolean; moved: boolean; prior: number | null } | null>(null);
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
  // A bar is dimmed against the one being read; a period with no value has no bar to read, so nothing is dimmed for it.
  const dimOthers = shown !== null && shown.value !== null;
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
  /** The horizontal extent of text of `width` placed at `at` with `anchor`. */
  const spanOf = (anchor: "start" | "middle" | "end", at: number, width: number): [number, number] =>
    anchor === "start" ? [at, at + width] : anchor === "end" ? [at - width, at] : [at - width / 2, at + width / 2];
  /** A bar's top; a period with no value has no bar, so its label stands on the baseline. */
  const barTop = (index: number) => (points[index].value === null ? zeroY : Math.min(y(points[index].value as number), zeroY));

  // Bar labels. A label wider than its band reaches over the neighbouring bars, so it is lifted above the tallest bar
  // under it (never drawn across a bar), and the selected bar's label always shows. A lifted label gets a thin leader down
  // to its own bar, so it is never read as the value of the tall bar beneath it. When two labels would touch, the
  // selected one wins, then the latest, then the peak.
  type BarLabel = { index: number; text: string; anchor: "start" | "middle" | "end"; at: number; baseline: number; top: number; lifted: boolean };
  const barLabels: BarLabel[] = [];
  if (bars) {
    const order: number[] = [];
    const want = (index: number, unknown = false) => { if (index >= 0 && (unknown || points[index].value !== null) && !order.includes(index)) order.push(index); };
    // The period being read always says what it is, even when it has no value: the app's own words for it, or a dash. Never nothing.
    if (active !== null) want(active, true);
    want(lastKnown);
    if (peak >= 0 && labelled(peak)) want(peak);
    points.forEach((_, index) => { if (labelled(index)) want(index); });
    const taken: [number, number][] = [];
    for (const index of order) {
      const text = show(points[index], format);
      const width = textWidth(text);
      const { anchor, at } = anchorAt(index, width);
      const [left, right] = spanOf(anchor, at, width);
      if (taken.some(([from, to]) => left < to + 3 && right > from - 3)) continue;
      taken.push([left, right]);
      let ceiling = barTop(index);
      points.forEach((point, other) => {
        if (point.value === null) return;
        if (x(other) + barW / 2 > left - 1 && x(other) - barW / 2 < right + 1) ceiling = Math.min(ceiling, barTop(other));
      });
      const baseline = Math.max(FONT, ceiling - 6);
      // A label that had to rise above a taller neighbour no longer sits on its own bar, so it is tied to it by a leader.
      barLabels.push({ index, text, anchor, at, baseline, top: barTop(index), lifted: baseline < barTop(index) - 6.5 });
    }
  }

  const path = (series: (number | null)[]) => {
    let open = false;
    return series.map((value, index) => {
      if (value === null) { open = false; return ""; }
      const command = open ? "L" : "M";
      open = true;
      return `${command} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
    }).join(" ").trim();
  };
  // A known value with a gap on both sides has no segment and no area, so it would not be drawn at all: it gets a dot. (The latest
  // value has its own, and so does the one being read.)
  const lone = bars ? [] : points.flatMap((point, index) =>
    point.value !== null && points[index - 1]?.value == null && points[index + 1]?.value == null && index !== lastKnown && index !== active ? [index] : []);

  // A partial last point is the period still in progress: a dashed segment into a hollow dot, never a solid "final".
  const partialAt = lastKnown >= 0 && points[lastKnown].partial ? lastKnown : -1;
  const solidSeries = points.map((point, index) => (index === partialAt ? null : point.value));
  const partialFrom = partialAt > 0 && points[partialAt - 1].value !== null ? partialAt - 1 : -1;
  const spoken = (point: MobileChartPoint) => point.partial ? `${point.label} ${partialLabel}` : point.label;
  const gridOn = grid ?? dark;
  const lineText = referenceLine ? `${referenceLine.label} ${referenceLine.display ?? format(referenceLine.value)}` : null;
  const partialText = partialAt >= 0 ? `Latest period, ${spoken(points[partialAt])}` : null;
  const summary = [label, lineText, partialText].filter(Boolean).join(". ");
  const readout = shown ?? points[lastKnown];
  const lineY = referenceLine ? y(referenceLine.value) : 0;
  const endText = endLabel ?? (future > 0 ? undefined : points.length > 1 ? points[points.length - 1].label : undefined);

  // The comparison line runs the whole plot; its label (10px) sits above it at its right end, or its left end without future slots.
  const refWidth = referenceLine ? textWidth(lineText ?? "") * (10 / FONT) : 0;
  const refBaseline = lineY - 5 < 10 ? lineY + 13 : lineY - 5;
  const refFrom = future > 0 ? W - PAD_X - refWidth : PAD_X;
  const refTo = future > 0 ? W - PAD_X : PAD_X + refWidth;
  // Where a line label sits above its point: over the highest part of the line under the text, then clear of the comparison line
  // and its label. The text spans about [baseline - 9, baseline + 3]; a band it touches moves it to just above that band.
  const labelAbove = (pointY: number, left: number, right: number, refLabel = true) => {
    let ceiling = pointY;
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index].value;
      const to = points[index + 1].value;
      if (from === null || to === null) continue;
      const x0 = x(index);
      const x1 = x(index + 1);
      const lo = Math.max(x0, left - 2);
      const hi = Math.min(x1, right + 2);
      if (lo > hi || x1 === x0) continue;
      const at = (px: number) => y(from) + ((y(to) - y(from)) * (px - x0)) / (x1 - x0);
      ceiling = Math.min(ceiling, at(lo), at(hi));
    }
    // What else is in the way, as bands of y: the comparison line, and its label where the text would reach it.
    const obstacles: [number, number][] = [];
    if (referenceLine) {
      obstacles.push([lineY - 1.5, lineY + 1.5]);
      if (refLabel && left < refTo && right > refFrom) obstacles.push([refBaseline - 10, refBaseline + 2]);
    }
    let baseline = Math.min(pointY - 9, ceiling - 7);
    for (let pass = 0; pass < obstacles.length; pass += 1) {
      const hit = obstacles.find(([from, to]) => baseline + 3 > from && baseline - 9 < to);
      if (!hit) break;
      baseline = hit[0] - 3;
    }
    return baseline;
  };

  // The line's latest value. With room to the right of the end point (future slots leave it empty) it sits beside the point,
  // where no segment of the series can reach. Otherwise it sits above the point, right-aligned and clamped inside the plot; if
  // the line falls into its end (the dashed segment of a period still in progress usually does), the label rises above the
  // highest part of the line under it. Either way no part of the series crosses the text, and neither does the comparison
  // line or its label: beside is refused when the end point is on that line, and above steps over it.
  type LineLabel = { text: string; anchor: "start" | "middle" | "end"; at: number; baseline: number; left: number; right: number };
  let endValue: LineLabel | null = null;
  if (!bars && lastKnown >= 0) {
    const text = show(points[lastKnown], format);
    const width = textWidth(text);
    const endX = x(lastKnown);
    const endY = y(points[lastKnown].value as number);
    const besideX = endX + 9;
    const beside = { text, anchor: "start" as const, at: besideX, baseline: endY + FONT * 0.35, left: besideX, right: besideX + width };
    const onRefLine = referenceLine !== undefined && Math.abs(endY - lineY) < FONT / 2 + 2;
    const onRefLabel = referenceLine !== undefined
      && besideX < refTo && besideX + width > refFrom
      && beside.baseline - FONT < refBaseline + 2 && beside.baseline + 3 > refBaseline - 10;
    if (besideX + width <= W - PAD_X && !onRefLine && !onRefLabel) {
      endValue = beside;
    } else {
      const fits = endX + 2 - width >= 0;
      const right = fits ? Math.min(W, endX + 2) : width;
      const left = right - width;
      endValue = { text, anchor: fits ? "end" : "start", at: fits ? right : 0, baseline: Math.max(FONT, labelAbove(endY, left, right)), left, right };
    }
  }

  // The scrubbed period of a line says its value in the plot, above its dot, the way a bar does (the latest already has its own).
  // A period with no value says so with the app's own words for it, or a dash, in the middle of the plot where its dot would be.
  // The scrubbed value wins any text it would touch: the latest value steps aside while a period is being read, and so does the
  // comparison line's label when the value has nowhere else to go.
  let selectedValue: LineLabel | null = null;
  let refLabelHidden = false;
  if (!bars && active !== null && active !== lastKnown && shown) {
    const text = show(shown, format);
    const width = textWidth(text);
    const { anchor, at } = anchorAt(active, width);
    const [left, right] = spanOf(anchor, at, width);
    const pointY = shown.value === null ? PAD_TOP + plotH / 2 + 9 : y(shown.value);
    let baseline = labelAbove(pointY, left, right);
    // Stepping over the comparison line's label would take the text out of the plot: the label gives way for as long as the period is read.
    if (baseline < FONT && referenceLine) { refLabelHidden = true; baseline = labelAbove(pointY, left, right, false); }
    selectedValue = { text, anchor, at, baseline: Math.max(FONT, baseline), left, right };
    if (endValue && selectedValue.left < endValue.right + 3 && selectedValue.right > endValue.left - 3
      && selectedValue.baseline - 9 < endValue.baseline + 3 && selectedValue.baseline + 3 > endValue.baseline - 9) endValue = null;
  }

  // The guide of the selected period starts under any label of its own above it (a bar's, or the line's value), so it never runs through
  // the text. Without one it starts at the top of the plot.
  let guideTop = PAD_TOP - 8;
  if (shown && active !== null) {
    const guideX = x(active);
    const dotY = shown.value === null ? Infinity : y(shown.value);
    const own = bars
      ? barLabels.filter(item => item.index === active)
      : [endValue, selectedValue].filter((item): item is LineLabel => item !== null && item.left - 1 <= guideX && guideX <= item.right + 1 && item.baseline < dotY);
    for (const item of own) guideTop = Math.max(guideTop, item.baseline + 3);
  }

  // Which period is being read, written on the axis under its guide. It takes the place of an end label it would touch. It is bold,
  // so it is wider per character than the axis labels, and it stays inside the same PAD_X inset they do: at an end it starts or ends
  // exactly where the label it replaces does.
  const AXIS = 10;
  const axisWidth = (text: string, bold = false) => text.length * AXIS * (bold ? 0.65 : 0.58);
  const period = shown ? spoken(shown) : null;
  let periodAt: { anchor: "start" | "middle" | "end"; at: number } | null = null;
  if (period !== null) {
    const width = axisWidth(period, true);
    const centre = x(active as number);
    periodAt = centre - width / 2 < PAD_X ? { anchor: "start", at: PAD_X } : centre + width / 2 > W - PAD_X ? { anchor: "end", at: W - PAD_X } : { anchor: "middle", at: centre };
  }
  const periodSpan = period === null || periodAt === null ? null : spanOf(periodAt.anchor, periodAt.at, axisWidth(period, true));
  const touches = (from: number, to: number) => periodSpan !== null && periodSpan[0] < to + 6 && periodSpan[1] > from - 6;
  const startShown = !touches(PAD_X, PAD_X + axisWidth(points[0].label));
  const endShown = endText !== undefined && !touches(W - PAD_X - axisWidth(endText), W - PAD_X);

  // One closed shape per run of known values, down to the baseline. Closing a path with gaps in it would join the runs with
  // diagonals: a gap draws nothing, and a run of one point has no area.
  let area = "";
  for (let first = 0; first < points.length; first += 1) {
    if (points[first].value === null) continue;
    let last = first;
    while (last + 1 < points.length && points[last + 1].value !== null) last += 1;
    if (last > first) {
      area += `${area ? " " : ""}M ${x(first).toFixed(1)} ${zeroY.toFixed(1)}`;
      for (let index = first; index <= last; index += 1) area += ` L ${x(index).toFixed(1)} ${y(points[index].value as number).toFixed(1)}`;
      area += ` L ${x(last).toFixed(1)} ${zeroY.toFixed(1)} Z`;
    }
    first = last;
  }

  // Press or drag on the plot picks the nearest period (the same snap as the hidden range input). A mouse or pen picks as it goes
  // down; a finger only once it moves sideways (the page keeps vertical scrolling: touch-action: pan-y) or lifts, so a thumb that
  // starts on the chart to scroll never flashes a guide. A tap on the period that is already selected clears it.
  const indexAtPointer = (clientX: number, svg: Element) => {
    const box = svg.getBoundingClientRect();
    if (!box.width) return null;
    const px = ((clientX - box.left) / box.width) * W;
    const raw = bars ? (px - PAD_X) / band - 0.5 : (px - PAD_X) / step;
    return Math.min(points.length - 1, Math.max(0, Math.round(raw)));
  };
  const grab = (event: React.PointerEvent<SVGSVGElement>) => { try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* the pointer may be gone */ } };
  const pick = (event: React.PointerEvent<SVGSVGElement>) => { const index = indexAtPointer(event.clientX, event.currentTarget); if (index !== null) setActive(index); };
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const direct = event.pointerType !== "touch";
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, scrubbing: direct, moved: false, prior: active };
    if (direct) { grab(event); pick(event); }
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const press = gesture.current;
    if (!press || press.id !== event.pointerId) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (Math.hypot(dx, dy) < SCRUB_SLOP) return;
    if (!press.scrubbing) {
      // Mostly vertical: the page is scrolling, and the browser is about to cancel this pointer.
      if (Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
      press.scrubbing = true;
      grab(event);
    }
    press.moved = true;
    pick(event);
  };
  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const press = gesture.current;
    if (!press || press.id !== event.pointerId) return;
    gesture.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    if (press.moved) return;
    const index = indexAtPointer(event.clientX, event.currentTarget);
    if (index !== null) setActive(index === press.prior ? null : index);
  };
  const onPointerCancel = (event: React.PointerEvent<SVGSVGElement>) => { if (gesture.current?.id === event.pointerId) gesture.current = null; };

  return (
    <figure className={figureClass}>
      {(headline || delta) && (
        <div className="curv-mobile-chart-head">
          {headline && <span className="curv-mobile-chart-value">{headline}</span>}
          {delta && <span className="curv-mobile-chart-delta" data-tone={deltaTone}>{delta}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}
        {...(scrubbable ? { "data-scrub": "true", onPointerDown, onPointerMove, onPointerUp, onPointerCancel } : {})}>
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
            {!refLabelHidden && <text className="curv-mobile-chart-ref-label" x={future > 0 ? W - PAD_X : PAD_X} y={lineY - 5 < 10 ? lineY + 13 : lineY - 5} textAnchor={future > 0 ? "end" : "start"} fontSize="10" fill="currentColor" fillOpacity="0.6" style={{ fontVariantNumeric: "tabular-nums" }}>{lineText}</text>}
          </>
        )}

        {variant === "bars"
          ? points.map((point, index) => {
              if (point.value === null) return null;
              const topY = Math.min(y(point.value), zeroY);
              const height = Math.max(2, Math.abs(y(point.value) - zeroY));
              return (
                <rect key={index} x={x(index) - barW / 2} y={topY} width={barW} height={height} rx="3"
                  fill="currentColor" fillOpacity={point.partial ? 0.28 : !dimOthers || active === index ? 1 : 0.35}
                  {...(point.partial ? { stroke: "currentColor", strokeWidth: 1.2, strokeDasharray: "3 2" } : {})} />
              );
            })
          : (
            <>
              {area && <path className="curv-mobile-chart-area" d={area} fill={`url(#${fillId})`} />}
              <path className="curv-mobile-chart-line" d={path(solidSeries)} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
              {lone.map(index => (
                <circle key={index} className="curv-mobile-chart-dot" cx={x(index)} cy={y(points[index].value as number)} r="3" fill="currentColor" stroke="var(--card, #fff)" strokeWidth="2" />
              ))}
              {partialFrom >= 0 && (
                <path className="curv-mobile-chart-line curv-mobile-chart-line-partial" d={`M ${x(partialFrom).toFixed(1)} ${y(points[partialFrom].value as number).toFixed(1)} L ${x(partialAt).toFixed(1)} ${y(points[partialAt].value as number).toFixed(1)}`} fill="none" stroke="currentColor" strokeWidth="2.25" strokeDasharray="3 4" strokeLinecap="round" />
              )}
            </>
          )}

        {/* The value the reader came for, drawn into the plot. */}
        {variant === "bars"
          ? barLabels.map(({ index, text, anchor, at, baseline, top, lifted }) => (
              <React.Fragment key={index}>
                {lifted && index !== active && (
                  <line className="curv-mobile-chart-leader" x1={x(index)} x2={x(index)} y1={baseline + 3} y2={top - 2} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
                )}
                <text className="curv-mobile-chart-label" x={at} y={baseline} textAnchor={anchor}
                  fontSize={FONT} fontWeight="600" fill="currentColor" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {text}
                </text>
              </React.Fragment>
            ))
          : lastKnown >= 0 && (
              <>
                {partialAt === lastKnown
                  ? <circle className="curv-mobile-chart-dot curv-mobile-chart-dot-partial" cx={x(lastKnown)} cy={y(points[lastKnown].value as number)} r="3.5" fill="var(--card, #fff)" stroke="currentColor" strokeWidth="2" />
                  : <circle className="curv-mobile-chart-dot" cx={x(lastKnown)} cy={y(points[lastKnown].value as number)} r="3.5" fill="currentColor" stroke="var(--card, #fff)" strokeWidth="2" />}
                {[endValue, selectedValue].map(item => item && (
                  <text key={item.text + item.at} className="curv-mobile-chart-label" x={item.at} y={item.baseline} textAnchor={item.anchor}
                    fontSize={FONT} fontWeight="600" fill="currentColor" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {item.text}
                  </text>
                ))}
              </>
            )}

        {shown && (
          <>
            <line x1={x(active as number)} x2={x(active as number)} y1={guideTop} y2={H - PAD_BOTTOM + 4} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
            {shown.value !== null && <circle className="curv-mobile-chart-dot" cx={x(active as number)} cy={y(shown.value)} r="4" fill="currentColor" stroke="var(--card, #fff)" strokeWidth="2" />}
          </>
        )}

        {/* Axis labels: the ends, so they never collide on a 360px screen. A period being read is written under its guide and
            takes the place of the end label it would touch. */}
        {startShown && <text className="curv-mobile-chart-axis" x={PAD_X} y={H - 5} fontSize={AXIS} fill="currentColor" fillOpacity="0.6">{points[0].label}</text>}
        {endText && endShown && (
          <text className="curv-mobile-chart-axis" x={W - PAD_X} y={H - 5} fontSize={AXIS} textAnchor="end" fill="currentColor" fillOpacity="0.6">{endText}</text>
        )}
        {period && periodAt && (
          <text className="curv-mobile-chart-period" x={periodAt.at} y={H - 5} fontSize={AXIS} fontWeight="600" textAnchor={periodAt.anchor} fill="currentColor">{period}</text>
        )}
      </svg>

      {/* Keyboard and screen-reader users scrub with this: it is visually hidden (see .curv-mobile-chart-scrub), the chart shows its
          focus ring, and the period and value it lands on are drawn in the plot, so nothing is said twice. */}
      {scrubbable && (
        <input type="range" className="curv-mobile-chart-scrub" min={0} max={points.length - 1} step={1}
          value={active ?? lastKnown}
          aria-label={`Inspect ${label} by period`}
          aria-valuetext={`${spoken(readout)}: ${show(readout, format)}`}
          onChange={event => setActive(Number(event.target.value))}
          onKeyDown={event => { if (event.key === "Escape" && active !== null) { event.stopPropagation(); setActive(null); } }} />
      )}

      {caption && <figcaption><span>{caption[0]}</span><span>{caption[1]}</span></figcaption>}
    </figure>
  );
}
