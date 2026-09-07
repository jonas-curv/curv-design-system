# Mobile foundation

Use `AppFrame` with `mobileNav={<MobileBottomNav ... />}` below 768px. Pass already permission-filtered destinations; Search and Menu handlers open the app's existing CommandPalette and Drawer. The navigation reserves at most five slots, including those actions. Put remaining allowed destinations in Menu. AppFrame reserves the footer and device safe area.

DataTable renders the same filtered and sorted records as mobile rows below 768px. Mark identity/status columns `mobilePriority: "primary"`; up to three remaining columns become labeled secondary values. Other columns remain reachable through More details (`"hidden"` means hidden from the initial summary, never deleted). Native Open links/buttons remain separate from interactive cell content. Mobile pagination renders 25 rows at a time, preserving access to the complete result set. Search, filters, exports and sorting retain their shared data owners.

For financial workbooks where column comparison matters, set `mobileLayout="scroll"`. Do not convert those into cards. Desktop table rendering is unchanged. `headerSuffix` is a sibling of the native sorting button so suffix controls remain independently interactive.

Phone inputs use 16px text; buttons and small tabs gain 44px touch targets. Dialogs cap height to the dynamic viewport; drawers use full phone width and safe areas. Desktop sizes remain at their prior breakpoints.

Validation: `npm run build && node --test tests/mobile.test.mjs`, `npm run typecheck`, `npm run lint`. App integrations must verify actual viewport layouts and permission-filtered navigation.
