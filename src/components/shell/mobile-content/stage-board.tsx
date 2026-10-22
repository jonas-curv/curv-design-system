"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { idPart } from "../mobile-nav/id-part";
import { MobileMoveSheet } from "./move-sheet";
import { ContentLink, DotsIcon, formatCount, prefersReducedMotion, useIsomorphicLayoutEffect, type MobileContentRenderLink } from "./shared";

export interface MobileStageCard {
  id: string;
  title: string;
  /** Every card is a link to its record. */
  href: string;
  /** Only when the record has a photo. */
  cover?: { src: string; alt?: string };
  /** `label` names the owner for screen readers; `color` is any CSS color. */
  avatar?: { initials: string; color?: string; label: string };
  date?: { label: string; late?: boolean };
  /** Only when the record is not on track. */
  badge?: { label: string; tone: "critical" | "warning" };
}
export interface MobileStageColumn {
  id: string;
  label: string;
  /** Used on the chip when the full label is long. */
  shortLabel?: string;
  /** The true count for the stage. It can exceed `cards.length` when the read is capped. */
  count: number;
  cards: MobileStageCard[];
}
export interface MobileStageBoardProps {
  /** Names the board: "Projects by stage". */
  label: string;
  columns: MobileStageColumn[];
  activeColumnId: string;
  onActiveColumnChange?: (id: string) => void;
  /** Provide it to enable moving. The app confirms and persists; the board only reports the request. */
  onMove?: (cardId: string, toColumnId: string) => void;
  /** "Move to Review". Called with a column label; with "…" it names the generic action. */
  moveLabel?: (columnLabel: string) => string;
  /** Shown in a column with no cards. */
  emptyLabel?: string;
  renderLink?: MobileContentRenderLink;
  className?: string;
}

const LONG_PRESS_MS = 450;
/** Movement that turns a press into a scroll instead of a lift. */
const PRESS_SLOP = 8;
/** How close to the board's edge a lifted card must be to carry it to the next column. */
const EDGE = 52;
const EDGE_FIRST_MS = 380;
const EDGE_REPEAT_MS = 720;

type Press = {
  id: number; cardId: string; from: string; el: HTMLElement;
  x: number; y: number; dx: number; dy: number; scroll0: number;
  timer: number; edgeTimer: number; edge: -1 | 0 | 1;
  lifted: boolean; over: number; minDy: number; maxDy: number;
  /** Window listeners that end a lifted press even when the card is no longer in the document. */
  end: ((event: PointerEvent) => void) | null;
  done: boolean;
};

const defaultMoveLabel = (column: string) => `Move to ${column}`;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const blockTouchMove = (event: TouchEvent) => { if (event.cancelable) event.preventDefault(); };
const unbindEnd = (p: Press) => {
  if (!p.end) return;
  window.removeEventListener("pointerup", p.end);
  window.removeEventListener("pointercancel", p.end);
  p.end = null;
};
/** Focus fell to the page (or to an element that left it), so there is nothing deliberate to protect. */
const focusIsLost = () => {
  const focused = document.activeElement;
  return !focused || focused === document.body || !focused.isConnected;
};
/** Times, in ms after the sheet closes, at which a moved card's button is given focus if focus was lost. */
const REFOCUS_DELAYS = [0, 60, 180, 420, 900];
/** A move the app has not applied by now is not followed. */
const REFOCUS_WINDOW_MS = 8000;

/**
 * One column at a time, the next peeking from the right. Chips jump between columns, the
 * columns snap, and a card moves by long-press and drag or by its "Move to…" button. The
 * button is the whole feature for keyboard and screen-reader users; the gesture is a shortcut.
 */
export function MobileStageBoard({ label, columns, activeColumnId, onActiveColumnChange, onMove, moveLabel = defaultMoveLabel, emptyLabel, renderLink, className }: MobileStageBoardProps) {
  const uid = React.useId();
  const root = React.useRef<HTMLElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const chips = React.useRef<HTMLDivElement>(null);
  const columnEls = React.useRef<(HTMLElement | null)[]>([]);
  // `target` is the column the board is, or is heading, at. `busy` is set while we scroll it ourselves.
  // `settle` waits out a swipe, so the app hears about the column it stopped on and not every one it passed.
  const sync = React.useRef({ target: activeColumnId, busy: false, timer: 0, settle: 0 });
  /** Scroll events are quiet this long after our own scroll: it has finished, or never started. */
  const QUIET_MS = 140;
  /** Time a smooth scroll gets to produce its first event on a busy device before we call it stalled. */
  const START_MS = 700;
  const press = React.useRef<Press | null>(null);
  const suppressUntil = React.useRef(0);
  const refocus = React.useRef<{ cardId: string; from: string; at: number } | null>(null);
  const latest = React.useRef({ columns, onActiveColumnChange, onMove });
  latest.current = { columns, onActiveColumnChange, onMove };
  const [drag, setDrag] = React.useState<{ cardId: string; from: string; over: string } | null>(null);
  const [moving, setMoving] = React.useState<{ cardId: string; from: string } | null>(null);
  // The column the chips and the board show. It follows the prop, and the board's own scrolling and taps, so the chips
  // stay right when the app does not feed `onActiveColumnChange` back into `activeColumnId`.
  const [current, setCurrent] = React.useState(activeColumnId);
  const [seenProp, setSeenProp] = React.useState(activeColumnId);
  if (seenProp !== activeColumnId) { setSeenProp(activeColumnId); setCurrent(activeColumnId); }

  const indexOf = (id: string) => columns.findIndex(column => column.id === id);
  const gutter = () => (scroller.current ? parseFloat(getComputedStyle(scroller.current).paddingLeft) || 0 : 0);
  /** Scroll position that puts a column at the left edge. Pass the gutter when asking for several. */
  const leftFor = (index: number, edge = gutter()) => (columnEls.current[index]?.offsetLeft ?? 0) - edge;
  const nearest = () => {
    const el = scroller.current;
    if (!el) return 0;
    const edge = gutter();
    let best = 0;
    let distance = Infinity;
    columns.forEach((_, index) => { const d = Math.abs(leftFor(index, edge) - el.scrollLeft); if (d < distance) { distance = d; best = index; } });
    return best;
  };

  /** The board's own change of column: the chips follow at once, the app is told. */
  const choose = (id: string) => {
    setCurrent(id);
    latest.current.onActiveColumnChange?.(id);
  };
  const report = () => {
    const column = latest.current.columns[nearest()];
    if (column && column.id !== sync.current.target) { sync.current.target = column.id; choose(column.id); }
  };
  /** While we scroll the board ourselves, scroll events are ours: hold reporting until it has been still for a moment. */
  const hold = (wait = QUIET_MS) => {
    window.clearTimeout(sync.current.timer);
    sync.current.timer = window.setTimeout(() => {
      sync.current.busy = false;
      // A smooth scroll that stalled (a throttled tab, a busy device) still has to land where it was sent.
      const el = scroller.current;
      const index = indexOf(sync.current.target);
      if (el && index >= 0 && Math.abs(el.scrollLeft - leftFor(index)) > 2) { el.scrollTo({ left: leftFor(index), behavior: "auto" }); return; }
      if (!press.current?.lifted) report();
    }, wait);
  };
  /** A finger or wheel on the board takes it back from any scroll we started. */
  const takeOver = () => {
    if (!sync.current.busy || press.current?.lifted) return;
    sync.current.busy = false;
    window.clearTimeout(sync.current.timer);
  };
  const goTo = (id: string, behavior: ScrollBehavior) => {
    const index = indexOf(id);
    const el = scroller.current;
    if (index < 0 || !el) return;
    sync.current.target = id;
    sync.current.busy = true;
    hold(START_MS);
    el.scrollTo({ left: leftFor(index), behavior: behavior === "smooth" && prefersReducedMotion() ? "auto" : behavior });
  };

  // First paint at the active column, with no animation. Columns arriving later are placed the same way.
  useIsomorphicLayoutEffect(() => {
    const index = indexOf(activeColumnId);
    const el = scroller.current;
    if (index > 0 && el && Math.abs(el.scrollLeft - leftFor(index)) > 2) el.scrollLeft = leftFor(index);
  }, [columns.length]);

  // An active column that changed from outside (the app, the URL) moves the board; one we reported ourselves does not.
  React.useEffect(() => {
    if (sync.current.target !== activeColumnId) goTo(activeColumnId, "smooth");
  }, [activeColumnId]);

  // The active chip stays on screen, without moving the page.
  React.useEffect(() => {
    const row = chips.current;
    const chip = row?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (!row || !chip) return;
    const outside = chip.offsetLeft < row.scrollLeft + 8 || chip.offsetLeft + chip.offsetWidth > row.scrollLeft + row.clientWidth - 8;
    if (outside) row.scrollTo({ left: Math.max(0, chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [current]);

  // After a move made in the sheet the card sits in another column, so its "Move to…" button is a new element and
  // focus has fallen to the page. Give it back to that card, but only if focus is still lost: the app may have put
  // it somewhere on purpose (a confirmation, say).
  React.useEffect(() => {
    if (!refocus.current || moving !== null) return;
    let timer = 0;
    let step = 0;
    const ensure = () => {
      const pending = refocus.current;
      if (!pending) return;
      if (performance.now() - pending.at > REFOCUS_WINDOW_MS) { refocus.current = null; return; }
      const column = columns.find(candidate => candidate.cards.some(card => card.id === pending.cardId));
      if (!column) { refocus.current = null; return; }
      if (column.id === pending.from || !focusIsLost()) return;
      const button = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-card-id]") ?? []).find(el => el.dataset.cardId === pending.cardId);
      if (!button) return;
      button.focus();
      // Done once it has landed: a later refresh of the columns must not pull focus back from wherever the person went.
      if (document.activeElement === button) refocus.current = null;
    };
    const run = () => {
      ensure();
      if (step < REFOCUS_DELAYS.length) timer = window.setTimeout(run, REFOCUS_DELAYS[step++]);
    };
    run();
    return () => window.clearTimeout(timer);
  }, [columns, moving]);

  React.useEffect(() => () => {
    window.clearTimeout(sync.current.timer);
    window.clearTimeout(sync.current.settle);
    const p = press.current;
    if (p) { window.clearTimeout(p.timer); window.clearTimeout(p.edgeTimer); unbindEnd(p); }
    document.removeEventListener("touchmove", blockTouchMove);
  }, []);

  const paint = (p: Press) => {
    const el = scroller.current;
    const shift = el ? el.scrollLeft - p.scroll0 : 0;
    p.el.style.translate = `${p.dx + shift}px ${clamp(p.dy, p.minDy, p.maxDy)}px`;
  };

  const onScroll = () => {
    const p = press.current;
    if (p?.lifted) { paint(p); hold(); return; }
    if (sync.current.busy) { hold(); return; }
    // A swipe passes columns on its way. Hear about the one it stops on.
    window.clearTimeout(sync.current.settle);
    sync.current.settle = window.setTimeout(() => { if (!press.current?.lifted) report(); }, QUIET_MS);
  };

  const chooseColumn = (id: string) => {
    goTo(id, "smooth");
    choose(id);
  };

  // Long-press and drag. Only wired up when the app can handle a move.
  const stopPress = (p: Press, commit: boolean) => {
    if (p.done) return;
    p.done = true;
    window.clearTimeout(p.timer);
    window.clearTimeout(p.edgeTimer);
    unbindEnd(p);
    document.removeEventListener("touchmove", blockTouchMove);
    if (press.current === p) press.current = null;
    if (!p.lifted) return;
    suppressUntil.current = performance.now() + 450;
    p.el.style.translate = "";
    try { p.el.releasePointerCapture(p.id); } catch { /* already released */ }
    setDrag(null);
    const to = latest.current.columns[p.over];
    if (commit && to && to.id !== p.from) latest.current.onMove?.(p.cardId, to.id);
  };
  const carry = (p: Press, direction: -1 | 1) => {
    const next = clamp(p.over + direction, 0, latest.current.columns.length - 1);
    if (next === p.over) return;
    p.over = next;
    const column = latest.current.columns[next];
    goTo(column.id, "smooth");
    setDrag(dragging => (dragging ? { ...dragging, over: column.id } : dragging));
    choose(column.id);
  };
  const watchEdge = (p: Press, clientX: number) => {
    const el = scroller.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const edge: -1 | 0 | 1 = clientX > box.right - EDGE ? 1 : clientX < box.left + EDGE ? -1 : 0;
    if (edge === p.edge) return;
    p.edge = edge;
    window.clearTimeout(p.edgeTimer);
    if (!edge) return;
    const tick = (delay: number) => {
      p.edgeTimer = window.setTimeout(() => {
        if (press.current !== p || p.edge !== edge) return;
        carry(p, edge);
        tick(EDGE_REPEAT_MS);
      }, delay);
    };
    tick(EDGE_FIRST_MS);
  };
  const lift = (p: Press) => {
    const el = scroller.current;
    if (press.current !== p || !el) return;
    // A refresh re-parented or unmounted the card while the finger was down: there is nothing left to lift.
    if (!p.el.isConnected) { stopPress(p, false); return; }
    p.lifted = true;
    p.scroll0 = el.scrollLeft;
    p.over = nearest();
    const box = el.getBoundingClientRect();
    const card = p.el.getBoundingClientRect();
    p.minDy = Math.min(0, box.top - card.top);
    p.maxDy = Math.max(0, box.bottom - card.bottom);
    try { p.el.setPointerCapture(p.id); } catch { /* the pointer may be gone */ }
    // The browser decides whether a touch scrolls at its first move. Cancel that move, or the lift becomes a scroll.
    document.addEventListener("touchmove", blockTouchMove, { passive: false });
    setDrag({ cardId: p.cardId, from: p.from, over: latest.current.columns[p.over]?.id ?? p.from });
  };

  const onCardPointerDown = (event: React.PointerEvent<HTMLElement>, card: MobileStageCard, columnId: string) => {
    if (!onMove || press.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const p: Press = {
      id: event.pointerId, cardId: card.id, from: columnId, el: event.currentTarget,
      x: event.clientX, y: event.clientY, dx: 0, dy: 0, scroll0: 0, timer: 0, edgeTimer: 0, edge: 0,
      lifted: false, over: 0, minDy: 0, maxDy: 0, end: null, done: false,
    };
    p.timer = window.setTimeout(() => lift(p), LONG_PRESS_MS);
    // The release can land somewhere else if a data refresh re-parents or unmounts the card while the finger is down,
    // and the card's own pointer handlers never hear it. The window does. A card that left the document is not moved.
    p.end = (endEvent: PointerEvent) => { if (endEvent.pointerId === p.id) stopPress(p, endEvent.type === "pointerup" && p.el.isConnected); };
    window.addEventListener("pointerup", p.end);
    window.addEventListener("pointercancel", p.end);
    press.current = p;
  };
  const onCardPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || p.id !== event.pointerId) return;
    const dx = event.clientX - p.x;
    const dy = event.clientY - p.y;
    if (!p.lifted) { if (Math.hypot(dx, dy) > PRESS_SLOP) stopPress(p, false); return; }
    p.dx = dx;
    p.dy = dy;
    paint(p);
    watchEdge(p, event.clientX);
  };
  const onCardPointerEnd = (event: React.PointerEvent<HTMLElement>, commit: boolean) => {
    const p = press.current;
    if (p && p.id === event.pointerId) stopPress(p, commit);
  };
  const onCardClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    // The release after a lift is not a tap on the record.
    if (performance.now() < suppressUntil.current) { event.preventDefault(); event.stopPropagation(); }
  };

  const generic = moveLabel("…").replace(/\s+…$/, "…");
  const sourceOf = (id: string) => columns.find(column => column.id === id);
  const movingCard = moving ? sourceOf(moving.from)?.cards.find(card => card.id === moving.cardId) : undefined;

  return (
    <section ref={root} className={cn("curv-mobile-board", className)} aria-label={label}>
      <div ref={chips} className="curv-mobile-board-chips">
        {columns.map(column => {
          const active = column.id === current;
          return (
            <button
              key={column.id}
              type="button"
              className="curv-mobile-chip curv-mobile-board-chip"
              aria-pressed={active}
              aria-label={column.shortLabel ? `${column.label}, ${formatCount(column.count)}` : undefined}
              onClick={() => chooseColumn(column.id)}
            >
              <span>{column.shortLabel ?? column.label}</span>
              <span className="curv-mobile-board-chip-count">{formatCount(column.count)}</span>
            </button>
          );
        })}
      </div>
      <div ref={scroller} className="curv-mobile-board-columns" onScroll={onScroll} onPointerDown={takeOver} onWheel={takeOver}>
        {columns.map((column, index) => {
          const headingId = `${uid}-${idPart(column.id)}`;
          const target = drag !== null && drag.over === column.id && drag.over !== drag.from;
          return (
            <section
              key={column.id}
              ref={el => { columnEls.current[index] = el; }}
              className="curv-mobile-board-column"
              aria-labelledby={headingId}
              data-active={column.id === current ? "true" : undefined}
              data-drop-target={target ? "true" : undefined}
            >
              <div className="curv-mobile-board-column-inner">
                <h3 id={headingId} className="curv-mobile-board-column-head">
                  <span>{column.label}</span>
                  <span className="curv-mobile-board-column-count">{formatCount(column.count)}</span>
                </h3>
                <ul className="curv-mobile-board-cards" role="list">
                  {column.cards.map(card => {
                    const lifted = drag?.cardId === card.id;
                    const link = (
                      <>
                        {card.cover && <img className="curv-mobile-board-cover" src={card.cover.src} alt={card.cover.alt ?? ""} loading="lazy" decoding="async" draggable={false} />}
                        <span className="curv-mobile-board-card-body">
                          <span className="curv-mobile-board-card-title">{card.title}</span>
                          {(card.avatar || card.date || card.badge) && (
                            <span className="curv-mobile-board-card-meta">
                              {card.avatar && <span className="curv-mobile-board-avatar" role="img" aria-label={card.avatar.label} style={card.avatar.color ? { background: card.avatar.color } : undefined}>{card.avatar.initials}</span>}
                              {card.date && (
                                <span className="curv-mobile-board-date" data-late={card.date.late ? "true" : undefined}>
                                  {card.date.late && <span className="curv-mobile-content-vh">Late: </span>}
                                  {card.date.label}
                                </span>
                              )}
                              {card.badge && <span className={cn("curv-mobile-board-badge", `curv-mobile-board-badge-${card.badge.tone}`)}>{card.badge.label}</span>}
                            </span>
                          )}
                        </span>
                      </>
                    );
                    return (
                      <li key={card.id} className="curv-mobile-board-item">
                        <div
                          className="curv-mobile-board-card"
                          data-movable={onMove ? "true" : undefined}
                          data-lifted={lifted ? "true" : undefined}
                          onPointerDown={onMove ? event => onCardPointerDown(event, card, column.id) : undefined}
                          onPointerMove={onMove ? onCardPointerMove : undefined}
                          onPointerUp={onMove ? event => onCardPointerEnd(event, true) : undefined}
                          onPointerCancel={onMove ? event => onCardPointerEnd(event, false) : undefined}
                          onClickCapture={onMove ? onCardClickCapture : undefined}
                          onContextMenu={onMove ? event => { if (press.current) event.preventDefault(); } : undefined}
                          onDragStart={onMove ? event => event.preventDefault() : undefined}
                        >
                          <ContentLink href={card.href} className="curv-mobile-board-card-link" renderLink={renderLink}>{link}</ContentLink>
                          {onMove && (
                            <button
                              type="button"
                              className="curv-mobile-board-move"
                              aria-label={`${generic}: ${card.title}`}
                              aria-haspopup="dialog"
                              data-card-id={card.id}
                              onClick={() => setMoving({ cardId: card.id, from: column.id })}
                            >
                              <DotsIcon size={18} />
                            </button>
                          )}
                          {lifted && drag && drag.over !== drag.from && (
                            <span className="curv-mobile-board-drop-label">{moveLabel(columns.find(c => c.id === drag.over)?.label ?? "")}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {!column.cards.length && emptyLabel && <p className="curv-mobile-board-empty">{emptyLabel}</p>}
              </div>
            </section>
          );
        })}
      </div>
      {onMove && (
        <MobileMoveSheet
          open={moving !== null}
          onOpenChange={open => { if (!open) setMoving(null); }}
          title={movingCard ? <span className="curv-mobile-board-sheet-title"><span>{generic}</span><span className="curv-mobile-content-vh">: </span><span className="curv-mobile-board-sheet-card">{movingCard.title}</span></span> : generic}
          options={columns.filter(column => column.id !== moving?.from).map(column => ({ id: column.id, label: moveLabel(column.label), count: column.count }))}
          onChoose={id => {
            if (!moving) return;
            refocus.current = { cardId: moving.cardId, from: moving.from, at: performance.now() };
            onMove?.(moving.cardId, id);
          }}
        />
      )}
    </section>
  );
}
