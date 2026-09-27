"use client";

import { useRef, useState, type MouseEvent } from "react";
import { cx } from "./cx";

// Hover lift: each segment rises by a Gaussian falloff of its distance from
// the pointer, measured in segment pitches so the curve reads the same at any
// width.
const RISE = 1.15;
const SPREAD = 2.4;

export interface MonthClockProps {
  /** Today's day of the month, 1-based. */
  day: number;
  /** Days in the month. */
  days: number;
  /** "September". */
  month: string;
  /** The tooltip's month, "Sep". Defaults to the first three letters. */
  monthShort?: string;
  className?: string;
}

/**
 * "September  Day 27 of 30" beside one hairline segment per day. Past days are
 * ink, today stands taller and breathes, days to come are faint. Hovering lifts
 * the segments toward the pointer and names the nearest date. The strip hides
 * under 640px; the words stay.
 */
export function MonthClock({ day, days, month, monthShort = month.slice(0, 3), className }: MonthClockProps) {
  const strip = useRef<HTMLDivElement | null>(null);
  const segments = useRef<(HTMLSpanElement | null)[]>([]);
  const lastHot = useRef<number | null>(null);
  const [hot, setHot] = useState<{ index: number; left: number } | null>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const box = strip.current?.getBoundingClientRect();
    if (!box) return;
    let best = -1;
    let bestDist = Infinity;
    let bestLeft = 0;
    segments.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const pitch = Math.max(1, (r.width * 5) / 3);
      const dist = (e.clientX - center) / pitch;
      // Written straight to the element: this runs on every pointer move.
      el.style.transform = `scaleY(${(1 + RISE * Math.exp(-(dist * dist) / (2 * SPREAD * SPREAD))).toFixed(3)})`;
      if (Math.abs(dist) < bestDist) {
        bestDist = Math.abs(dist);
        best = i;
        bestLeft = center - box.left;
      }
    });
    // State only when the nearest segment changes: one render per segment crossed.
    if (best !== -1 && best !== lastHot.current) {
      lastHot.current = best;
      setHot({ index: best, left: bestLeft });
    }
  }

  function onLeave() {
    segments.current.forEach((el) => {
      if (el) el.style.transform = "";
    });
    lastHot.current = null;
    setHot(null);
  }

  return (
    <div className={cx("home-month-clock", className)}>
      <span className="home-month-label">
        <span className="home-month-name">{month}</span>
        <span>{`Day ${day} of ${days}`}</span>
      </span>
      <div
        ref={strip}
        role="img"
        aria-label={`Day ${day} of ${days}`}
        className="home-day-strip"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {Array.from({ length: days }, (_, i) => {
          const n = i + 1;
          const state = n === day ? "today" : n > day ? "future" : "past";
          const isHot = hot?.index === i;
          return (
            <span
              key={n}
              ref={(el) => {
                segments.current[i] = el;
              }}
              className={cx("home-day", state === "today" && !isHot && "home-breathe")}
              data-day={state}
              data-hot={isHot ? "" : undefined}
            />
          );
        })}
        {hot ? (
          <span className="home-day-tip" style={{ left: `${hot.left}px` }} aria-hidden="true">
            {hot.index + 1 === day ? `Today, ${monthShort} ${day}` : `${monthShort} ${hot.index + 1}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
