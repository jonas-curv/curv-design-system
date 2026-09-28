// Home motion, with no motion library: one entrance curve, one count
// duration, and a requestAnimationFrame tween small enough to read in one go.
// Shared by CountText; kept free of React so it stays a plain module.

/** The one entrance curve: a quick start that settles without a bounce. */
export const HOME_EASE = [0.16, 1, 0.3, 1] as const;

/** How long a number takes to count, in milliseconds. */
export const HOME_COUNT_MS = 800;

/**
 * CSS cubic-bezier(x1, y1, x2, y2) as a function of progress 0..1. Newton's
 * method for the x curve, with a bisection fallback where the slope is flat.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  function solve(target: number): number {
    let t = target;
    for (let i = 0; i < 8; i++) {
      const err = x(t) - target;
      if (Math.abs(err) < 1e-6) return t;
      const slope = dx(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= err / slope;
    }
    let lo = 0;
    let hi = 1;
    t = target;
    while (hi - lo > 1e-7) {
      const v = x(t);
      if (Math.abs(v - target) < 1e-6) return t;
      if (v < target) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : y(solve(t)));
}

const ease = cubicBezier(...HOME_EASE);

/** False on the server, in a hidden tab (no frames run there) and under reduced motion. */
export function motionAllowed(): boolean {
  if (typeof document === "undefined" || typeof requestAnimationFrame !== "function") return false;
  if (document.visibilityState !== "visible") return false;
  return !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/**
 * Tween a number from `from` to `to` on the home curve. `onFrame` gets each
 * eased value once the delay has passed; `onDone` fires once at the end.
 * Returns a stop function that cancels the next frame.
 */
export function tween(
  from: number,
  to: number,
  durationMs: number,
  delayMs: number,
  onFrame: (value: number) => void,
  onDone: () => void,
): () => void {
  let raf = 0;
  let start: number | null = null;
  const frame = (now: number) => {
    if (start === null) start = now + delayMs;
    const progress = (now - start) / durationMs;
    if (progress >= 1) {
      onDone();
      return;
    }
    if (progress >= 0) onFrame(from + (to - from) * ease(progress));
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
