import {
  buildContinuationGenerationCorrectivePlanScope,
  continuationGenerationCorrectivePlanFingerprint
} from "../lib/successive-generation-recurrence-planning";
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
    expectedFingerprint: "expected-a-subsequent",
    observedFingerprint: "observed-a-subsequent",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "record-b",
    status: "missing",
    expectedFingerprint: "expected-b-subsequent",
    observedFingerprint: null,
    differingFields: []
  }
];

const scope = buildContinuationGenerationCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 077 must include only successive-generation recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 077 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 077 mismatched scope must include only successive-generation recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 077 desired values must remain frozen to Build 073 predecessor evidence."
);

const base = {
  successiveGenerationRetriageId: "subsequent-retriage-1",
  successiveGenerationRecurrenceId: "successive-generation-recurrence-1",
  successiveGenerationReclosureId: "successive-generation-reclosure-1",
  successiveGenerationReclosureRegressionCheckId: "post-continuation-generation-check-1",
  predecessorSuccessiveGenerationPlanId: "successive-generation-plan-1",
  predecessorSuccessiveGenerationDeliveryId: "successive-generation-delivery-1",
  sourceSuccessiveGenerationRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceSuccessiveGenerationReclosureFingerprint: "reclosure3-fp",
  sourceSuccessiveGenerationPackageId: "successive-generation-package-1",
  sourceSuccessiveGenerationReplayKey: "successive-generation-replay-1",
  sourceSuccessiveGenerationPackageFingerprint: "successive-generation-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified successive-generation recurrence."
};

const one = continuationGenerationCorrectivePlanFingerprint(base);
const two = continuationGenerationCorrectivePlanFingerprint(base);
const changed = continuationGenerationCorrectivePlanFingerprint({
  ...base,
  sourceSuccessiveGenerationRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 077 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 077 plan fingerprint must bind successive-generation recurrence identity.");
assert(
  one.startsWith("continuation-generation-plan1-"),
  "Build 077 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildContinuationGenerationCorrectivePlanScope(predecessor, [
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
  "Build 077 must fail closed when successive-generation recurrent scope is not Build 073 governed."
);

console.log(
  "Build 077 successive-generation recurrence re-triage and continuation-generation planning verification passed."
);
