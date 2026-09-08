"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "../../lib/cn";

type Breakpoint = "md" | "lg";
const Chevron = ({ back = false }: { back?: boolean }) => <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={back ? "m14 5-7 7 7 7" : "m9 5 7 7-7 7"} /></svg>;
const Close = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M6 18 18 6" /></svg>;

export interface MobileHeaderProps {
  title: string;
  context?: string;
  action?: React.ReactNode;
  onBack?: () => void;
  onTitleClick?: () => void;
  breakpoint?: Breakpoint;
}
/** One title and one contextual action. App adapters own history and permissions. */
export function MobileHeader({ title, context, action, onBack, onTitleClick, breakpoint = "md" }: MobileHeaderProps) {
  const heading = <><span className="curv-mobile-title">{title}</span>{context && <span className="curv-mobile-context">{context}</span>}</>;
  return <header className="curv-mobile-header curv-mobile-only" data-breakpoint={breakpoint}>
    <div className="curv-mobile-header-identity">
      {onBack && <button type="button" className="curv-mobile-icon-button" aria-label="Back" onClick={onBack}><Chevron back /></button>}
      <h1 className="curv-mobile-title-heading">{onTitleClick ? <button type="button" className="curv-mobile-title-button" onClick={onTitleClick} aria-label={`${title}: open navigation`}>{heading}<span className="curv-mobile-down"><Chevron /></span></button> : <div className="curv-mobile-title-button">{heading}</div>}</h1>
    </div>
    {action && <div className="curv-mobile-header-action">{action}</div>}
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
export interface MobileRecordRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  status?: React.ReactNode;
  meta?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  renderLink?: (props: { href: string; className: string; children: React.ReactNode }) => React.ReactNode;
}
/** A single record target. Secondary entity links belong in the opened record. */
export function MobileRecordRow({ title, subtitle, value, status, meta, href, onClick, renderLink }: MobileRecordRowProps) {
  const children = <><span className="curv-mobile-record-main"><span className="curv-mobile-record-identity"><strong>{title}</strong>{subtitle && <span className="curv-mobile-record-subtitle">{subtitle}</span>}</span>{value != null && <span className="curv-mobile-record-value">{value}</span>}{(href || onClick) && <Chevron />}</span>{(status || meta) && <span className="curv-mobile-record-footer"><span>{status}</span><span>{meta}</span></span>}</>;
  if (href) return <>{renderLink ? renderLink({ href, className: "curv-mobile-record", children }) : <a href={href} className="curv-mobile-record">{children}</a>}</>;
  if (onClick) return <button type="button" className="curv-mobile-record" onClick={onClick}>{children}</button>;
  return <div className="curv-mobile-record">{children}</div>;
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
}
const subscribeViewport = (callback: () => void) => {
  window.visualViewport?.addEventListener("resize", callback);
  window.visualViewport?.addEventListener("scroll", callback);
  return () => { window.visualViewport?.removeEventListener("resize", callback); window.visualViewport?.removeEventListener("scroll", callback); };
};
const viewportSnapshot = () => `${window.visualViewport?.height ?? window.innerHeight}:${window.visualViewport?.offsetTop ?? 0}:${window.innerHeight}:${window.innerWidth}`;
const serverViewportSnapshot = () => "";

/** Base UI owns focus trapping, Escape and restoration. No page-specific overlay behavior. */
export function MobileSheet({ open, onOpenChange, title, children, footer, fullScreen, dark, initialFocus }: MobileSheetProps) {
  const viewport = React.useSyncExternalStore(subscribeViewport, viewportSnapshot, serverViewportSnapshot);
  const [height, offset, layoutHeight] = viewport.split(":").map(Number);
  const viewportStyle: React.CSSProperties | undefined = viewport ? {
    maxHeight: height,
    ...(fullScreen ? { height, top: offset, bottom: "auto" } : { bottom: Math.max(0, layoutHeight - height - offset) }),
  } : undefined;
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Backdrop className="curv-mobile-scrim" /><Dialog.Popup className={cn("curv-mobile-sheet", fullScreen && "curv-mobile-fullscreen", dark && "curv-mobile-more")} initialFocus={initialFocus} style={viewportStyle}>
    <div className="curv-mobile-sheet-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="curv-mobile-icon-button" aria-label="Close"><Close /></Dialog.Close></div>
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
export function MobileHeaderTitle({ title, context, onBack, onTitleClick, breakpoint = "md" }: Omit<MobileHeaderProps, "action">) {
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
