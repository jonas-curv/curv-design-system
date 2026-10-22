import * as React from "react";

const svg = { "aria-hidden": true, focusable: false, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SearchIcon = () => <svg {...svg} viewBox="0 0 24 24" width="24" height="24" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>;
export const MenuIcon = () => <svg {...svg} viewBox="0 0 24 24" width="24" height="24" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const CloseIcon = () => <svg {...svg} viewBox="0 0 24 24" width="24" height="24" strokeWidth="1.8"><path d="m6 6 12 12M6 18 18 6" /></svg>;
export const CheckIcon = () => <svg {...svg} viewBox="0 0 24 24" width="20" height="20" strokeWidth="2"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const chevronPaths = { down: "m6 9 6 6 6-6", up: "m6 15 6-6 6 6", right: "m9 5 7 7-7 7", back: "m15 5-7 7 7 7" } as const;
export const ChevronIcon = ({ direction, size, strokeWidth = 2, className }: { direction: keyof typeof chevronPaths; size: number; strokeWidth?: number; className?: string }) =>
  <svg {...svg} className={className} viewBox="0 0 24 24" width={size} height={size} strokeWidth={strokeWidth}><path d={chevronPaths[direction]} /></svg>;
