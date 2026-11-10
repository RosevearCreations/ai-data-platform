# Build 353 — Master Shell Connection Handoffs

AI Data Platform introduces itself as the Master Shell intelligence/monitoring coordinator and requests a simple source-side acknowledgement from each companion application.

No credential values are stored here.

| Target | Repository | Token | Current AI Data Platform state |
| --- | --- | --- | --- |
| Yard Workers | RosevearCreations/yw | MS353-AIDATA-YW-HELLO | HANDOFF_SENT |
| iCamp | RosevearCreations/iCamp | MS353-AIDATA-ICAMP-HELLO | HANDOFF_SENT |
| Rosie Dazzlers | RosevearCreations/rosiedazzlers | MS353-AIDATA-ROSIEDAZZLERS-HELLO | HANDOFF_SENT |
| Devil n Dove | RosevearCreations/devilndove-site | MS353-AIDATA-DEVILNDOVE-HELLO | HANDOFF_SENT |
| Rosevear AI Hub | RosevearCreations/rosevear-ai-hub | MS353-AIDATA-ROSEVEAR-AI-HUB-HELLO | HANDOFF_SENT |
| Rosevear Comms Hub | RosevearCreations/rosevear-comms-hub | MS353-AIDATA-COMMS-HUB-HELLO | HANDOFF_SENT |

## Expected source-side acknowledgement

Each application should:

1. recognize the matching token;
2. confirm its existing Master Shell identity/boundary;
3. inspect its already-configured Master/Slave account/setup without exposing credentials;
4. record an acknowledgement in its own repository or evidence surface;
5. report one of: CONNECTED, HOLD, STALE or FAIL;
6. return the evidence/revision used for that answer.

CONNECTED must not be reported merely because the handoff file exists.
