import {
  buildNextCorrectiveGenerationPlanScope,
  nextCorrectiveGenerationPlanFingerprint
} from "../lib/continuation-cycle-recurrence-planning";
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

const scope = buildNextCorrectiveGenerationPlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 101 must include only continuation-cycle recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 101 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 101 mismatched scope must include only continuation-cycle recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 101 desired values must remain frozen to Build 097 predecessor evidence."
);

const base = {
  continuationCycleRetriageId: "next-generation-retriage-1",
  continuationCycleRecurrenceId: "continuation-cycle-recurrence-1",
  continuationCycleReclosureId: "continuation-cycle-reclosure-1",
  continuationCycleReclosureRegressionCheckId: "post-continuation-cycle-check-1",
  predecessorContinuationCyclePlanId: "continuation-cycle-plan-1",
  predecessorContinuationCycleDeliveryId: "continuation-cycle-delivery-1",
  sourceContinuationCycleRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceContinuationCycleReclosureFingerprint: "reclosure3-fp",
  sourceContinuationCyclePackageId: "continuation-cycle-package-1",
  sourceContinuationCycleReplayKey: "continuation-cycle-replay-1",
  sourceContinuationCyclePackageFingerprint: "continuation-cycle-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified continuation-cycle recurrence."
};

const one = nextCorrectiveGenerationPlanFingerprint(base);
const two = nextCorrectiveGenerationPlanFingerprint(base);
const changed = nextCorrectiveGenerationPlanFingerprint({
  ...base,
  sourceContinuationCycleRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 101 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 101 plan fingerprint must bind continuation-cycle recurrence identity.");
assert(
  one.startsWith("next-corrective-generation-plan1-"),
  "Build 101 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildNextCorrectiveGenerationPlanScope(predecessor, [
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
  "Build 101 must fail closed when continuation-cycle recurrent scope is not Build 097 governed."
);

console.log(
  "Build 101 continuation-cycle recurrence re-triage and next corrective-generation planning verification passed."
);
