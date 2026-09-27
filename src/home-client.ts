"use client";

/**
 * The interactive half of the home kit. Built on its own with a "use client"
 * banner, so a server component can render these straight from
 * `@curvgroup/design-system/home`. Imports React and nothing else.
 */
export { CountText, type CountTextProps } from "./components/home/count-text";
export { MonthClock, type MonthClockProps } from "./components/home/month-clock";
