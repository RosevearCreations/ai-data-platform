import {
  buildSuccessiveCycleCorrectivePlanScope,
  successiveCycleCorrectivePlanFingerprint
} from "../lib/subsequent-cycle-recurrence-planning";
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

const scope = buildSuccessiveCycleCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 093 must include only subsequent-cycle recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 093 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 093 mismatched scope must include only subsequent-cycle recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 093 desired values must remain frozen to Build 089 predecessor evidence."
);

const base = {
  subsequentCycleRetriageId: "continuation-retriage-1",
  subsequentCycleRecurrenceId: "subsequent-cycle-recurrence-1",
  subsequentCycleReclosureId: "subsequent-cycle-reclosure-1",
  subsequentCycleReclosureRegressionCheckId: "post-subsequent-cycle-check-1",
  predecessorSubsequentCyclePlanId: "subsequent-cycle-plan-1",
  predecessorSubsequentCycleDeliveryId: "subsequent-cycle-delivery-1",
  sourceSubsequentCycleRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceSubsequentCycleReclosureFingerprint: "reclosure3-fp",
  sourceSubsequentCyclePackageId: "subsequent-cycle-package-1",
  sourceSubsequentCycleReplayKey: "subsequent-cycle-replay-1",
  sourceSubsequentCyclePackageFingerprint: "subsequent-cycle-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified subsequent-cycle recurrence."
};

const one = successiveCycleCorrectivePlanFingerprint(base);
const two = successiveCycleCorrectivePlanFingerprint(base);
const changed = successiveCycleCorrectivePlanFingerprint({
  ...base,
  sourceSubsequentCycleRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 093 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 093 plan fingerprint must bind subsequent-cycle recurrence identity.");
assert(
  one.startsWith("successive-cycle-plan1-"),
  "Build 093 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildSuccessiveCycleCorrectivePlanScope(predecessor, [
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
  "Build 093 must fail closed when subsequent-cycle recurrent scope is not Build 089 governed."
);

console.log(
  "Build 093 subsequent-cycle recurrence re-triage and successive-cycle planning verification passed."
);
