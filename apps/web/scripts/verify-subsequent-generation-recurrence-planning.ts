import {
  buildSuccessiveGenerationCorrectivePlanScope,
  successiveGenerationCorrectivePlanFingerprint
} from "../lib/subsequent-generation-recurrence-planning";
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
    expectedFingerprint: "expected-a-successor",
    observedFingerprint: "observed-a-successor",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "record-b",
    status: "missing",
    expectedFingerprint: "expected-b-successor",
    observedFingerprint: null,
    differingFields: []
  }
];

const scope = buildSuccessiveGenerationCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 073 must include only subsequent-generation recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 073 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 073 mismatched scope must include only subsequent-generation recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 073 desired values must remain frozen to Build 069 predecessor evidence."
);

const base = {
  subsequentGenerationRetriageId: "successor-retriage-1",
  subsequentGenerationRecurrenceId: "subsequent-generation-recurrence-1",
  subsequentGenerationReclosureId: "subsequent-generation-reclosure-1",
  subsequentGenerationReclosureRegressionCheckId: "post-subsequent-generation-check-1",
  predecessorSubsequentGenerationPlanId: "subsequent-generation-plan-1",
  predecessorSubsequentGenerationDeliveryId: "subsequent-generation-delivery-1",
  sourceSubsequentGenerationRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceSubsequentGenerationReclosureFingerprint: "reclosure3-fp",
  sourceSubsequentGenerationPackageId: "subsequent-generation-package-1",
  sourceSubsequentGenerationReplayKey: "subsequent-generation-replay-1",
  sourceSubsequentGenerationPackageFingerprint: "subsequent-generation-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified subsequent-generation recurrence."
};

const one = successiveGenerationCorrectivePlanFingerprint(base);
const two = successiveGenerationCorrectivePlanFingerprint(base);
const changed = successiveGenerationCorrectivePlanFingerprint({
  ...base,
  sourceSubsequentGenerationRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 073 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 073 plan fingerprint must bind subsequent-generation recurrence identity.");
assert(
  one.startsWith("successive-generation-plan1-"),
  "Build 073 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildSuccessiveGenerationCorrectivePlanScope(predecessor, [
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
  "Build 073 must fail closed when subsequent-generation recurrent scope is not Build 069 governed."
);

console.log(
  "Build 073 subsequent-generation recurrence re-triage and successive-generation planning verification passed."
);
