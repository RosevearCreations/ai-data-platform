import {
  buildContinuationCycleCorrectivePlanScope,
  continuationCycleCorrectivePlanFingerprint
} from "../lib/successive-cycle-recurrence-planning";
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

const scope = buildContinuationCycleCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 097 must include only successive-cycle recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 097 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 097 mismatched scope must include only successive-cycle recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 097 desired values must remain frozen to Build 093 predecessor evidence."
);

const base = {
  successiveCycleRetriageId: "continuation-retriage-1",
  successiveCycleRecurrenceId: "successive-cycle-recurrence-1",
  successiveCycleReclosureId: "successive-cycle-reclosure-1",
  successiveCycleReclosureRegressionCheckId: "post-successive-cycle-check-1",
  predecessorSuccessiveCyclePlanId: "successive-cycle-plan-1",
  predecessorSuccessiveCycleDeliveryId: "successive-cycle-delivery-1",
  sourceSuccessiveCycleRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceSuccessiveCycleReclosureFingerprint: "reclosure3-fp",
  sourceSuccessiveCyclePackageId: "successive-cycle-package-1",
  sourceSuccessiveCycleReplayKey: "successive-cycle-replay-1",
  sourceSuccessiveCyclePackageFingerprint: "successive-cycle-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified successive-cycle recurrence."
};

const one = continuationCycleCorrectivePlanFingerprint(base);
const two = continuationCycleCorrectivePlanFingerprint(base);
const changed = continuationCycleCorrectivePlanFingerprint({
  ...base,
  sourceSuccessiveCycleRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 097 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 097 plan fingerprint must bind successive-cycle recurrence identity.");
assert(
  one.startsWith("continuation-cycle-plan1-"),
  "Build 097 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildContinuationCycleCorrectivePlanScope(predecessor, [
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
  "Build 097 must fail closed when successive-cycle recurrent scope is not Build 093 governed."
);

console.log(
  "Build 097 successive-cycle recurrence re-triage and continuation-cycle planning verification passed."
);
