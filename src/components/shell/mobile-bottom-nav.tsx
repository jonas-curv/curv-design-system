"use client";
import * as React from "react";

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}
export interface MobileBottomNavProps {
  /** Already permission-filtered destinations. The complete menu belongs in More. */
  items: MobileNavItem[];
  renderLink?: (item: MobileNavItem, props: { className: string; children: React.ReactNode; "aria-current"?: "page" }) => React.ReactNode;
  onSearch?: () => void;
  /** Explicit read refresh, owned by the authenticated app router. Never replay writes. */
  onRefresh?: () => void;
  onMenu?: () => void;
  menuOpen?: boolean;
  searchOpen?: boolean;
  breakpoint?: "md" | "lg";
}
const SearchIcon = () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>;
const MenuIcon = () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16M4 12h16M4 18h16"/></svg>;

/** Hide the dock only while the software keyboard consumes the visual viewport. */
function useSoftwareKeyboard() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const input = document.activeElement;
      const editing = input instanceof HTMLElement && (input.matches("input,textarea") || input.isContentEditable);
      setVisible(Boolean(editing && viewport && window.innerHeight - viewport.height > 140));
    };
    viewport?.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => { viewport?.removeEventListener("resize", update); document.removeEventListener("focusin", update); document.removeEventListener("focusout", update); };
  }, []);
  return visible;
}
/** Shared approved order: Home, Search, core work, reporting, More. */
export function MobileBottomNav({ items, renderLink, onSearch, onRefresh, onMenu, menuOpen = false, searchOpen = false, breakpoint = "md" }: MobileBottomNavProps) {
  const keyboard = useSoftwareKeyboard();
  const [connection, setConnection] = React.useState<"online" | "offline" | "restored">("online");
  React.useEffect(() => {
    const offline = () => setConnection("offline");
    const online = () => setConnection(current => current === "offline" ? "restored" : current);
    if (!navigator.onLine) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, []);
  const destinations = items.slice(0, 5 - Number(Boolean(onSearch)) - Number(Boolean(onMenu)));
  const renderItem = (item: MobileNavItem) => {
    const props = { className: "curv-mobile-destination", "aria-current": item.active && !menuOpen && !searchOpen ? "page" as const : undefined, children: <><span aria-hidden="true" className="curv-mobile-dock-icon">{item.icon}</span><span className="curv-mobile-dock-label">{item.label}</span></> };
    return <React.Fragment key={item.id}>{renderLink ? renderLink(item, props) : <a href={item.href} {...props} />}</React.Fragment>;
  };
  return <nav aria-label="Mobile navigation" className="curv-mobile-dock curv-mobile-only" data-breakpoint={breakpoint} hidden={keyboard || searchOpen}>
    {connection !== "online" && <div className="curv-mobile-connection" role="status">
      <span>{connection === "offline" ? "Offline. Loaded information may be out of date." : "Connection restored. Refresh for current information."}</span>
      {connection === "restored" && <span className="curv-mobile-connection-actions">{onRefresh && <button type="button" onClick={onRefresh}>Refresh view</button>}<button type="button" aria-label="Dismiss connection notice" onClick={() => setConnection("online")}>Dismiss</button></span>}
    </div>}
    <div className="curv-mobile-dock-items">
      {destinations[0] && renderItem(destinations[0])}
      {onSearch && <button type="button" onClick={onSearch} aria-label="Search this OS"><span className="curv-mobile-dock-icon"><SearchIcon /></span><span>Search</span></button>}
      {destinations.slice(1).map(renderItem)}
      {onMenu && <button type="button" onClick={onMenu} aria-expanded={menuOpen} aria-label="More navigation"><span className="curv-mobile-dock-icon"><MenuIcon /></span><span>More</span></button>}
    </div>
  </nav>;
}
