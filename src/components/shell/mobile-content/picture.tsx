"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { BoxIcon, ContentLink, hasNode, imageHasFailed, type MobileContentRenderLink } from "./shared";

export interface MobilePictureProps {
  /** The image address. One that fails to load, or none, shows the neutral box and keeps the caption. */
  src?: string | null;
  /** Describes the picture for screen readers. Empty only if the caption already says what it is. */
  alt: string;
  /** A short chip at the top left: "Latest render", "Client mockup". */
  label?: string;
  /** The caption's first line, on a gradient at the bottom. */
  title?: React.ReactNode;
  /** One line under the title: the item's spec. */
  caption?: React.ReactNode;
  /** A picture with an href or onClick is the target (it opens the full image or the gallery). */
  href?: string;
  onClick?: () => void;
  renderLink?: MobileContentRenderLink;
  className?: string;
}

/** A 16:10 image card: a label chip top-left, a gradient caption with a title and one line at the bottom. Full width of its container. */
export function MobilePicture({ src, alt, label, title, caption, href, onClick, renderLink, className }: MobilePictureProps) {
  const image = React.useRef<HTMLImageElement>(null);
  const [failed, setFailed] = React.useState<string | null>(null);
  const address = typeof src === "string" && src ? src : null;
  const broken = address !== null && failed === address;
  React.useEffect(() => { if (address && imageHasFailed(image.current)) setFailed(address); }, [address]);
  const empty = address === null || broken;
  const hasCaption = hasNode(title) || hasNode(caption);
  const content = (
    <>
      {empty
        ? <span className="curv-mobile-picture-empty" role="img" aria-label={alt}><BoxIcon size={32} /></span>
        : <img ref={image} className="curv-mobile-picture-image" src={address} alt={alt} loading="lazy" decoding="async" draggable={false} referrerPolicy="no-referrer" onError={() => setFailed(address)} />}
      {label && <span className="curv-mobile-picture-chip">{label}</span>}
      {hasCaption && (
        <span className="curv-mobile-picture-caption">
          {hasNode(title) && <span className="curv-mobile-picture-title">{title}</span>}
          {hasNode(caption) && <span className="curv-mobile-picture-line">{caption}</span>}
        </span>
      )}
    </>
  );
  const rootClass = cn("curv-mobile-picture", className);
  if (href) return <ContentLink href={href} className={cn(rootClass, "curv-mobile-picture-link")} renderLink={renderLink}>{content}</ContentLink>;
  if (onClick) return <button type="button" className={cn(rootClass, "curv-mobile-picture-link")} onClick={onClick}>{content}</button>;
  return <div className={rootClass}>{content}</div>;
}
