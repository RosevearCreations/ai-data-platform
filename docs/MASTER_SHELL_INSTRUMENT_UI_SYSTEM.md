# Master Shell Instrument UI System

This is the shared visual contract for the Rosevear Master Shell family.

The reference specification defines the desired interface as a dark operational console with persistent navigation, a left module rail, release/build identity, compact KPI instruments, status semantics, rounded dark cards, responsive panels, and a consistent drill-down language.

## Scope

Use this theme for:

- AI Data Platform Master Shell
- Rosevear Comms Hub module inside the combined Master application
- Rosevear AI Hub module inside the combined Master application
- Yard Workers platform shell
- iCamp platform shell

Child tenants may retain their business branding inside their workspace, but the product-shell and Master oversight surfaces should use the same instrument language.

## Tokens

- Surface: deep navy / near-black
- Primary/active: violet/purple
- Information: blue/cyan
- Healthy/success: green
- Pending/warning: amber
- Critical/overdue: red
- Neutral: muted slate/grey

## Structural contract

- Persistent top navigation on desktop.
- Contextual left module rail, collapsing to drawer/bottom navigation on mobile.
- Branded hero with release/build identity and concise context.
- KPI instrument strip using large value, compact label, status/trend rail and optional micro-chart.
- Dense data panels below the instrument strip.
- Secondary inspectors beside primary content on wide screens; overlay/full-screen on tablet/mobile.
- Tables become cards on narrow screens.
- Calendar surfaces default to agenda/timeline on mobile.

## Shared components

AppShell, TopNav, SideRail, PageHero, ReleaseLabel, KpiCard, KpiCardGrid,
SearchBar, FilterSelect, FilterChip, StatusBadge, HealthIndicator,
TrendIndicator, DataTable, KanbanBoard, DetailDrawer, CalendarTimeline,
ResourceCard, CapacityMeter, ChartCard, ConfirmDialog, Toast, EmptyState,
LoadingSkeleton and PermissionDeniedState.

## Behavior

The shared visual language must not change authority boundaries. Runtime evidence, role checks, audit logging and fail-closed state remain source-authoritative. Visual GREEN may only render when the underlying model is genuinely GREEN.
