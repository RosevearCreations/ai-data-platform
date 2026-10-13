import {
  buildSuccessorCorrectivePlanScope,
  successorCorrectivePlanFingerprint
} from "../lib/reopened-exception-planning";
import type { CorrectivePlanScopeItem } from "../lib/reconciliation-exception-triage";
import type { ReconciliationRecordResult } from "../lib/post-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const predecessor: CorrectivePlanScopeItem[] = [
  {
    integrationKey: "record-a",
    issueStatus: "mismatched",
    proposedAction: "update-existing",
    desiredValues: { priceMinimumCad: 249, offeringName: "Complete" },
    governedFields: ["offeringName","priceMinimumCad"],
    expectedFingerprint: "expected-a",
    observedFingerprint: "observed-a"
  },
  {
    integrationKey: "record-b",
    issueStatus: "missing",
    proposedAction: "restore-missing",
    desiredValues: { offeringName: "Interior", priceMinimumCad: 195 },
    governedFields: ["offeringName","priceMinimumCad"],
    expectedFingerprint: "expected-b",
    observedFingerprint: null
  }
];

const regression: ReconciliationRecordResult[] = [
  {
    integrationKey: "record-a",
    status: "mismatched",
    expectedFingerprint: "expected-a2",
    observedFingerprint: "observed-a2",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "record-b",
    status: "missing",
    expectedFingerprint: "expected-b2",
    observedFingerprint: null,
    differingFields: []
  },
  {
    integrationKey: "record-c",
    status: "matched",
    expectedFingerprint: "expected-c",
    observedFingerprint: "expected-c",
    differingFields: []
  }
];

const scope = buildSuccessorCorrectivePlanScope(predecessor, regression);
assert(scope.length === 2, "Build 057 must include only regressed records.");
assert(scope[0].integrationKey === "record-a", "Build 057 scope ordering must be deterministic.");
assert(scope[0].governedFields.length === 1 && scope[0].governedFields[0] === "priceMinimumCad", "Mismatched successor scope must include only proven differing fields.");
assert(scope[0].desiredValues.priceMinimumCad === 249, "Successor desired values must come from predecessor governed evidence.");
assert(scope[1].proposedAction === "restore-missing", "A previously restored missing record may be restored again.");
assert(scope[1].governedFields.length === 2, "Missing successor scope must restore all predecessor governed values.");

const base = {
  retriageId: "retriage-1",
  reopenId: "reopen-1",
  regressionCheckId: "regression-1",
  predecessorPlanId: "plan-1",
  predecessorCorrectiveDeliveryId: "delivery-1",
  sourceRegressionFingerprint: "regression-fp",
  sourceCorrectivePackageId: "package-1",
  sourceCorrectiveReplayKey: "replay-1",
  sourceCorrectivePackageFingerprint: "package-fp",
  correctionScope: scope,
  rationale: "Restore the proven regression."
};
const one = successorCorrectivePlanFingerprint(base);
const two = successorCorrectivePlanFingerprint(base);
const changed = successorCorrectivePlanFingerprint({ ...base, rationale: "Different rationale." });
assert(one === two, "Successor plan fingerprint must be deterministic.");
assert(one !== changed, "Successor plan fingerprint must bind rationale.");
assert(one.startsWith("successor-plan1-"), "Successor plan fingerprint must be versioned.");

let rejected = false;
try {
  buildSuccessorCorrectivePlanScope(
    predecessor,
    [{
      integrationKey: "not-predecessor-governed",
      status: "mismatched",
      expectedFingerprint: "x",
      observedFingerprint: "y",
      differingFields: ["priceMinimumCad"]
    }]
  );
} catch {
  rejected = true;
}
assert(rejected, "Build 057 must fail closed when regression scope is not predecessor-governed.");

console.log("Build 057 reopened exception successor planning verification passed.");
