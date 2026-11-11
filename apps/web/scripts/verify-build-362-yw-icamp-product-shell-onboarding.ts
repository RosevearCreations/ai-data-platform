import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MASTER_362_COMMS_RECEIPT,
  MASTER_362_PRODUCT_SHELLS,
  composeSourceShellOnboarding
} from "../lib/source-shell-onboarding";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const model = composeSourceShellOnboarding();

assert.equal(model.build, 362);
assert.equal(model.summary.onboardingCodeReady, true);
assert.equal(model.summary.masterGateOpen, false);
assert.equal(model.summary.supervisedAcceptanceEligible, false);
assert.equal(model.summary.supervisedMasterAcceptance, "HOLD");
assert.equal(model.summary.yardWorkersConnection, "HOLD");
assert.equal(model.summary.iCampConnection, "HOLD");
assert.equal(MASTER_362_PRODUCT_SHELLS[0].sourceId, "yw");
assert.equal(MASTER_362_PRODUCT_SHELLS[1].sourceId, "icamp");
assert.equal(MASTER_362_PRODUCT_SHELLS[0].tenantBoundary, "platform_shell");
assert.equal(MASTER_362_PRODUCT_SHELLS[1].tenantBoundary, "platform_shell");
assert.equal(model.sources[0].revisionCurrent, false);
assert.equal(model.sources[1].revisionCurrent, false);
assert.equal(model.sources[0].signerEnrolled, false);
assert.equal(model.sources[1].signerEnrolled, false);
assert.equal(MASTER_362_COMMS_RECEIPT.receipt, "MASTER360-COMMS-QL413-ACK");
assert.equal(MASTER_362_COMMS_RECEIPT.receiver, "OFF");
assert.equal(MASTER_362_COMMS_RECEIPT.connection, "HOLD");
assert.equal(model.policy.childTenantMayBecomeSourceIdentity, false);
assert.equal(model.policy.deploymentGreenIsConnectionProof, false);

const page = source("app/source-shell-onboarding/page.tsx");
for (const token of [
  "Build 362 · Yard Workers &amp; iCamp product-shell onboarding",
  "Build 362 is code-ready, not connection acceptance.",
  "Child tenants remain child tenants."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/source-shell-onboarding"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/source-shell-onboarding"'));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-362-yw-icamp-product-shell-onboarding.ts";
assert.equal(String(pkg.scripts["verify:build362"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

const productionBuild = String(pkg.scripts.build);
for (let build = 351; build <= 362; build += 1) {
  assert.ok(
    productionBuild.includes(`verify-build-${build}-`),
    `production build must execute Build ${build} verification`
  );
}
assert.ok(
  productionBuild.indexOf("verify-build-362-") <
    productionBuild.indexOf("run-production-migrations.ts"),
  "Build 362 verification must run before production migrations"
);

console.log(
  "Build 362 Yard Workers & iCamp Product-Shell Onboarding verification passed."
);
