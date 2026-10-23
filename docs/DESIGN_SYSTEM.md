# AI Data Platform design system

Build 118 establishes the visual foundation for the AI Data Platform.

## Active theme

The active theme is **Marble Standard** (`marble-standard`).

Its visual language is:

- deep charcoal/black stone rather than pure black;
- restrained pale-grey and silver veining;
- translucent depth rather than high-gloss decoration;
- teal accents for navigation, focus and ordinary interactive emphasis;
- semantic status colors for healthy, attention, critical and informational states;
- off-white primary text and muted silver secondary text.

The marble pattern is generated entirely with CSS gradients. No bitmap or external image asset is required.

## Theme architecture

Theme metadata lives in `apps/web/lib/ui-theme.ts`.

The root document declares the active theme through:

```html
<html data-theme="marble-standard">
```

Theme values are expressed through CSS custom properties in `globals.css`. New themes must provide the same semantic token contract instead of rewriting individual pages.

Build 118 deliberately ships one active theme. Per-user theme selection/persistence is not part of this build.

## SurfaceCard framework

`apps/web/app/ui/SurfaceCard.tsx` is the reusable card primitive.

Supported hierarchy variants:

- `default` — normal content;
- `raised` — modules, major summaries and primary grouped content;
- `metric` — compact quantitative content;
- `interactive` — selectable/action-oriented surfaces;
- `inset` — nested evidence and lower-emphasis details.

Supported semantic statuses:

- `neutral`
- `healthy`
- `attention`
- `critical`
- `info`

Status is semantic, never decorative.

## Card rules

New major card surfaces should use `SurfaceCard` or the shared `.uiSurfaceCard` contract.

Do not create a new one-off card background when a shared variant can express the hierarchy.

Every major card must also follow `docs/HELP_SYSTEM.md`: a visible circled information control tied to a correct centralized help topic.

## Accessibility

Decoration is subordinate to:

- readable contrast;
- text labels for status;
- visible keyboard focus;
- predictable help controls;
- responsive layouts;
- reduced-motion preferences.

Do not encode operational meaning in marble veining, shadow, or color alone.

## Migration policy

Build 118 immediately covers:

- application shell;
- Command Center metrics/modules/workspaces/recent evidence;
- Workflow Directory;
- Corrective History & Legacy Workflows;
- Help Center generic card styling;
- AI suggestion metrics/cards;
- generic `.card`, `.panel` and `.metricCard` surfaces;
- Appearance & Design System specimen screen.

Future builds that materially touch an older bespoke card should migrate that card to shared design-system tokens during the same build.

## Future themes

A future theme may change stone, color, density or ornamentation, but must preserve:

- semantic status tokens;
- focus visibility;
- card hierarchy;
- contextual help placement;
- functional layout;
- authoritative business-state text.

Theme selection must never change permissions, evidence, workflow state or data.
