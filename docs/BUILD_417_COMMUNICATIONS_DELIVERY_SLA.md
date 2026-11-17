# AI Data Platform Build 417 — Communications Delivery SLA, ACK Latency, Replay Quality & Dead-Letter Operations

Build 417 adds a fail-closed communications-operations layer over the 14 canonical relationships already defined by the Server Shell. Rosevear Comms Hub remains message authority.

## Operational policy

- ACK target: **120 seconds** from verified delivery to signed acknowledgement.
- Queue-to-delivery target: **300 seconds**.
- Dead-letter recovery target: **24 hours**.
- Maximum replay attempts admitted as quality evidence: **3**.
- Duplicate attempts must be durably suppressed.
- Missing relationship evidence is HOLD, not zero latency.
- A dead letter cannot pass without a verified recovery receipt.
- Direct peer database writes remain forbidden.
- Build 417 never authorizes automatic replay, message sending or receiver activation.

The protected ledger records delivery/ACK timing, replay attempts, duplicate suppression, dead-letter identity, transport/source/audience/tenant checks and Comms authority preservation. A second append-only ledger records recovery evidence.

## UX and cosmetic pass

Build 417 also extends the shared Master appearance system from eight to **twelve** presentation-only themes. The four new themes are Crimson Forge, Emerald Circuit, Ultraviolet Grid and Steel Command. The same theme contract is exposed by the shared Master shell used for AI Data Platform, Rosevear AI Hub and Rosevear Comms Hub views.

Master-form controls receive bounded widths, responsive grids, readable text areas, consistent 44px minimum controls and improved dark-theme date/time picker contrast. Date/time controls remain native browser controls and do not alter stored timestamps or evidence semantics.

## Release boundary

Software Production GREEN proves the dashboard, schema, validation and UX release. It does not prove that any peer delivered a live message, acknowledged it within SLA, replayed a failed message or recovered a dead letter. Those claims require admitted independent evidence.
