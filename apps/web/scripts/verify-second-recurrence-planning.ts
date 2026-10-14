import {
  buildSuccessorGenerationCorrectivePlanScope,
  successorGenerationCorrectivePlanFingerprint
} from "../lib/second-recurrence-planning";
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

const scope = buildSuccessorGenerationCorrectivePlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 065 must include only second-recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 065 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 065 mismatched scope must include only second-recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 065 desired values must remain frozen to Build 061 predecessor evidence."
);

const base = {
  secondRecurrenceRetriageId: "second-retriage-1",
  nextGenerationRecurrenceId: "next-generation-recurrence-1",
  nextGenerationReclosureId: "next-generation-reclosure-1",
  nextGenerationReclosureRegressionCheckId: "post-next-generation-check-1",
  predecessorNextGenerationPlanId: "next-generation-plan-1",
  predecessorNextGenerationDeliveryId: "next-generation-delivery-1",
  sourceNextGenerationRecurrenceFingerprint: "recurrence2-fp",
  sourceRegressionFingerprint: "regression2-fp",
  sourceNextGenerationReclosureFingerprint: "reclosure2-fp",
  sourceNextGenerationPackageId: "next-generation-package-1",
  sourceNextGenerationReplayKey: "next-generation-replay-1",
  sourceNextGenerationPackageFingerprint: "next-generation-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified second recurrence."
};

const one = successorGenerationCorrectivePlanFingerprint(base);
const two = successorGenerationCorrectivePlanFingerprint(base);
const changed = successorGenerationCorrectivePlanFingerprint({
  ...base,
  sourceNextGenerationRecurrenceFingerprint: "different-recurrence2-fp"
});

assert(one === two, "Build 065 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 065 plan fingerprint must bind second recurrence identity.");
assert(
  one.startsWith("successor-generation-plan1-"),
  "Build 065 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildSuccessorGenerationCorrectivePlanScope(predecessor, [
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
  "Build 065 must fail closed when second-recurrent scope is not Build 061 governed."
);

console.log(
  "Build 065 second-recurrence re-triage and successor-generation planning verification passed."
);
