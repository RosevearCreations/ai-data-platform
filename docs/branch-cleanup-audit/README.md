# AI Data Platform Branch Cleanup Manifest — 2026-11-13

Production baseline after Build 391: `fc172738858704287f871e611eec882509564175`.

## Rule

- **SAFE_TO_DELETE**: zero unique commits ahead of production `main`.
- **PRESERVE_UNMERGED**: one or more unique commits remain and must not be deleted.
- Keep `main` and `dev`.
- Delete `branch-cleanup-audit-20261113` only after another application has completed the cleanup from the JSON manifest.

## Results

- SAFE_TO_DELETE: **357**
- PRESERVE_UNMERGED: **13**
- Core branches retained: `main`, `dev`

## Preserve these unmerged branches

- `build-051-ci-fix-1` — ahead by 1 commit(s)
- `build-220` — ahead by 23 commit(s)
- `build-306-universal-module-manifest` — ahead by 6 commit(s)
- `build-307-headless-module-sdk` — ahead by 7 commit(s)
- `build-308-embeddable-runtime-shell` — ahead by 12 commit(s)
- `build-309-host-adapter-pack` — ahead by 10 commit(s)
- `build-310-auth-user-context-bridge` — ahead by 9 commit(s)
- `build-311-tenant-workspace-resolution` — ahead by 7 commit(s)
- `build-312-capability-negotiation` — ahead by 7 commit(s)
- `build-313-host-navigation-bridge` — ahead by 8 commit(s)
- `build-314-theme-accessibility-locale-bridge` — ahead by 7 commit(s)
- `build-315-contract-resolver-comms-closure` — ahead by 17 commit(s)
- `RosevearCreations-patch-1` — ahead by 1 commit(s)

The complete machine-readable SAFE_TO_DELETE list is in `CLEANUP_MANIFEST_2026-11-13.json`.
