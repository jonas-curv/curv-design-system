"use client";
import * as React from "react";
import { cn } from "../../lib/cn";

export type AskOrbState = "idle" | "searching" | "reading" | "writing";
/** 18 and 24 are the inline sizes, 20 sits in the phone's glass circle, 88 is the hero. */
export type AskOrbSize = 18 | 20 | 24 | 88;

export interface AskOrbProps {
  size?: AskOrbSize;
  /** `busy` alone still works and looks like searching. */
  busy?: boolean;
  state?: AskOrbState;
  className?: string;
}

/**
 * The Ask AI orb (Pool Water), ported from Customs OS. At rest it breathes slowly over a steady swirl; while working it
 * follows the agent: a sheen sweeps while it searches, a gentle beat while it reads, a slow breathing glow while it
 * writes. Decorative: the control that holds it carries the name. With reduced motion every animation stops and the
 * sheen is parked, so the states still differ.
 */
export function AskOrb({ size = 24, busy = false, state, className }: AskOrbProps) {
  const current: AskOrbState = state && state !== "idle" ? state : busy ? "searching" : "idle";
  return (
    <span
      className={cn("curv-orb", `curv-orb-s${size}`, current !== "idle" && `curv-orb-${current}`, className)}
      aria-hidden="true"
      data-busy={current !== "idle" ? "true" : undefined}
      data-state={current}
    >
      <i />
      <i />
      <i />
    </span>
  );
}

export type AskButtonVariant = "circle" | "labelled";

export interface AskButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> {
  /** `circle`: the phone variant, a 40px glass circle holding a 20px orb and no label, for a dark top bar.
   *  `labelled`: the white 40px button with the orb and the word, the desktop variant. Default `circle`. */
  variant?: AskButtonVariant;
  /** The panel the button opens is showing. */
  open?: boolean;
  /** The orb works while an answer streams, even with the panel closed. */
  busy?: boolean;
  state?: AskOrbState;
  /** The word on the labelled button and the accessible name of the circle. Default "Ask AI". */
  label?: string;
}

/**
 * The one Ask AI control for every OS. It always sits on a dark bar, so its colours are fixed (they do not follow the
 * app's theme). Pass it to `MobileHeader`'s `ask` slot, or put the labelled variant in a desktop top bar.
 */
export const AskButton = React.forwardRef<HTMLButtonElement, AskButtonProps>(function AskButton(
  { variant = "circle", open = false, busy = false, state, label = "Ask AI", className, ...props }, ref,
) {
  const circle = variant === "circle";
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={props["aria-label"] ?? (circle ? label : undefined)}
      data-variant={variant}
      className={cn("curv-ask", circle ? "curv-ask-circle" : "curv-ask-labelled", className)}
    >
      <AskOrb size={circle ? 20 : 18} busy={busy} state={state} />
      {!circle && label}
    </button>
  );
});
