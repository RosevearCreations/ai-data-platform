import { createHash } from "node:crypto";

import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const MASTER_COMPLETION_BUILD = 338 as const;

export const MASTER_COMPLETION_AXES = [
  "design",
  "implementation",
  "automated-testing",
  "integration-verification",
  "security",
  "accessibility-device-acceptance",
  "production-user-acceptance"
] as const;

export type MasterCompletionAxis =
  (typeof MASTER_COMPLETION_AXES)[number];

export const MASTER_COMPLETION_APPLICABILITY = [
  "required",
  "not-applicable",
  "unscoped"
] as const;

export type MasterCompletionApplicability =
  (typeof MASTER_COMPLETION_APPLICABILITY)[number];

export const MASTER_COMPLETION_EVIDENCE_STATES = [
  "SATISFIED",
  "PARTIAL",
  "FAILED"
] as const;

export type MasterCompletionEvidenceState =
  (typeof MASTER_COMPLETION_EVIDENCE_STATES)[number];

export type MasterCompletionEffectiveEvidenceState =
  | MasterCompletionEvidenceState
  | "UNKNOWN"
  | "STALE"
  | "NOT_APPLICABLE";

export type MasterCompletionRequirementRevision = {
  requirementId: string;
  revisionNumber: number;
  sourceId: MasterShellSourceId;
  moduleId: string | null;
  requirementKey: string;
  title: string;
  description: string;
  applicability: MasterCompletionApplicability;
  requiredAxes: MasterCompletionAxis[];
  weight: number;
  critical: boolean;
  recordedAt: string;
};

export type MasterCompletionDenominatorItem = {
  requirementId: string;
  revisionNumber: number;
  weight: number;
};

export type MasterCompletionDenominatorApproval = {
  approvalId: string;
  scopeKey: string;
  scopeVersion: number;
  sourceId: MasterShellSourceId;
  moduleId: string | null;
  scopeDate: string;
  branch: string;
  commitSha: string;
  denominatorHash: string;
  items: MasterCompletionDenominatorItem[];
  approvedBy: string;
  approvedAt: string;
};

export type MasterCompletionEvidence = {
  evidenceId: string;
  requirementId: string;
  requirementRevision: number;
  axis: MasterCompletionAxis;
  recordVersion: number;
  state: MasterCompletionEvidenceState;
  evidenceURI: string;
  reviewer: string;
  confidence: number;
  observedAt: string;
  expiresAt: string;
  branch: string;
  commitSha: string;
  notes: string | null;
  recordedAt: string;
};

export type MasterCompletionAxisState = {
  axis: MasterCompletionAxis;
  state: MasterCompletionEffectiveEvidenceState;
  evidenceId: string | null;
  evidenceURI: string | null;
  reviewer: string | null;
  confidence: number | null;
  observedAt: string | null;
  expiresAt: string | null;
  branch: string | null;
  commitSha: string | null;
};

export type MasterCompletionRequirementScore = {
  requirementId: string;
  revisionNumber: number;
  title: string;
  weight: number;
  critical: boolean;
  state: Exclude<
    MasterCompletionEffectiveEvidenceState,
    "NOT_APPLICABLE"
  >;
  axes: MasterCompletionAxisState[];
};

export type MasterCompletionPercentageMetric = {
  percent: number | null;
  numerator: number;
  denominator: number;
  scopeKey: string;
  scopeDate: string;
  branch: string;
  commitSha: string;
  evidenceReferences: string[];
  reviewers: string[];
  confidence: {
    minimum: number | null;
    average: number | null;
  };
  blockedByUnknown: number;
  blockedByStale: number;
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const SAFE_REQUIREMENT_KEY =
  /^[a-z0-9][a-z0-9._:-]{1,158}[a-z0-9]$/;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,1000}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/;
const COMMIT = /^[a-f0-9]{7,64}$/;
const URI = /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;

function includes<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function validIso(value: unknown) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function uniqueSorted<T extends string>(values: T[]) {
  return [...new Set(values)].sort();
}

export function stableMasterCompletionRequirementId(input: {
  sourceId: MasterShellSourceId;
  moduleId: string | null;
  requirementKey: string;
}) {
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        "rosevear-master-completion-requirement-v1",
        input.sourceId,
        input.moduleId,
        input.requirementKey
      ])
    )
    .digest("hex")
    .slice(0, 32);
  return "req_" + digest;
}

export function masterCompletionScopeKey(input: {
  sourceId: MasterShellSourceId;
  moduleId: string | null;
}) {
  return input.sourceId + "::" + (input.moduleId ?? "*");
}

export function masterCompletionDenominatorHash(
  items: MasterCompletionDenominatorItem[]
) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        [...items]
          .sort((a, b) =>
            a.requirementId.localeCompare(b.requirementId)
          )
          .map((item) => [
            item.requirementId,
            item.revisionNumber,
            item.weight
          ])
      )
    )
    .digest("hex");
}

export function validateMasterCompletionRequirementRevision(
  input: MasterCompletionRequirementRevision
) {
  if (!SAFE_ID.test(input.requirementId)) {
    throw new Error("master_completion_requirement_id_invalid");
  }
  if (
    !Number.isSafeInteger(input.revisionNumber) ||
    input.revisionNumber < 1
  ) {
    throw new Error("master_completion_requirement_revision_invalid");
  }
  if (!MASTER_SHELL_SOURCE_IDS.includes(input.sourceId)) {
    throw new Error("master_completion_source_id_invalid");
  }
  if (
    input.moduleId !== null &&
    !SAFE_ID.test(input.moduleId)
  ) {
    throw new Error("master_completion_module_id_invalid");
  }
  if (!SAFE_REQUIREMENT_KEY.test(input.requirementKey)) {
    throw new Error("master_completion_requirement_key_invalid");
  }
  if (
    !SAFE_TEXT.test(input.title) ||
    input.title.length > 240
  ) {
    throw new Error("master_completion_requirement_title_invalid");
  }
  if (!SAFE_TEXT.test(input.description)) {
    throw new Error("master_completion_requirement_description_invalid");
  }
  if (
    !includes(
      MASTER_COMPLETION_APPLICABILITY,
      input.applicability
    )
  ) {
    throw new Error("master_completion_applicability_invalid");
  }
  if (
    !Array.isArray(input.requiredAxes) ||
    input.requiredAxes.length > MASTER_COMPLETION_AXES.length ||
    input.requiredAxes.some(
      (axis) => !MASTER_COMPLETION_AXES.includes(axis)
    ) ||
    new Set(input.requiredAxes).size !== input.requiredAxes.length
  ) {
    throw new Error("master_completion_required_axes_invalid");
  }
  if (
    input.applicability === "required" &&
    input.requiredAxes.length < 1
  ) {
    throw new Error("master_completion_required_axes_required");
  }
  if (
    input.applicability !== "required" &&
    input.requiredAxes.length !== 0
  ) {
    throw new Error(
      "master_completion_nonrequired_axes_must_be_empty"
    );
  }
  if (
    !Number.isFinite(input.weight) ||
    input.weight <= 0 ||
    input.weight > 100
  ) {
    throw new Error("master_completion_weight_invalid");
  }
  if (typeof input.critical !== "boolean") {
    throw new Error("master_completion_critical_invalid");
  }
  if (!validIso(input.recordedAt)) {
    throw new Error("master_completion_recorded_at_invalid");
  }

  const expectedId = stableMasterCompletionRequirementId({
    sourceId: input.sourceId,
    moduleId: input.moduleId,
    requirementKey: input.requirementKey
  });
  if (input.requirementId !== expectedId) {
    throw new Error("master_completion_requirement_id_mismatch");
  }

  return {
    ...input,
    requiredAxes: uniqueSorted(input.requiredAxes)
  };
}

export function validateMasterCompletionEvidence(
  input: MasterCompletionEvidence
) {
  if (!SAFE_ID.test(input.evidenceId)) {
    throw new Error("master_completion_evidence_id_invalid");
  }
  if (!SAFE_ID.test(input.requirementId)) {
    throw new Error("master_completion_requirement_id_invalid");
  }
  if (
    !Number.isSafeInteger(input.requirementRevision) ||
    input.requirementRevision < 1 ||
    !Number.isSafeInteger(input.recordVersion) ||
    input.recordVersion < 1
  ) {
    throw new Error("master_completion_evidence_version_invalid");
  }
  if (!MASTER_COMPLETION_AXES.includes(input.axis)) {
    throw new Error("master_completion_axis_invalid");
  }
  if (
    !MASTER_COMPLETION_EVIDENCE_STATES.includes(input.state)
  ) {
    throw new Error("master_completion_evidence_state_invalid");
  }
  if (!URI.test(input.evidenceURI)) {
    throw new Error("master_completion_evidence_uri_invalid");
  }
  if (
    !SAFE_TEXT.test(input.reviewer) ||
    input.reviewer.length > 160
  ) {
    throw new Error("master_completion_reviewer_invalid");
  }
  if (
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 1
  ) {
    throw new Error("master_completion_confidence_invalid");
  }
  if (
    !validIso(input.observedAt) ||
    !validIso(input.expiresAt) ||
    Date.parse(input.expiresAt) <= Date.parse(input.observedAt)
  ) {
    throw new Error("master_completion_evidence_time_invalid");
  }
  if (
    !BRANCH.test(input.branch) ||
    !COMMIT.test(input.commitSha)
  ) {
    throw new Error("master_completion_evidence_revision_invalid");
  }
  if (
    input.notes !== null &&
    (!SAFE_TEXT.test(input.notes) || input.notes.length > 1000)
  ) {
    throw new Error("master_completion_notes_invalid");
  }
  if (!validIso(input.recordedAt)) {
    throw new Error("master_completion_recorded_at_invalid");
  }
  return input;
}

export function effectiveMasterCompletionEvidenceState(
  evidence: MasterCompletionEvidence | null,
  now = new Date()
): MasterCompletionEffectiveEvidenceState {
  if (!evidence) return "UNKNOWN";
  if (Date.parse(evidence.expiresAt) <= now.getTime()) {
    return "STALE";
  }
  return evidence.state;
}

function confidenceSummary(
  evidence: MasterCompletionEvidence[]
) {
  if (!evidence.length) {
    return { minimum: null, average: null };
  }
  const values = evidence.map((item) => item.confidence);
  return {
    minimum: Math.min(...values),
    average:
      Math.round(
        (values.reduce((sum, value) => sum + value, 0) /
          values.length) *
          1000
      ) / 1000
  };
}

function percentageMetric(input: {
  numerator: number;
  denominator: number;
  approval: MasterCompletionDenominatorApproval;
  currentEvidence: MasterCompletionEvidence[];
  blockedByUnknown: number;
  blockedByStale: number;
  allowWhenIncomplete?: boolean;
}): MasterCompletionPercentageMetric {
  const mayCalculate =
    input.allowWhenIncomplete === true ||
    (input.blockedByUnknown === 0 &&
      input.blockedByStale === 0);
  const percent =
    mayCalculate && input.denominator > 0
      ? Math.round(
          (input.numerator / input.denominator) * 10000
        ) / 100
      : null;

  return {
    percent,
    numerator: input.numerator,
    denominator: input.denominator,
    scopeKey: input.approval.scopeKey,
    scopeDate: input.approval.scopeDate,
    branch: input.approval.branch,
    commitSha: input.approval.commitSha,
    evidenceReferences: uniqueSorted(
      input.currentEvidence.map((item) => item.evidenceURI)
    ),
    reviewers: uniqueSorted(
      input.currentEvidence.map((item) => item.reviewer)
    ),
    confidence: confidenceSummary(input.currentEvidence),
    blockedByUnknown: input.blockedByUnknown,
    blockedByStale: input.blockedByStale
  };
}

export function scoreMasterCompletionScope(input: {
  approval: MasterCompletionDenominatorApproval;
  requirementRevisions: MasterCompletionRequirementRevision[];
  evidence: MasterCompletionEvidence[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const requirements = new Map(
    input.requirementRevisions.map((item) => [
      item.requirementId + ":" + item.revisionNumber,
      item
    ])
  );
  const evidenceMap = new Map<string, MasterCompletionEvidence>();
  for (const item of input.evidence) {
    const key =
      item.requirementId +
      ":" +
      item.requirementRevision +
      ":" +
      item.axis;
    const current = evidenceMap.get(key);
    if (!current || item.recordVersion > current.recordVersion) {
      evidenceMap.set(key, item);
    }
  }

  const scored: MasterCompletionRequirementScore[] = [];
  const activeEvidence: MasterCompletionEvidence[] = [];
  let requiredAxisCount = 0;
  let freshAxisCount = 0;
  let unknownAxisCount = 0;
  let staleAxisCount = 0;

  for (const denominatorItem of input.approval.items) {
    const requirement = requirements.get(
      denominatorItem.requirementId +
        ":" +
        denominatorItem.revisionNumber
    );
    if (!requirement) {
      throw new Error(
        "master_completion_denominator_requirement_missing"
      );
    }
    if (requirement.applicability !== "required") {
      throw new Error(
        "master_completion_denominator_nonrequired_requirement"
      );
    }

    const axes: MasterCompletionAxisState[] =
      MASTER_COMPLETION_AXES.map((axis) => {
        if (!requirement.requiredAxes.includes(axis)) {
          return {
            axis,
            state: "NOT_APPLICABLE" as const,
            evidenceId: null,
            evidenceURI: null,
            reviewer: null,
            confidence: null,
            observedAt: null,
            expiresAt: null,
            branch: null,
            commitSha: null
          };
        }

        requiredAxisCount += 1;
        const evidence = evidenceMap.get(
          requirement.requirementId +
            ":" +
            requirement.revisionNumber +
            ":" +
            axis
        ) ?? null;
        const state = effectiveMasterCompletionEvidenceState(
          evidence,
          now
        );
        if (state === "UNKNOWN") {
          unknownAxisCount += 1;
        } else if (state === "STALE") {
          staleAxisCount += 1;
        } else {
          freshAxisCount += 1;
          if (evidence) activeEvidence.push(evidence);
        }

        return {
          axis,
          state,
          evidenceId: evidence?.evidenceId ?? null,
          evidenceURI: evidence?.evidenceURI ?? null,
          reviewer: evidence?.reviewer ?? null,
          confidence: evidence?.confidence ?? null,
          observedAt: evidence?.observedAt ?? null,
          expiresAt: evidence?.expiresAt ?? null,
          branch: evidence?.branch ?? null,
          commitSha: evidence?.commitSha ?? null
        };
      });

    const requiredStates = axes
      .filter((axis) => axis.state !== "NOT_APPLICABLE")
      .map((axis) => axis.state);

    let state: MasterCompletionRequirementScore["state"];
    if (requiredStates.includes("FAILED")) state = "FAILED";
    else if (requiredStates.includes("STALE")) state = "STALE";
    else if (requiredStates.includes("UNKNOWN")) state = "UNKNOWN";
    else if (requiredStates.includes("PARTIAL")) state = "PARTIAL";
    else state = "SATISFIED";

    scored.push({
      requirementId: requirement.requirementId,
      revisionNumber: requirement.revisionNumber,
      title: requirement.title,
      weight: denominatorItem.weight,
      critical: requirement.critical,
      state,
      axes
    });
  }

  const denominator = scored.length;
  const numerator = scored.filter(
    (item) => item.state === "SATISFIED"
  ).length;
  const unknownRequirements = scored.filter(
    (item) =>
      item.axes.some((axis) => axis.state === "UNKNOWN")
  ).length;
  const staleRequirements = scored.filter(
    (item) =>
      item.axes.some((axis) => axis.state === "STALE")
  ).length;
  const failedRequirements = scored.filter(
    (item) =>
      item.axes.some((axis) => axis.state === "FAILED")
  ).length;
  const partialRequirements = scored.filter(
    (item) =>
      item.axes.some((axis) => axis.state === "PARTIAL")
  ).length;

  const totalWeight = scored.reduce(
    (sum, item) => sum + item.weight,
    0
  );
  const satisfiedWeight = scored
    .filter((item) => item.state === "SATISFIED")
    .reduce((sum, item) => sum + item.weight, 0);

  const completion = percentageMetric({
    numerator,
    denominator,
    approval: input.approval,
    currentEvidence: activeEvidence,
    blockedByUnknown: unknownRequirements,
    blockedByStale: staleRequirements
  });

  const evidenceCoverage = percentageMetric({
    numerator: freshAxisCount,
    denominator: requiredAxisCount,
    approval: input.approval,
    currentEvidence: activeEvidence,
    blockedByUnknown: unknownAxisCount,
    blockedByStale: staleAxisCount,
    allowWhenIncomplete: true
  });

  const weightedCompletion = percentageMetric({
    numerator: satisfiedWeight,
    denominator: totalWeight,
    approval: input.approval,
    currentEvidence: activeEvidence,
    blockedByUnknown: unknownRequirements,
    blockedByStale: staleRequirements
  });

  const axes = MASTER_COMPLETION_AXES.map((axis) => {
    const axisItems = scored
      .map((requirement) => ({
        requirement,
        axisState: requirement.axes.find(
          (item) => item.axis === axis
        )
      }))
      .filter(
        (item) => item.axisState?.state !== "NOT_APPLICABLE"
      );
    const axisEvidence = axisItems
      .map((item) => {
        const state = item.axisState;
        if (!state?.evidenceId) return null;
        return input.evidence.find(
          (record) =>
            record.evidenceId === state.evidenceId
        ) ?? null;
      })
      .filter(
        (item): item is MasterCompletionEvidence => item !== null
      );

    const unknown = axisItems.filter(
      (item) => item.axisState?.state === "UNKNOWN"
    ).length;
    const stale = axisItems.filter(
      (item) => item.axisState?.state === "STALE"
    ).length;
    const satisfied = axisItems.filter(
      (item) => item.axisState?.state === "SATISFIED"
    ).length;

    return {
      axis,
      score: percentageMetric({
        numerator: satisfied,
        denominator: axisItems.length,
        approval: input.approval,
        currentEvidence: axisEvidence.filter(
          (record) =>
            effectiveMasterCompletionEvidenceState(
              record,
              now
            ) !== "STALE"
        ),
        blockedByUnknown: unknown,
        blockedByStale: stale
      }),
      states: {
        satisfied,
        partial: axisItems.filter(
          (item) => item.axisState?.state === "PARTIAL"
        ).length,
        failed: axisItems.filter(
          (item) => item.axisState?.state === "FAILED"
        ).length,
        unknown,
        stale
      }
    };
  });

  return {
    scopeKey: input.approval.scopeKey,
    sourceId: input.approval.sourceId,
    moduleId: input.approval.moduleId,
    approvalId: input.approval.approvalId,
    scopeVersion: input.approval.scopeVersion,
    denominatorHash: input.approval.denominatorHash,
    scopeDate: input.approval.scopeDate,
    branch: input.approval.branch,
    commitSha: input.approval.commitSha,
    requirements: scored,
    completion,
    weightedCompletion,
    evidenceCoverage,
    axes,
    counts: {
      denominator,
      satisfied: numerator,
      partial: partialRequirements,
      failed: failedRequirements,
      unknown: unknownRequirements,
      stale: staleRequirements,
      criticalFailed: scored.filter(
        (item) => item.critical && item.state === "FAILED"
      ).length
    },
    policy: {
      completionUnavailableWhenUnknownOrStale:
        completion.percent === null &&
        (unknownRequirements > 0 || staleRequirements > 0),
      evidenceAxesIndependent: true,
      implementationDoesNotImplyOtherAxes: true,
      nonApplicableAxesExcluded: true,
      denominatorExplicitlyApproved: true,
      oldRevisionEvidenceCarriesForward: false
    }
  };
}
