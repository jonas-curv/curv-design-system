"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { Popover } from "../popover";
import { ThemeToggle } from "./theme-toggle";

function ChevronDown() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted-foreground">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * AccountMenu — the top-bar account chip + dropdown every OS shares: avatar +
 * name, opening to an identity header, an optional Light/Dark toggle, and a
 * slot of menu items. Identity is passed in (`name`/`email`/`role`/`avatarSrc`);
 * theme + items are wired by the app. Compose rows with <AccountMenuItem>; the
 * sign-out control (usually a POST form) is passed as a child too.
 */
export interface AccountMenuProps {
  name: string;
  email: string;
  /** Small caption under the name (e.g. the user's role). Sentence case. */
  role?: string;
  avatarSrc?: string;
  /** Provide both `theme` + `onThemeChange` to show the Light/Dark toggle. */
  theme?: "light" | "dark";
  onThemeChange?: (value: "light" | "dark") => void;
  /** Menu rows — <AccountMenuItem>s and/or the app's sign-out form. */
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
  /** Extra classes on the trigger chip. */
  className?: string;
}

export function AccountMenu({ name, email, role, avatarSrc, theme, onThemeChange, children, align = "end", className }: AccountMenuProps) {
  const trigger = (
    <button
      type="button"
      aria-label="Account menu"
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg pl-1.5 pr-2 transition hover:bg-accent data-[popup-open]:bg-accent",
        className,
      )}
    >
      <Avatar name={name} src={avatarSrc} size="md" className="rounded-lg" />
      <span className="hidden max-w-[140px] truncate text-body font-medium text-foreground sm:block">{name}</span>
      <ChevronDown />
    </button>
  );

  return (
    <Popover trigger={trigger} align={align} sideOffset={8} className="w-64 max-w-none p-0">
      <div className="flex items-center gap-2.5 p-3">
        <Avatar name={name} src={avatarSrc} size="lg" className="rounded-lg" />
        <div className="min-w-0">
          <div className="truncate text-body font-semibold text-foreground">{name}</div>
          {role ? <div className="text-micro text-muted-foreground">{role}</div> : null}
          <div className="truncate text-caption text-muted-foreground">{email}</div>
        </div>
      </div>

      {theme && onThemeChange ? (
        <div className="px-3 pb-2.5">
          <ThemeToggle value={theme} onValueChange={onThemeChange} size="sm" />
        </div>
      ) : null}

      {children ? (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-0.5 p-1.5">{children}</div>
        </>
      ) : null}
    </Popover>
  );
}

const itemClass =
  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-body text-muted-foreground transition hover:bg-accent hover:text-foreground";

export interface AccountMenuItemProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Render as a link; otherwise a button (pass `onClick`). */
  href?: string;
  onClick?: () => void;
  /** Right-aligned slot (e.g. a "soon" tag). */
  trailing?: React.ReactNode;
  /** Non-interactive, muted (e.g. a locked-behind-permission row). */
  disabled?: boolean;
}

export function AccountMenuItem({ icon, children, href, onClick, trailing, disabled }: AccountMenuItemProps) {
  const inner = (
    <>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </>
  );
  if (disabled) return <div className={cn(itemClass, "pointer-events-none opacity-60")}>{inner}</div>;
  if (href) return <a href={href} className={itemClass}>{inner}</a>;
  return <button type="button" onClick={onClick} className={itemClass}>{inner}</button>;
}
