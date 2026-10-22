"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { prefersReducedMotion } from "./shared";

export interface MobileGalleryImage {
  src: string;
  alt: string;
}
export interface MobileGalleryProps {
  images: MobileGalleryImage[];
  /** Names the gallery for screen readers: "Product photos". */
  label: string;
  className?: string;
}

/** A swipeable photo strip with a pager pill and a row of thumbnails that jump to each photo. */
export function MobileGallery({ images, label, className }: MobileGalleryProps) {
  const total = images.length;
  const [current, setCurrent] = React.useState(0);
  const strip = React.useRef<HTMLDivElement>(null);
  const thumbs = React.useRef<HTMLDivElement>(null);
  // While a thumbnail jump is scrolling the strip, the strip's own scroll events are ours and must not move the pager.
  const jump = React.useRef({ busy: false, to: 0, timer: 0 });
  const frame = React.useRef(0);

  React.useEffect(() => () => { window.clearTimeout(jump.current.timer); window.cancelAnimationFrame(frame.current); }, []);

  // Keep the current thumbnail in view without touching the page's own scroll.
  React.useEffect(() => {
    const row = thumbs.current;
    const thumb = row?.children[current] as HTMLElement | undefined;
    if (!row || !thumb) return;
    const target = thumb.offsetLeft - (row.clientWidth - thumb.offsetWidth) / 2;
    if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, target), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [current]);

  if (!total) return null;

  /** Quiet for `wait` ms means the jump finished, or never started (a throttled tab): land it, then hand the strip back. */
  const settle = (wait: number) => {
    window.clearTimeout(jump.current.timer);
    jump.current.timer = window.setTimeout(() => {
      jump.current.busy = false;
      const el = strip.current;
      if (el && Math.abs(el.scrollLeft - jump.current.to) > 2) el.scrollTo({ left: jump.current.to, behavior: "auto" });
    }, wait);
  };
  const takeOver = () => {
    if (!jump.current.busy) return;
    jump.current.busy = false;
    window.clearTimeout(jump.current.timer);
  };
  const onScroll = () => {
    if (jump.current.busy) { settle(140); return; }
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      const el = strip.current;
      if (!el || !el.clientWidth) return;
      setCurrent(Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
    });
  };
  const show = (index: number) => {
    const el = strip.current;
    if (!el) return;
    jump.current.busy = true;
    jump.current.to = index * el.clientWidth;
    settle(700);
    setCurrent(index);
    el.scrollTo({ left: jump.current.to, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className={cn("curv-mobile-gallery", className)}>
      <div className="curv-mobile-gallery-frame">
        <div ref={strip} className="curv-mobile-gallery-strip" role="group" aria-label={label} tabIndex={0} onScroll={onScroll} onPointerDown={takeOver} onWheel={takeOver}>
          {images.map((image, index) => (
            <div key={index} className="curv-mobile-gallery-slide">
              <img src={image.src} alt={image.alt} loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
            </div>
          ))}
        </div>
        {total > 1 && (
          <div className="curv-mobile-gallery-pager">
            <span className="curv-mobile-gallery-dots" aria-hidden="true">
              {images.map((_, index) => <span key={index} className="curv-mobile-gallery-dot" data-current={index === current ? "true" : undefined} />)}
            </span>
            <span className="curv-mobile-gallery-live" aria-live="polite" aria-atomic="true">{`Photo ${current + 1} of ${total}`}</span>
          </div>
        )}
      </div>
      {total > 1 && (
        <div ref={thumbs} className="curv-mobile-gallery-thumbs">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              className="curv-mobile-gallery-thumb"
              aria-label={`Photo ${index + 1}: ${image.alt}`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => show(index)}
            >
              <img src={image.src} alt="" loading="lazy" decoding="async" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
