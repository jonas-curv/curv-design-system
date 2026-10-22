"use client";
import * as React from "react";
import { cn } from "../../../lib/cn";
import { MobileConnectionNotice, useConnectionStatus, useKeyboardInset, useScrollCollapse, useSoftwareKeyboard } from "./bar-state";
import { isDevelopment } from "./dev";
import { CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { idPart } from "./id-part";
import type { MobileBreakpoint, MobileNavLinkProps, MobileNavRenderLink } from "./types";

export interface MobileTabBarItem {
  id: string;
  /** Icon-only destination: the label is its accessible name. */
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
  /** Unread or pending count. Hidden when 0 or empty; numbers above 99 read 99+. */
  badge?: number | string;
  /** What assistive technology reads for the badge. Default "<n> unread" for a count, the text itself for a string. */
  badgeLabel?: (badge: number | string) => string;
}
/** Record mode: the hub's icon, a link back to the hub. */
export interface MobileTabBarLeading {
  label: string;
  icon: React.ReactNode;
  href: string;
}
/** Search mode: the pill becomes the field. */
export interface MobileTabBarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name of the field. */
  label: string;
  onClose: () => void;
  /** Accessible name of the close circle. Default "Close search". */
  closeLabel?: string;
}
export interface MobileTabBarProps {
  /** Already permission-filtered destinations. Up to 5 including the menu button; extra items are dropped (a console warning says which, outside production). */
  items?: MobileTabBarItem[];
  renderLink?: MobileNavRenderLink<MobileTabBarItem>;
  /** Shows the 62px search circle on the left. */
  onSearch?: () => void;
  searchLabel?: string;
  /** Shows the menu button as the last item in the pill. */
  onMenu?: () => void;
  menuOpen?: boolean;
  menuLabel?: string;
  /** `record` needs `action` and `search` needs `search`; without them the bar stays in `tabs` mode. */
  mode?: "tabs" | "record" | "search";
  /** mode "record": the left circle. */
  leading?: MobileTabBarLeading;
  /** mode "record": fills the pill (a composer and camera button, or one primary button). */
  action?: React.ReactNode;
  /** mode "search": the field and its close circle. */
  search?: MobileTabBarSearch;
  /** Shrink to the current destination and Search while the page is read downwards. Default true. */
  collapseOnScroll?: boolean;
  /** Explicit read refresh, owned by the authenticated app router. Never replay writes. */
  onRefresh?: () => void;
  breakpoint?: MobileBreakpoint;
  className?: string;
}

const badgeText = (badge: MobileTabBarItem["badge"]) => {
  if (badge == null || badge === "" || badge === 0) return null;
  return typeof badge === "number" ? (badge > 99 ? "99+" : String(badge)) : badge;
};
const badgeDescription = (item: MobileTabBarItem) => {
  const badge = item.badge as number | string;
  if (item.badgeLabel) return item.badgeLabel(badge);
  return typeof badge === "number" ? `${badge} unread` : badge;
};
const tabLabels = { tabs: "Mobile navigation", record: "Record actions" } as const;
const CAP = 5;

/**
 * The floating glass bar (docs/mobile.md rule 5). Three modes share one position:
 * `tabs` (search circle, icon pill, menu), `record` (hub circle, the page's one
 * action) and `search` (the field, down where the thumb is). It hides behind the
 * keyboard in `tabs` mode and rides above it in the two modes that hold a field.
 */
export function MobileTabBar({ items = [], renderLink, onSearch, searchLabel = "Search", onMenu, menuOpen = false, menuLabel = "Menu", mode: requestedMode = "tabs", leading, action, search, collapseOnScroll = true, onRefresh, breakpoint = "md", className }: MobileTabBarProps) {
  const uid = React.useId();
  const keyboard = useSoftwareKeyboard();
  const keyboardInset = useKeyboardInset();
  const [connection, dismissConnection] = useConnectionStatus();
  // A mode with nothing to show is the tab bar, not an empty pill.
  const mode = requestedMode === "search" && !search ? "tabs" : requestedMode === "record" && !action ? "tabs" : requestedMode;
  const cap = CAP - Number(Boolean(onMenu));
  const destinations = items.slice(0, cap);
  const dropped = mode === "tabs" ? items.slice(cap).map(item => item.label) : [];
  const droppedKey = dropped.join("\u0000");
  const compactId = (destinations.find(item => item.active) ?? destinations[0])?.id;
  const [scrolled, expand] = useScrollCollapse(collapseOnScroll && mode === "tabs" && destinations.length > 0);
  const collapsed = scrolled && !menuOpen;
  const lifted = mode !== "tabs" && keyboardInset > 0;
  const field = React.useRef<HTMLInputElement>(null);
  const searchCircle = React.useRef<HTMLButtonElement>(null);
  const previousMode = React.useRef(mode);
  React.useEffect(() => {
    if (mode === "search") field.current?.focus();
    // Closing search unmounts the field the person was typing in. If focus fell to the page, put it on the circle that opens search.
    else if (previousMode.current === "search" && mode === "tabs") {
      const focused = document.activeElement;
      if (!focused || focused === document.body || !focused.isConnected) searchCircle.current?.focus();
    }
    previousMode.current = mode;
  }, [mode]);
  React.useEffect(() => {
    if (droppedKey && isDevelopment()) console.warn(`MobileTabBar shows at most ${CAP} items including the menu button. Dropped: ${droppedKey.split("\u0000").map(label => `"${label}"`).join(", ")}.`);
  }, [droppedKey]);

  const link = (item: MobileTabBarItem, props: MobileNavLinkProps) => renderLink ? renderLink(item, props) : <a {...props} />;
  const renderItem = (item: MobileTabBarItem) => {
    const badge = badgeText(item.badge);
    const badgeId = badge ? `${uid}-badge-${idPart(item.id)}` : undefined;
    const compact = collapsed && item.id === compactId;
    return <React.Fragment key={item.id}>{link(item, {
      href: item.href,
      className: "curv-mobile-tabbar-item",
      "aria-label": item.label,
      "aria-current": item.active && !menuOpen ? "page" : undefined,
      "aria-describedby": badgeId,
      "data-compact": compact ? "true" : undefined,
      children: <>
        <span className="curv-mobile-tabbar-icon" aria-hidden="true">{item.icon}</span>
        {compact && <span className="curv-mobile-tabbar-label" aria-hidden="true">{item.label}</span>}
        {badge && <>
          <span className="curv-mobile-tabbar-badge" aria-hidden="true">{badge}</span>
          <span id={badgeId} className="curv-mobile-nav-sr">{badgeDescription(item)}</span>
        </>}
      </>,
    })}</React.Fragment>;
  };
  // A tap on the shrunken pill brings the full bar back instead of navigating.
  const restore = collapsed ? (event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); expand(); } : undefined;
  const restoreOnKeyboardFocus = collapsed ? (event: React.FocusEvent) => { if (event.target.matches(":focus-visible")) expand(); } : undefined;

  // Search mode holds a `role="search"` landmark, so it is a plain container: landmarks do not nest.
  const Root = mode === "search" ? "div" : "nav";
  return <Root
    aria-label={mode === "search" ? undefined : tabLabels[mode]}
    className={cn("curv-mobile-tabbar curv-mobile-only", className)}
    data-breakpoint={breakpoint}
    data-mode={mode}
    data-collapsed={collapsed || undefined}
    data-lifted={lifted || undefined}
    style={lifted ? { "--curv-mobile-keyboard-inset": `${keyboardInset}px` } as React.CSSProperties : undefined}
    hidden={keyboard && mode === "tabs"}
    onFocusCapture={restoreOnKeyboardFocus}
  >
    <MobileConnectionNotice connection={connection} onRefresh={onRefresh} onDismiss={dismissConnection} />
    <div className="curv-mobile-tabbar-row">
      {mode === "tabs" && onSearch && <button ref={searchCircle} type="button" className="curv-mobile-tabbar-circle curv-mobile-tabbar-glass" aria-label={searchLabel} onClick={onSearch}><SearchIcon /></button>}
      {mode === "record" && leading && <>{link({ id: "leading", ...leading }, {
        href: leading.href,
        className: "curv-mobile-tabbar-circle curv-mobile-tabbar-glass",
        "aria-label": leading.label,
        children: <span className="curv-mobile-tabbar-icon" aria-hidden="true">{leading.icon}</span>,
      })}</>}
      {mode === "tabs" && <div className="curv-mobile-tabbar-pill curv-mobile-tabbar-glass" onClickCapture={restore}>
        {destinations.map(renderItem)}
        {onMenu && <button type="button" className="curv-mobile-tabbar-item" aria-label={menuLabel} aria-expanded={menuOpen} aria-haspopup="dialog" onClick={onMenu}><span className="curv-mobile-tabbar-icon" aria-hidden="true"><MenuIcon /></span></button>}
      </div>}
      {mode === "record" && <div className="curv-mobile-tabbar-pill curv-mobile-tabbar-glass"><div className="curv-mobile-tabbar-action">{action}</div></div>}
      {mode === "search" && search && <>
        <form role="search" aria-label={search.label} className="curv-mobile-tabbar-pill curv-mobile-tabbar-glass curv-mobile-tabbar-search" onSubmit={event => event.preventDefault()}>
          <SearchIcon />
          <input
            ref={field}
            type="search"
            aria-label={search.label}
            placeholder={search.placeholder}
            value={search.value}
            onChange={event => search.onChange(event.target.value)}
            onKeyDown={event => { if (event.key === "Escape") search.onClose(); }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </form>
        <button type="button" className="curv-mobile-tabbar-circle curv-mobile-tabbar-glass" aria-label={search.closeLabel ?? "Close search"} onClick={search.onClose}><CloseIcon /></button>
      </>}
    </div>
  </Root>;
}
