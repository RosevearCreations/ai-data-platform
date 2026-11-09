import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  buildMasterApplicationInventoryReadModel,
  normalizeHostApplicationId,
  type InstalledAiDataModuleEvidence,
  type SourceModuleReadinessEvidence,
  type SourceReleaseEvidence,
  type SourceRegistryInventoryEvidence
} from "./master-application-inventory-core";
import {
  listMasterCompletionForUser
} from "./master-completion-database";
import type { MasterShellSourceId } from "./master-shell-contract-v1";
import {
  buildMasterShellSourceRegistryView,
  validateMasterShellSourceEvidence,
  type MasterShellSourceEvidence
} from "./master-shell-source-registry-core";

type RegistryRow = {
  source_id: MasterShellSourceId;
  record_version: string;
  environment: "nonproduction" | "production";
  declared_status: Exclude<
    MasterShellSourceEvidence["declaredStatus"],
    "UNKNOWN"
  >;
  status_observed_at: Date;
  status_expires_at: Date;
  evidence_uri: string;
  manifest_uri: string | null;
  immutable_revision: string | null;
  capability_version: string | null;
  approved_origin: string | null;
  signer_key_id: string | null;
  signer_fingerprint: string | null;
  roles_allowed: unknown;
  hold_reason: string | null;
  test_evidence_uri: string | null;
  connection_evidence_uri: string | null;
  owner_authorized: boolean;
  independent_test_verified: boolean;
  independent_connection_verified: boolean;
  evidence_authority:
    | "operator-recorded"
    | "independent-source-verification";
};

type UpdateRow = {
  source_id: MasterShellSourceId;
  source_revision: string;
  source_sequence: string;
  verification_state: string;
  normalized_payload: Record<string, unknown>;
  expires_at: Date;
  occurred_at: Date;
  published_at: Date;
};

type HostInstanceRow = {
  module_host_instance_id: string;
  workspace_id: string;
  host_application_id: string;
  host_instance_id: string;
  environment: string;
  current_version: string;
  last_known_good_version: string;
  lifecycle_state: string;
  installation_evidence: string;
  observed_at: Date;
  updated_at: Date;
};

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function registryEvidence(row: RegistryRow): MasterShellSourceEvidence {
  return validateMasterShellSourceEvidence({
    sourceId: row.source_id,
    recordVersion: Number(row.record_version),
    environment: row.environment,
    declaredStatus: row.declared_status,
    statusObservedAt: row.status_observed_at.toISOString(),
    statusExpiresAt: row.status_expires_at.toISOString(),
    evidenceURI: row.evidence_uri,
    manifestURI: row.manifest_uri,
    immutableRevision: row.immutable_revision,
    capabilityVersion: row.capability_version,
    approvedOrigin: row.approved_origin,
    signerKeyId: row.signer_key_id,
    signerFingerprint: row.signer_fingerprint,
    rolesAllowed: strings(row.roles_allowed),
    holdReason: row.hold_reason,
    testEvidenceURI: row.test_evidence_uri,
    connectionEvidenceURI: row.connection_evidence_uri,
    ownerAuthorized: row.owner_authorized,
    independentTestVerified: row.independent_test_verified,
    independentConnectionVerified:
      row.independent_connection_verified,
    evidenceAuthority: row.evidence_authority
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
    throw new Error("master_inventory_suite_admin_required");
  }
}

function moduleReadiness(row: UpdateRow): SourceModuleReadinessEvidence {
  const payload = row.normalized_payload;
  const readinessState = String(payload.readinessState ?? "");
  if (
    readinessState !== "UNKNOWN" &&
    readinessState !== "IN_PROGRESS" &&
    readinessState !== "BLOCKED" &&
    readinessState !== "READY" &&
    readinessState !== "ACCEPTED"
  ) {
    throw new Error("master_inventory_module_readiness_invalid");
  }

  const completionPercent =
    payload.completionPercent === null
      ? null
      : Number(payload.completionPercent);
  if (
    completionPercent !== null &&
    (!Number.isFinite(completionPercent) ||
      completionPercent < 0 ||
      completionPercent > 100)
  ) {
    throw new Error("master_inventory_module_completion_invalid");
  }

  return {
    sourceId: row.source_id,
    moduleId: String(payload.moduleId ?? ""),
    readinessState,
    completionPercent,
    evidenceURI: String(payload.evidenceURI ?? ""),
    expiresAt: row.expires_at.toISOString(),
    occurredAt: row.occurred_at.toISOString(),
    publishedAt: row.published_at.toISOString(),
    sourceRevision: row.source_revision,
    sourceSequence: Number(row.source_sequence),
    verificationState: row.verification_state
  };
}

function releaseEvidence(row: UpdateRow): SourceReleaseEvidence {
  const payload = row.normalized_payload;
  const deploymentStatus = String(payload.deploymentStatus ?? "");
  if (
    deploymentStatus !== "GREEN" &&
    deploymentStatus !== "RED" &&
    deploymentStatus !== "HOLD" &&
    deploymentStatus !== "UNKNOWN"
  ) {
    throw new Error("master_inventory_release_status_invalid");
  }
  return {
    sourceId: row.source_id,
    releaseId: String(payload.releaseId ?? ""),
    branch: String(payload.branch ?? ""),
    deploymentStatus,
    evidenceURI: String(payload.evidenceURI ?? ""),
    expiresAt: row.expires_at.toISOString(),
    occurredAt: row.occurred_at.toISOString(),
    sourceRevision: row.source_revision,
    sourceSequence: Number(row.source_sequence)
  };
}

export async function listMasterApplicationInventoryForUser(
  userId: string,
  now = new Date()
) {
  const raw = await withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);

    const [registryRows, moduleRows, releaseRows, hostRows] =
      await Promise.all([
        client.query<RegistryRow>(
          `select distinct on (source_id)
             source_id,record_version,environment,declared_status,
             status_observed_at,status_expires_at,evidence_uri,
             manifest_uri,immutable_revision,capability_version,
             approved_origin,signer_key_id,signer_fingerprint,
             roles_allowed,hold_reason,test_evidence_uri,
             connection_evidence_uri,owner_authorized,
             independent_test_verified,independent_connection_verified,
             evidence_authority
           from app.master_shell_source_registry_evidence
           order by source_id,record_version desc`
        ),
        client.query<UpdateRow>(
          `select distinct on (
             source_id,normalized_payload->>'moduleId'
           )
             source_id,source_revision,source_sequence,
             verification_state,normalized_payload,expires_at,
             occurred_at,published_at
           from app.master_shell_source_updates
           where event_type='module.readiness.changed'
           order by
             source_id,
             normalized_payload->>'moduleId',
             source_sequence desc,
             ingested_at desc`
        ),
        client.query<UpdateRow>(
          `select distinct on (source_id)
             source_id,source_revision,source_sequence,
             verification_state,normalized_payload,expires_at,
             occurred_at,published_at
           from app.master_shell_source_updates
           where event_type='release.promoted'
           order by source_id,source_sequence desc,ingested_at desc`
        ),
        client.query<HostInstanceRow>(
          `select
             module_host_instance_id::text,
             workspace_id::text,
             host_application_id,
             host_instance_id,
             environment,
             current_version,
             last_known_good_version,
             lifecycle_state,
             installation_evidence,
             observed_at,
             updated_at
           from app.module_host_instances
           order by updated_at desc
           limit 500`
        )
      ]);

    const evidenceMap = new Map<
      MasterShellSourceId,
      MasterShellSourceEvidence
    >();
    for (const row of registryRows.rows) {
      evidenceMap.set(row.source_id, registryEvidence(row));
    }

    const views = buildMasterShellSourceRegistryView(
      evidenceMap,
      now
    );
    const viewMap = new Map(
      views.map((view) => [view.sourceId, view])
    );

    const registry: SourceRegistryInventoryEvidence[] =
      registryRows.rows.map((row) => {
        const evidence = registryEvidence(row);
        const view = viewMap.get(row.source_id);
        return {
          sourceId: row.source_id,
          environment: row.environment,
          declaredStatus: evidence.declaredStatus,
          effectiveStatus:
            view?.effectiveStatus ?? evidence.declaredStatus,
          freshness: view?.freshness ?? "UNMEASURED",
          statusObservedAt: evidence.statusObservedAt,
          statusExpiresAt: evidence.statusExpiresAt,
          evidenceURI: evidence.evidenceURI,
          manifestURI: evidence.manifestURI,
          immutableRevision: evidence.immutableRevision,
          capabilityVersion: evidence.capabilityVersion,
          approvedOrigin: evidence.approvedOrigin,
          rolesAllowed: evidence.rolesAllowed,
          evidenceAuthority: evidence.evidenceAuthority
        };
      });

    const installedAiDataModules: InstalledAiDataModuleEvidence[] =
      [];
    let unmappedHostInstances = 0;
    for (const row of hostRows.rows) {
      const sourceId = normalizeHostApplicationId(
        row.host_application_id
      );
      if (!sourceId) {
        unmappedHostInstances += 1;
        continue;
      }
      installedAiDataModules.push({
        sourceId,
        moduleHostInstanceId: row.module_host_instance_id,
        workspaceId: row.workspace_id,
        hostApplicationId: row.host_application_id,
        hostInstanceId: row.host_instance_id,
        environment: row.environment,
        currentVersion: row.current_version,
        lastKnownGoodVersion: row.last_known_good_version,
        lifecycleState: row.lifecycle_state,
        installationEvidence: row.installation_evidence,
        observedAt: row.observed_at.toISOString(),
        updatedAt: row.updated_at.toISOString()
      });
    }

    return {
      registry,
      moduleReadiness: moduleRows.rows.map(moduleReadiness),
      releases: releaseRows.rows.map(releaseEvidence),
      installedAiDataModules,
      unmappedHostInstances
    };
  });

  const completion = await listMasterCompletionForUser(
    userId,
    now
  );

  return buildMasterApplicationInventoryReadModel({
    ...raw,
    requirements: completion.requirements.map((item) => ({
      requirementId: item.requirementId,
      sourceId: item.sourceId,
      moduleId: item.moduleId,
      title: item.title,
      applicability: item.applicability
    })),
    completionScopes: completion.scores.map((score) => ({
      sourceId: score.sourceId,
      moduleId: score.moduleId,
      scopeKey: score.scopeKey,
      scopeVersion: score.scopeVersion,
      scopeDate: score.scopeDate,
      branch: score.branch,
      commitSha: score.commitSha,
      denominatorHash: score.denominatorHash,
      completion: {
        percent: score.completion.percent,
        numerator: score.completion.numerator,
        denominator: score.completion.denominator,
        blockedByUnknown: score.completion.blockedByUnknown,
        blockedByStale: score.completion.blockedByStale
      },
      evidenceCoverage: {
        percent: score.evidenceCoverage.percent,
        numerator: score.evidenceCoverage.numerator,
        denominator: score.evidenceCoverage.denominator,
        blockedByUnknown:
          score.evidenceCoverage.blockedByUnknown,
        blockedByStale: score.evidenceCoverage.blockedByStale
      },
      counts: {
        satisfied: score.counts.satisfied,
        partial: score.counts.partial,
        failed: score.counts.failed,
        unknown: score.counts.unknown,
        stale: score.counts.stale,
        criticalFailed: score.counts.criticalFailed
      }
    })),
    now
  });
}
