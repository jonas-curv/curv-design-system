"use client";

import * as React from "react";

/** What a link renderer receives. Apps pass their router's Link here; `aria-current` is set on the active
 *  item of a set, so a renderer should spread it onto the element it returns. */
export interface MobileContentLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
  "aria-current"?: "page" | "true";
}
export type MobileContentRenderLink = (props: MobileContentLinkProps) => React.ReactNode;

/** A real anchor unless the app supplied a router link. */
export function ContentLink({ renderLink, ...props }: MobileContentLinkProps & { renderLink?: MobileContentRenderLink }) {
  return <>{renderLink ? renderLink(props) : <a {...props} />}</>;
}

/** Layout effect where there is a DOM, plain effect on the server (no warning, no mismatch). */
export const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fixed locale so server and client markup agree. */
export const formatCount = (value: number) => value.toLocaleString("en-US");

type IconProps = { size?: number };
const svg = (size: number) => ({ "aria-hidden": true as const, focusable: false as const, viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const SearchIcon = ({ size = 22 }: IconProps) => <svg {...svg(size)}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
export const SortIcon = ({ size = 22 }: IconProps) => <svg {...svg(size)}><path d="M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3" /></svg>;
export const FilterIcon = ({ size = 22 }: IconProps) => <svg {...svg(size)}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>;
export const BoxIcon = ({ size = 22 }: IconProps) => <svg {...svg(size)}><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z" /><path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" /></svg>;
export const ChevronIcon = ({ size = 16 }: IconProps) => <svg {...svg(size)} strokeWidth={2}><path d="m9 5 7 7-7 7" /></svg>;
export const DotsIcon = ({ size = 20 }: IconProps) => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><circle cx="5.5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="18.5" cy="12" r="1.9" /></svg>;
