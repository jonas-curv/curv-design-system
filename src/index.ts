// @curvgroup/design-system — public API.
// Add every shared component here as it's built (see README → Adding a component).
export { cn } from "./lib/cn";
export { Card, type CardProps } from "./components/card";
export { Button, type ButtonProps } from "./components/button";
export { Avatar, AvatarGroup, type AvatarProps, type AvatarGroupProps } from "./components/avatar";
export { Badge, type BadgeProps } from "./components/badge";
export { MultiSelect, type MultiSelectProps, type MultiSelectOption } from "./components/multi-select";
export { Sparkline, type SparklineProps } from "./components/sparkline";
export { HScroll, type HScrollProps } from "./components/h-scroll";
export {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  type KanbanBoardProps,
  type KanbanColumnProps,
  type KanbanCardProps,
} from "./components/kanban";
export { LineChart, BarChart, type LineChartProps, type BarChartProps, type ChartSeries } from "./components/chart";
export { BarBreakdown, type BarBreakdownProps, type BreakdownItem } from "./components/bar-breakdown";
export {
  ReportTable,
  type ReportTableProps,
  type ReportSection,
  type ReportRow,
  type ReportPeriod,
  type ReportSummaryColumn,
} from "./components/report-table";
export { ChartCard, type ChartCardProps, type ChartLegendItem, type ChartCardState } from "./components/chart-card";
export { DateRangePicker, type DateRangePickerProps, type DateRange, type DateRangeValue, type DateRangePreset } from "./components/date-range-picker";
export { StatCard, StatGroup, BreakdownRow, type StatCardProps, type StatDelta } from "./components/stat-card";
export { SummaryStrip, type SummaryStripProps, type SummaryStripItem } from "./components/summary-strip";
export { CopyButton, type CopyButtonProps } from "./components/copy-button";
export { Kbd, type KbdProps } from "./components/kbd";
export { Skeleton, type SkeletonProps } from "./components/skeleton";
export { ConfirmDialog, type ConfirmDialogProps } from "./components/confirm-dialog";
export { PageHeader, type PageHeaderProps } from "./components/page-header";
export { Banner, type BannerProps, type BannerVariant } from "./components/banner";
export { EmptyState, type EmptyStateProps } from "./components/empty-state";
export { Popover, PopoverClose, type PopoverProps } from "./components/popover";
export { Drawer, DrawerClose, type DrawerProps } from "./components/drawer";
export { CommandPalette, type CommandPaletteProps, type CommandItem } from "./components/command-palette";
export { Input, Textarea, type InputProps, type TextareaProps } from "./components/input";
export { Select, type SelectProps, type SelectOption } from "./components/select";
export { Checkbox, type CheckboxProps } from "./components/checkbox";
export { Switch, type SwitchProps } from "./components/switch";
export { RadioGroup, Radio, type RadioGroupProps, type RadioProps } from "./components/radio";
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedItem,
} from "./components/segmented-control";
export { Tabs, type TabsProps, type TabItem } from "./components/tabs";
export { Field, type FieldProps } from "./components/field";
export { Tooltip, TooltipProvider, type TooltipProps } from "./components/tooltip";
export {
  Menu,
  MenuItem,
  MenuSeparator,
  MenuLabel,
  type MenuProps,
  type MenuItemProps,
} from "./components/menu";
export { Dialog, DialogClose, type DialogProps } from "./components/dialog";
export { ToastProvider, toast, type ToastOptions } from "./components/toast";
export { TopBar, type TopBarProps } from "./components/shell/top-bar";
export { ThemeToggle, type ThemeToggleProps } from "./components/shell/theme-toggle";
export { AccountMenu, AccountMenuItem, type AccountMenuProps, type AccountMenuItemProps } from "./components/shell/account-menu";
export { NotificationBell, type NotificationBellProps, type NotificationItem } from "./components/shell/notification-bell";
export { AppFrame, type AppFrameProps } from "./components/shell/app-frame";
export { PageContainer, type PageContainerProps } from "./components/shell/page-container";
export {
  Sidebar,
  SidebarSection,
  SidebarItem,
  type SidebarProps,
  type SidebarSectionProps,
  type SidebarItemProps,
} from "./components/shell/sidebar";
export {
  DataTable,
  dataTableToolbarButton,
  type DataTableProps,
  type DataTableColumn,
  type DataTableTab,
} from "./components/data-table/data-table";
export { TableLink, type TableLinkProps } from "./components/data-table/table-link";
export { toCsv, downloadCsv, downloadPdf, type CellValue } from "./components/data-table/export";
export {
  FilterButton,
  ActiveFilterBar,
  matchesRange,
  rowMatchesFilters,
  type FilterDef,
  type FilterValues,
  type FilterValue,
  type FilterOption,
  type RangeValue,
  type RangePreset,
} from "./components/data-table/filter-bar";
export { MobileBottomNav, type MobileBottomNavProps, type MobileNavItem } from "./components/shell/mobile-bottom-nav";
export type { MobilePriority } from "./components/data-table/data-table";

export { MobileHeader, MobileHeaderTitle, MobilePage, MobileSection, MobileMetricCard, MobileSupportingMetrics, MobileList, MobileRecordRow, MobileDetailSection, MobileNotice, MobileSheet, MobileMoreMenu, MobileSearchSurface, type MobileHeaderProps, type MobileRecordRowProps, type MobileSheetProps } from "./components/shell/mobile-command";

export { useMobileViewportStyle } from "./components/shell/mobile-command";
