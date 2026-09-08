# Approved mobile command center

Jonas approved the September 2026 Curv Mobile Redesign Proposal. This is the mobile extension of the existing design system, not a separate theme or data layer.

## Adoption

Import components from `@curvgroup/design-system/mobile` and import `@curvgroup/design-system/mobile.css` once after existing application styles. The additive entry preserves existing desktop chart contracts. Consume a pinned build of this source; do not copy components into app folders.

## Shared patterns

- `MobileBottomNav`: at most five labelled destinations. Home, Search, core work, reporting, More. App adapters pass permission-filtered links and active state. Hides for the software keyboard. The app reserves 88px plus the bottom safe area below content.
- `MobileHeader` or `MobileHeaderTitle` inside an existing top bar: one 20px title, optional context, one action. Back on records. Existing notification state mounts once.
- `MobilePage`, `MobileMetricCard`, `MobileSupportingMetrics`, `MobileSection`: 16px rails, 18px surfaces, one 32px primary value and two supporting values. Existing source adapters own calculations, scope, dates and comparisons.
- `MobileList` and `MobileRecordRow`: identity, amount, metadata and meaningful exception. Real link or button. Complete detail remains one tap away. Search, sort, totals and exports operate on the whole dataset.
- `MobileDetailSection`: accessible progressive disclosure for secondary record data.
- `MobileSheet`, `MobileMoreMenu`, `MobileSearchSurface`: Base UI focus management and keyboard dismissal. Fullscreen surfaces follow the visual viewport, including keyboard resize. Filter sheets use one Apply and Reset.
- `MobileNotice`: visible network failure or domain exception. Never substitute zero for an unavailable financial value.

Search always stays within the current OS. Switching OS uses existing navigation and session checks. Do not cache authenticated records in service workers or local storage. No shared mobile component fetches data or grants access.

Desktop styling and reporting semantics remain owned by their existing components. The approved mobile scale and footer architecture supersede older desktop-only guidance at the configured mobile breakpoint.

The dock reports browser offline/restored events without polling or fetching. Optional `onRefresh` is an explicit current-route read refresh supplied by the app. Loaded records remain only in existing page memory; this adds no service worker, persisted business data, or queued writes. A restored browser connection is not proof of a successful server refresh.
