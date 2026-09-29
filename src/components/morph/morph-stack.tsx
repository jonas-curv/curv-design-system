"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ElementType,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/**
 * MorphStack: a one-line summary ("Sam and 4 others are waiting" over a
 * stack of faces) that opens in place into the list it summarises, with the
 * faces travelling from the stack into their rows and back. Rows carry their
 * own actions, and a row that leaves slides out while the rest close up.
 *
 * No motion library: the morph is a FLIP on the Web Animations API, the row
 * exit is a CSS transition, and both are skipped under reduced motion or in a
 * hidden tab. Style comes from morph.css through --morph-* variables.
 */

export type MorphStackTone = "dark" | "island" | "light" | "row";
export type MorphStackAnchor = "start" | "center" | "end";

export interface MorphStackItem {
  id: string;
  /** Primary text, usually a person. Also the source of the initials. */
  label: string;
  avatarUrl?: string | null;
  /** Overrides the initials taken from `label`. */
  initials?: string;
  /** Secondary text on the same line, e.g. "Time off · Oct 6–10". */
  meta?: ReactNode;
  /** Short right-aligned text, e.g. "71d". */
  aside?: ReactNode;
  asideTone?: "muted" | "hot";
  /** Controls for this row, usually MorphStackButtons. */
  actions?: ReactNode;
  /** Makes the whole row a link when the row has no actions. */
  href?: string;
  onOpen?: () => void;
}

export interface MorphStackProps {
  items: MorphStackItem[];
  /** The collapsed line. Use <strong> for the lead and .morph-muted / .morph-hot spans. */
  summary: ReactNode;
  /** The open panel's heading. */
  title: ReactNode;
  /** Shown beside the title. Defaults to items.length; null hides it. */
  count?: number | null;
  /** A link or button in the open header, e.g. "View all". */
  headerAction?: ReactNode;
  /** Short text at the end of the collapsed line, e.g. the newest time. */
  pillAside?: ReactNode;
  tone?: MorphStackTone;
  /** The edge that stays put while the width changes. */
  anchor?: MorphStackAnchor;
  /** The open panel floats over the page instead of pushing it down. Default: every tone but "row". */
  overlay?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Adds a dismiss button to the collapsed line and the open header. */
  onDismiss?: () => void;
  /** Shown in place of the summary once the list empties. Without it the component renders nothing. */
  clearedLabel?: ReactNode;
  /** Rows before the list scrolls. */
  maxVisibleRows?: number;
  /** Link component for `href` rows, e.g. next/link. */
  linkAs?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export const MORPH_OPEN_MS = 280;
export const MORPH_CLOSE_MS = 200;
export const MORPH_EXIT_MS = 180;
const MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const STAGGER_MS = 18;
const STACK = 3;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** False on the server, in a hidden tab and under reduced motion. */
function motionAllowed(): boolean {
  if (typeof document === "undefined" || typeof Element === "undefined") return false;
  if (typeof Element.prototype.animate !== "function") return false;
  if (document.visibilityState !== "visible") return false;
  return !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

const TINTS: [string, string][] = [
  ["#EDE4FF", "#4B2A8C"],
  ["#FFE1DC", "#8A2A1F"],
  ["#FCEDB9", "#6B3E00"],
  ["#D7F7C2", "#1F5A2A"],
  ["#DCEBFE", "#1E4E8C"],
  ["#F3E3F7", "#6E2A7A"],
  ["#E3F1EE", "#1E5A50"],
];

function tintFor(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function initialsOf(item: MorphStackItem): string {
  if (item.initials) return item.initials;
  return item.label
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ item, slot, row }: { item: MorphStackItem; slot?: number; row?: boolean }) {
  const [bg, ink] = tintFor(item.id);
  return (
    <span
      className="morph-av"
      aria-hidden="true"
      data-morph-slot={slot}
      data-morph-avatar={row ? item.id : undefined}
      style={{ "--morph-av-bg": bg, "--morph-av-ink": ink } as CSSProperties}
    >
      {item.avatarUrl ? <img src={item.avatarUrl} alt="" loading="lazy" decoding="async" /> : initialsOf(item)}
    </span>
  );
}

function Icon({ d, size = 16 }: { d: string[]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}
const CHEVRON_DOWN = ["m6 9 6 6 6-6"];
const CHEVRON_UP = ["m18 15-6-6-6 6"];
const X = ["M18 6 6 18", "m6 6 12 12"];
const CHECK = ["M20 6 9 17l-5-5"];

type Phase = "closed" | "open" | "closing";
type Rel = { x: number; y: number; w: number; h: number };
type Geo = { rect: Rel; radius: string; bg: string; avatars: Rel[] };
type Ghost = { item: MorphStackItem; index: number };

function relTo(r0: DOMRect, r: DOMRect): Rel {
  return { x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height };
}

/** Panel grows from the pill; row faces fly out of the stack. */
function morphOpen(root: HTMLElement, panel: HTMLElement, g: Geo) {
  const r0 = root.getBoundingClientRect();
  const pr = panel.getBoundingClientRect();
  const cs = getComputedStyle(panel);
  panel.animate(
    [
      { width: `${g.rect.w}px`, height: `${g.rect.h}px`, borderRadius: g.radius, backgroundColor: g.bg },
      { width: `${pr.width}px`, height: `${pr.height}px`, borderRadius: cs.borderRadius, backgroundColor: cs.backgroundColor },
    ],
    { duration: MORPH_OPEN_MS, easing: MORPH_EASE },
  );
  panel.querySelectorAll<HTMLElement>("[data-morph-avatar]").forEach((el, i) => {
    const from = g.avatars[Math.min(i, g.avatars.length - 1)];
    if (!from) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const dx = r0.left + from.x - r.left;
    const dy = r0.top + from.y - r.top;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.w / r.width})`, opacity: i < g.avatars.length ? 1 : 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: MORPH_OPEN_MS, easing: MORPH_EASE, delay: Math.min(i, 8) * STAGGER_MS, fill: "backwards" },
    );
  });
}

/** The reverse, faster: panel shrinks to the pill; faces fly home. Resolves when done. */
function morphClose(root: HTMLElement, panel: HTMLElement, g: Geo): Promise<void> {
  const r0 = root.getBoundingClientRect();
  const pr = panel.getBoundingClientRect();
  const cs = getComputedStyle(panel);
  const shrink = panel.animate(
    [
      { width: `${pr.width}px`, height: `${pr.height}px`, borderRadius: cs.borderRadius, backgroundColor: cs.backgroundColor },
      { width: `${g.rect.w}px`, height: `${g.rect.h}px`, borderRadius: g.radius, backgroundColor: g.bg },
    ],
    { duration: MORPH_CLOSE_MS, easing: MORPH_EASE, fill: "forwards" },
  );
  panel.querySelectorAll<HTMLElement>("[data-morph-avatar]").forEach((el, i) => {
    const to = i < g.avatars.length ? g.avatars[i] : undefined;
    const r = el.getBoundingClientRect();
    if (!to || !r.width) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease", fill: "forwards" });
      return;
    }
    const dx = r0.left + to.x - r.left;
    const dy = r0.top + to.y - r.top;
    el.animate(
      [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${to.w / r.width})` }],
      { duration: MORPH_CLOSE_MS, easing: MORPH_EASE, fill: "forwards" },
    );
  });
  return shrink.finished.then(
    () => undefined,
    () => undefined,
  );
}

export function MorphStack({
  items,
  summary,
  title,
  count,
  headerAction,
  pillAside,
  tone = "dark",
  anchor = "end",
  overlay,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onDismiss,
  clearedLabel,
  maxVisibleRows = 6,
  linkAs,
  className,
  style,
}: MorphStackProps) {
  const floating = overlay ?? tone !== "row";
  const uid = useId();
  const panelId = `${uid}-panel`;
  const titleId = `${uid}-title`;
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const geo = useRef<Geo | null>(null);
  const focusAfter = useRef<"panel" | "trigger" | null>(null);
  // Focus was inside the panel when it went away: hand it back to the line.
  const focusInPanel = useRef(false);

  // Rows that just left stay one beat, flagged, so they can slide out while
  // the rows under them close the gap. Derived during render so the leaving
  // row keeps its DOM node and its CSS transition runs.
  const [track, setTrack] = useState<{ items: MorphStackItem[]; ghosts: Ghost[] }>({ items, ghosts: [] });
  if (track.items !== items) {
    const ids = new Set(items.map((i) => i.id));
    const left = track.items.map((item, index) => ({ item, index })).filter((g) => !ids.has(g.item.id));
    setTrack({ items, ghosts: [...track.ghosts.filter((g) => !ids.has(g.item.id)), ...left] });
  }
  const ghosts = track.ghosts;
  useEffect(() => {
    if (!ghosts.length) return;
    const t = setTimeout(() => setTrack((s) => ({ ...s, ghosts: [] })), motionAllowed() ? MORPH_EXIT_MS : 0);
    return () => clearTimeout(t);
  }, [ghosts]);

  // Acting on a row from the keyboard: focus moves to the same control in the
  // next row (or the one above), never to the page.
  useIsoLayoutEffect(() => {
    const panel = panelRef.current;
    const active = typeof document === "undefined" ? null : document.activeElement;
    if (!ghosts.length || !panel || !(active instanceof HTMLElement) || !panel.contains(active)) return;
    const row = active.closest(".morph-row");
    if (!row || !row.hasAttribute("data-leaving")) return;
    const controls = (el: Element) => Array.from(el.querySelectorAll<HTMLElement>("button, a[href], input"));
    const at = Math.max(0, controls(row).indexOf(active));
    const live = (el: Element | null, step: "nextElementSibling" | "previousElementSibling") => {
      while (el && el.hasAttribute("data-leaving")) el = el[step];
      return el;
    };
    const next = live(row.nextElementSibling, "nextElementSibling") ?? live(row.previousElementSibling, "previousElementSibling");
    const pool = next ? controls(next) : [];
    (pool[Math.min(at, pool.length - 1)] ?? collapseRef.current)?.focus({ preventScroll: true });
  }, [ghosts]);

  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const wanted = openProp ?? innerOpen;
  const hasRows = items.length > 0 || ghosts.length > 0;
  const open = wanted && hasRows;
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");
  if (open && phase !== "open") setPhase("open");
  else if (!open && phase === "open") setPhase(motionAllowed() ? "closing" : "closed");

  const setOpen = useCallback(
    (next: boolean, focus: "panel" | "trigger" | null) => {
      focusAfter.current = focus;
      if (openProp === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  // The list emptied while open: tell the owner it closed.
  useEffect(() => {
    if (wanted && !hasRows) {
      if (openProp === undefined) setInnerOpen(false);
      onOpenChange?.(false);
    }
  }, [wanted, hasRows, openProp, onOpenChange]);

  // Where the pill and its faces sit, relative to the root, every render the
  // pill is laid out. The morph flies to and from these.
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const pill = pillRef.current;
    if (!root || !pill) return;
    const pr = pill.getBoundingClientRect();
    if (!pr.width && !pr.height) return;
    const r0 = root.getBoundingClientRect();
    const cs = getComputedStyle(pill);
    geo.current = {
      rect: relTo(r0, pr),
      radius: cs.borderRadius,
      bg: cs.backgroundColor,
      avatars: Array.from(pill.querySelectorAll<HTMLElement>("[data-morph-slot]")).map((el) => relTo(r0, el.getBoundingClientRect())),
    };
  });

  // Remember, while the panel exists, whether focus is inside it; the commit
  // that removes the panel reads it (removal can fire a blur, so no events).
  useIsoLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel) focusInPanel.current = panel.contains(document.activeElement);
  });

  const lastPhase = useRef<Phase>(phase);
  useIsoLayoutEffect(() => {
    const was = lastPhase.current;
    lastPhase.current = phase;
    if (was === phase) return;
    const root = rootRef.current;
    const panel = panelRef.current;
    const g = geo.current;
    if (phase === "open") {
      if (was === "closing" && panel) panel.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      else if (root && panel && g && motionAllowed()) morphOpen(root, panel, g);
      if (focusAfter.current === "panel") collapseRef.current?.focus({ preventScroll: true });
      focusAfter.current = null;
      return;
    }
    if (phase === "closing") {
      if (!root || !panel || !g) {
        setPhase("closed");
        return;
      }
      let live = true;
      morphClose(root, panel, g).then(() => {
        if (live) setPhase("closed");
      });
      return () => {
        live = false;
      };
    }
    const active = document.activeElement;
    const lost = !active || active === document.body;
    if (focusAfter.current === "trigger" || (focusInPanel.current && lost)) triggerRef.current?.focus({ preventScroll: true });
    focusInPanel.current = false;
    focusAfter.current = null;
  }, [phase]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && phase === "open") {
      e.stopPropagation();
      setOpen(false, "trigger");
    }
  };

  const cleared = items.length === 0;
  if (cleared && !ghosts.length && phase === "closed" && clearedLabel == null) return null;

  const rows: { item: MorphStackItem; leaving: boolean }[] = items.map((item) => ({ item, leaving: false }));
  for (const g of [...ghosts].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(g.index, rows.length), 0, { item: g.item, leaving: true });
  }
  const shownCount = count === undefined ? items.length : count;
  const Link = linkAs ?? "a";
  const body = (item: MorphStackItem) => (
    <>
      <span className="morph-label">{item.label}</span>
      {item.meta != null ? <span className="morph-meta">{item.meta}</span> : null}
      {item.aside != null ? (
        <span className="morph-aside" data-tone={item.asideTone === "hot" ? "hot" : undefined}>
          {item.aside}
        </span>
      ) : null}
    </>
  );
  const dismissButton = onDismiss ? (
    <button type="button" className="morph-icon-btn" aria-label="Dismiss" onClick={onDismiss}>
      <Icon d={X} />
    </button>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cx("morph", className)}
      data-tone={tone}
      data-anchor={anchor}
      data-overlay={floating ? "" : undefined}
      data-phase={phase}
      style={{ ...style, "--morph-max-rows": maxVisibleRows } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      <div ref={pillRef} className="morph-pill" data-cleared={cleared ? "" : undefined}>
        <button
          ref={triggerRef}
          type="button"
          className="morph-trigger"
          aria-expanded={phase === "open"}
          aria-controls={phase === "closed" ? undefined : panelId}
          aria-disabled={cleared || undefined}
          onClick={() => {
            if (!cleared) setOpen(true, "panel");
          }}
        >
          {cleared ? (
            <span className="morph-cleared-icon">
              <Icon d={CHECK} />
            </span>
          ) : (
            <span className="morph-stack">
              {items.slice(0, STACK).map((it, i) => (
                <Avatar key={it.id} item={it} slot={i} />
              ))}
            </span>
          )}
          <span className="morph-summary">{cleared ? clearedLabel : summary}</span>
          {pillAside != null && !cleared ? <span className="morph-pill-aside">{pillAside}</span> : null}
          {cleared ? null : (
            <span className="morph-chevron">
              <Icon d={CHEVRON_DOWN} size={14} />
            </span>
          )}
        </button>
        {cleared ? null : dismissButton}
      </div>
      {phase === "closed" ? null : (
        <div
          ref={panelRef}
          id={panelId}
          className="morph-panel"
          role="region"
          aria-labelledby={titleId}
        >
          <div className="morph-head">
            <span id={titleId} className="morph-title">
              {title}
            </span>
            {shownCount === null ? null : <span className="morph-count">{shownCount}</span>}
            <span className="morph-head-end">
              {headerAction}
              <button
                ref={collapseRef}
                type="button"
                className="morph-icon-btn"
                aria-label="Collapse"
                aria-expanded={true}
                aria-controls={panelId}
                onClick={() => setOpen(false, "trigger")}
              >
                <Icon d={CHEVRON_UP} />
              </button>
              {dismissButton}
            </span>
          </div>
          <ul className="morph-list">
            {rows.map(({ item, leaving }, i) => (
              <li
                key={item.id}
                className="morph-row"
                data-leaving={leaving ? "" : undefined}
                aria-hidden={leaving || undefined}
                style={{ "--morph-i": Math.min(i, 8) } as CSSProperties}
              >
                <Avatar item={item} row />
                {item.href && !item.actions ? (
                  <Link className="morph-row-body morph-row-link morph-fade" href={item.href} onClick={item.onOpen}>
                    {body(item)}
                  </Link>
                ) : (
                  <div className="morph-row-body morph-fade">
                    {body(item)}
                    {item.actions ? <div className="morph-actions">{item.actions}</div> : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface MorphStackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

/** A row action sized and colored for the MorphStack tone it sits in. */
export function MorphStackButton({ variant = "secondary", className, type = "button", ...rest }: MorphStackButtonProps) {
  return <button type={type} className={cx("morph-btn", className)} data-variant={variant} {...rest} />;
}

/** A one-line field for a row, e.g. the reason a request is declined. */
export const MorphStackInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function MorphStackInput(
  { className, type = "text", ...rest },
  ref,
) {
  return <input ref={ref} type={type} className={cx("morph-input", className)} {...rest} />;
});
