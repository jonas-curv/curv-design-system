/**
 * Home kit entry: the shared Home page pieces every Curv OS renders. Standalone
 * like the mobile entry: React is the only import, plus its own client half.
 * Style comes from `@curvgroup/design-system/home.css`, never an app's
 * Tailwind config.
 *
 * The panel pieces and row classes are server-safe. CountText and MonthClock
 * live in ./home-client.js, which carries "use client", so both halves import
 * from here in a server or a client component alike.
 */
export {
  HomePanel,
  PanelLink,
  HomePanelNote,
  HOME_ROW,
  HOME_FEED_ROW,
  HOME_ROW_HOVER,
  HOME_CHIP,
  HOME_ROW_ICON,
  type HomePanelProps,
  type PanelLinkProps,
  type HomePanelNoteProps,
} from "./components/home/home-panel";

export { CountText, MonthClock, type CountTextProps, type MonthClockProps } from "./home-client.js";
