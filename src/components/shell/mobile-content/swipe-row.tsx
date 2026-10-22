"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { DotsIcon } from "./shared";

export interface MobileSwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  tone: "primary" | "positive" | "neutral";
  onAction: () => void;
}
export interface MobileSwipeRowProps {
  /** One row. Its own link or button keeps working. */
  children: React.ReactNode;
  /** At most two; extra actions are ignored. */
  actions: MobileSwipeAction[];
  /** Names the actions button and group for screen readers: "Row actions". */
  actionsLabel: string;
  className?: string;
}

const ACTION_WIDTH = 72;
/** Movement before we decide whether the finger is scrolling the page or swiping the row. */
const SLOP = 10;
/** px per ms. A flick faster than this decides the snap on its own. */
const FLICK = 0.35;

type Gesture = { id: number; x: number; y: number; base: number; mode: "pending" | "drag" | "scroll"; lastX: number; lastT: number; v: number; at: number };

/**
 * Reveals up to two actions on a leftward swipe. The row follows the finger with
 * pointer events (touch and mouse); `touch-action: pan-y` leaves vertical scrolling
 * to the browser, and a gesture only becomes a swipe once it is clearly horizontal.
 * Every action is also reachable without swiping: a button that is invisible until
 * it has keyboard focus opens the same actions and moves focus into them.
 */
export function MobileSwipeRow({ children, actions, actionsLabel, className }: MobileSwipeRowProps) {
  const list = actions.slice(0, 2);
  const width = list.length * ACTION_WIDTH;
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const group = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const gesture = React.useRef<Gesture | null>(null);
  const swallow = React.useRef(false);
  const focusActions = React.useRef(false);
  const groupId = React.useId();

  /** Drive the row directly while dragging: no React render per pointer move. */
  const paint = (x: number | null) => {
    const el = surface.current;
    const host = root.current;
    if (!el || !host) return;
    if (x === null) { el.style.transform = ""; delete host.dataset.dragging; return; }
    host.dataset.dragging = "true";
    el.style.transform = `translate3d(${x}px,0,0)`;
  };
  const settle = (next: boolean) => { paint(null); setOpen(next); };

  React.useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open]);

  React.useEffect(() => {
    if (open && focusActions.current) group.current?.querySelector<HTMLElement>("button")?.focus();
    focusActions.current = false;
  }, [open]);

  // Fewer actions than before can leave an open row stranded.
  React.useEffect(() => { if (!width) setOpen(false); }, [width]);

  if (!list.length) return <>{children}</>;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swallow.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, base: open ? -width : 0, mode: "pending", lastX: event.clientX, lastT: event.timeStamp, v: 0, at: open ? -width : 0 };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId || g.mode === "scroll") return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (g.mode === "pending") {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      if (Math.abs(dx) <= Math.abs(dy)) { g.mode = "scroll"; return; }
      g.mode = "drag";
      g.x = event.clientX; // start from here so the row does not jump by the slop distance
      swallow.current = true;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* the pointer may already be gone */ }
      return;
    }
    const raw = g.base + (event.clientX - g.x);
    // A little rubber past the last action; none past closed.
    const x = Math.min(0, raw < -width ? -width + (raw + width) * 0.25 : raw);
    g.at = x;
    const elapsed = Math.max(1, event.timeStamp - g.lastT);
    g.v = 0.6 * ((event.clientX - g.lastX) / elapsed) + 0.4 * g.v;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;
    paint(x);
  };
  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (g.mode !== "drag") return;
    // The click that follows a drag must not follow the link underneath.
    window.setTimeout(() => { swallow.current = false; }, 350);
    if (cancelled) return settle(open);
    settle(Math.abs(g.v) > FLICK ? g.v < 0 : g.at < -width / 2);
  };

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (swallow.current) { swallow.current = false; event.preventDefault(); event.stopPropagation(); return; }
    // A tap on an open row closes it instead of opening the record. Keyboard activation (detail 0) passes through.
    if (open && event.detail > 0) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !open) return;
    const inside = root.current?.contains(document.activeElement) ?? false;
    setOpen(false);
    if (inside) trigger.current?.focus();
  };
  // Tabbing away closes the row; a null target (window blur, a tap on nothing) does not.
  const onBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (open && next && !root.current?.contains(next)) setOpen(false);
  };

  return (
    <div
      ref={root}
      className={cn("curv-mobile-swipe", className)}
      data-open={open}
      style={{ "--curv-swipe-width": `${width}px` } as React.CSSProperties}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div
        ref={surface}
        className="curv-mobile-swipe-surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={event => onPointerEnd(event, false)}
        onPointerCancel={event => onPointerEnd(event, true)}
        onClickCapture={onClickCapture}
        onDragStart={event => event.preventDefault()}
      >
        {children}
      </div>
      <button
        ref={trigger}
        type="button"
        className="curv-mobile-swipe-trigger"
        aria-label={actionsLabel}
        aria-expanded={open}
        aria-controls={groupId}
        onClick={() => { focusActions.current = !open; setOpen(!open); }}
      >
        <DotsIcon />
      </button>
      <div ref={group} id={groupId} className="curv-mobile-swipe-actions" role="group" aria-label={actionsLabel}>
        {list.map(action => (
          <button
            key={action.id}
            type="button"
            className={cn("curv-mobile-swipe-action", `curv-mobile-swipe-action-${action.tone}`)}
            onClick={() => {
              // Keyboard users keep their place: focus goes back to the actions button, not to nowhere.
              if (group.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
              action.onAction();
              setOpen(false);
            }}
          >
            {action.icon && <span className="curv-mobile-swipe-action-icon" aria-hidden="true">{action.icon}</span>}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
