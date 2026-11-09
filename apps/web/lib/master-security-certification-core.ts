import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const MASTER_SECURITY_CERTIFICATION_BUILD = 347 as const;

export const MASTER_SECURITY_CERTIFICATION_DIMENSIONS = [
  "source-signing-trust",
  "role-authorization",
  "consent",
  "sensitive-data-handling",
  "audit-evidence",
  "fail-closed-controls"
] as const;

export const MASTER_SECURITY_CERTIFICATION_OUTCOMES = [
  "pass",
  "fail",
  "blocked"
] as const;

export type MasterSecurityCertificationDimension =
  (typeof MASTER_SECURITY_CERTIFICATION_DIMENSIONS)[number];
export type MasterSecurityCertificationOutcome =
  (typeof MASTER_SECURITY_CERTIFICATION_OUTCOMES)[number];

export type MasterSecurityCertificationAssertion = {
  dimension: MasterSecurityCertificationDimension;
  outcome: MasterSecurityCertificationOutcome;
  evidenceURI: string;
  detail: string;
};

export type MasterSecurityCertificationRun = {
  runId: string;
  sourceId: MasterShellSourceId;
  certificationVersion: number;
  overallOutcome: "passed" | "failed" | "blocked";
  reviewer: string;
  observedAt: string;
  expiresAt: string;
  branch: string;
  commitSha: string;
  notes: string | null;
  recordedAt: string;
  assertions: MasterSecurityCertificationAssertion[];
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

export function validateMasterSecurityAssertions(
  assertions: MasterSecurityCertificationAssertion[]
) {
  if (assertions.length !== MASTER_SECURITY_CERTIFICATION_DIMENSIONS.length) {
    throw new Error("master_security_certification_requires_six_dimensions");
  }

  const dimensions = new Set<MasterSecurityCertificationDimension>();
  for (const assertion of assertions) {
    if (!includes(MASTER_SECURITY_CERTIFICATION_DIMENSIONS, assertion.dimension)) {
      throw new Error("master_security_certification_dimension_invalid");
    }
    if (!includes(MASTER_SECURITY_CERTIFICATION_OUTCOMES, assertion.outcome)) {
      throw new Error("master_security_certification_outcome_invalid");
    }
    if (!URI.test(assertion.evidenceURI)) {
      throw new Error("master_security_certification_evidence_uri_invalid");
    }
    if (!SAFE_TEXT.test(assertion.detail) || assertion.detail.length > 1200) {
      throw new Error("master_security_certification_detail_invalid");
    }
    if (dimensions.has(assertion.dimension)) {
      throw new Error("master_security_certification_duplicate_dimension");
    }
    dimensions.add(assertion.dimension);
  }

  for (const dimension of MASTER_SECURITY_CERTIFICATION_DIMENSIONS) {
    if (!dimensions.has(dimension)) {
      throw new Error("master_security_certification_dimension_missing");
    }
  }
  return assertions;
}

export function summarizeMasterSecurityAssertions(
  assertions: readonly MasterSecurityCertificationAssertion[]
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

export function validateMasterSecurityCertificationRun(
  input: MasterSecurityCertificationRun
) {
  if (!SAFE_ID.test(input.runId)) {
    throw new Error("master_security_certification_run_id_invalid");
  }
  if (!MASTER_SHELL_SOURCE_IDS.includes(input.sourceId)) {
    throw new Error("master_security_certification_source_invalid");
  }
  if (!Number.isSafeInteger(input.certificationVersion) || input.certificationVersion < 1) {
    throw new Error("master_security_certification_version_invalid");
  }
  if (!SAFE_TEXT.test(input.reviewer) || input.reviewer.length > 160) {
    throw new Error("master_security_certification_reviewer_invalid");
  }
  if (
    !validIso(input.observedAt) ||
    !validIso(input.expiresAt) ||
    Date.parse(input.expiresAt) <= Date.parse(input.observedAt)
  ) {
    throw new Error("master_security_certification_time_invalid");
  }
  if (!BRANCH.test(input.branch)) {
    throw new Error("master_security_certification_branch_invalid");
  }
  if (!COMMIT.test(input.commitSha)) {
    throw new Error("master_security_certification_commit_invalid");
  }
  if (
    input.notes !== null &&
    (!SAFE_TEXT.test(input.notes) || input.notes.length > 1200)
  ) {
    throw new Error("master_security_certification_notes_invalid");
  }
  if (!validIso(input.recordedAt)) {
    throw new Error("master_security_certification_recorded_at_invalid");
  }

  validateMasterSecurityAssertions(input.assertions);
  const summary = summarizeMasterSecurityAssertions(input.assertions);
  if (summary.overallOutcome !== input.overallOutcome) {
    throw new Error("master_security_certification_summary_mismatch");
  }
  return input;
}

function effectiveState(
  run: MasterSecurityCertificationRun,
  now: Date
): "PASS" | "FAIL" | "BLOCKED" | "STALE" {
  if (Date.parse(run.expiresAt) <= now.getTime()) return "STALE";
  if (run.overallOutcome === "failed") return "FAIL";
  if (run.overallOutcome === "blocked") return "BLOCKED";
  return "PASS";
}

export function composeMasterSecurityCertificationModel(input: {
  runs: MasterSecurityCertificationRun[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const latestBySource = new Map<MasterShellSourceId, MasterSecurityCertificationRun>();

  for (const raw of input.runs) {
    const run = validateMasterSecurityCertificationRun(raw);
    const current = latestBySource.get(run.sourceId);
    if (
      !current ||
      run.certificationVersion > current.certificationVersion ||
      (run.certificationVersion === current.certificationVersion &&
        Date.parse(run.recordedAt) > Date.parse(current.recordedAt))
    ) {
      latestBySource.set(run.sourceId, run);
    }
  }

  const sources = MASTER_SHELL_SOURCE_IDS.map((sourceId) => {
    const run = latestBySource.get(sourceId);
    if (!run) {
      return {
        sourceId,
        certificationVersion: null,
        effectiveState: "UNKNOWN" as const,
        run: null
      };
    }
    return {
      sourceId,
      certificationVersion: run.certificationVersion,
      effectiveState: effectiveState(run, now),
      run
    };
  });

  const failed = sources.filter((row) => row.effectiveState === "FAIL").length;
  const blocked = sources.filter((row) => row.effectiveState === "BLOCKED").length;
  const stale = sources.filter((row) => row.effectiveState === "STALE").length;
  const unknown = sources.filter((row) => row.effectiveState === "UNKNOWN").length;
  const passed = sources.filter((row) => row.effectiveState === "PASS").length;
  const suiteEffectiveState =
    failed > 0
      ? "FAIL"
      : blocked > 0
        ? "BLOCKED"
        : stale > 0
          ? "STALE"
          : unknown > 0
            ? "UNKNOWN"
            : passed === MASTER_SHELL_SOURCE_IDS.length
              ? "PASS"
              : "UNKNOWN";

  return {
    schema: "ai-data-platform.master-security-certification.v1",
    build: MASTER_SECURITY_CERTIFICATION_BUILD,
    generatedAt: now.toISOString(),
    dimensions: [...MASTER_SECURITY_CERTIFICATION_DIMENSIONS],
    sources,
    summary: {
      sources: sources.length,
      passed,
      failed,
      blocked,
      stale,
      unknown,
      suiteEffectiveState
    },
    policy: {
      missingEvidenceMeansCertified: false,
      expiredEvidenceMeansCertified: false,
      deploymentGreenImpliesCertification: false,
      build346PassImpliesSecurityCertification: false,
      roleDeviceAcceptanceImpliesAuthorization: false,
      signingSoftwareImpliesTrust: false,
      consentInferredFromMembership: false,
      consentInferredFromPriorCommunication: false,
      sourceTrustInferred: false,
      sourceMutationPerformed: false,
      peerWritePerformed: false,
      externalProbePerformed: false,
      holdReleasePerformed: false,
      productionAcceptanceInferred: false
    }
  };
}

export type MasterSecurityCertificationModel = ReturnType<
  typeof composeMasterSecurityCertificationModel
>;
