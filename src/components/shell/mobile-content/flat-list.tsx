"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { BoxIcon, ContentLink, type MobileContentRenderLink } from "./shared";

export type MobileStatusTone = "positive" | "critical" | "warning" | "info" | "special" | "neutral";

/** A plain white list. Rows draw their own inset hairline; there are no cards around them. */
export function MobileFlatList({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("curv-mobile-flat-list", className)} role="list" aria-label={label}>
      {React.Children.map(children, child => (child == null || typeof child === "boolean" ? null : <div role="listitem" className="curv-mobile-flat-item">{child}</div>))}
    </div>
  );
}

/** A heading above a list. Put a `MobileFlatList` (or any rows) inside. */
export function MobileListSection({ title, trailing, children, className }: { title: React.ReactNode; trailing?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  return (
    <section className={cn("curv-mobile-flat-section", className)} aria-labelledby={id}>
      <div className="curv-mobile-flat-section-head">
        <h2 id={id}>{title}</h2>
        {trailing != null && trailing !== false && <span className="curv-mobile-flat-section-trailing">{trailing}</span>}
      </div>
      {children}
    </section>
  );
}

/** A problem inside a meta line, in red: "0 sellable". Not a badge. */
export function MobileException({ children }: { children: React.ReactNode }) {
  return <span className="curv-mobile-flat-exception">{children}</span>;
}

export interface MobileListRowProps {
  title: React.ReactNode;
  /** A string is an image URL. `null` shows a neutral box placeholder. Leave it out for a row without a thumbnail. */
  thumbnail?: string | React.ReactNode | null;
  thumbnailAlt?: string;
  /** One line, cut off with an ellipsis. Put problems in `MobileException`. */
  meta?: React.ReactNode;
  /** One pill, in the record's own vocabulary. */
  status?: { label: string; tone: MobileStatusTone };
  /** A time, or a small button. Rendered beside the row link, never inside it. */
  trailing?: React.ReactNode;
  unread?: boolean;
  /** Visually hidden text read before the title of an unread row. */
  unreadLabel?: string;
  href?: string;
  onClick?: () => void;
  renderLink?: MobileContentRenderLink;
  className?: string;
}

/** One row, one real link or button. The whole row is tappable; an inline trailing button sits above it as a sibling. */
export function MobileListRow({ title, thumbnail, thumbnailAlt, meta, status, trailing, unread, unreadLabel = "Unread", href, onClick, renderLink, className }: MobileListRowProps) {
  const hasThumbnail = thumbnail !== undefined;
  const placeholder = thumbnail === null || thumbnail === "";
  const interactive = Boolean(href || onClick);
  const content = (
    <>
      {hasThumbnail && (
        <span className="curv-mobile-flat-thumb" data-empty={placeholder || undefined}>
          {typeof thumbnail === "string" && thumbnail
            ? <img src={thumbnail} alt={thumbnailAlt ?? ""} width={48} height={48} loading="lazy" decoding="async" draggable={false} />
            : placeholder ? <BoxIcon size={22} /> : thumbnail}
        </span>
      )}
      <span className="curv-mobile-flat-text">
        {unread && <span className="curv-mobile-content-vh">{unreadLabel}</span>}
        <span className="curv-mobile-flat-title">{title}</span>
        {meta != null && meta !== false && <span className="curv-mobile-flat-meta">{meta}</span>}
      </span>
    </>
  );
  const targetClass = cn("curv-mobile-flat-target", interactive && "curv-mobile-flat-link");
  const target = href
    ? <ContentLink href={href} className={targetClass} renderLink={renderLink}>{content}</ContentLink>
    : onClick
      ? <button type="button" className={targetClass} onClick={onClick}>{content}</button>
      : <div className={targetClass}>{content}</div>;
  return (
    <div className={cn("curv-mobile-flat-row", className)} data-thumb={hasThumbnail || undefined} data-unread={unread || undefined}>
      {unread && <span className="curv-mobile-flat-unread" aria-hidden="true" />}
      {target}
      {trailing != null && trailing !== false && <span className="curv-mobile-flat-trailing">{trailing}</span>}
      {status && <span className={cn("curv-mobile-flat-pill", `curv-mobile-flat-pill-${status.tone}`)}>{status.label}</span>}
    </div>
  );
}
