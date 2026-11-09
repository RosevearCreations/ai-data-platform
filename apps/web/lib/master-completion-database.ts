import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  MASTER_COMPLETION_APPLICABILITY,
  MASTER_COMPLETION_AXES,
  MASTER_COMPLETION_EVIDENCE_STATES,
  masterCompletionDenominatorHash,
  masterCompletionScopeKey,
  scoreMasterCompletionScope,
  stableMasterCompletionRequirementId,
  validateMasterCompletionEvidence,
  validateMasterCompletionRequirementRevision,
  type MasterCompletionApplicability,
  type MasterCompletionAxis,
  type MasterCompletionDenominatorApproval,
  type MasterCompletionDenominatorItem,
  type MasterCompletionEvidence,
  type MasterCompletionEvidenceState,
  type MasterCompletionRequirementRevision
} from "./master-completion-core";
import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

type RequirementRow = {
  requirement_id: string;
  revision_number: string;
  actor_user_id: string;
  source_id: MasterShellSourceId;
  module_id: string | null;
  requirement_key: string;
  title: string;
  description: string;
  applicability: MasterCompletionApplicability;
  required_axes: unknown;
  weight: string;
  critical: boolean;
  recorded_at: Date;
};

type DenominatorRow = {
  approval_id: string;
  actor_user_id: string;
  scope_key: string;
  scope_version: string;
  source_id: MasterShellSourceId;
  module_id: string | null;
  scope_date: string | Date;
  branch: string;
  commit_sha: string;
  denominator_hash: string;
  items: unknown;
  approved_by: string;
  approved_at: Date;
};

type EvidenceRow = {
  evidence_id: string;
  actor_user_id: string;
  requirement_id: string;
  requirement_revision: string;
  axis: MasterCompletionAxis;
  record_version: string;
  state: MasterCompletionEvidenceState;
  evidence_uri: string;
  reviewer: string;
  confidence: string;
  observed_at: Date;
  expires_at: Date;
  branch: string;
  commit_sha: string;
  notes: string | null;
  recorded_at: Date;
};

function requiredAxes(value: unknown): MasterCompletionAxis[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(String)
    .filter((axis): axis is MasterCompletionAxis =>
      MASTER_COMPLETION_AXES.includes(axis as MasterCompletionAxis)
    );
}

function denominatorItems(
  value: unknown
): MasterCompletionDenominatorItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const row = item as Record<string, unknown>;
    const revisionNumber = Number(row.revisionNumber);
    const weight = Number(row.weight);
    if (
      typeof row.requirementId !== "string" ||
      !Number.isSafeInteger(revisionNumber) ||
      revisionNumber < 1 ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      return [];
    }
    return [{
      requirementId: row.requirementId,
      revisionNumber,
      weight
    }];
  });
}

function dateOnly(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function rowToRequirement(
  row: RequirementRow
): MasterCompletionRequirementRevision {
  return validateMasterCompletionRequirementRevision({
    requirementId: row.requirement_id,
    revisionNumber: Number(row.revision_number),
    sourceId: row.source_id,
    moduleId: row.module_id,
    requirementKey: row.requirement_key,
    title: row.title,
    description: row.description,
    applicability: row.applicability,
    requiredAxes: requiredAxes(row.required_axes),
    weight: Number(row.weight),
    critical: row.critical,
    recordedAt: row.recorded_at.toISOString()
  });
}

function rowToDenominator(
  row: DenominatorRow
): MasterCompletionDenominatorApproval {
  const items = denominatorItems(row.items);
  const result: MasterCompletionDenominatorApproval = {
    approvalId: row.approval_id,
    scopeKey: row.scope_key,
    scopeVersion: Number(row.scope_version),
    sourceId: row.source_id,
    moduleId: row.module_id,
    scopeDate: dateOnly(row.scope_date),
    branch: row.branch,
    commitSha: row.commit_sha,
    denominatorHash: row.denominator_hash,
    items,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at.toISOString()
  };
  if (
    result.scopeKey !== masterCompletionScopeKey(result) ||
    result.denominatorHash !== masterCompletionDenominatorHash(items)
  ) {
    throw new Error("master_completion_denominator_integrity_invalid");
  }
  return result;
}

function rowToEvidence(row: EvidenceRow): MasterCompletionEvidence {
  return validateMasterCompletionEvidence({
    evidenceId: row.evidence_id,
    requirementId: row.requirement_id,
    requirementRevision: Number(row.requirement_revision),
    axis: row.axis,
    recordVersion: Number(row.record_version),
    state: row.state,
    evidenceURI: row.evidence_uri,
    reviewer: row.reviewer,
    confidence: Number(row.confidence),
    observedAt: row.observed_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    branch: row.branch,
    commitSha: row.commit_sha,
    notes: row.notes,
    recordedAt: row.recorded_at.toISOString()
  });
}

async function requireSuiteAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1
       from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) {
    throw new Error("master_completion_suite_admin_required");
  }
}

function validSourceId(value: string): value is MasterShellSourceId {
  return MASTER_SHELL_SOURCE_IDS.includes(
    value as MasterShellSourceId
  );
}

function validApplicability(
  value: string
): value is MasterCompletionApplicability {
  return MASTER_COMPLETION_APPLICABILITY.includes(
    value as MasterCompletionApplicability
  );
}

function validAxis(value: string): value is MasterCompletionAxis {
  return MASTER_COMPLETION_AXES.includes(
    value as MasterCompletionAxis
  );
}

function validEvidenceState(
  value: string
): value is MasterCompletionEvidenceState {
  return MASTER_COMPLETION_EVIDENCE_STATES.includes(
    value as MasterCompletionEvidenceState
  );
}

async function latestRequirement(
  client: PoolClient,
  requirementId: string
) {
  const result = await client.query<RequirementRow>(
    `select *
     from app.master_completion_requirement_revisions
     where requirement_id=$1
     order by revision_number desc
     limit 1`,
    [requirementId]
  );
  return result.rows[0] ? rowToRequirement(result.rows[0]) : null;
}

export async function recordMasterCompletionRequirementRevision(
  userId: string,
  input: {
    sourceId: string;
    moduleId?: string | null;
    requirementKey: string;
    title: string;
    description: string;
    applicability: string;
    requiredAxes: string[];
    weight: number;
    critical: boolean;
  }
) {
  if (!validSourceId(input.sourceId)) {
    throw new Error("master_completion_source_id_invalid");
  }
  if (!validApplicability(input.applicability)) {
    throw new Error("master_completion_applicability_invalid");
  }
  if (
    input.requiredAxes.some((axis) => !validAxis(axis)) ||
    new Set(input.requiredAxes).size !== input.requiredAxes.length
  ) {
    throw new Error("master_completion_required_axes_invalid");
  }

  const moduleId =
    input.moduleId === undefined ||
    input.moduleId === null ||
    input.moduleId === ""
      ? null
      : input.moduleId;
  const requirementId = stableMasterCompletionRequirementId({
    sourceId: input.sourceId,
    moduleId,
    requirementKey: input.requirementKey
  });

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["master-completion-requirement:" + requirementId]
    );

    const current = await latestRequirement(client, requirementId);
    if (
      current &&
      (
        current.sourceId !== input.sourceId ||
        current.moduleId !== moduleId ||
        current.requirementKey !== input.requirementKey
      )
    ) {
      throw new Error("master_completion_requirement_identity_drift");
    }

    const nextRevision = (current?.revisionNumber ?? 0) + 1;
    const candidate = validateMasterCompletionRequirementRevision({
      requirementId,
      revisionNumber: nextRevision,
      sourceId: input.sourceId,
      moduleId,
      requirementKey: input.requirementKey,
      title: input.title,
      description: input.description,
      applicability: input.applicability,
      requiredAxes: input.requiredAxes as MasterCompletionAxis[],
      weight: input.weight,
      critical: input.critical,
      recordedAt: new Date().toISOString()
    });

    const result = await client.query<RequirementRow>(
      `insert into app.master_completion_requirement_revisions (
        requirement_id,revision_number,actor_user_id,source_id,module_id,
        requirement_key,title,description,applicability,required_axes,
        weight,critical
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12
      )
      returning *`,
      [
        candidate.requirementId,
        candidate.revisionNumber,
        userId,
        candidate.sourceId,
        candidate.moduleId,
        candidate.requirementKey,
        candidate.title,
        candidate.description,
        candidate.applicability,
        JSON.stringify(candidate.requiredAxes),
        candidate.weight,
        candidate.critical
      ]
    );
    return rowToRequirement(result.rows[0]);
  });
}

export async function approveMasterCompletionDenominator(
  userId: string,
  input: {
    sourceId: string;
    moduleId?: string | null;
    scopeDate: string;
    branch: string;
    commitSha: string;
    requirementIds: string[];
    approvedBy: string;
  }
) {
  if (!validSourceId(input.sourceId)) {
    throw new Error("master_completion_source_id_invalid");
  }
  if (
    !/^\\d{4}-\\d{2}-\\d{2}$/.test(input.scopeDate) ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/.test(input.branch) ||
    !/^[a-f0-9]{7,64}$/.test(input.commitSha) ||
    input.approvedBy.trim().length < 1 ||
    input.approvedBy.trim().length > 160
  ) {
    throw new Error("master_completion_denominator_metadata_invalid");
  }

  if (
    !Array.isArray(input.requirementIds) ||
    input.requirementIds.length < 1 ||
    input.requirementIds.length > 500 ||
    new Set(input.requirementIds).size !== input.requirementIds.length
  ) {
    throw new Error("master_completion_denominator_requirements_invalid");
  }

  const moduleId =
    input.moduleId === undefined ||
    input.moduleId === null ||
    input.moduleId === ""
      ? null
      : input.moduleId;
  const scopeKey = masterCompletionScopeKey({
    sourceId: input.sourceId,
    moduleId
  });

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["master-completion-denominator:" + scopeKey]
    );

    const requirements: MasterCompletionRequirementRevision[] = [];
    for (const requirementId of [...input.requirementIds].sort()) {
      const requirement = await latestRequirement(client, requirementId);
      if (!requirement) {
        throw new Error("master_completion_requirement_not_found");
      }
      if (requirement.sourceId !== input.sourceId) {
        throw new Error("master_completion_denominator_source_mismatch");
      }
      if (
        moduleId !== null &&
        requirement.moduleId !== moduleId
      ) {
        throw new Error("master_completion_denominator_module_mismatch");
      }
      if (requirement.applicability !== "required") {
        throw new Error(
          "master_completion_denominator_nonrequired_requirement"
        );
      }
      requirements.push(requirement);
    }

    const items: MasterCompletionDenominatorItem[] =
      requirements.map((requirement) => ({
        requirementId: requirement.requirementId,
        revisionNumber: requirement.revisionNumber,
        weight: requirement.weight
      }));
    const denominatorHash = masterCompletionDenominatorHash(items);

    const current = await client.query<{ scope_version: string }>(
      `select scope_version
       from app.master_completion_denominator_approvals
       where scope_key=$1
       order by scope_version desc
       limit 1`,
      [scopeKey]
    );
    const scopeVersion =
      Number(current.rows[0]?.scope_version ?? 0) + 1;

    const result = await client.query<DenominatorRow>(
      `insert into app.master_completion_denominator_approvals (
        approval_id,actor_user_id,scope_key,scope_version,source_id,module_id,
        scope_date,branch,commit_sha,denominator_hash,items,approved_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12
      )
      returning *`,
      [
        randomUUID(),
        userId,
        scopeKey,
        scopeVersion,
        input.sourceId,
        moduleId,
        input.scopeDate,
        input.branch,
        input.commitSha,
        denominatorHash,
        JSON.stringify(items),
        input.approvedBy
      ]
    );
    return rowToDenominator(result.rows[0]);
  });
}

export async function recordMasterCompletionEvidence(
  userId: string,
  input: {
    requirementId: string;
    axis: string;
    state: string;
    evidenceURI: string;
    reviewer: string;
    confidence: number;
    observedAt: string;
    expiresAt: string;
    branch: string;
    commitSha: string;
    notes?: string | null;
  }
) {
  if (!validAxis(input.axis)) {
    throw new Error("master_completion_axis_invalid");
  }
  if (!validEvidenceState(input.state)) {
    throw new Error("master_completion_evidence_state_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    const requirement = await latestRequirement(
      client,
      input.requirementId
    );
    if (!requirement) {
      throw new Error("master_completion_requirement_not_found");
    }
    if (requirement.applicability !== "required") {
      throw new Error("master_completion_evidence_nonrequired");
    }
    if (!requirement.requiredAxes.includes(input.axis)) {
      throw new Error("master_completion_axis_not_required");
    }

    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      [
        "master-completion-evidence:" +
          requirement.requirementId +
          ":" +
          requirement.revisionNumber +
          ":" +
          input.axis
      ]
    );

    const current = await client.query<{ record_version: string }>(
      `select record_version
       from app.master_completion_evidence
       where requirement_id=$1
         and requirement_revision=$2
         and axis=$3
       order by record_version desc
       limit 1`,
      [
        requirement.requirementId,
        requirement.revisionNumber,
        input.axis
      ]
    );
    const recordVersion =
      Number(current.rows[0]?.record_version ?? 0) + 1;

    const candidate = validateMasterCompletionEvidence({
      evidenceId: randomUUID(),
      requirementId: requirement.requirementId,
      requirementRevision: requirement.revisionNumber,
      axis: input.axis,
      recordVersion,
      state: input.state,
      evidenceURI: input.evidenceURI,
      reviewer: input.reviewer,
      confidence: input.confidence,
      observedAt: input.observedAt,
      expiresAt: input.expiresAt,
      branch: input.branch,
      commitSha: input.commitSha,
      notes:
        input.notes === undefined || input.notes === ""
          ? null
          : input.notes,
      recordedAt: new Date().toISOString()
    });

    const result = await client.query<EvidenceRow>(
      `insert into app.master_completion_evidence (
        evidence_id,actor_user_id,requirement_id,requirement_revision,
        axis,record_version,state,evidence_uri,reviewer,confidence,
        observed_at,expires_at,branch,commit_sha,notes
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      returning *`,
      [
        candidate.evidenceId,
        userId,
        candidate.requirementId,
        candidate.requirementRevision,
        candidate.axis,
        candidate.recordVersion,
        candidate.state,
        candidate.evidenceURI,
        candidate.reviewer,
        candidate.confidence,
        candidate.observedAt,
        candidate.expiresAt,
        candidate.branch,
        candidate.commitSha,
        candidate.notes
      ]
    );
    return rowToEvidence(result.rows[0]);
  });
}

export async function listMasterCompletionForUser(
  userId: string,
  now = new Date()
) {
  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);

    const [requirementRows, denominatorRows, evidenceRows] =
      await Promise.all([
        client.query<RequirementRow>(
          `select *
           from app.master_completion_requirement_revisions
           order by requirement_id,revision_number`
        ),
        client.query<DenominatorRow>(
          `select *
           from app.master_completion_denominator_approvals
           order by scope_key,scope_version`
        ),
        client.query<EvidenceRow>(
          `select *
           from app.master_completion_evidence
           order by requirement_id,requirement_revision,axis,record_version`
        )
      ]);

    const allRequirements =
      requirementRows.rows.map(rowToRequirement);
    const allDenominators =
      denominatorRows.rows.map(rowToDenominator);
    const allEvidence = evidenceRows.rows.map(rowToEvidence);

    const latestRequirements = new Map<
      string,
      MasterCompletionRequirementRevision
    >();
    for (const requirement of allRequirements) {
      const current = latestRequirements.get(
        requirement.requirementId
      );
      if (
        !current ||
        requirement.revisionNumber > current.revisionNumber
      ) {
        latestRequirements.set(
          requirement.requirementId,
          requirement
        );
      }
    }

    const latestDenominators = new Map<
      string,
      MasterCompletionDenominatorApproval
    >();
    for (const approval of allDenominators) {
      const current = latestDenominators.get(approval.scopeKey);
      if (!current || approval.scopeVersion > current.scopeVersion) {
        latestDenominators.set(approval.scopeKey, approval);
      }
    }

    const scores = [...latestDenominators.values()]
      .sort((a, b) => a.scopeKey.localeCompare(b.scopeKey))
      .map((approval) =>
        scoreMasterCompletionScope({
          approval,
          requirementRevisions: allRequirements,
          evidence: allEvidence,
          now
        })
      );

    const latest = [...latestRequirements.values()].sort(
      (a, b) =>
        a.sourceId.localeCompare(b.sourceId) ||
        (a.moduleId ?? "").localeCompare(b.moduleId ?? "") ||
        a.requirementKey.localeCompare(b.requirementKey)
    );

    return {
      schema: "ai-data-platform.master-completion.v1",
      build: 338,
      generatedAt: now.toISOString(),
      axes: [...MASTER_COMPLETION_AXES],
      requirements: latest,
      denominatorApprovals: [...latestDenominators.values()].sort(
        (a, b) => a.scopeKey.localeCompare(b.scopeKey)
      ),
      scores,
      summary: {
        requirements: latest.length,
        required: latest.filter(
          (item) => item.applicability === "required"
        ).length,
        notApplicable: latest.filter(
          (item) => item.applicability === "not-applicable"
        ).length,
        unscoped: latest.filter(
          (item) => item.applicability === "unscoped"
        ).length,
        approvedScopes: latestDenominators.size,
        scopesWithCalculableCompletion: scores.filter(
          (item) => item.completion.percent !== null
        ).length,
        scopesBlockedByUnknownOrStale: scores.filter(
          (item) => item.completion.percent === null
        ).length
      },
      policy: {
        stableRequirementIds: true,
        appendOnlyRequirementRevisions: true,
        explicitApprovedDenominators: true,
        denominatorPinsRequirementRevisions: true,
        sevenIndependentEvidenceAxes: true,
        implementationDoesNotImplyOtherAxes: true,
        missingEvidenceIsUnknownNotZero: true,
        staleEvidenceIsStaleNotZero: true,
        nonApplicableAndUnscopedExcludedFromApprovedDenominator: true,
        percentageIncludesNumeratorDenominatorScopeRevisionEvidenceReviewerConfidence:
          true,
        protectedReleaseDoesNotEqualProductionAcceptance: true,
        sourceMutationPerformed: false
      }
    };
  });
}
