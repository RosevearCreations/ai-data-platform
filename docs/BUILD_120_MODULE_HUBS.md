# Build 120 — Module Hubs, Sub-Screens & Progressive Workflow Navigation

## Objective

Reduce cognitive load after the Build 119 Operator Home by giving each major business area a dedicated module landing hub before operators enter detailed workflows.

## Functional scope

- dedicated `/modules/[moduleId]` landing route for every current module;
- progressive sub-screen cards inside each hub;
- module-aware breadcrumbs in the persistent shell;
- direct **Module hub** access from the sidebar and top bar;
- Operator Home module cards now enter module hubs first;
- Workflow Directory now promotes hubs while retaining direct workflow links for experienced operators;
- Build 117 contextual help remains present on every major hub and sub-screen card;
- Build 118 Marble Standard remains the visual contract.

## Navigation contract

The normal path is:

1. Operator Home or Workflow Directory;
2. Module hub;
3. Relevant sub-screen;
4. Existing governed workflow action.

The numbered sub-screen order is an orientation aid. It is not a state machine and does not imply that every earlier screen is a prerequisite.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no new mutation endpoint;
- no automatic workflow transition;
- no permission, role or profile change;
- no historical corrective workflow deletion;
- module hubs are navigation only.

All consequential actions remain inside their existing destination workflows, where current evidence, confirmation, authorization and RLS controls remain authoritative.

## Help

Build 120 adds centralized help for:

- Module hubs & sub-screen navigation;
- Progressive workflow navigation.

Every new major card keeps the circled information control and deep-links to the relevant Help Center topic.

## Next roadmap item

**Build 121 — In-Module Task Panels, Search & Operator Shortcuts.**
