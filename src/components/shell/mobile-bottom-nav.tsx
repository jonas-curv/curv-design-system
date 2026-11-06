"use client";
import * as React from "react";
import { MobileTabBar } from "./mobile-nav/tab-bar";

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}
/** @deprecated Use `MobileTabBarProps`. */
export interface MobileBottomNavProps {
  /** Already permission-filtered destinations. The complete menu belongs in More. */
  items: MobileNavItem[];
  renderLink?: (item: MobileNavItem, props: { className: string; children: React.ReactNode; "aria-current"?: "page" }) => React.ReactNode;
  /** @deprecated Search moved to the header (`MobileHeader` `onSearch`). Still shows the legacy search circle, and still takes one of the five slots. */
  onSearch?: () => void;
  /** Explicit read refresh, owned by the authenticated app router. Never replay writes. */
  onRefresh?: () => void;
  onMenu?: () => void;
  menuOpen?: boolean;
  searchOpen?: boolean;
  breakpoint?: "md" | "lg";
}

/**
 * @deprecated The flat labelled dock is retired: this renders `MobileTabBar`, the one shared glass bar, with the same props it
 * always took. Import `MobileTabBar` instead; it also drops the search circle (search lives in `MobileHeader`). Kept so an app
 * can move at its own pace. The legacy cap is unchanged: a search handler still takes one of the five slots.
 */
export function MobileBottomNav({ items, renderLink, onSearch, onRefresh, onMenu, menuOpen = false, searchOpen = false, breakpoint = "md" }: MobileBottomNavProps) {
  const destinations = items.slice(0, 5 - Number(Boolean(onSearch)) - Number(Boolean(onMenu)));
  return (
    <MobileTabBar
      items={destinations}
      // The old adapters got `{ className, children, aria-current }` and read `href` from the item; the bar's props are a superset.
      renderLink={renderLink ? (item, props) => renderLink(item, props) : undefined}
      onSearch={onSearch}
      searchLabel="Search this OS"
      onMenu={onMenu}
      menuOpen={menuOpen}
      menuLabel="More navigation"
      onRefresh={onRefresh}
      hidden={searchOpen}
      breakpoint={breakpoint}
    />
  );
}
