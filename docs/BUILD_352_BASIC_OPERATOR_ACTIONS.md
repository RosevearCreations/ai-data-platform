# Build 352 — Basic Operator Actions, Safe Refresh, Retry, Recheck & Recovery Controls

## Objective

Make basic Master Shell operator controls useful without converting observation into unauthorized peer mutation.

## Delivered

- `/basic-operator-actions` operator surface;
- safe action definitions for refresh, recheck, retry and recovery;
- explicit authority classification for each action;
- exact six-source linkage map;
- explicit Rosevear Comms Hub complementary-control-plane relationship;
- deterministic Build 352 verification;
- Master Shell linkage and role documentation.

## Safety / authority rules

- refresh is local/read-only;
- recheck validates current evidence and cannot manufacture missing evidence;
- retry prepares a source-owned request intent;
- recovery remains supervised and source-authoritative;
- deployment GREEN does not prove source connectivity;
- HOLD cannot be released automatically;
- no action silently mutates another application.
