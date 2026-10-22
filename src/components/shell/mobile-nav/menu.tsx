"use client";
import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronIcon, CloseIcon } from "./icons";
import { idPart } from "./id-part";
import type { MobileNavLinkProps, MobileNavRenderLink } from "./types";

export interface MobileMenuChild {
  id: string;
  label: string;
  href: string;
  current?: boolean;
  /** Desktop-only: dimmed, not focusable, announced as unavailable. */
  disabled?: boolean;
}
export interface MobileMenuGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** A group without children is a link to this. */
  href?: string;
  badge?: number | string;
  current?: boolean;
  /** Desktop-only: dimmed, not focusable, announced as unavailable. Children are not shown. */
  disabled?: boolean;
  /** Starts open. Defaults to open when a child is the current page. */
  defaultExpanded?: boolean;
  children?: MobileMenuChild[];
}
/** The bottom pill: avatar, OS name, chevron. Switches OS. */
export interface MobileMenuAccount {
  initials: string;
  label: string;
  href?: string;
  onClick?: () => void;
  /** Avatar background. */
  color?: string;
}
export interface MobileMenuLink {
  id: string;
  label: string;
  href: string;
  current?: boolean;
}
export interface MobileMenuBodyProps {
  groups: MobileMenuGroup[];
  renderLink?: MobileNavRenderLink<MobileMenuLink>;
  account?: MobileMenuAccount;
  /** Names the menu's navigation landmark. Default "Menu". */
  label?: string;
  /** Accessible name of the close circle. Default "Close menu". */
  closeLabel?: string;
  /** Read after the name of a desktop-only row ("Finance, desktop only"). Default "desktop only". */
  disabledLabel?: string;
  /** Called by the close circle and by every link, so a client-side navigation also closes the menu. */
  onClose?: () => void;
}
export interface MobileMenuProps extends Omit<MobileMenuBodyProps, "onClose"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const badgeText = (badge: MobileMenuGroup["badge"]) => {
  if (badge == null || badge === "" || badge === 0) return null;
  return typeof badge === "number" ? (badge > 99 ? "99+" : String(badge)) : badge;
};

/**
 * The menu without its dialog: rows, groups, account pill and close circle.
 * `MobileMenu` wraps it in a full-screen dialog; use it directly only inside
 * another container (a showcase page, a test).
 */
export function MobileMenuBody({ groups, renderLink, account, label = "Menu", closeLabel = "Close menu", disabledLabel = "desktop only", onClose }: MobileMenuBodyProps) {
  const uid = React.useId();
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({});
  const isExpanded = (group: MobileMenuGroup) => toggled[group.id] ?? group.defaultExpanded ?? Boolean(group.children?.some(child => child.current));
  const link = (item: MobileMenuLink, props: MobileNavLinkProps) => renderLink ? renderLink(item, props) : <a {...props} />;
  const navigate = onClose ? () => onClose() : undefined;
  const badge = (value: MobileMenuGroup["badge"]) => { const text = badgeText(value); return text ? <span className="curv-mobile-menu-badge">{text}</span> : null; };
  /** A desktop-only row cannot be focused or followed, but it is still announced: a link that is unavailable, with the reason. */
  const unavailable = <span className="curv-mobile-nav-sr">, {disabledLabel}</span>;
  const rowContent = (group: MobileMenuGroup, trailing?: React.ReactNode) => <>
    <span className="curv-mobile-menu-icon" aria-hidden="true">{group.icon}</span>
    <span className="curv-mobile-menu-label">{group.label}</span>
    {badge(group.badge)}
    {trailing}
  </>;

  const renderGroup = (group: MobileMenuGroup) => {
    if (group.disabled) return <div className="curv-mobile-menu-row" role="link" aria-disabled="true">{rowContent(group, unavailable)}</div>;
    if (group.children && group.children.length > 0) {
      const expanded = isExpanded(group);
      const panel = `${uid}-${idPart(group.id)}`;
      return <>
        <button type="button" className="curv-mobile-menu-row" aria-expanded={expanded} aria-controls={panel} onClick={() => setToggled(current => ({ ...current, [group.id]: !expanded }))}>
          {rowContent(group, <ChevronIcon className="curv-mobile-menu-chevron" direction={expanded ? "up" : "down"} size={20} />)}
        </button>
        <ul id={panel} className="curv-mobile-menu-children" hidden={!expanded}>
          {group.children.map(child => <li key={child.id}>{child.disabled
            ? <div className="curv-mobile-menu-child" role="link" aria-disabled="true">{child.label}{unavailable}</div>
            : link(child, { href: child.href, className: "curv-mobile-menu-child", "aria-current": child.current ? "page" : undefined, onClick: navigate, children: child.label })}</li>)}
        </ul>
      </>;
    }
    if (group.href !== undefined) return link({ id: group.id, label: group.label, href: group.href, current: group.current }, { href: group.href, className: "curv-mobile-menu-row", "aria-current": group.current ? "page" : undefined, onClick: navigate, children: rowContent(group) });
    return <div className="curv-mobile-menu-row">{rowContent(group)}</div>;
  };

  const accountContent = account && <>
    <span className="curv-mobile-menu-avatar" aria-hidden="true" style={account.color ? { background: account.color } : undefined}>{account.initials}</span>
    <span className="curv-mobile-menu-account-label">{account.label}</span>
    <ChevronIcon className="curv-mobile-menu-chevron" direction="right" size={20} />
  </>;
  let accountControl: React.ReactNode = null;
  if (account?.href !== undefined) accountControl = link({ id: "account", label: account.label, href: account.href }, { href: account.href, className: "curv-mobile-menu-account", onClick: account.onClick ? () => { account.onClick?.(); onClose?.(); } : navigate, children: accountContent });
  else if (account?.onClick) accountControl = <button type="button" className="curv-mobile-menu-account" onClick={() => { account.onClick?.(); onClose?.(); }}>{accountContent}</button>;
  else if (account) accountControl = <div className="curv-mobile-menu-account">{accountContent}</div>;

  return <>
    <nav className="curv-mobile-menu-scroll" aria-label={label}>
      <ul className="curv-mobile-menu-list">
        {groups.map(group => <li key={group.id} className="curv-mobile-menu-item">{renderGroup(group)}</li>)}
      </ul>
    </nav>
    <div className="curv-mobile-menu-footer">
      {accountControl}
      <button type="button" className="curv-mobile-menu-close" aria-label={closeLabel} onClick={onClose}><CloseIcon /></button>
    </div>
  </>;
}

/** Base UI owns focus trapping, Escape and focus restoration, as in MobileSheet. */
export function MobileMenu({ open, onOpenChange, label = "Menu", ...body }: MobileMenuProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Popup className="curv-mobile-menu">
        <Dialog.Title className="curv-mobile-nav-sr">{label}</Dialog.Title>
        <MobileMenuBody {...body} label={label} onClose={() => onOpenChange(false)} />
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
