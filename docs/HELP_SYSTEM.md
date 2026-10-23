# AI Data Platform contextual help standard

Build 117 establishes contextual help as a required interface contract.

## Operator goal

Every major card, panel, navigation module and workflow entry must answer four questions without forcing the operator to leave the current task:

1. What is this?
2. How do I use it?
3. What authority or safety boundary still applies?
4. Is any manual intervention required?

The visible signal is a lowercase `i` inside a circle. The signal is intentionally consistent across the application so operators do not have to learn different help patterns on different screens.

## Required implementation

All new major cards and panels must:

- be a positioned help surface (normally `.cardHelpSurface`);
- render `HelpInfo` with a valid centralized `HelpTopicKey`;
- place the circled information signal in the upper-right corner without obscuring primary content;
- deep-link the full topic to `/help#<topic-key>`;
- remain keyboard reachable and expose an accessible label;
- never use help text as a substitute for permission checks, typed confirmations, RLS or database enforcement.

Navigation modules and navigation items use the same circled information signal. Their full topics are linked into the Help Center.

## Topic schema

Every help topic lives in `apps/web/app/help/help-content.ts` and contains:

- `title` — operator-readable name;
- `summary` — what the surface is for;
- `steps` — normal operating sequence;
- `notes` — important authority, evidence, safety or interpretation boundaries;
- optional `manual` — external/manual work only when genuinely required.

Do not invent a manual-intervention section when no external work is needed.

## Card completion rule

A new card is not interface-complete until one of these is true:

- it has its own dedicated help topic; or
- it deliberately reuses an existing topic that accurately describes the card.

A card must never point to a loosely related help topic simply to satisfy the rule.

## Help Center behavior

The Help Center is the canonical long-form index. Every help card receives an HTML `id` matching its topic key so contextual help can deep-link to the exact topic.

Inline help should remain concise enough to use in context. The full Help Center may contain longer operating guidance.

## Historical and legacy workflows

Historical corrective-generation screens remain available through the Build 117 History & Legacy Workflows view. Help must make the distinction between:

- the current unified operator workflow; and
- older generation-specific evidence/diagnostic screens.

Navigation organization never changes the authority of the underlying workflow.

## Accessibility rules

- The information signal must be keyboard focusable.
- It must have an accessible text label such as “Help for Collection Projects”.
- The visible `i` is decorative when a screen-reader label is present.
- Focus styling must remain visible against the dark interface.
- Popovers must remain usable at mobile widths.
- Help text should use plain operator language before implementation terminology.

## Build 117 coverage

Build 117 applies the standard to:

- persistent application shell;
- module/group navigation;
- workflow directory module cards and workflow rows;
- Command Center metric cards;
- Command Center module cards;
- workspace cards and empty states;
- recent evidence cards;
- account context card;
- signed-out workspace cards;
- AI suggestion telemetry and suggestion cards;
- Corrective History & Legacy Workflow cards;
- Help Center topic cards.

Existing screens retain their current contextual help where already present. Any future build that materially edits an existing card must bring that card into this standard during the same build.
