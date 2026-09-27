"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { HOME_COUNT_MS, motionAllowed, tween } from "./motion";

export interface CountTextProps {
  value: number;
  /** A stable, module-level formatter. An inline arrow re-runs the effect on every render. */
  format: (n: number) => string;
  /** Count up from this value once on entrance. `null` skips the entrance and only tweens later changes. */
  from?: number | null;
  /** Entrance delay in seconds. Later changes tween at once. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A number that counts up once on the page entrance and tweens to each later
 * value instead of swapping. The server renders the final value, so the
 * figure reads right before hydration, in a hidden tab and with motion
 * reduced; the tween writes the DOM directly, so it never re-renders the tree.
 */
export function CountText({ value, format, from = 0, delay = 0, className, style }: CountTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Where the next tween starts: `from` until the entrance plays, then the value on screen.
  const shown = useRef<number | null>(from);
  const entering = useRef(from != null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = shown.current;
    const settle = () => {
      shown.current = value;
      entering.current = false;
      el.textContent = format(value);
    };
    if (start == null || start === value || !motionAllowed()) {
      settle();
      return;
    }
    const waitMs = entering.current ? Math.max(0, delay) * 1000 : 0;
    el.textContent = format(start);
    // Torn down mid-tween (a quick second change, or strict mode running the
    // effect twice), the next run continues from the value on screen.
    return tween(
      start,
      value,
      HOME_COUNT_MS,
      waitMs,
      (v) => {
        entering.current = false;
        shown.current = v;
        el.textContent = format(v);
      },
      settle,
    );
  }, [value, format, delay]);

  return (
    <span ref={ref} className={className} style={style}>
      {format(value)}
    </span>
  );
}
