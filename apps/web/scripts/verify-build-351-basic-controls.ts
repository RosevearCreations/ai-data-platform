import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { MasterProductionReadinessModel } from "../lib/master-production-readiness-core";
import {
  BASIC_CONTROLS_BUILD,
  buildBasicControlsCompletion
} from "../lib/basic-controls-completion";
import { MASTER_SHELL_SOURCE_IDS } from "../lib/master-shell-contract-v1";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

type State = "ACCEPTED" | "READY_FOR_OWNER" | "HOLD" | "FAIL" | "STALE";

function readiness(states: State[]): MasterProductionReadinessModel {
  assert.equal(states.length, 6);
  const sources = MASTER_SHELL_SOURCE_IDS.map((sourceId, index) => ({
    sourceId,
    effectiveState: states[index],
    run: null
  }));

  const accepted = states.filter((state) => state === "ACCEPTED").length;
  const readyForOwner = states.filter((state) => state === "READY_FOR_OWNER").length;
  const hold = states.filter((state) => state === "HOLD").length;
  const failed = states.filter((state) => state === "FAIL").length;
  const stale = states.filter((state) => state === "STALE").length;

  return {
    schema: "ai-data-platform.master-production-readiness.v1",
    build: 349,
    generatedAt: "2026-11-10T02:00:00.000Z",
    dimensions: [
      "source-onboarding",
      "operational-recovery",
      "accessibility",
      "production-safeguards",
      "rollback"
    ],
    sources,
    summary: {
      sources: 6,
      accepted,
      readyForOwner,
      hold,
      failed,
      stale,
      suiteEffectiveState:
        failed ? "FAIL" : stale ? "STALE" : hold ? "HOLD" :
        readyForOwner ? "READY_FOR_OWNER" : accepted === 6 ? "ACCEPTED" : "HOLD"
    },
    policy: {
      exactSixSources: true,
      sourceOnboardingRequired: true,
      recoveryEvidenceRequired: true,
      accessibilityEvidenceRequired: true,
      productionSafeguardsRequired: true,
      rollbackEvidenceRequired: true,
      ownerAcceptanceExplicit: true,
      deploymentGreenImpliesAcceptance: false,
      build348OnboardedImpliesAcceptance: false,
      acceptanceActivatesConnection: false,
      sourceSpecificGatesRemainAuthoritative: true,
      sourceMutationPerformed: false,
      peerWritePerformed: false,
      automaticRollbackPerformed: false,
      automaticHoldRelease: false
    }
  } as MasterProductionReadinessModel;
}

assert.equal(BASIC_CONTROLS_BUILD, 351);

const accepted = buildBasicControlsCompletion({
  readiness: readiness(["ACCEPTED","ACCEPTED","ACCEPTED","ACCEPTED","ACCEPTED","ACCEPTED"]),
  generatedAt: new Date("2026-11-10T02:00:00.000Z")
});
assert.equal(accepted.summary.basicControlsComplete, true);
assert.equal(accepted.summary.complete, accepted.summary.totalControls);

const held = buildBasicControlsCompletion({
  readiness: readiness(["ACCEPTED","HOLD","ACCEPTED","ACCEPTED","ACCEPTED","ACCEPTED"])
});
assert.equal(held.summary.basicControlsComplete, false);
assert.ok(held.summary.hold > 0);

const failed = buildBasicControlsCompletion({
  readiness: readiness(["FAIL","ACCEPTED","ACCEPTED","ACCEPTED","ACCEPTED","ACCEPTED"])
});
assert.ok(failed.summary.failed > 0);

assert.equal(accepted.policy.historicalPreflightIsAutomaticBlocker, false);
assert.equal(accepted.policy.deploymentGreenImpliesAcceptance, false);
assert.equal(accepted.policy.basicControlCompletionDoesNotAuthorizePeerWrites, true);

const page = source("app/basic-controls/page.tsx");
assert.ok(page.includes("Master Basic Controls Completion"));
assert.ok(page.includes("Historical preflight or prelaunch wording is not an automatic blocker"));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/basic-controls"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(roadmap.includes("Build 351 — Master Basic Controls Completion"));
assert.ok(roadmap.includes("Build 360 — Advanced Control Readiness"));

console.log("Build 351 verification passed");
