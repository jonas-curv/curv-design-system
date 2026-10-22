"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { BoxIcon, ContentLink, imageHasFailed, type MobileContentRenderLink } from "./shared";

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

export type MobileExceptionTone = "critical" | "warning";

/** A problem inside a meta line: red "0 sellable", or amber for one that needs watching ("3 days of cover"). Not a badge. */
export function MobileException({ children, tone = "critical" }: { children: React.ReactNode; tone?: MobileExceptionTone }) {
  return <span className="curv-mobile-flat-exception" data-tone={tone === "warning" ? "warning" : undefined}>{children}</span>;
}

export interface MobileStatusPillProps {
  label: string;
  tone: MobileStatusTone;
  className?: string;
}

/** The status pill a list row ends with, on its own: a record's own vocabulary ("At risk") in one of six fixed tones. */
export function MobileStatusPill({ label, tone, className }: MobileStatusPillProps) {
  return <span className={cn("curv-mobile-flat-pill", `curv-mobile-flat-pill-${tone}`, className)}>{label}</span>;
}

/** The 48px thumbnail. A photo that cannot load (hotlink blocked, deleted, offline) becomes the neutral box a row without one draws. */
function RowThumb({ thumbnail, alt }: { thumbnail: string | React.ReactNode | null; alt?: string }) {
  const image = React.useRef<HTMLImageElement>(null);
  const [failed, setFailed] = React.useState<string | null>(null);
  const src = typeof thumbnail === "string" && thumbnail ? thumbnail : null;
  // Keyed by the address that failed, so a row that is given another photo tries it.
  const broken = src !== null && failed === src;
  React.useEffect(() => { if (src && imageHasFailed(image.current)) setFailed(src); }, [src]);
  const placeholder = thumbnail === null || thumbnail === "" || broken;
  return (
    <span className="curv-mobile-flat-thumb" data-empty={placeholder || undefined}>
      {src && !broken
        ? <img ref={image} src={src} alt={alt ?? ""} width={48} height={48} loading="lazy" decoding="async" draggable={false} referrerPolicy="no-referrer" onError={() => setFailed(src)} />
        : placeholder ? <BoxIcon size={22} /> : thumbnail}
    </span>
  );
}

export interface MobileListRowProps {
  title: React.ReactNode;
  /** A string is an image URL; one that fails to load shows the same neutral box as `null`. Leave it out for a row without a thumbnail. */
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
  const interactive = Boolean(href || onClick);
  const content = (
    <>
      {hasThumbnail && <RowThumb thumbnail={thumbnail} alt={thumbnailAlt} />}
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
      {status && <MobileStatusPill label={status.label} tone={status.tone} />}
    </div>
  );
}
