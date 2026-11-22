# AI Data Platform Build 434 — Cross-Application Revision Convergence, Source-Aware Divergence Classification & Multi-App Build Awareness

Build 434 separates two facts that were previously easy to confuse:

1. **Peer revision evolution** — another Rosevear application releases a new build on its own protected main branch.
2. **AIDP Git ancestry divergence** — AI Data Platform dev and main have different commit ancestry.

A genuine signed peer revision change is now classified as expected peer evolution. It is not automatically treated as a broken AIDP branch. Unsigned or unverified source revision changes remain HOLD.

## Current peer release awareness at Build 434 planning

- Rosevear Comms Hub: QL-483, main 6a8fe68c05f76cde0c88027224a16f7a7ace0829
- Rosevear AI Hub: Build 375, main 8b6fdc19861eb17cf50013080c5022619e76de48
- iCamp: Build 272, main e2739ad971dc2c437482467fc5b5ed95ffd8c6c4
- Yard Workers: YW588, main 9ecf99f7e8bca694c112d68e6d6ae2e1a100324b
- Devil n Dove: Build 748, main c6321eb680df04a4f18ea77353232e51ff227016
- Rosie Dazzlers: Build 918, main 760623164d62381ea91a809f47cb1331566860e4

These are observation baselines, not permanent pins. A newer signed source revision is expected evolution.

## Capability movement

Cross-application release-coordination capability is re-baselined from **62% to 70% (+8 points)** by adding source-aware classification, peer release awareness, explicit separation of peer evolution from AIDP branch ancestry and fail-closed handling for unverified revision changes.
