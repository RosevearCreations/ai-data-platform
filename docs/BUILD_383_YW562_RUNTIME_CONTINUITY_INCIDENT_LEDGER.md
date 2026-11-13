# AI Data Platform Build 383

Build 383 adds a durable runtime continuity incident ledger, renewal recovery aging, and three-master drift escalation closure on top of Build 382.

- Any active Build 382 drift requires a durable incident.
- Recovery age enters warning at 5 minutes and escalation at 15 minutes.
- AI Hub, Comms Hub, and AI Data Platform acknowledgements are all required for closure.
- Verified closure evidence is mandatory.
- An open incident cannot report CONNECTED.
- Repository or deployment GREEN status cannot close a runtime incident.

Migration 0147 adds append-only incident, escalation, and closure evidence tables with RLS and protected-runtime insert authority.
