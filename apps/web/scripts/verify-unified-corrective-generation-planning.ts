import {
  buildUnifiedCorrectiveGenerationPlanScope,
  unifiedCorrectiveGenerationPlanFingerprint
} from "../lib/unified-corrective-generation-planning";
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
    expectedFingerprint: "expected-a-generic",
    observedFingerprint: "observed-a-generic",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "record-b",
    status: "missing",
    expectedFingerprint: "expected-b-generic",
    observedFingerprint: null,
    differingFields: []
  }
];

const scope = buildUnifiedCorrectiveGenerationPlanScope(predecessor, recurrence);
assert(scope.length === 2, "Build 110 must preserve only recurrent predecessor-governed records.");
assert(scope[0].integrationKey === "record-a", "Build 110 scope ordering must be deterministic.");
assert(
  scope[0].governedFields.length === 1 && scope[0].governedFields[0] === "priceMinimumCad",
  "Build 110 mismatched scope must narrow to recurrent governed fields."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 110 desired values must remain frozen to predecessor plan evidence."
);

const base = {
  correctiveGenerationRetriageId: "retriage-g3",
  successorSourceId: "successor-g3",
  predecessorGenerationLineageId: "lineage-g2",
  generationNumber: 3,
  predecessorPlanId: "plan-g2",
  predecessorDeliveryId: "delivery-g2",
  predecessorPackageId: "package-g2",
  predecessorReplayKey: "replay-g2",
  predecessorPackageFingerprint: "package-fingerprint-g2",
  predecessorReclosureId: "reclosure-g2",
  predecessorReclosureFingerprint: "reclosure-fingerprint-g2",
  sourceRecurrenceId: "recurrence-g2",
  sourceRecurrenceFingerprint: "recurrence-fingerprint-g2",
  sourceRegressionFingerprint: "regression-fingerprint-g2",
  sourceSuccessorFingerprint: "successor-fingerprint-g3",
  correctionScope: scope,
  rationale: "Create generation 3 from the governed Build 109 successor source."
};

const one = unifiedCorrectiveGenerationPlanFingerprint(base);
const two = unifiedCorrectiveGenerationPlanFingerprint(base);
const changed = unifiedCorrectiveGenerationPlanFingerprint({
  ...base,
  generationNumber: 4
});

assert(one === two, "Build 110 plan fingerprint must be deterministic.");
assert(one !== changed, "Build 110 plan fingerprint must bind generation number.");
assert(
  one.startsWith("corrective-generation-plan1-"),
  "Build 110 plan fingerprint must use the generic versioned prefix."
);

let rejected = false;
try {
  buildUnifiedCorrectiveGenerationPlanScope(predecessor, [{
    integrationKey: "outside-governed-scope",
    status: "mismatched",
    expectedFingerprint: "x",
    observedFingerprint: "y",
    differingFields: ["priceMinimumCad"]
  }]);
} catch {
  rejected = true;
}
assert(rejected, "Build 110 must fail closed for recurrence outside predecessor-governed scope.");

console.log("Build 110 unified corrective-generation planning verification passed.");
