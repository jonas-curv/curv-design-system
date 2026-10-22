"use client";
import * as React from "react";
import { cn } from "../../../lib/cn";
import { CheckIcon, ChevronIcon } from "./icons";
import type { MobileBreakpoint, MobileNavLinkProps, MobileNavRenderLink } from "./types";

export interface MobileTopBarSwitcherItem {
  id: string;
  label: string;
  /** Every page keeps its own route. */
  href: string;
  active?: boolean;
}
interface MobileTopBarBase {
  /** The page or hub name. Omit it on records: they show only the back chevron. */
  title?: React.ReactNode;
  /** The hub's pages. When present the title becomes a button that lists them. */
  switcher?: MobileTopBarSwitcherItem[];
  /** Names the list of pages for assistive technology. */
  switcherLabel?: string;
  /** One control, for example `MobileViewToggle`. */
  trailing?: React.ReactNode;
  renderLink?: MobileNavRenderLink<MobileTopBarSwitcherItem>;
  breakpoint?: MobileBreakpoint;
  className?: string;
}
/** A back control always carries a name that says where it goes ("Back to Projects"). */
type MobileTopBarBack =
  | { backHref?: undefined; onBack?: undefined; backLabel?: undefined }
  | { backHref: string; onBack?: () => void; backLabel: string }
  | { backHref?: undefined; onBack: () => void; backLabel: string };
export type MobileTopBarProps = MobileTopBarBase & MobileTopBarBack;

/**
 * The quiet black header (docs/mobile.md rule 4): a title or the hub switcher, a
 * back chevron on records, at most one trailing control. It is fixed to the top
 * and brings its own in-flow spacer, so the page below it starts at the bar's
 * edge. The bar also draws the sheet's two rounded top corners (see
 * `.curv-mobile-topbar` in mobile.css), so they stay put while the page scrolls.
 */
export function MobileTopBar({ title, switcher, switcherLabel = "Pages", backHref, onBack, backLabel, trailing, renderLink, breakpoint = "md", className }: MobileTopBarProps) {
  const uid = React.useId();
  const listId = `${uid}-pages`;
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
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

  const link = (item: MobileTopBarSwitcherItem, props: MobileNavLinkProps) => renderLink ? renderLink(item, props) : <a {...props} />;
  let back: React.ReactNode = null;
  if (backHref !== undefined) {
    back = link({ id: "back", label: backLabel, href: backHref }, { href: backHref, className: "curv-mobile-topbar-back", "aria-label": backLabel, onClick: onBack ? () => onBack() : undefined, children: <ChevronIcon direction="back" size={24} strokeWidth={2} /> });
  } else if (onBack) {
    back = <button type="button" className="curv-mobile-topbar-back" aria-label={backLabel} onClick={() => onBack()}><ChevronIcon direction="back" size={24} strokeWidth={2} /></button>;
  }

  return <>
    <header ref={root} className={cn("curv-mobile-topbar curv-mobile-only", className)} data-breakpoint={breakpoint} data-open={open || undefined}>
      <div className="curv-mobile-topbar-row">
        {back}
        {title != null && <h1 className="curv-mobile-topbar-title">
          {pages
            ? <button type="button" ref={trigger} className="curv-mobile-topbar-switch" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(current => !current)}>
              <span className="curv-mobile-topbar-title-text">{title}</span>
              <ChevronIcon direction="down" size={18} strokeWidth={2.2} className="curv-mobile-topbar-chevron" />
            </button>
            : <span className="curv-mobile-topbar-title-text">{title}</span>}
        </h1>}
        {trailing != null && <div className="curv-mobile-topbar-trailing">{trailing}</div>}
      </div>
      {pages && <>
        {open && <div className="curv-mobile-topbar-scrim" aria-hidden="true" onClick={() => setOpen(false)} />}
        <nav id={listId} className="curv-mobile-topbar-pages" aria-label={switcherLabel} hidden={!open}>
          <ul>
            {pages.map(item => <li key={item.id}>{link(item, {
              href: item.href,
              className: "curv-mobile-topbar-page",
              "aria-current": item.active ? "page" : undefined,
              onClick: () => setOpen(false),
              children: <><span>{item.label}</span>{item.active && <CheckIcon />}</>,
            })}</li>)}
          </ul>
        </nav>
      </>}
    </header>
    <div className="curv-mobile-topbar-spacer curv-mobile-only" data-breakpoint={breakpoint} aria-hidden="true" />
  </>;
}

export interface MobileSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** grouped: #f4f4f5 for stacked cards and lists. plain: white for a single flat list or a record. */
  tone?: "grouped" | "plain";
}
/**
 * The content sheet that sits over the black bar (18px rounded top) and reserves
 * room for `MobileTabBar` below the last row.
 */
export function MobileSurface({ tone = "grouped", className, children, ...props }: MobileSurfaceProps) {
  return <div {...props} className={cn("curv-mobile-surface", className)} data-tone={tone}>{children}</div>;
}
