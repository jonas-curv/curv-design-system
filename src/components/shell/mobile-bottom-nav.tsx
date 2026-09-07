"use client";
import * as React from "react";
import { cn } from "../../lib/cn";

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}
export interface MobileBottomNavProps {
  /** Already permission-filtered destinations. Overflow belongs in onMenu's Drawer. */
  items: MobileNavItem[];
  /** Router integration without coupling this primitive to a framework. */
  renderLink?: (item: MobileNavItem, props: { className: string; children: React.ReactNode; "aria-current"?: "page" }) => React.ReactNode;
  onSearch?: () => void;
  onMenu?: () => void;
}
/** At most five destinations/actions. App owns routing, permissions and overlay state. */
export function MobileBottomNav({ items, renderLink, onSearch, onMenu }: MobileBottomNavProps) {
  const destinations = items.slice(0, 5 - Number(Boolean(onSearch)) - Number(Boolean(onMenu)));
  const itemClass = "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch border-t border-border bg-card pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] md:hidden">
    {destinations.map(item => {
      const props = { className: cn(itemClass, item.active ? "bg-accent text-foreground" : "text-muted-foreground"), "aria-current": item.active ? "page" as const : undefined, children: <><span aria-hidden className="grid size-5 place-items-center">{item.icon}</span><span className="max-w-full truncate">{item.label}</span></> };
      return <React.Fragment key={item.id}>{renderLink ? renderLink(item, props) : <a href={item.href} {...props} />}</React.Fragment>;
    })}
    {onSearch && <button type="button" className={itemClass} onClick={onSearch}><svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg>Search</button>}
    {onMenu && <button type="button" className={itemClass} onClick={onMenu}><svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>More</button>}
  </nav>;
}
