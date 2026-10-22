"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { ContentLink, prefersReducedMotion, useIsomorphicLayoutEffect, type MobileContentRenderLink } from "./shared";

export interface MobileHeroKpi {
  id: string;
  label: string;
  value: React.ReactNode;
  delta?: { label: string; tone: "positive" | "critical" };
  /** A KPI with an href is a link (the URL holds the selection). Without one it is a button when the panel has
   *  `onKpiChange`, and plain text otherwise: an informational chip ("Per day") beside a selectable one. */
  href?: string;
}
export interface MobileHeroPanelProps {
  kpis: MobileHeroKpi[];
  activeKpiId: string;
  /** Makes every KPI without an href a button that selects its series. */
  onKpiChange?: (id: string) => void;
  /** The app passes a `MobileChart` with `tone="dark"`. */
  chart: React.ReactNode;
  /** At most two `MobileHeroAction`s. */
  actions?: React.ReactNode;
  /** Names the panel and its KPI group: "Overview". */
  label?: string;
  renderLink?: MobileContentRenderLink;
  className?: string;
}

/** The dark Home panel that continues the black top bar: KPI chips select the series, one chart, up to two buttons. */
export function MobileHeroPanel({ kpis, activeKpiId, onKpiChange, chart, actions, label = "Overview", renderLink, className }: MobileHeroPanelProps) {
  const track = React.useRef<HTMLDivElement>(null);
  const first = React.useRef(true);

  useIsomorphicLayoutEffect(() => {
    const scroller = track.current;
    const chip = scroller?.querySelector<HTMLElement>("[data-active='true']")?.closest<HTMLElement>(".curv-mobile-hero-kpi");
    if (!scroller || !chip) return;
    const visible = chip.offsetLeft >= scroller.scrollLeft && chip.offsetLeft + chip.offsetWidth <= scroller.scrollLeft + scroller.clientWidth;
    if (!visible) scroller.scrollTo({ left: Math.max(0, chip.offsetLeft - 12), behavior: first.current || prefersReducedMotion() ? "auto" : "smooth" });
    first.current = false;
  }, [activeKpiId]);

  return (
    <section className={cn("curv-mobile-hero", className)} aria-label={label}>
      <div ref={track} className="curv-mobile-hero-kpis">
        {kpis.map(kpi => {
          const active = kpi.id === activeKpiId;
          const body = (
            <span className="curv-mobile-hero-kpi-body" data-active={active ? "true" : undefined}>
              <span className="curv-mobile-hero-kpi-label">{kpi.label}</span>
              <span className="curv-mobile-hero-kpi-value">{kpi.value}</span>
              {kpi.delta && <span className="curv-mobile-hero-kpi-delta" data-tone={kpi.delta.tone}>{kpi.delta.label}</span>}
            </span>
          );
          if (kpi.href) return <ContentLink key={kpi.id} href={kpi.href} className="curv-mobile-hero-kpi" aria-current={active ? "true" : undefined} renderLink={renderLink}>{body}</ContentLink>;
          // Nothing to select with: a chip that only informs is text, not a button that does nothing.
          if (!onKpiChange) return <div key={kpi.id} className="curv-mobile-hero-kpi">{body}</div>;
          return <button key={kpi.id} type="button" className="curv-mobile-hero-kpi" aria-pressed={active} onClick={() => onKpiChange(kpi.id)}>{body}</button>;
        })}
      </div>
      <div className="curv-mobile-hero-chart">{chart}</div>
      {actions && <div className="curv-mobile-hero-actions">{actions}</div>}
    </section>
  );
}

export interface MobileHeroActionProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Makes the action a link. */
  href?: string;
  renderLink?: MobileContentRenderLink;
  className?: string;
}

/** A dark pill button for the hero panel: 44px high, optional icon. */
export function MobileHeroAction({ children, icon, onClick, href, renderLink, className }: MobileHeroActionProps) {
  const body = <>{icon && <span className="curv-mobile-hero-action-icon" aria-hidden="true">{icon}</span>}<span>{children}</span></>;
  const classes = cn("curv-mobile-hero-action", className);
  return href
    ? <ContentLink href={href} className={classes} renderLink={renderLink}>{body}</ContentLink>
    : <button type="button" className={classes} onClick={onClick}>{body}</button>;
}
