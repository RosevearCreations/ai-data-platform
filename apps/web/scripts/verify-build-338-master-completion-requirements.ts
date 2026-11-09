import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  MASTER_COMPLETION_AXES,
  masterCompletionDenominatorHash,
  masterCompletionScopeKey,
  scoreMasterCompletionScope,
  stableMasterCompletionRequirementId,
  validateMasterCompletionEvidence,
  validateMasterCompletionRequirementRevision,
  type MasterCompletionDenominatorApproval,
  type MasterCompletionEvidence,
  type MasterCompletionRequirementRevision
} from "../lib/master-completion-core";

const root = resolve(process.cwd());
const source = (path: string) =>
  readFileSync(resolve(root, path), "utf8");

assert.deepEqual([...MASTER_COMPLETION_AXES], [
  "design",
  "implementation",
  "automated-testing",
  "integration-verification",
  "security",
  "accessibility-device-acceptance",
  "production-user-acceptance"
]);

const req1Id = stableMasterCompletionRequirementId({
  sourceId: "yw",
  moduleId: "booking",
  requirementKey: "customer.booking.create"
});
assert.equal(
  req1Id,
  stableMasterCompletionRequirementId({
    sourceId: "yw",
    moduleId: "booking",
    requirementKey: "customer.booking.create"
  })
);
assert.notEqual(
  req1Id,
  stableMasterCompletionRequirementId({
    sourceId: "yw",
    moduleId: "booking",
    requirementKey: "customer.booking.cancel"
  })
);

const req1 = validateMasterCompletionRequirementRevision({
  requirementId: req1Id,
  revisionNumber: 1,
  sourceId: "yw",
  moduleId: "booking",
  requirementKey: "customer.booking.create",
  title: "Create booking",
  description: "Customer can create a governed booking.",
  applicability: "required",
  requiredAxes: [...MASTER_COMPLETION_AXES],
  weight: 2,
  critical: true,
  recordedAt: "2026-11-09T12:00:00.000Z"
});

const req2Id = stableMasterCompletionRequirementId({
  sourceId: "yw",
  moduleId: "booking",
  requirementKey: "worker.booking.assign"
});
const req2 = validateMasterCompletionRequirementRevision({
  requirementId: req2Id,
  revisionNumber: 1,
  sourceId: "yw",
  moduleId: "booking",
  requirementKey: "worker.booking.assign",
  title: "Assign worker",
  description: "Authorized worker assignment is supported.",
  applicability: "required",
  requiredAxes: ["implementation", "security"],
  weight: 1,
  critical: false,
  recordedAt: "2026-11-09T12:00:00.000Z"
});

assert.throws(
  () =>
    validateMasterCompletionRequirementRevision({
      ...req2,
      requiredAxes: [],
      applicability: "required"
    }),
  /master_completion_required_axes_required/
);

const items = [
  {
    requirementId: req1.requirementId,
    revisionNumber: 1,
    weight: 2
  },
  {
    requirementId: req2.requirementId,
    revisionNumber: 1,
    weight: 1
  }
];

const approval: MasterCompletionDenominatorApproval = {
  approvalId: "approval_123456789012",
  scopeKey: masterCompletionScopeKey({
    sourceId: "yw",
    moduleId: "booking"
  }),
  scopeVersion: 1,
  sourceId: "yw",
  moduleId: "booking",
  scopeDate: "2026-11-09",
  branch: "main",
  commitSha: "9727ab9faf0c396d48b26d139cccf3a413b8d71a",
  denominatorHash: masterCompletionDenominatorHash(items),
  items,
  approvedBy: "owner-review",
  approvedAt: "2026-11-09T12:00:00.000Z"
};

function evidence(
  requirement: MasterCompletionRequirementRevision,
  axis: (typeof MASTER_COMPLETION_AXES)[number],
  state: "SATISFIED" | "PARTIAL" | "FAILED" = "SATISFIED",
  expiresAt = "2026-11-10T12:00:00.000Z",
  recordVersion = 1
): MasterCompletionEvidence {
  return validateMasterCompletionEvidence({
    evidenceId:
      "evidence_" +
      requirement.requirementId.slice(4, 12) +
      "_" +
      axis.replaceAll("-", "_") +
      "_" +
      recordVersion,
    requirementId: requirement.requirementId,
    requirementRevision: requirement.revisionNumber,
    axis,
    recordVersion,
    state,
    evidenceURI:
      "urn:rosevear:evidence:" +
      requirement.requirementId +
      ":" +
      axis +
      ":" +
      recordVersion,
    reviewer: "owner-review",
    confidence: 0.95,
    observedAt: "2026-11-09T12:00:00.000Z",
    expiresAt,
    branch: "main",
    commitSha: "9727ab9faf0c396d48b26d139cccf3a413b8d71a",
    notes: null,
    recordedAt: "2026-11-09T12:01:00.000Z"
  });
}

const req1ImplementationOnly = [
  evidence(req1, "implementation")
];
const implementationOnlyScore = scoreMasterCompletionScope({
  approval,
  requirementRevisions: [req1, req2],
  evidence: req1ImplementationOnly,
  now: new Date("2026-11-09T13:00:00.000Z")
});
assert.equal(implementationOnlyScore.completion.percent, null);
assert.ok(implementationOnlyScore.counts.unknown > 0);
assert.equal(
  implementationOnlyScore.policy.implementationDoesNotImplyOtherAxes,
  true
);

const req1All = MASTER_COMPLETION_AXES.map((axis) =>
  evidence(req1, axis)
);
const partialCoverage = scoreMasterCompletionScope({
  approval,
  requirementRevisions: [req1, req2],
  evidence: req1All,
  now: new Date("2026-11-09T13:00:00.000Z")
});
assert.equal(partialCoverage.completion.percent, null);
assert.equal(partialCoverage.counts.satisfied, 1);
assert.equal(partialCoverage.counts.unknown, 1);
assert.equal(partialCoverage.evidenceCoverage.numerator, 7);
assert.equal(partialCoverage.evidenceCoverage.denominator, 9);
assert.equal(partialCoverage.requirements[1].axes.filter(
  (axis) => axis.state === "NOT_APPLICABLE"
).length, 5);

const completeEvidence = [
  ...req1All,
  evidence(req2, "implementation"),
  evidence(req2, "security")
];
const completeScore = scoreMasterCompletionScope({
  approval,
  requirementRevisions: [req1, req2],
  evidence: completeEvidence,
  now: new Date("2026-11-09T13:00:00.000Z")
});
assert.equal(completeScore.completion.percent, 100);
assert.equal(completeScore.weightedCompletion.percent, 100);
assert.equal(completeScore.evidenceCoverage.percent, 100);
assert.equal(completeScore.completion.numerator, 2);
assert.equal(completeScore.completion.denominator, 2);
assert.equal(completeScore.completion.scopeDate, "2026-11-09");
assert.equal(completeScore.completion.branch, "main");
assert.equal(
  completeScore.completion.commitSha,
  "9727ab9faf0c396d48b26d139cccf3a413b8d71a"
);
assert.ok(completeScore.completion.evidenceReferences.length >= 9);
assert.deepEqual(completeScore.completion.reviewers, ["owner-review"]);
assert.equal(completeScore.completion.confidence.minimum, 0.95);

const staleScore = scoreMasterCompletionScope({
  approval,
  requirementRevisions: [req1, req2],
  evidence: [
    ...req1All,
    evidence(
      req2,
      "implementation",
      "SATISFIED",
      "2026-11-09T12:30:00.000Z"
    ),
    evidence(req2, "security")
  ],
  now: new Date("2026-11-09T13:00:00.000Z")
});
assert.equal(staleScore.completion.percent, null);
assert.equal(staleScore.counts.stale, 1);

const req2Revision2 = validateMasterCompletionRequirementRevision({
  ...req2,
  revisionNumber: 2,
  title: "Assign worker v2",
  recordedAt: "2026-11-09T13:30:00.000Z"
});
const revision2Items = [
  items[0],
  {
    requirementId: req2Revision2.requirementId,
    revisionNumber: 2,
    weight: 1
  }
];
const revision2Approval: MasterCompletionDenominatorApproval = {
  ...approval,
  approvalId: "approval_234567890123",
  scopeVersion: 2,
  denominatorHash: masterCompletionDenominatorHash(revision2Items),
  items: revision2Items,
  approvedAt: "2026-11-09T13:31:00.000Z"
};
const revision2Score = scoreMasterCompletionScope({
  approval: revision2Approval,
  requirementRevisions: [req1, req2, req2Revision2],
  evidence: completeEvidence,
  now: new Date("2026-11-09T14:00:00.000Z")
});
assert.equal(revision2Score.completion.percent, null);
assert.equal(revision2Score.counts.unknown, 1);
assert.equal(revision2Score.policy.oldRevisionEvidenceCarriesForward, false);

const migration = source(
  "../../db/migrations/0120_master_completion_requirements_scoring.sql"
);
for (const token of [
  "master_completion_requirement_revisions",
  "master_completion_denominator_approvals",
  "master_completion_evidence",
  "required_axes",
  "denominator_hash",
  "scope_date",
  "reviewer",
  "confidence",
  "record_version",
  "enable row level security",
  "grant select, insert",
  "revoke update, delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.includes("grant update"));
assert.ok(!migration.includes("grant delete"));

const database = source("lib/master-completion-database.ts");
for (const token of [
  "recordMasterCompletionRequirementRevision",
  "approveMasterCompletionDenominator",
  "recordMasterCompletionEvidence",
  "listMasterCompletionForUser",
  "masterCompletionDenominatorHash",
  "scoreMasterCompletionScope",
  "master_completion_denominator_source_mismatch",
  "master_completion_denominator_module_mismatch",
  "master_completion_axis_not_required"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("fetch("));

const api = source("app/api/master-completion/route.ts");
for (const token of [
  "record-requirement-revision",
  "approve-denominator",
  "record-evidence",
  "authentication_required",
  "api.master-completion.get",
  "api.master-completion.post",
  "MAX_BODY_BYTES"
]) {
  assert.ok(api.includes(token), "API token " + token);
}

const page = source("app/master-completion/page.tsx");
for (const token of [
  "Master Completion Requirements &amp; Evidence Axes",
  "Missing evidence is not 0%.",
  "Evidence-backed scoring",
  "Stable requirement registry",
  "Master Completion"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const consoleSource = source(
  "app/master-completion/CompletionConsole.tsx"
);
assert.ok(consoleSource.includes("Record requirement revision"));
assert.ok(consoleSource.includes("Approve denominator"));
assert.ok(consoleSource.includes("Record evidence"));

const navigation = source("lib/application-navigation.ts");
const operatorTools = source("lib/module-operator-tools.ts");
const ingestionPage = source("app/master-shell-ingestion/page.tsx");
assert.ok(navigation.includes('href: "/master-completion"'));
assert.ok(operatorTools.includes('"/master-completion"'));
assert.ok(ingestionPage.includes('href="/master-completion"'));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build338-review.json")
);
assert.equal(review.build, 338);
assert.equal(review.axes.length, 7);
assert.equal(review.scoring.unknownConvertedToZero, false);
assert.equal(review.scoring.staleConvertedToZero, false);
assert.equal(review.safety.sixSourceDenominatorsInvented, false);
assert.equal(review.nextQueuedBuild, 339);

const docs = source(
  "../../docs/BUILD_338_MASTER_COMPLETION_REQUIREMENTS_EVIDENCE_SCORING.md"
);
assert.ok(
  docs.includes(
    "Build 339 — Application & Module Inventory, Capability and Readiness Read Models"
  )
);
assert.ok(
  docs.includes(
    "A completion percentage is **unavailable** whenever"
  )
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 337 — Read-Only Source Update Ingestion & Provenance Normalization** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 339 — Application & Module Inventory, Capability and Readiness Read Models"
  )
);

const response = source(
  "../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md"
);
assert.ok(
  response.includes(
    "Build 338 contribution — Master Completion evidence model"
  )
);

const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(
  architecture.includes(
    "Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring"
  )
);
assert.ok(
  security.includes(
    "Build 338 Master Completion security and evidence integrity"
  )
);

const previousVerifier = source(
  "scripts/verify-build-337-master-shell-source-ingestion.ts"
);
assert.ok(
  previousVerifier.includes(
    "Build 337 — Read-Only Source Update Ingestion & Provenance Normalization** — Production"
  )
);

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const table of [
  "master_completion_requirement_revisions",
  "master_completion_denominator_approvals",
  "master_completion_evidence"
]) {
  assert.ok(
    (dbSpine.match(new RegExp(table, "g")) ?? []).length >= 2,
    "database spine " + table
  );
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-338-master-completion-requirements.ts";
assert.equal(pkg.scripts["verify:build338"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-337-master-shell-source-ingestion.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-338-master-completion-requirements.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-338-master-completion-requirements.ts"
  ) < String(pkg.scripts.build).indexOf(
    "run-production-migrations.ts"
  )
);

console.log(
  "Build 338 Master Completion Requirements Registry & Evidence-Axis Scoring verification passed."
);
