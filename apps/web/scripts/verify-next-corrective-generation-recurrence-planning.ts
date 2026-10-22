import {
  buildFollowingCorrectiveGenerationPlanScope,
  followingCorrectiveGenerationPlanFingerprint
} from "../lib/next-corrective-generation-recurrence-planning";
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

const scope = buildFollowingCorrectiveGenerationPlanScope(
  predecessor,
  recurrence
);
assert(scope.length === 2, "Build 105 must include only next-corrective-generation recurrent records.");
assert(
  scope[0].integrationKey === "record-a",
  "Build 105 scope ordering must be deterministic."
);
assert(
  scope[0].governedFields.length === 1 &&
    scope[0].governedFields[0] === "priceMinimumCad",
  "Build 105 mismatched scope must include only next-corrective-generation recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 105 desired values must remain frozen to Build 101 predecessor evidence."
);

const base = {
  nextCorrectiveGenerationRetriageId: "next-generation-retriage-1",
  nextCorrectiveGenerationRecurrenceId: "next-corrective-generation-recurrence-1",
  nextCorrectiveGenerationReclosureId: "next-corrective-generation-reclosure-1",
  nextCorrectiveGenerationReclosureRegressionCheckId: "post-next-corrective-generation-check-1",
  predecessorNextCorrectiveGenerationPlanId: "next-corrective-generation-plan-1",
  predecessorNextCorrectiveGenerationDeliveryId: "next-corrective-generation-delivery-1",
  sourceNextCorrectiveGenerationRecurrenceFingerprint: "recurrence3-fp",
  sourceRegressionFingerprint: "regression3-fp",
  sourceNextCorrectiveGenerationReclosureFingerprint: "reclosure3-fp",
  sourceNextCorrectiveGenerationPackageId: "next-corrective-generation-package-1",
  sourceNextCorrectiveGenerationReplayKey: "next-corrective-generation-replay-1",
  sourceNextCorrectiveGenerationPackageFingerprint: "next-corrective-generation-package-fp",
  correctionScope: scope,
  rationale: "Correct the newest verified next-corrective-generation recurrence."
};

const one = followingCorrectiveGenerationPlanFingerprint(base);
const two = followingCorrectiveGenerationPlanFingerprint(base);
const changed = followingCorrectiveGenerationPlanFingerprint({
  ...base,
  sourceNextCorrectiveGenerationRecurrenceFingerprint: "different-recurrence3-fp"
});

assert(one === two, "Build 105 plan fingerprints must be deterministic.");
assert(one !== changed, "Build 105 plan fingerprint must bind next-corrective-generation recurrence identity.");
assert(
  one.startsWith("following-corrective-generation-plan1-"),
  "Build 105 plan fingerprint must be versioned."
);

let rejected = false;
try {
  buildFollowingCorrectiveGenerationPlanScope(predecessor, [
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
  "Build 105 must fail closed when next-corrective-generation recurrent scope is not Build 101 governed."
);

console.log(
  "Build 105 next-corrective-generation recurrence re-triage and following corrective-generation planning verification passed."
);
