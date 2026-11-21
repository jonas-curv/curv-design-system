"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Tooltip, TooltipProvider } from "../tooltip";

/**
 * The left nav sidebar: recessed gray, sticky under the top bar, rounding its
 * top-left corner to meet the bar's cradle (see design-system.md → App shell).
 * Pure nav: the wordmark, search and profile live in the <TopBar>. Compose it
 * from <SidebarSection> + <SidebarItem>. `sticky top-14` + `h-[calc(100vh-3.5rem)]`
 * keep it pinned and its rounded corner visible as the page scrolls.
 *
 * 240 wide (`w-60`), or the 56px icon rail (`w-14`) with `collapsed`. Rows are a
 * fixed 32 (`h-8`), 13px, with 16px icons on every row, indented ones included.
 */

/** What a link renderer receives: spread it onto the router's link (Next's <Link>, a prefetching link). */
export interface SidebarLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
  "aria-current"?: "page";
  onClick?: () => void;
}
export type SidebarRenderLink = (props: SidebarLinkProps) => React.ReactNode;

interface SidebarContextValue {
  collapsed: boolean;
  renderLink?: SidebarRenderLink;
}
const SidebarContext = React.createContext<SidebarContextValue>({ collapsed: false });
/** How deep an item sits under expandable parents: 0 at the top, 1 under Flow. */
const DepthContext = React.createContext(0);

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Pinned above the nav, e.g. the sidebar search. Pass a compact one when `collapsed`. */
  header?: React.ReactNode;
  /** Pinned to the bottom, e.g. <SidebarToggle>. */
  footer?: React.ReactNode;
  /**
   * The icon rail: 56px wide, every item shows its icon only and names itself in a
   * tooltip. The app owns the state and where it is remembered (a cookie).
   */
  collapsed?: boolean;
  /** Renders every item link. Pass the router's link so navigation stays client-side. Default: a plain <a>. */
  renderLink?: SidebarRenderLink;
  /** Names the nav landmark. Default "Main". */
  navLabel?: string;
}

export function Sidebar({
  className,
  children,
  header,
  footer,
  collapsed = false,
  renderLink,
  navLabel = "Main",
  ...props
}: SidebarProps) {
  const context = React.useMemo(() => ({ collapsed, renderLink }), [collapsed, renderLink]);
  return (
    <SidebarContext.Provider value={context}>
      <aside
        data-collapsed={collapsed ? "" : undefined}
        className={cn(
          "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col rounded-tl-[12px] border-r border-sidebar-border bg-sidebar md:flex",
          collapsed ? "w-14" : "w-60",
          className,
        )}
        {...props}
      >
        {header ? <div className="shrink-0 px-3 pt-3">{header}</div> : null}
        <nav aria-label={navLabel} className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-3">
          {/* One provider so scanning down the rail opens each label without a new delay. */}
          <TooltipProvider>{children}</TooltipProvider>
        </nav>
        {footer ? (
          <div className="shrink-0 border-t border-sidebar-border p-2">{footer}</div>
        ) : null}
      </aside>
    </SidebarContext.Provider>
  );
}

/** Small inline chevron, so consumers need no icon library. Points right, turns down when open. */
function Chevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn(
        "shrink-0 text-muted-foreground/50 transition-transform duration-150 group-hover:text-muted-foreground",
        open && "rotate-90",
        className,
      )}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** Open state that is either controlled (`open` + `onOpenChange`) or the component's own. */
function useOpenState(
  open: boolean | undefined,
  initial: boolean | undefined,
  fallback: boolean,
  onOpenChange?: (open: boolean) => void,
) {
  const [choice, setChoice] = React.useState<boolean | undefined>(initial);
  const value = open ?? choice ?? fallback;
  const set = (next: boolean) => {
    if (open === undefined) setChoice(next);
    onOpenChange?.(next);
  };
  return [value, set] as const;
}

export interface SidebarSectionProps {
  /** Sentence-case label. Omit for a pinned group (Home, Flow) with no header. */
  label?: string;
  /** Make the header a toggle with a chevron. */
  collapsible?: boolean;
  /** Initial open state when collapsible and uncontrolled. */
  defaultOpen?: boolean;
  /** Controlled open state when collapsible: pair it with `onOpenChange` to remember it, or to open the active section. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function SidebarSection({
  label,
  collapsible = false,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
}: SidebarSectionProps) {
  const { collapsed } = React.useContext(SidebarContext);
  const [open, setOpen] = useOpenState(openProp, defaultOpen, true, onOpenChange);
  const id = React.useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;

  // No label → a pinned group (Home / Flow): items only, tighter bottom gap.
  if (!label) {
    return <ul className="mb-2 space-y-0.5">{children}</ul>;
  }

  // The rail has no room for a label: a hairline marks the group, the name stays
  // for screen readers, and the items always show (there is no chevron to open them).
  if (collapsed) {
    return (
      <div className="mb-3">
        <div aria-hidden className="mx-1.5 mb-2 border-t border-sidebar-border" />
        <span id={labelId} className="sr-only">
          {label}
        </span>
        <ul aria-labelledby={labelId} className="space-y-0.5">
          {children}
        </ul>
      </div>
    );
  }

  if (!collapsible) {
    return (
      <div className="mb-3">
        <div id={labelId} className="flex h-7 items-center px-2 text-caption font-medium text-foreground/70">
          <span className="min-w-0 truncate">{label}</span>
        </div>
        <ul aria-labelledby={labelId} className="mt-0.5 space-y-0.5">
          {children}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        id={labelId}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className="group flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-caption font-medium text-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <ul id={listId} aria-labelledby={labelId} className="mt-0.5 space-y-0.5">
          {children}
        </ul>
      ) : null}
    </div>
  );
}

type IconType = React.ComponentType<{ size?: number | string; className?: string }>;

export interface SidebarItemProps {
  /** A 16px icon: an icon component (`Users` from lucide-react) or an element. */
  icon?: IconType | React.ReactElement;
  label: string;
  active?: boolean;
  /**
   * A count or short status on the right. A number or string renders as the neutral
   * count chip; 0, null and "" render nothing; any other node renders as given. In the
   * rail it becomes a dot on the icon, and the value is read to screen readers.
   */
  badge?: React.ReactNode;
  /** Right-aligned slot after the badge, e.g. a status pill. Hidden in the rail. */
  trailing?: React.ReactNode;
  /** Indent as a sub-item. Children of an expandable item indent on their own. */
  indent?: boolean;
  /**
   * Not shipped yet: renders muted and non-interactive with a "Soon" tag, so a
   * planned page can sit in the nav without pretending to be clickable. Ignores
   * `href`/`onClick`/`active`.
   */
  comingSoon?: boolean;
  /** Render as a link when provided; otherwise a button (pass onClick). */
  href?: string;
  /** Called on click, for a link too (e.g. to close a drawer). */
  onClick?: () => void;
  /** This item's link renderer. Default: the Sidebar's `renderLink`, else a plain <a>. */
  renderLink?: SidebarRenderLink;
  /**
   * Child <SidebarItem>s make this an expandable parent (Flow → Inbox, Goals, Projects).
   * With `href` the row navigates and a chevron beside it folds; without, the whole row folds.
   */
  children?: React.ReactNode;
  /** Initial open state of a parent. Default: open while it or a direct child is active. */
  defaultOpen?: boolean;
  /** Controlled open state of a parent; pair it with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function hasValue(value: React.ReactNode) {
  return value != null && value !== false && value !== 0 && value !== "";
}

function ItemIcon({ icon, label, collapsed }: { icon?: SidebarItemProps["icon"]; label: string; collapsed: boolean }) {
  if (!icon) {
    // The rail needs something to show: the label's first letter, at icon size.
    return collapsed ? (
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center text-caption font-medium">
        {label.trim().charAt(0).toUpperCase()}
      </span>
    ) : null;
  }
  if (React.isValidElement(icon)) {
    return (
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
        {icon}
      </span>
    );
  }
  const Icon = icon as IconType;
  return <Icon size={16} className="size-4 shrink-0" />;
}

function ItemBadge({ value, collapsed }: { value: React.ReactNode; collapsed: boolean }) {
  if (!hasValue(value)) return null;
  const text = typeof value === "number" || typeof value === "string";
  if (collapsed) {
    return (
      <>
        <span aria-hidden className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-foreground" />
        {text ? <span className="sr-only">{`, ${value}`}</span> : null}
      </>
    );
  }
  if (!text) return <span className="shrink-0">{value}</span>;
  return (
    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] px-1.5 text-micro font-medium tabular-nums text-foreground/70">
      {value}
    </span>
  );
}

const ROW =
  "group relative flex h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

export function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  trailing,
  indent = false,
  comingSoon = false,
  href,
  onClick,
  renderLink,
  children,
  defaultOpen,
  open: openProp,
  onOpenChange,
}: SidebarItemProps) {
  const { collapsed, renderLink: sidebarRenderLink } = React.useContext(SidebarContext);
  const depth = React.useContext(DepthContext);
  const listId = `${React.useId()}-children`;
  const childItems = React.Children.toArray(children);
  const isParent = childItems.length > 0;
  const childActive = childItems.some(
    (child) => React.isValidElement<{ active?: boolean }>(child) && child.props.active === true,
  );
  const [open, setOpen] = useOpenState(openProp, defaultOpen, active || childActive, onOpenChange);
  const indented = !collapsed && (indent || depth > 0);
  const link = renderLink ?? sidebarRenderLink;

  const withTooltip = (row: React.ReactNode, content: string) =>
    collapsed && React.isValidElement(row) ? (
      <Tooltip content={content} side="right">
        {row}
      </Tooltip>
    ) : (
      row
    );

  if (comingSoon) {
    return (
      <li>
        {withTooltip(
          <div
            aria-disabled="true"
            className={cn(
              "flex h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-body text-muted-foreground/60",
              indented && "pl-7",
              collapsed && "justify-center gap-0 px-0",
            )}
          >
            <ItemIcon icon={icon} label={label} collapsed={collapsed} />
            <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>{label}</span>
            <span className={cn("shrink-0 pl-2 text-micro text-muted-foreground/50", collapsed && "sr-only")}>Soon</span>
          </div>,
          `${label} · Soon`,
        )}
      </li>
    );
  }

  const toggles = isParent && !href && !onClick;
  const className = cn(
    ROW,
    indented && "pl-7",
    collapsed && "justify-center gap-0 px-0",
    active
      ? "bg-sidebar-active font-medium text-foreground"
      : "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground",
  );
  const inner = (
    <>
      <ItemIcon icon={icon} label={label} collapsed={collapsed} />
      <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>{label}</span>
      <ItemBadge value={badge} collapsed={collapsed} />
      {trailing && !collapsed ? <span className="shrink-0">{trailing}</span> : null}
      {toggles && !collapsed ? <Chevron open={open} /> : null}
    </>
  );

  let row: React.ReactNode;
  if (toggles) {
    row = (
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={className}
      >
        {inner}
      </button>
    );
  } else if (href) {
    const props: SidebarLinkProps = {
      href,
      className,
      children: inner,
      "aria-current": active ? "page" : undefined,
      onClick,
    };
    row = link ? link(props) : <a {...props} />;
  } else {
    row = (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  row = withTooltip(row, label);

  if (!isParent) return <li>{row}</li>;

  return (
    <li>
      {toggles || collapsed ? (
        row
      ) : (
        <div className="flex items-center gap-0.5">
          <div className="min-w-0 flex-1">{row}</div>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
            className="group grid h-8 w-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Chevron open={open} />
          </button>
        </div>
      )}
      {open ? (
        <DepthContext.Provider value={depth + 1}>
          <ul id={listId} className="mt-0.5 space-y-0.5">
            {children}
          </ul>
        </DepthContext.Provider>
      ) : null}
    </li>
  );
}

export interface SidebarToggleProps {
  /** Whether the sidebar is the icon rail now. */
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  className?: string;
}

/** The footer button that switches between the full sidebar and the icon rail. */
export function SidebarToggle({ collapsed, onCollapsedChange, className }: SidebarToggleProps) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <Tooltip content={label} side="right">
      <button
        type="button"
        aria-label={label}
        onClick={() => onCollapsedChange(!collapsed)}
        className={cn(
          "flex h-8 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          className,
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d={collapsed ? "m14 9 3 3-3 3" : "m16 15-3-3 3-3"} />
        </svg>
      </button>
    </Tooltip>
  );
}
