import {
  buildSubsequentGenerationCorrectivePlanScope,
  subsequentGenerationCorrectivePlanFingerprint
} from "../lib/successor-generation-recurrence-planning";
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

const scope = buildSubsequentGenerationCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 069 must include only successor-generation recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 069 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 069 mismatched scope must include only successor-generation recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 069 desired values must remain frozen to Build 065 predecessor evidence."
);

const base = {
  successorGenerationRetriageId: "successor-retriage-1",
  successorGenerationRecurrenceId: "successor-generation-recurrence-1",
  successorGenerationReclosureId: "successor-generation-reclosure-1",
  successorGenerationReclosureRegressionCheckId: "post-successor-generation-check-1",
  predecessorSuccessorGenerationPlanId: "successor-generation-plan-1",
  predecessorSuccessorGenerationDeliveryId: "successor-generation-delivery-1",
  sourceSuccessorGenerationRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceSuccessorGenerationReclosureFingerprint: "reclosure3-fp",
  sourceSuccessorGenerationPackageId: "successor-generation-package-1",
  sourceSuccessorGenerationReplayKey: "successor-generation-replay-1",
  sourceSuccessorGenerationPackageFingerprint: "successor-generation-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified successor-generation recurrence."
};

const one = subsequentGenerationCorrectivePlanFingerprint(base);
const two = subsequentGenerationCorrectivePlanFingerprint(base);
const changed = subsequentGenerationCorrectivePlanFingerprint({
  ...base,
  sourceSuccessorGenerationRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 069 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 069 plan fingerprint must bind successor-generation recurrence identity.");
assert(
  one.startsWith("subsequent-generation-plan1-"),
  "Build 069 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildSubsequentGenerationCorrectivePlanScope(predecessor, [
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
  "Build 069 must fail closed when successor-generation recurrent scope is not Build 065 governed."
);

console.log(
  "Build 069 successor-generation recurrence re-triage and subsequent-generation planning verification passed."
);
