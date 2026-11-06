"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "../../lib/cn";
import { CheckIcon, DotsIcon, SearchIcon } from "./mobile-content/shared";
import type { MobileNavLinkProps } from "./mobile-nav/types";

type Breakpoint = "md" | "lg";
const Chevron = ({ back = false }: { back?: boolean }) => <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={back ? "m14 5-7 7 7 7" : "m9 5 7 7-7 7"} /></svg>;
const Close = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M6 18 18 6" /></svg>;

export interface MobileHeaderSwitcherItem {
  id: string;
  label: string;
  /** Every page keeps its own route. */
  href: string;
  active?: boolean;
}
export interface MobileHeaderProps {
  /** The one title of the screen. A record shows `recordId` in its place. */
  title?: string;
  context?: string;
  /** The older single trailing slot, drawn after the circles below. Prefer `onSearch`, `ask` and `onMore`. */
  action?: React.ReactNode;
  onBack?: () => void;
  /** Accessible name of the back chevron. Default "Back"; say where it goes ("Back to Orders"). */
  backLabel?: string;
  /** The app owns the dropdown: the title becomes a button with a caret that calls this. Use `switcher` to have the header own it. */
  onTitleClick?: () => void;
  /** A hub's pages. The title becomes a caret dropdown that lists them with the current one marked. The list closes on the tap. */
  switcher?: MobileHeaderSwitcherItem[];
  switcherLabel?: string;
  renderLink?: (item: MobileHeaderSwitcherItem, props: MobileNavLinkProps) => React.ReactNode;
  /** A record: a back chevron plus this id ("CICO20142") in place of the title. */
  recordId?: string;
  /** Shows the 40px glass search circle. Search belongs in the header, never in the bar. */
  onSearch?: () => void;
  searchLabel?: string;
  /** The Ask slot, right of the search circle: `<AskButton onClick={…} />` (the 40px glass circle with the orb). */
  ask?: React.ReactNode;
  /** Records only: the ⋯ button for the actions the page does not show. */
  onMore?: () => void;
  moreLabel?: string;
  breakpoint?: Breakpoint;
}
/**
 * The 62px black header: one 20px title (with a caret dropdown for a hub's pages), or a back chevron and a record id; on the right a
 * search circle, the Ask orb and, on records, a ⋯ button. Nothing else. App adapters own history and permissions.
 */
export function MobileHeader({ title, context, action, onBack, backLabel = "Back", onTitleClick, switcher, switcherLabel = "Pages", renderLink, recordId, onSearch, searchLabel = "Search", ask, onMore, moreLabel = "More actions", breakpoint = "md" }: MobileHeaderProps) {
  const uid = React.useId();
  const listId = `${uid}-pages`;
  const root = React.useRef<HTMLElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const pages = switcher && switcher.length > 0 ? switcher : undefined;
  React.useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const text = recordId ?? title;
  const heading = <><span className="curv-mobile-title">{text}</span>{context && <span className="curv-mobile-context">{context}</span>}</>;
  const caret = <span className="curv-mobile-down" aria-hidden="true"><Chevron /></span>;
  let identity: React.ReactNode = <div className="curv-mobile-title-button">{heading}</div>;
  if (pages) identity = <button type="button" ref={trigger} className="curv-mobile-title-button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(current => !current)}>{heading}{caret}</button>;
  else if (onTitleClick) identity = <button type="button" className="curv-mobile-title-button" onClick={onTitleClick} aria-label={`${text}: open navigation`}>{heading}{caret}</button>;
  const hasRight = Boolean(onSearch || ask || onMore || action);
  return <header ref={root} className="curv-mobile-header curv-mobile-only" data-breakpoint={breakpoint} data-record={recordId ? "true" : undefined} data-open={open || undefined}>
    <div className="curv-mobile-header-identity">
      {onBack && <button type="button" className="curv-mobile-icon-button" aria-label={backLabel} onClick={onBack}><Chevron back /></button>}
      <h1 className="curv-mobile-title-heading">{identity}</h1>
    </div>
    {hasRight && <div className="curv-mobile-header-action">
      {onSearch && <button type="button" className="curv-mobile-header-circle" aria-label={searchLabel} onClick={onSearch}><SearchIcon size={20} /></button>}
      {ask}
      {onMore && <button type="button" className="curv-mobile-header-circle" aria-label={moreLabel} onClick={onMore}><DotsIcon size={20} /></button>}
      {action}
    </div>}
    {pages && open && <nav id={listId} className="curv-mobile-header-pages" aria-label={switcherLabel}>
      <ul>
        {pages.map(item => {
          const props: MobileNavLinkProps = { href: item.href, className: "curv-mobile-header-page", "aria-current": item.active ? "page" : undefined, onClick: () => setOpen(false), children: <><span>{item.label}</span>{item.active && <CheckIcon />}</> };
          return <li key={item.id}>{renderLink ? renderLink(item, props) : <a {...props} />}</li>;
        })}
      </ul>
    </nav>}
  </header>;
}

export function MobilePage({ children, className, breakpoint = "md", ...props }: React.HTMLAttributes<HTMLDivElement> & { breakpoint?: Breakpoint }) {
  return <div {...props} data-breakpoint={breakpoint} className={cn("curv-mobile-page curv-mobile-only", className)}>{children}</div>;
}
export function MobileSection({ title, action, children, className }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={cn("curv-mobile-section", className)}><div className="curv-mobile-section-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}
export function MobileMetricCard({ label, value, context, comparison, children, dark = false }: { label: React.ReactNode; value: React.ReactNode; context?: React.ReactNode; comparison?: React.ReactNode; children?: React.ReactNode; dark?: boolean }) {
  return <section className={cn("curv-mobile-card curv-mobile-metric", dark && "curv-mobile-metric-dark")}><div className="curv-mobile-metric-heading"><span>{label}</span>{context && <span>{context}</span>}</div><div className="curv-mobile-metric-value">{value}</div>{comparison && <div className="curv-mobile-comparison">{comparison}</div>}{children}</section>;
}
export function MobileSupportingMetrics({ items }: { items: { label: React.ReactNode; value: React.ReactNode }[] }) {
  return <dl className="curv-mobile-supporting">{items.map((item, index) => <div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
export function MobileList({ children, label }: { children: React.ReactNode; label?: string }) {
  return <div className="curv-mobile-list" role="list" aria-label={label}>{React.Children.map(children, child => child == null ? null : <div role="listitem">{child}</div>)}</div>;
}
/** The word under an amount, or the dot on a one-line row: good (green), warn (amber), info (blue), bad (red). */
export type MobileRecordTone = "good" | "warn" | "info" | "bad";
export interface MobileRecordRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** The amount, right-aligned and tabular. */
  value?: React.ReactNode;
  /** `default`: the card row with a footer. `amount`: the 56px phone row (name and one line of meta on the left, one amount on the right
   *  with `status` as a word under it, no second amount). `oneLine`: the 48px row (name, `meta` as a short right-aligned note such as a
   *  due date, amount, and an optional `exception` dot). */
  layout?: "default" | "amount" | "oneLine";
  /** In `amount`, the word under the amount ("Paid", "Overdue"). In `default`, the left of the footer. */
  status?: React.ReactNode;
  /** Colours the `amount` status word. Without one it is plain grey. */
  statusTone?: MobileRecordTone;
  /** In `amount` the line under the name; in `oneLine` the short note right-aligned before the amount; in `default` the right of the footer. */
  meta?: React.ReactNode;
  /** `oneLine` only: an 8px dot after the name, amber or blue, for the row's one exception. */
  exception?: "warn" | "info";
  /** What the dot means, for screen readers. Default "Needs attention" (warn) or "For information" (info). */
  exceptionLabel?: string;
  href?: string;
  onClick?: () => void;
  renderLink?: (props: { href: string; className: string; children: React.ReactNode; "data-layout"?: string }) => React.ReactNode;
}
/** A single record target. Secondary entity links belong in the opened record. */
export function MobileRecordRow({ title, subtitle, value, layout = "default", status, statusTone, meta, exception, exceptionLabel, href, onClick, renderLink }: MobileRecordRowProps) {
  let children: React.ReactNode;
  if (layout === "amount") {
    const line = meta ?? subtitle;
    children = <>
      <span className="curv-mobile-record-identity"><strong>{title}</strong>{line != null && line !== false && <span className="curv-mobile-record-subtitle">{line}</span>}</span>
      {(value != null || status != null) && <span className="curv-mobile-record-amount">{value != null && <span className="curv-mobile-record-value">{value}</span>}{status != null && status !== false && <span className="curv-mobile-record-status" data-tone={statusTone}>{status}</span>}</span>}
    </>;
  } else if (layout === "oneLine") {
    children = <>
      <span className="curv-mobile-record-name"><strong>{title}</strong>{exception && <><span className="curv-mobile-record-dot" data-tone={exception} aria-hidden="true" /><span className="curv-mobile-nav-sr">{exceptionLabel ?? (exception === "warn" ? "Needs attention" : "For information")}</span></>}</span>
      {meta != null && meta !== false && <span className="curv-mobile-record-note">{meta}</span>}
      {value != null && <span className="curv-mobile-record-value">{value}</span>}
    </>;
  } else {
    children = <><span className="curv-mobile-record-main"><span className="curv-mobile-record-identity"><strong>{title}</strong>{subtitle && <span className="curv-mobile-record-subtitle">{subtitle}</span>}</span>{value != null && <span className="curv-mobile-record-value">{value}</span>}{(href || onClick) && <Chevron />}</span>{(status || meta) && <span className="curv-mobile-record-footer"><span>{status}</span><span>{meta}</span></span>}</>;
  }
  const className = "curv-mobile-record";
  const layoutAttr = layout === "default" ? undefined : layout;
  if (href) return <>{renderLink ? renderLink({ href, className, children, ...(layoutAttr ? { "data-layout": layoutAttr } : {}) }) : <a href={href} className={className} data-layout={layoutAttr}>{children}</a>}</>;
  if (onClick) return <button type="button" className={className} data-layout={layoutAttr} onClick={onClick}>{children}</button>;
  return <div className={className} data-layout={layoutAttr}>{children}</div>;
}
export function MobileDetailSection({ title, summary, children, open = false }: { title: React.ReactNode; summary?: React.ReactNode; children: React.ReactNode; open?: boolean }) {
  return <details className="curv-mobile-detail-section" open={open || undefined}><summary><span>{title}</span><span>{summary}</span><Chevron /></summary><div>{children}</div></details>;
}
export function MobileNotice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "error" }) {
  return <div className="curv-mobile-notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}
export interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  fullScreen?: boolean;
  dark?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Accessible name of the close control. Default "Close". */
  closeLabel?: string;
}
const subscribeViewport = (callback: () => void) => {
  window.visualViewport?.addEventListener("resize", callback);
  window.visualViewport?.addEventListener("scroll", callback);
  return () => { window.visualViewport?.removeEventListener("resize", callback); window.visualViewport?.removeEventListener("scroll", callback); };
};
const viewportSnapshot = () => `${window.visualViewport?.height ?? window.innerHeight}:${window.visualViewport?.offsetTop ?? 0}:${window.innerHeight}:${window.innerWidth}`;
const serverViewportSnapshot = () => "";

/** Base UI owns focus trapping, Escape and restoration. No page-specific overlay behavior. */
export function MobileSheet({ open, onOpenChange, title, children, footer, fullScreen, dark, initialFocus, closeLabel = "Close" }: MobileSheetProps) {
  const viewport = React.useSyncExternalStore(subscribeViewport, viewportSnapshot, serverViewportSnapshot);
  const [height, offset, layoutHeight] = viewport.split(":").map(Number);
  const viewportStyle: React.CSSProperties | undefined = viewport ? {
    maxHeight: height,
    ...(fullScreen ? { height, top: offset, bottom: "auto" } : { bottom: Math.max(0, layoutHeight - height - offset) }),
  } : undefined;
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Backdrop className="curv-mobile-scrim" /><Dialog.Popup className={cn("curv-mobile-sheet", fullScreen && "curv-mobile-fullscreen", dark && "curv-mobile-more")} initialFocus={initialFocus} style={viewportStyle}>
    <div className="curv-mobile-sheet-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="curv-mobile-icon-button" aria-label={closeLabel}><Close /></Dialog.Close></div>
    <div className="curv-mobile-sheet-body">{children}</div>{footer && <div className="curv-mobile-sheet-footer">{footer}</div>}
  </Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
export function MobileMoreMenu(props: Omit<MobileSheetProps, "title" | "fullScreen" | "dark">) {
  return <MobileSheet {...props} title="More" fullScreen dark />;
}
export function MobileSearchSurface({ title, query, onQueryChange, placeholder, children, ...props }: Omit<MobileSheetProps, "children" | "fullScreen" | "initialFocus"> & { query: string; onQueryChange: (value: string) => void; placeholder?: string; children: React.ReactNode }) {
  const input = React.useRef<HTMLInputElement>(null);
  return <MobileSheet {...props} title={title} fullScreen initialFocus={input}><div className="curv-mobile-search-input"><input ref={input} aria-label={typeof title === "string" ? title : "Search this OS"} type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder={placeholder} autoComplete="off" enterKeyHint="search" /></div>{children}</MobileSheet>;
}

/** Shared identity slot for existing top bars, preserving a single live notification mount. */
export function MobileHeaderTitle({ title, context, onBack, onTitleClick, breakpoint = "md" }: Pick<MobileHeaderProps, "title" | "context" | "onBack" | "onTitleClick" | "breakpoint">) {
  return <div className="curv-mobile-header-identity curv-mobile-only" data-breakpoint={breakpoint}>
    {onBack && <button type="button" className="curv-mobile-icon-button" onClick={onBack} aria-label="Back"><Chevron back /></button>}
    <h1 className="curv-mobile-title-heading">{onTitleClick ? <button className="curv-mobile-title-button" type="button" onClick={onTitleClick} aria-label={`${title}: open navigation`}><span className="curv-mobile-title">{title}</span><span className="curv-mobile-down"><Chevron /></span>{context && <span className="curv-mobile-context">{context}</span>}</button> : <span className="curv-mobile-title">{title}</span>}</h1>
  </div>;
}

/** Adapt existing app-owned search dialogs to the visible phone viewport. */
export function useMobileViewportStyle(breakpoint: Breakpoint = "md"): React.CSSProperties | undefined {
  const subscribe = React.useCallback((notify: () => void) => {
    const remove = subscribeViewport(notify);
    window.addEventListener("resize", notify);
    return () => { remove(); window.removeEventListener("resize", notify); };
  }, []);
  const viewport = React.useSyncExternalStore(subscribe, viewportSnapshot, serverViewportSnapshot);
  const [height, offset, , width] = viewport.split(":").map(Number);
  if (!viewport || width >= (breakpoint === "md" ? 768 : 1024)) return undefined;
  return { height, maxHeight: height, top: offset, bottom: "auto", transform: "none", width: "100%", maxWidth: "none", borderRadius: 0 };
}
