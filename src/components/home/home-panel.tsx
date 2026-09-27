import type { AnchorHTMLAttributes, CSSProperties, ElementType, ReactNode } from "react";
import { cx } from "./cx";

// The one panel shape under the Home pulse: a 16px heading with an optional
// live count and a quiet qualifier, a slot on the right, then one-line rows.
// Hook-free, so a server component renders it directly. Every color, radius,
// border and weight is a CSS variable in home.css, resolved from the app's
// own tokens (see docs/home.md).

export interface HomePanelProps {
  title: ReactNode;
  /** A live count, shown as a small chip beside the title. 0 shows; null or undefined hides it. */
  count?: number | null;
  /** Muted text beside the title. */
  meta?: ReactNode;
  /** A link or qualifier on the right of the heading. */
  right?: ReactNode;
  children: ReactNode;
  /** Feed-like list: one hairline under the heading, then rows that breathe on spacing (HOME_FEED_ROW). */
  feed?: boolean;
  /** The once-per-visit CSS entrance (home-enter-up). Off in tests and where the page has its own. */
  entrance?: boolean;
  /** Entrance stagger for this panel, in milliseconds. */
  delayMs?: number;
  /** Accessible name when the title is not plain text. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function HomePanel({
  title,
  count,
  meta,
  right,
  children,
  feed = false,
  entrance = true,
  delayMs = 0,
  label,
  className,
  style,
}: HomePanelProps) {
  return (
    <section
      aria-label={label}
      className={cx("home-panel", entrance && "home-enter-up", className)}
      data-feed={feed ? "" : undefined}
      style={entrance && delayMs ? { animationDelay: `${delayMs}ms`, ...style } : style}
    >
      <div className="home-panel-head">
        <h2 className="home-panel-title">
          <span className="home-panel-title-text">{title}</span>
          {count != null ? <span className="home-panel-count">{count}</span> : null}
          {meta ? <span className="home-panel-meta">{meta}</span> : null}
        </h2>
        {right ? <div className="home-panel-right">{right}</div> : null}
      </div>
      <div className="home-panel-body">{children}</div>
    </section>
  );
}

export type PanelLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> & {
  href: string;
  children: ReactNode;
  /** The app's router link, for client-side navigation (next/link's Link). A plain anchor by default. */
  as?: ElementType;
};

/** A quiet link with a chevron, for a panel's right slot. */
export function PanelLink({ href, children, as: Tag = "a", className, ...rest }: PanelLinkProps) {
  return (
    <Tag href={href} className={cx("home-panel-link", className)} {...rest}>
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Tag>
  );
}

export interface HomePanelNoteProps {
  children: ReactNode;
  /** One action under the note: a link or a button. */
  action?: ReactNode;
  /** A hairline above and room to breathe, for panels whose rows carry hairlines (HOME_ROW). */
  ruled?: boolean;
  className?: string;
}

/** A quiet state inside a panel: empty, signed out, or unavailable. */
export function HomePanelNote({ children, action, ruled = false, className }: HomePanelNoteProps) {
  return (
    <div className={cx("home-panel-note", className)} data-ruled={ruled ? "" : undefined}>
      <p>{children}</p>
      {action}
    </div>
  );
}

/** A full-width row with a hairline above it, for table-like lists (leaderboard, goals). */
export const HOME_ROW = "home-row";

/** An inset row with no hairline, for feed-like lists (requests, inbox, tasks) that breathe on spacing. */
export const HOME_FEED_ROW = "home-feed-row";

/** The hover a linked or checkable row gets: a faint wash and a focus ring, no shadow, no movement. */
export const HOME_ROW_HOVER = "home-row-hover";

/** One neutral chip for channels, goals and other labels: the label is the identity, never a hue. */
export const HOME_CHIP = "home-chip";

/** A 28px square holding a row's icon. */
export const HOME_ROW_ICON = "home-row-icon";
