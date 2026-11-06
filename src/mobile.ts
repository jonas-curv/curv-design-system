/** Additive mobile entry for apps preserving an established main-entry contract. */
export { DataTable, type DataTableProps, type DataTableColumn, type MobilePriority } from "./components/data-table/data-table";
export { MobileBottomNav, type MobileBottomNavProps, type MobileNavItem } from "./components/shell/mobile-bottom-nav";
export { Select, type SelectProps } from "./components/select";

export { MobileHeader, MobileHeaderTitle, MobilePage, MobileSection, MobileMetricCard, MobileSupportingMetrics, MobileList, MobileRecordRow, MobileDetailSection, MobileNotice, MobileSheet, MobileMoreMenu, MobileSearchSurface, type MobileHeaderProps, type MobileHeaderSwitcherItem, type MobileRecordRowProps, type MobileRecordTone, type MobileSheetProps } from "./components/shell/mobile-command";

export { useMobileViewportStyle } from "./components/shell/mobile-command";

export { MobileChart, type MobileChartProps, type MobileChartPoint, type MobileChartReadout, type MobileChartEmphasis, type MobileChartBarTone } from "./components/shell/mobile-chart";

// The shared Ask AI orb and its button: the 40px glass circle for the dark top bar, the labelled white button for desktop.
export { AskOrb, AskButton, type AskOrbProps, type AskOrbState, type AskOrbSize, type AskButtonProps, type AskButtonVariant } from "./components/shell/mobile-ask";

export * from "./components/shell/mobile-nav";
export * from "./components/shell/mobile-content";
