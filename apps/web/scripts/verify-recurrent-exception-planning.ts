import {
  buildNextGenerationCorrectivePlanScope,
  nextGenerationCorrectivePlanFingerprint
} from "../lib/recurrent-exception-planning";
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
    governedFields: ["offeringName","priceMinimumCad"],
    expectedFingerprint: "expected-a",
    observedFingerprint: "observed-a"
  },
  {
    integrationKey: "record-b",
    issueStatus: "missing",
    proposedAction: "restore-missing",
    desiredValues: { offeringName: "Interior", priceMinimumCad: 195 },
    governedFields: ["offeringName","priceMinimumCad"],
    expectedFingerprint: "expected-b",
    observedFingerprint: null
  }
];

const recurrence: ReconciliationRecordResult[] = [
  {
    integrationKey: "record-a",
    status: "mismatched",
    expectedFingerprint: "expected-a-next",
    observedFingerprint: "observed-a-next",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "record-b",
    status: "missing",
    expectedFingerprint: "expected-b-next",
    observedFingerprint: null,
    differingFields: []
  },
  {
    integrationKey: "record-c",
    status: "matched",
    expectedFingerprint: "expected-c",
    observedFingerprint: "expected-c",
    differingFields: []
  }
];

const scope = buildNextGenerationCorrectivePlanScope(predecessor, recurrence);
assert(scope.length === 2, "Build 061 must include only recurrent records.");
assert(scope[0].integrationKey === "record-a", "Build 061 scope ordering must be deterministic.");
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 061 mismatched scope must include only recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 061 desired values must remain frozen to predecessor successor-plan evidence."
);
assert(
  scope[1].proposedAction === "restore-missing",
  "Build 061 may restore a predecessor-governed missing record."
);

const base = {
  recurrenceRetriageId: "recurrence-retriage-1",
  recurrenceId: "recurrence-1",
  reclosureId: "reclosure-1",
  reclosureRegressionCheckId: "post-reclosure-check-1",
  predecessorSuccessorPlanId: "successor-plan-1",
  predecessorSuccessorDeliveryId: "successor-delivery-1",
  sourceRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "regression-fp",
  sourceReclosureFingerprint: "reclosure-fp",
  sourceSuccessorPackageId: "successor-package-1",
  sourceSuccessorReplayKey: "successor-replay-1",
  sourceSuccessorPackageFingerprint: "successor-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified recurrence."
};
const one = nextGenerationCorrectivePlanFingerprint(base);
const two = nextGenerationCorrectivePlanFingerprint(base);
const changed = nextGenerationCorrectivePlanFingerprint({
  ...base,
  sourceRecurrenceFingerprint: "different-recurrence-fp"
});
assert(one === two, "Build 061 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 061 plan fingerprint must bind recurrence identity.");
assert(
  one.startsWith("next-generation-plan1-"),
  "Build 061 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildNextGenerationCorrectivePlanScope(predecessor, [{
    integrationKey: "not-predecessor-governed",
    status: "mismatched",
    expectedFingerprint: "x",
    observedFingerprint: "y",
    differingFields: ["priceMinimumCad"]
  }]);
} catch {
  rejected = true;
}
assert(
  rejected,
  "Build 061 must fail closed when recurrent scope is not predecessor-successor governed."
);

console.log("Build 061 recurrent re-triage and next-generation planning verification passed.");
