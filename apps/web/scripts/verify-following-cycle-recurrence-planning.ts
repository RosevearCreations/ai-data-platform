import {
  buildSubsequentCycleCorrectivePlanScope,
  subsequentCycleCorrectivePlanFingerprint
} from "../lib/following-cycle-recurrence-planning";
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
    governedFields: ["offeringName", "priceMinimumCad"],
    expectedFingerprint: "expected-a",
    observedFingerprint: "observed-a"
  },
  {
    integrationKey: "record-b",
    issueStatus: "missing",
    proposedAction: "restore-missing",
    desiredValues: { offeringName: "Interior", priceMinimumCad: 195 },
    governedFields: ["offeringName", "priceMinimumCad"],
    expectedFingerprint: "expected-b",
    observedFingerprint: null
  }
];

const recurrence: ReconciliationRecordResult[] = [
  {
    integrationKey: "record-a",
    status: "mismatched",
    expectedFingerprint: "expected-a-continuation",
    observedFingerprint: "observed-a-continuation",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "record-b",
    status: "missing",
    expectedFingerprint: "expected-b-continuation",
    observedFingerprint: null,
    differingFields: []
  }
];

const scope = buildSubsequentCycleCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 089 must include only following-cycle recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 089 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 089 mismatched scope must include only following-cycle recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 089 desired values must remain frozen to Build 085 predecessor evidence."
);

const base = {
  followingCycleRetriageId: "continuation-retriage-1",
  followingCycleRecurrenceId: "following-cycle-recurrence-1",
  followingCycleReclosureId: "following-cycle-reclosure-1",
  followingCycleReclosureRegressionCheckId: "post-following-cycle-check-1",
  predecessorFollowingCyclePlanId: "following-cycle-plan-1",
  predecessorFollowingCycleDeliveryId: "following-cycle-delivery-1",
  sourceFollowingCycleRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceFollowingCycleReclosureFingerprint: "reclosure3-fp",
  sourceFollowingCyclePackageId: "following-cycle-package-1",
  sourceFollowingCycleReplayKey: "following-cycle-replay-1",
  sourceFollowingCyclePackageFingerprint: "following-cycle-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified following-cycle recurrence."
};

const one = subsequentCycleCorrectivePlanFingerprint(base);
const two = subsequentCycleCorrectivePlanFingerprint(base);
const changed = subsequentCycleCorrectivePlanFingerprint({
  ...base,
  sourceFollowingCycleRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 089 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 089 plan fingerprint must bind following-cycle recurrence identity.");
assert(
  one.startsWith("subsequent-cycle-plan1-"),
  "Build 089 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildSubsequentCycleCorrectivePlanScope(predecessor, [
    {
      integrationKey: "not-predecessor-governed",
      status: "mismatched",
      expectedFingerprint: "x",
      observedFingerprint: "y",
      differingFields: ["priceMinimumCad"]
    }
  ]);
} catch {
  rejected = true;
}
assert(
  rejected,
  "Build 089 must fail closed when following-cycle recurrent scope is not Build 085 governed."
);

console.log(
  "Build 089 following-cycle recurrence re-triage and subsequent-cycle planning verification passed."
);
