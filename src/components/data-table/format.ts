// Number and date formatting for tables (design-system.md → Tables → Numbers).
// Pure and dependency-free, so tests load it as-is with Node's type stripping:
// keep it erasable syntax only, no runtime imports.
//
// One vocabulary for every list: a real minus sign (U+2212) and never
// parentheses, the currency symbol in every cell, whole dollars, one decimal
// on percentages, zero as "0", and an em dash for no value.

/** The minus sign every table uses for negatives (U+2212), never a hyphen. */
export const MINUS = "−";
/** What an empty cell shows. */
export const EMPTY = "—";

/** What a column holds. Drives alignment, default formatting and the first sort direction. */
export type DataTableColumnType = "text" | "number" | "money" | "percent" | "date" | "status";

type Numeric = number | null | undefined;

const cache = new Map<string, Intl.NumberFormat>();
function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    cache.set(key, f);
  }
  return f;
}

// Rounds first, so a value that rounds to zero never shows a sign ("−$0").
function signed(value: number, digits: number, body: (abs: number) => string): string {
  const factor = 10 ** digits;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  if (rounded === 0) return body(0);
  return (value < 0 ? MINUS : "") + body(rounded);
}

function isFiniteNumber(value: Numeric): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export interface FormatNumberOptions {
  /** Fixed decimals. Default 0. */
  decimals?: number;
  locale?: string;
}

/** `1240` → "1,240" · `-1240` → "−1,240" · `0` → "0" · `null` → "—". */
export function formatNumber(value: Numeric, options: FormatNumberOptions = {}): string {
  if (!isFiniteNumber(value)) return EMPTY;
  const decimals = options.decimals ?? 0;
  const f = numberFormat(options.locale ?? "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return signed(value, decimals, (abs) => (abs === 0 ? "0" : f.format(abs)));
}

export interface FormatMoneyOptions {
  /** ISO currency code. Default "USD". */
  currency?: string;
  /** Show cents. Lists show whole dollars (the default); a detail line may show cents. */
  cents?: boolean;
  locale?: string;
}

/** `48200` → "$48,200" · `-1240` → "−$1,240" · `0` → "$0" · `null` → "—". */
export function formatMoney(value: Numeric, options: FormatMoneyOptions = {}): string {
  if (!isFiniteNumber(value)) return EMPTY;
  const digits = options.cents ? 2 : 0;
  const f = numberFormat(options.locale ?? "en-US", {
    style: "currency",
    currency: options.currency ?? "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return signed(value, digits, (abs) => f.format(abs));
}

export interface FormatPercentOptions {
  /** Decimals. Default 1. */
  decimals?: number;
  /** The value is a ratio (0.125 → "12.5%"). Default false: the value is already a percentage (12.5). */
  ratio?: boolean;
  locale?: string;
}

/** `12.5` → "12.5%" · `-3` → "−3.0%" · `0` → "0%" · `null` → "—". */
export function formatPercent(value: Numeric, options: FormatPercentOptions = {}): string {
  if (!isFiniteNumber(value)) return EMPTY;
  const decimals = options.decimals ?? 1;
  const pct = options.ratio ? value * 100 : value;
  const f = numberFormat(options.locale ?? "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return signed(pct, decimals, (abs) => (abs === 0 ? "0%" : `${f.format(abs)}%`));
}

export type DateInput = string | number | Date | null | undefined;

export interface FormatDateOptions {
  /** "Today" for the this-year check. Default: now. */
  today?: Date;
  locale?: string;
}

// A date-only ISO string ("2026-10-14") is a calendar day, not UTC midnight:
// parsed as UTC it would show the day before west of Greenwich.
function toDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(value);
}

/** "Nov 21" this year, "Nov 21, 2025" otherwise. `null` → "—". Unparseable input is shown as given. */
export function formatDate(value: DateInput, options: FormatDateOptions = {}): string {
  if (value == null || value === "") return EMPTY;
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const today = options.today ?? new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  const locale = options.locale ?? "en-US";
  return d.toLocaleDateString(locale, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The default text for a typed cell. Numbers that arrive as strings are shown
 * as given; `text` and `status` show the value as a string. Empty → "—".
 */
export function formatValue(type: DataTableColumnType | undefined, value: unknown): string {
  if (value == null || value === "") return EMPTY;
  switch (type) {
    case "money":
      return typeof value === "number" ? formatMoney(value) : String(value);
    case "number":
      return typeof value === "number" ? formatNumber(value) : String(value);
    case "percent":
      return typeof value === "number" ? formatPercent(value) : String(value);
    case "date":
      return typeof value === "string" || typeof value === "number" || value instanceof Date ? formatDate(value) : String(value);
    default:
      return String(value);
  }
}
