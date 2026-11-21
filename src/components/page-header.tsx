import * as React from "react";
import { cn } from "../lib/cn";

/**
 * PageHeader: the title block of a DETAIL page (one deal, one creator): the
 * 20px / 600 title with an optional status badge, and right-aligned actions.
 * Stacks on narrow screens.
 *
 * Index pages (reached from the sidebar) show no visible title: they open on
 * one <PageToolbar> instead (design-system.md → No titles on index pages).
 * `eyebrow`, `count` and `description` still render for pages that have not
 * moved yet; new pages leave them out.
 */
export interface PageHeaderProps {
  title: React.ReactNode;
  /** Small context above the title, e.g. "Finance / Refunds". Legacy: new pages leave it out. */
  eyebrow?: React.ReactNode;
  /** A muted count after the title, e.g. "2,369". Legacy: counts live in the table footer. */
  count?: React.ReactNode;
  /** A status pill next to the title (pass a <Badge/>). */
  badge?: React.ReactNode;
  /** A line under the title. Legacy: new pages leave it out. */
  description?: React.ReactNode;
  /** Right-aligned controls/actions. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, count, badge, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-caption font-medium text-muted-foreground">{eyebrow}</div>}
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground text-balance">{title}</h1>
          {count != null && <span className="shrink-0 text-body tabular-nums text-muted-foreground">{count}</span>}
          {badge}
        </div>
        {description && <p className="mt-1 max-w-2xl text-body text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * PageToolbar: how an INDEX page opens. The sidebar already says where you are,
 * so the page name is a visually hidden <h1> for screen readers, and the page
 * starts on ONE control row: views (segmented) · search · filter on the left,
 * columns · Export · the primary action on the right. Every control is 36 tall
 * (`h-9`), 8 apart; the row wraps on a narrow window. Leave 16 (`mt-4`) between
 * it and the content.
 *
 *   <PageToolbar
 *     title="Deals"
 *     controls={<><SegmentedControl … /><Input type="search" className="w-60" … /><FilterButton … /></>}
 *     actions={<><Button variant="outline">Export</Button><Button>New deal</Button></>}
 *   />
 */
export interface PageToolbarProps {
  /** The page name, for screen readers only (a visually hidden <h1>). */
  title: React.ReactNode;
  /** Left: views, search, filter. */
  controls?: React.ReactNode;
  /** Right: columns, Export, the primary action (last). */
  actions?: React.ReactNode;
  className?: string;
}

export function PageToolbar({ title, controls, actions, className }: PageToolbarProps) {
  return (
    <div className={cn("flex min-h-9 flex-wrap items-center gap-2", className)}>
      <h1 className="sr-only">{title}</h1>
      {controls && <div className="flex min-w-0 flex-wrap items-center gap-2">{controls}</div>}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
