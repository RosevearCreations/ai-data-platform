# AI Data Platform Connector SDK v1

Build 029 provides a versioned server-side extension contract for imports, enrichments and approved exports.

Connectors are statically registered server code. The SDK does not accept uploaded JavaScript or expose a database handle, authenticated session or unrestricted process environment to a connector executor.

A v1 manifest declares a stable connector key/version, capabilities, bounded configuration fields, exact secret environment-variable declarations and execution/input/output limits.

Workspace installations grant only a subset of manifest capabilities. A run must pass manifest compatibility, config validation, secret-reference validation, enabled-state and workspace grant checks before execution.

Secret references contain only the exact environment variable declared by the manifest. Secret values remain server-side and are resolved only inside the bounded execution context.

See examples/no-secret-connector.ts for a starter template.
