import {
  buildNextCycleCorrectivePlanScope,
  nextCycleCorrectivePlanFingerprint
} from "../lib/continuation-generation-recurrence-planning";
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
    expectedFingerprint: "expected-a-successive",
    observedFingerprint: "observed-a-successive",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "record-b",
    status: "missing",
    expectedFingerprint: "expected-b-successive",
    observedFingerprint: null,
    differingFields: []
  }
];

const scope = buildNextCycleCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 081 must include only continuation-generation recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 081 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 081 mismatched scope must include only continuation-generation recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 081 desired values must remain frozen to Build 077 predecessor evidence."
);

const base = {
  continuationGenerationRetriageId: "successive-retriage-1",
  continuationGenerationRecurrenceId: "continuation-generation-recurrence-1",
  continuationGenerationReclosureId: "continuation-generation-reclosure-1",
  continuationGenerationReclosureRegressionCheckId: "post-continuation-generation-check-1",
  predecessorContinuationGenerationPlanId: "continuation-generation-plan-1",
  predecessorContinuationGenerationDeliveryId: "continuation-generation-delivery-1",
  sourceContinuationGenerationRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceContinuationGenerationReclosureFingerprint: "reclosure3-fp",
  sourceContinuationGenerationPackageId: "continuation-generation-package-1",
  sourceContinuationGenerationReplayKey: "continuation-generation-replay-1",
  sourceContinuationGenerationPackageFingerprint: "continuation-generation-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified continuation-generation recurrence."
};

const one = nextCycleCorrectivePlanFingerprint(base);
const two = nextCycleCorrectivePlanFingerprint(base);
const changed = nextCycleCorrectivePlanFingerprint({
  ...base,
  sourceContinuationGenerationRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 081 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 081 plan fingerprint must bind continuation-generation recurrence identity.");
assert(
  one.startsWith("next-cycle-plan1-"),
  "Build 081 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildNextCycleCorrectivePlanScope(predecessor, [
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
  "Build 081 must fail closed when continuation-generation recurrent scope is not Build 077 governed."
);

console.log(
  "Build 081 continuation-generation recurrence re-triage and next-cycle planning verification passed."
);
