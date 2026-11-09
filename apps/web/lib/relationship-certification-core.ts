import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const RELATIONSHIP_CERTIFICATION_BUILD = 346 as const;

export const RELATIONSHIP_PATTERNS = [
  "one-to-one",
  "one-to-many",
  "many-to-one",
  "many-to-many"
] as const;

export const RELATIONSHIP_CERTIFICATION_DIMENSIONS = [
  "contract",
  "identity",
  "replay",
  "expiry",
  "audience",
  "tenant-isolation"
] as const;

export const RELATIONSHIP_CERTIFICATION_OUTCOMES = [
  "pass",
  "fail",
  "blocked"
] as const;

export type RelationshipPattern =
  (typeof RELATIONSHIP_PATTERNS)[number];
export type RelationshipCertificationDimension =
  (typeof RELATIONSHIP_CERTIFICATION_DIMENSIONS)[number];
export type RelationshipCertificationOutcome =
  (typeof RELATIONSHIP_CERTIFICATION_OUTCOMES)[number];

export type RelationshipCertificationAssertion = {
  dimension: RelationshipCertificationDimension;
  outcome: RelationshipCertificationOutcome;
  evidenceURI: string;
  detail: string;
};

export type RelationshipCertificationRun = {
  runId: string;
  relationshipId: string;
  certificationVersion: number;
  pattern: RelationshipPattern;
  sourceIds: MasterShellSourceId[];
  destinationIds: MasterShellSourceId[];
  overallOutcome: "passed" | "failed" | "blocked";
  reviewer: string;
  observedAt: string;
  expiresAt: string;
  branch: string;
  commitSha: string;
  notes: string | null;
  recordedAt: string;
  assertions: RelationshipCertificationAssertion[];
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,1200}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/;
const COMMIT = /^[a-f0-9]{7,64}$/;
const URI = /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;

function validIso(value: unknown) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function includes<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function uniqueSourceIds(values: readonly MasterShellSourceId[]) {
  return [...new Set(values)];
}

export function validateRelationshipShape(input: {
  relationshipId: string;
  pattern: RelationshipPattern;
  sourceIds: MasterShellSourceId[];
  destinationIds: MasterShellSourceId[];
}) {
  if (!SAFE_ID.test(input.relationshipId)) {
    throw new Error("relationship_certification_relationship_id_invalid");
  }
  if (!includes(RELATIONSHIP_PATTERNS, input.pattern)) {
    throw new Error("relationship_certification_pattern_invalid");
  }

  const sourceIds = uniqueSourceIds(input.sourceIds);
  const destinationIds = uniqueSourceIds(input.destinationIds);
  if (
    sourceIds.length !== input.sourceIds.length ||
    destinationIds.length !== input.destinationIds.length
  ) {
    throw new Error("relationship_certification_duplicate_source_invalid");
  }
  if (
    sourceIds.length < 1 ||
    destinationIds.length < 1 ||
    sourceIds.length > MASTER_SHELL_SOURCE_IDS.length ||
    destinationIds.length > MASTER_SHELL_SOURCE_IDS.length
  ) {
    throw new Error("relationship_certification_cardinality_invalid");
  }
  if (
    [...sourceIds, ...destinationIds].some(
      (id) => !MASTER_SHELL_SOURCE_IDS.includes(id)
    )
  ) {
    throw new Error("relationship_certification_source_invalid");
  }
  if (sourceIds.some((id) => destinationIds.includes(id))) {
    throw new Error("relationship_certification_self_relationship_invalid");
  }

  const sourceCount = sourceIds.length;
  const destinationCount = destinationIds.length;
  const validPattern =
    (input.pattern === "one-to-one" &&
      sourceCount === 1 &&
      destinationCount === 1) ||
    (input.pattern === "one-to-many" &&
      sourceCount === 1 &&
      destinationCount >= 2) ||
    (input.pattern === "many-to-one" &&
      sourceCount >= 2 &&
      destinationCount === 1) ||
    (input.pattern === "many-to-many" &&
      sourceCount >= 2 &&
      destinationCount >= 2);

  if (!validPattern) {
    throw new Error("relationship_certification_pattern_cardinality_mismatch");
  }

  return {
    relationshipId: input.relationshipId,
    pattern: input.pattern,
    sourceIds,
    destinationIds
  };
}

export function validateRelationshipAssertions(
  assertions: RelationshipCertificationAssertion[]
) {
  if (assertions.length !== RELATIONSHIP_CERTIFICATION_DIMENSIONS.length) {
    throw new Error("relationship_certification_requires_six_dimensions");
  }
  const dimensions = new Set<RelationshipCertificationDimension>();
  for (const assertion of assertions) {
    if (
      !includes(
        RELATIONSHIP_CERTIFICATION_DIMENSIONS,
        assertion.dimension
      )
    ) {
      throw new Error("relationship_certification_dimension_invalid");
    }
    if (!includes(RELATIONSHIP_CERTIFICATION_OUTCOMES, assertion.outcome)) {
      throw new Error("relationship_certification_outcome_invalid");
    }
    if (!URI.test(assertion.evidenceURI)) {
      throw new Error("relationship_certification_evidence_uri_invalid");
    }
    if (
      !SAFE_TEXT.test(assertion.detail) ||
      assertion.detail.length > 1200
    ) {
      throw new Error("relationship_certification_detail_invalid");
    }
    if (dimensions.has(assertion.dimension)) {
      throw new Error("relationship_certification_duplicate_dimension");
    }
    dimensions.add(assertion.dimension);
  }
  for (const dimension of RELATIONSHIP_CERTIFICATION_DIMENSIONS) {
    if (!dimensions.has(dimension)) {
      throw new Error("relationship_certification_dimension_missing");
    }
  }
  return assertions;
}

export function summarizeRelationshipAssertions(
  assertions: readonly RelationshipCertificationAssertion[]
) {
  const passed = assertions.filter((item) => item.outcome === "pass").length;
  const failed = assertions.filter((item) => item.outcome === "fail").length;
  const blocked = assertions.filter((item) => item.outcome === "blocked").length;
  return {
    checks: assertions.length,
    passed,
    failed,
    blocked,
    overallOutcome: (
      failed > 0 ? "failed" : blocked > 0 ? "blocked" : "passed"
    ) as "passed" | "failed" | "blocked"
  };
}

export function validateRelationshipCertificationRun(
  input: RelationshipCertificationRun
) {
  validateRelationshipShape(input);
  validateRelationshipAssertions(input.assertions);

  if (!SAFE_ID.test(input.runId)) {
    throw new Error("relationship_certification_run_id_invalid");
  }
  if (
    !Number.isSafeInteger(input.certificationVersion) ||
    input.certificationVersion < 1
  ) {
    throw new Error("relationship_certification_version_invalid");
  }
  if (!SAFE_TEXT.test(input.reviewer) || input.reviewer.length > 160) {
    throw new Error("relationship_certification_reviewer_invalid");
  }
  if (
    !validIso(input.observedAt) ||
    !validIso(input.expiresAt) ||
    Date.parse(input.expiresAt) <= Date.parse(input.observedAt)
  ) {
    throw new Error("relationship_certification_time_invalid");
  }
  if (!BRANCH.test(input.branch)) {
    throw new Error("relationship_certification_branch_invalid");
  }
  if (!COMMIT.test(input.commitSha)) {
    throw new Error("relationship_certification_commit_invalid");
  }
  if (
    input.notes !== null &&
    (!SAFE_TEXT.test(input.notes) || input.notes.length > 1200)
  ) {
    throw new Error("relationship_certification_notes_invalid");
  }
  if (!validIso(input.recordedAt)) {
    throw new Error("relationship_certification_recorded_at_invalid");
  }

  const summary = summarizeRelationshipAssertions(input.assertions);
  if (summary.overallOutcome !== input.overallOutcome) {
    throw new Error("relationship_certification_summary_mismatch");
  }

  return input;
}

function effectiveState(
  run: RelationshipCertificationRun,
  now: Date
): "PASS" | "FAIL" | "BLOCKED" | "STALE" {
  if (Date.parse(run.expiresAt) <= now.getTime()) return "STALE";
  if (run.overallOutcome === "failed") return "FAIL";
  if (run.overallOutcome === "blocked") return "BLOCKED";
  return "PASS";
}

export function composeRelationshipCertificationModel(input: {
  runs: RelationshipCertificationRun[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const latestByRelationship = new Map<string, RelationshipCertificationRun>();

  for (const raw of input.runs) {
    const run = validateRelationshipCertificationRun(raw);
    const current = latestByRelationship.get(run.relationshipId);
    if (
      !current ||
      run.certificationVersion > current.certificationVersion ||
      (run.certificationVersion === current.certificationVersion &&
        Date.parse(run.recordedAt) > Date.parse(current.recordedAt))
    ) {
      latestByRelationship.set(run.relationshipId, run);
    }
  }

  const relationships = [...latestByRelationship.values()]
    .map((run) => ({
      ...run,
      effectiveState: effectiveState(run, now),
      certificationIsActivation: false,
      peerWritePerformed: false,
      sourceMutationPerformed: false,
      productionAcceptanceInferred: false
    }))
    .sort((a, b) => a.relationshipId.localeCompare(b.relationshipId));

  const patterns = RELATIONSHIP_PATTERNS.map((pattern) => {
    const rows = relationships.filter((row) => row.pattern === pattern);
    const failed = rows.filter((row) => row.effectiveState === "FAIL").length;
    const blocked = rows.filter((row) => row.effectiveState === "BLOCKED").length;
    const stale = rows.filter((row) => row.effectiveState === "STALE").length;
    const passed = rows.filter((row) => row.effectiveState === "PASS").length;
    const effectiveState =
      rows.length === 0
        ? "UNKNOWN"
        : failed > 0
          ? "FAIL"
          : blocked > 0
            ? "BLOCKED"
            : stale > 0
              ? "STALE"
              : passed === rows.length
                ? "PASS"
                : "UNKNOWN";
    return {
      pattern,
      relationships: rows.length,
      passed,
      failed,
      blocked,
      stale,
      effectiveState
    };
  });

  return {
    schema: "ai-data-platform.relationship-integration-certification.v1",
    build: RELATIONSHIP_CERTIFICATION_BUILD,
    generatedAt: now.toISOString(),
    dimensions: [...RELATIONSHIP_CERTIFICATION_DIMENSIONS],
    supportedPatterns: [...RELATIONSHIP_PATTERNS],
    relationships,
    patterns,
    summary: {
      relationships: relationships.length,
      passed: relationships.filter((row) => row.effectiveState === "PASS").length,
      failed: relationships.filter((row) => row.effectiveState === "FAIL").length,
      blocked: relationships.filter((row) => row.effectiveState === "BLOCKED").length,
      stale: relationships.filter((row) => row.effectiveState === "STALE").length,
      patternCoverage: patterns.filter((row) => row.relationships > 0).length
    },
    policy: {
      missingPatternEvidenceMeansCertified: false,
      expiredEvidenceMeansCertified: false,
      deploymentGreenImpliesCertification: false,
      build304PassImpliesRelationshipCertification: false,
      certificationIsActivation: false,
      peerWritePerformed: false,
      sourceMutationPerformed: false,
      externalProbePerformed: false,
      productionAcceptanceInferred: false
    }
  };
}

export type RelationshipCertificationModel = ReturnType<
  typeof composeRelationshipCertificationModel
>;
