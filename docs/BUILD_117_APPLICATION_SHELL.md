# Build 117 — Application Shell, Navigation Architecture & Workflow Consolidation

## Objective

Turn the AI Data Platform from a flat collection of workflow links into a task-oriented operator application without deleting or weakening historical workflow evidence.

## Scope

- persistent application shell with grouped navigation;
- active-module state and responsive shell behavior;
- task-oriented Workflow Directory;
- dedicated Corrective History & Legacy Workflows sub-screen;
- Command Center workflow consolidation into module cards;
- current unified corrective lifecycle promoted over historical generation naming;
- centralized contextual-help topics for Build 117 surfaces;
- visible circled information control on every Build 117 card/module/workflow surface;
- deep-linked Help Center topics;
- documented “no card without help” interface rule.

## Safety boundaries

- no database migration;
- no new mutation endpoint;
- no permission change;
- no RLS change;
- no corrective state transition change;
- no historical workflow deletion;
- navigation never authorizes an operation that the destination workflow would otherwise block.

## Current corrective operator path

1. Corrective Operations Console
2. State Machine / invariant audit when needed
3. Planning
4. Delivery
5. Verification & Closure
6. Regression Monitoring
7. History & Legacy Workflows only for historical evidence and diagnostics

## Acceptance

- the root layout uses the shared application shell;
- normal navigation exposes current task-oriented modules rather than dozens of historical generation links;
- all historical corrective routes remain reachable from the history sub-screen;
- Build 117 card surfaces carry contextual help;
- every navigation/help topic resolves to the centralized help registry;
- the Help Center deep-links to exact topics;
- typecheck, lint, production build, tests and existing database/RLS verification remain green.
