import { shouldRunProductionMigrations } from "../lib/production-build-migrations";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  shouldRunProductionMigrations("production"),
  "Build 101 production builds must run committed migrations before Next.js build."
);
assert(
  !shouldRunProductionMigrations("preview"),
  "Build 101 preview deployments must never migrate the production database."
);
assert(
  !shouldRunProductionMigrations("development"),
  "Build 101 development deployments must never run the production migration gate."
);
assert(
  !shouldRunProductionMigrations(undefined),
  "Build 101 ordinary local/CI builds must leave migration execution to their explicit migration step."
);

console.log("Build 101 production migration gate verification passed.");
