# AI Data Platform Build 384

Build 384 adds post-recovery continuity watching, recurrent drift detection, and three-master recurrence-prevention auditing on top of Build 383.

- A recovered Build 383 state must remain CONNECTED and CLEAR.
- At least three healthy continuity samples are required inside a 30-minute watch window.
- Any recurrent drift forces DISCONNECTED_HOLD.
- AI Hub, Comms Hub, and AI Data Platform must all acknowledge a recurrence.
- Recurrence-prevention action must be independently verified before CONNECTED can resume.
- Historical code or deployment GREEN status cannot override recurrent runtime drift.

Migration 0148 adds append-only watch, recurrence, and prevention-audit tables protected with RLS and protected-runtime insert authority.
