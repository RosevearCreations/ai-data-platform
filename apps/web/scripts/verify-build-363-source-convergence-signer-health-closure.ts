import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_363_SOURCE_SNAPSHOT,
  composeSourceConvergence
} from "../lib/source-convergence";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const current = composeSourceConvergence();
assert.equal(current.build, 363);
assert.equal(current.summary.allIdentitiesBound, true);
assert.equal(current.summary.allRevisionsConverged, false);
assert.equal(current.summary.allSignersReady, false);
assert.equal(current.summary.allHealthReceiptsVerified, false);
assert.equal(current.summary.supervisedClosureEligible, false);
assert.equal(current.summary.closureState, "HOLD");

assert.equal(
  BUILD_363_SOURCE_SNAPSHOT[0].productionMain,
  "cdc368e2f2773863595ff9cf6f35c1f02773eeaf"
);
assert.equal(
  BUILD_363_SOURCE_SNAPSHOT[1].productionMain,
  "e2d343595363ca9106e7f1dbc60006e3a6c616aa"
);
assert.equal(
  BUILD_363_SOURCE_SNAPSHOT[0].sourceHandoff,
  "MASTER363-YW-SOURCE-CONVERGE"
);
assert.equal(
  BUILD_363_SOURCE_SNAPSHOT[1].sourceHandoff,
  "MASTER363-ICAMP-SOURCE-CONVERGE"
);
assert.equal(current.policy.controllerMayRewriteSourceManifest, false);
assert.equal(current.policy.controllerMayEnrollSourcePrivateKey, false);
assert.equal(current.policy.controllerMayInferConnectionFromHealth, false);

const sourceReady = composeSourceConvergence({
  yw: {
    manifestRevision: BUILD_363_SOURCE_SNAPSHOT[0].productionMain,
    signerState: "INDEPENDENT_SOURCE_SIGNER_VERIFIED",
    healthReceiptState: "VERIFIED_SOURCE_BOUND_HEALTH",
    connectionState: "ACCEPTED"
  },
  icamp: {
    manifestRevision: BUILD_363_SOURCE_SNAPSHOT[1].productionMain,
    signerState: "INDEPENDENT_SOURCE_SIGNER_VERIFIED",
    healthReceiptState: "VERIFIED_SOURCE_BOUND_HEALTH",
    connectionState: "ACCEPTED"
  }
});
assert.equal(sourceReady.summary.allSourceEvidenceReady, true);
assert.equal(sourceReady.summary.supervisedClosureEligible, false);
assert.equal(
  sourceReady.sources[0].nextSourceAction,
  "WAIT_FOR_MASTER_RUNTIME_CLOSURE"
);

const page = source("app/source-convergence/page.tsx");
for (const token of [
  "Build 363 · Source convergence and acceptance closure",
  "Build 363 closes evidence gaps, not truth boundaries."
]) {
  assert.ok(page.includes(token), "page token " + token);
}
const modelSource = source("lib/source-convergence.ts");
assert.ok(modelSource.includes("MASTER363-YW-SOURCE-CONVERGE"));
assert.ok(modelSource.includes("MASTER363-ICAMP-SOURCE-CONVERGE"));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/source-convergence"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/source-convergence"'));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-363-source-convergence-signer-health-closure.ts";
assert.equal(String(pkg.scripts["verify:build363"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 363 Yard Workers & iCamp Source Revision Convergence, Independent Signer Readiness, Verified Health Intake & Supervised Acceptance Closure verification passed."
);
