import * as React from "react";
import { cn } from "../../lib/cn";

export interface TopBarProps {
  /** Left region: the app's <Wordmark> (+ mobile menu trigger). */
  logo?: React.ReactNode;
  /**
   * Center region: the global ⌘K search with the Ask button beside it. From `md` it is a 560px region
   * at the true center of the bar, narrower only when the window is; give the search `w-full` (or
   * `flex-1`) and the Ask button `shrink-0`. Below `md` it fills the middle, as before.
   */
  center?: React.ReactNode;
  /** Right region: feedback, approvals, notifications, account (theme lives in the account menu). */
  actions?: React.ReactNode;
  className?: string;
  /** Approved compact mobile identity; desktop chrome stays unchanged. */
  mobileTitle?: React.ReactNode;
}

/**
 * The global top bar: a fixed dark (#1b1b1b) chrome bar in BOTH themes
 * (deliberate; see design-system.md → App shell). Structure is shared, content
 * is per-OS: each app passes its own wordmark, search and actions.
 *
 * From `md` the grid is `minmax(max-content,1fr) minmax(0,35rem) minmax(max-content,1fr)`:
 * the 1fr sides are equal, so the search sits at the true center whatever the
 * sides hold (the standard's `1fr auto 1fr`). Two refinements keep it whole: the
 * center track has a definite 560px size, so a `w-full` search fills it instead
 * of collapsing to its text, and the sides never shrink below their content, so
 * on a narrow window the search gives way instead of sliding under the actions.
 * Below `md` the bar keeps its phone layout (`auto 1fr auto`).
 */
export function TopBar({ logo, center, actions, className, mobileTitle }: TopBarProps) {
  return (
    <header
      data-mobile-breakpoint="md"
      className={cn(
        "sticky top-0 z-50 grid h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 bg-topbar pt-[env(safe-area-inset-top)] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] text-topbar-foreground md:grid-cols-[minmax(max-content,1fr)_minmax(0,35rem)_minmax(max-content,1fr)]",
        mobileTitle && "curv-mobile-adaptive-header",
        className,
      )}
    >
      {mobileTitle}
      <div className={cn("items-center gap-1 pl-1", mobileTitle ? "hidden md:flex" : "flex")}>{logo}</div>
      <div
        className={cn(
          "min-w-0 items-center justify-center gap-2 px-1 sm:px-2 md:px-0",
          mobileTitle ? "hidden md:flex" : "flex",
        )}
      >
        {center}
      </div>
      <div className="flex items-center justify-end gap-1">{actions}</div>
    </header>
  );
}
