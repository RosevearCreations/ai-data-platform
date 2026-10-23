import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  buildUnifiedCorrectiveGenerationPlanScope,
  requireUnifiedCorrectiveGenerationSourceEvidence,
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

const genericEvidence = requireUnifiedCorrectiveGenerationSourceEvidence({
  sourceRecurrenceKind: "generic-corrective-generation",
  regressionStatus: "recurred",
  recordResults: recurrence
});
assert(
  genericEvidence === recurrence,
  "Build 113 must accept the generic recurrence evidence emitted by post-unified recurrence governance."
);

const historicalEvidence = requireUnifiedCorrectiveGenerationSourceEvidence({
  sourceRecurrenceKind: "following-corrective-generation",
  regressionStatus: "recurred",
  recordResults: recurrence
});
assert(
  historicalEvidence === recurrence,
  "Build 113 must preserve historical following-corrective-generation planning compatibility."
);

let stableRejected = false;
try {
  requireUnifiedCorrectiveGenerationSourceEvidence({
    sourceRecurrenceKind: "generic-corrective-generation",
    regressionStatus: "stable",
    recordResults: recurrence
  });
} catch {
  stableRejected = true;
}
assert(stableRejected, "Build 113 must not plan from stable post-re-closure evidence.");

let emptyRejected = false;
try {
  requireUnifiedCorrectiveGenerationSourceEvidence({
    sourceRecurrenceKind: "generic-corrective-generation",
    regressionStatus: "recurred",
    recordResults: []
  });
} catch {
  emptyRejected = true;
}
assert(emptyRejected, "Build 113 must fail closed when generic recurrence evidence has no records.");

const scope = buildUnifiedCorrectiveGenerationPlanScope(predecessor, genericEvidence);
assert(scope.length === 2, "Build 113 must retain recurrent records inside predecessor-governed scope.");
assert(scope[0].integrationKey === "record-a", "Build 113 generic scope ordering must be deterministic.");
assert(
  scope[0].governedFields.length === 1 && scope[0].governedFields[0] === "priceMinimumCad",
  "Build 113 generic mismatched scope must narrow to the recurrent governed field."
);
assert(
  scope[0].desiredValues.priceMinimumCad === 249,
  "Build 113 generic planning must preserve predecessor desired values."
);

const planInput = {
  correctiveGenerationRetriageId: "retriage-g4",
  successorSourceId: "successor-g4",
  predecessorGenerationLineageId: "lineage-g3",
  generationNumber: 4,
  predecessorPlanId: "plan-g3",
  predecessorDeliveryId: "delivery-g3",
  predecessorPackageId: "package-g3",
  predecessorReplayKey: "replay-g3",
  predecessorPackageFingerprint: "package-fingerprint-g3",
  predecessorReclosureId: "reclosure-g3",
  predecessorReclosureFingerprint: "reclosure-fingerprint-g3",
  sourceRecurrenceId: "recurrence-g3",
  sourceRecurrenceFingerprint: "recurrence-fingerprint-g3",
  sourceRegressionFingerprint: "regression-fingerprint-g3",
  sourceSuccessorFingerprint: "successor-fingerprint-g4",
  correctionScope: scope,
  rationale: "Create generation 4 from the generic successor emitted by Build 113 recurrence governance."
};
const one = unifiedCorrectiveGenerationPlanFingerprint(planInput);
const two = unifiedCorrectiveGenerationPlanFingerprint(planInput);
assert(one === two, "Build 113 generic plan fingerprint must remain deterministic.");
assert(
  one.startsWith("corrective-generation-plan1-"),
  "Build 113 must preserve the unified generic plan fingerprint contract."
);

const sourcePath = fileURLToPath(
  new URL("../lib/unified-corrective-generation-planning.ts", import.meta.url)
);
const source = readFileSync(sourcePath, "utf8");
for (const required of [
  "workspace_reconciliation_unified_cg_recurrences recurrence113",
  "workspace_post_unified_cg_reclosure_checks check113",
  "recurrence113.recurrence_fingerprint=s.source_recurrence_fingerprint",
  "check113.verification_fingerprint=s.source_regression_fingerprint",
  "recurrence113.recurrence_fingerprint=t.source_recurrence_fingerprint",
  "check113.verification_fingerprint=t.source_regression_fingerprint",
  "coalesce(check113.record_results,check108.record_results)"
]) {
  assert(
    source.includes(required),
    "Build 113 planning service is missing generic recurrence bridge: " + required
  );
}
assert(
  !source.includes('row.source_recurrence_kind !== "following-corrective-generation"'),
  "Build 113 must remove the Build 110 historical-only source-kind gate."
);

console.log("Build 113 unified corrective-generation recurrence planning verification passed.");
