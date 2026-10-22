"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { ChevronIcon, ContentLink, type MobileContentRenderLink } from "./shared";

export type MobileKeyValueTone = "positive" | "critical" | "warning" | "neutral";

export interface MobileKeyValueRow {
  id: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  /** The colour of the left sub-line: "Short cover" in amber, "Overdue" in red. Neutral is the default grey. */
  subTone?: MobileKeyValueTone;
  value: React.ReactNode;
  valueSub?: React.ReactNode;
  /** The colour of the right sub-line ("+4.2% vs prior" in green). The value's own colour is `valueTone`. */
  valueSubTone?: MobileKeyValueTone;
  valueTone?: MobileKeyValueTone;
  /** A row with an href is a link and shows a chevron. */
  href?: string;
}
export interface MobileKeyValueListProps {
  /** Say the period here: "Money, last 30 days". */
  title?: React.ReactNode;
  /** A short note at the right of the title: "as of 9:41". */
  trailing?: React.ReactNode;
  rows: MobileKeyValueRow[];
  renderLink?: MobileContentRenderLink;
  className?: string;
}

const toneOf = (tone: MobileKeyValueTone | undefined) => (tone && tone !== "neutral" ? tone : undefined);

/** Settings-style figures: label on the left, a tabular value on the right, optional sub-lines. */
export function MobileKeyValueList({ title, trailing, rows, renderLink, className }: MobileKeyValueListProps) {
  const id = React.useId();
  return (
    <section className={cn("curv-mobile-kv", className)}>
      {(title != null || trailing != null) && (
        <div className="curv-mobile-kv-head">
          {title != null && <h2 id={id}>{title}</h2>}
          {trailing != null && <span className="curv-mobile-kv-trailing">{trailing}</span>}
        </div>
      )}
      <ul className="curv-mobile-kv-card" role="list" aria-labelledby={title != null ? id : undefined}>
        {rows.map(row => {
          const body = (
            <>
              <span className="curv-mobile-kv-label"><span>{row.label}</span>{row.sub != null && <span className="curv-mobile-kv-sub" data-tone={toneOf(row.subTone)}>{row.sub}</span>}</span>
              <span className="curv-mobile-kv-value" data-tone={toneOf(row.valueTone)}>
                <span>{row.value}</span>
                {row.valueSub != null && <span className="curv-mobile-kv-sub" data-tone={toneOf(row.valueSubTone)}>{row.valueSub}</span>}
              </span>
              {row.href && <span className="curv-mobile-kv-chevron" aria-hidden="true"><ChevronIcon /></span>}
            </>
          );
          return (
            <li key={row.id} className="curv-mobile-kv-row">
              {row.href
                ? <ContentLink href={row.href} className="curv-mobile-kv-line curv-mobile-kv-link" renderLink={renderLink}>{body}</ContentLink>
                : <div className="curv-mobile-kv-line">{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
