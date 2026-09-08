import * as React from "react";
import { cn } from "../../lib/cn";

export interface TopBarProps {
  /** Left region — the app logo / wordmark (+ mobile menu trigger). */
  logo?: React.ReactNode;
  /** Center region — the global search / command palette. Fills and shrinks. */
  center?: React.ReactNode;
  /** Right region — icon actions (knowledge base, feedback, notifications, account). */
  actions?: React.ReactNode;
  className?: string;
  /** Approved compact mobile identity; desktop chrome stays unchanged. */
  mobileTitle?: React.ReactNode;
}

/**
 * The global top bar — a fixed dark (#1b1b1b) chrome bar in BOTH themes
 * (deliberate; see design-system.md → App shell). Structure is shared, content
 * is per-OS: each app passes its own logo, search and actions. auto/1fr/auto
 * lets the logo and actions take natural width while search fills the middle.
 */
export function TopBar({ logo, center, actions, className, mobileTitle }: TopBarProps) {
  return (
    <header
      data-mobile-breakpoint="md"
      className={cn(
        "sticky top-0 z-50 grid h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 bg-topbar pt-[env(safe-area-inset-top)] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] text-topbar-foreground",
        mobileTitle && "curv-mobile-adaptive-header",
        className,
      )}
    >
      {mobileTitle}
      <div className={cn("items-center gap-1 pl-1", mobileTitle ? "hidden md:flex" : "flex")}>{logo}</div>
      <div className={cn("min-w-0 justify-center px-1 sm:px-2", mobileTitle ? "hidden md:flex" : "flex")}>{center}</div>
      <div className="flex items-center justify-end gap-1">{actions}</div>
    </header>
  );
}
