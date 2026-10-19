import {
  buildFollowingCycleCorrectivePlanScope,
  followingCycleCorrectivePlanFingerprint
} from "../lib/next-cycle-recurrence-planning";
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

const scope = buildFollowingCycleCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 085 must include only next-cycle recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 085 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 085 mismatched scope must include only next-cycle recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 085 desired values must remain frozen to Build 081 predecessor evidence."
);

const base = {
  nextCycleRetriageId: "continuation-retriage-1",
  nextCycleRecurrenceId: "next-cycle-recurrence-1",
  nextCycleReclosureId: "next-cycle-reclosure-1",
  nextCycleReclosureRegressionCheckId: "post-next-cycle-check-1",
  predecessorNextCyclePlanId: "next-cycle-plan-1",
  predecessorNextCycleDeliveryId: "next-cycle-delivery-1",
  sourceNextCycleRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceNextCycleReclosureFingerprint: "reclosure3-fp",
  sourceNextCyclePackageId: "next-cycle-package-1",
  sourceNextCycleReplayKey: "next-cycle-replay-1",
  sourceNextCyclePackageFingerprint: "next-cycle-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified next-cycle recurrence."
};

const one = followingCycleCorrectivePlanFingerprint(base);
const two = followingCycleCorrectivePlanFingerprint(base);
const changed = followingCycleCorrectivePlanFingerprint({
  ...base,
  sourceNextCycleRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 085 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 085 plan fingerprint must bind next-cycle recurrence identity.");
assert(
  one.startsWith("following-cycle-plan1-"),
  "Build 085 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildFollowingCycleCorrectivePlanScope(predecessor, [
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
  "Build 085 must fail closed when next-cycle recurrent scope is not Build 081 governed."
);

console.log(
  "Build 085 next-cycle recurrence re-triage and following-cycle planning verification passed."
);
