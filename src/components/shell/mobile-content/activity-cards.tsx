"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { ContentLink, type MobileContentRenderLink } from "./shared";

export interface MobileActivityItem {
  id: string;
  label: string;
  value: React.ReactNode;
  tone?: "critical" | "neutral";
  icon?: React.ReactNode;
  href: string;
}
export interface MobileActivityCardsProps {
  title?: React.ReactNode;
  /** Counts that are jobs. Each card is one link to the work. */
  items: MobileActivityItem[];
  renderLink?: MobileContentRenderLink;
  className?: string;
}

/** "Here's what needs you": a sideways, snapping row of count cards. */
export function MobileActivityCards({ title, items, renderLink, className }: MobileActivityCardsProps) {
  const id = React.useId();
  return (
    <section className={cn("curv-mobile-activity", className)} aria-labelledby={title ? id : undefined}>
      {title && <h2 id={id} className="curv-mobile-activity-title">{title}</h2>}
      <ul className="curv-mobile-activity-rail" role="list">
        {items.map(item => (
          <li key={item.id} className="curv-mobile-activity-item">
            <ContentLink href={item.href} className="curv-mobile-activity-card" renderLink={renderLink}>
              <span className="curv-mobile-activity-label">{item.label}</span>
              <span className="curv-mobile-activity-foot">
                <span className="curv-mobile-activity-value" data-tone={item.tone === "critical" ? "critical" : undefined}>{item.value}</span>
                {item.icon && <span className="curv-mobile-activity-icon" aria-hidden="true">{item.icon}</span>}
              </span>
            </ContentLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
