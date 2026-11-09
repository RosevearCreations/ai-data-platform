import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import type { MasterShellSourceId } from "./master-shell-contract-v1";
import {
  buildMasterShellSourceRegistryView,
  masterShellSourceRegistrySummary,
  validateMasterShellSourceEvidence,
  validateMasterShellSourceTransition,
  type MasterShellEvidenceAuthority,
  type MasterShellSourceEvidence,
  type MasterShellSourceState
} from "./master-shell-source-registry-core";

type RegistryRow = {
  evidence_id: string;
  actor_user_id: string;
  source_id: MasterShellSourceId;
  record_version: string;
  environment: "nonproduction" | "production";
  declared_status: Exclude<MasterShellSourceState, "UNKNOWN">;
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
  evidence_authority: MasterShellEvidenceAuthority;
  metadata: Record<string, unknown>;
  recorded_at: Date;
};

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function rowToEvidence(row: RegistryRow): MasterShellSourceEvidence {
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
    rolesAllowed: stringArray(row.roles_allowed),
    holdReason: row.hold_reason,
    testEvidenceURI: row.test_evidence_uri,
    connectionEvidenceURI: row.connection_evidence_uri,
    ownerAuthorized: row.owner_authorized,
    independentTestVerified: row.independent_test_verified,
    independentConnectionVerified: row.independent_connection_verified,
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
    throw new Error("master_shell_registry_suite_admin_required");
  }
}

async function latestEvidenceForSource(
  client: PoolClient,
  sourceId: MasterShellSourceId
) {
  const result = await client.query<RegistryRow>(
    `select *
     from app.master_shell_source_registry_evidence
     where source_id=$1
     order by record_version desc
     limit 1`,
    [sourceId]
  );
  return result.rows[0] ? rowToEvidence(result.rows[0]) : null;
}

export async function listMasterShellSourceRegistryForUser(
  userId: string,
  now = new Date()
) {
  const rows = await withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    return client.query<RegistryRow>(
      `select distinct on (source_id) *
       from app.master_shell_source_registry_evidence
       order by source_id,record_version desc`
    );
  });

  const latest = new Map<MasterShellSourceId, MasterShellSourceEvidence>();
  for (const row of rows.rows) {
    latest.set(row.source_id, rowToEvidence(row));
  }

  const sources = buildMasterShellSourceRegistryView(latest, now);
  return {
    schema: "ai-data-platform.master-shell-source-registry.v1",
    build: 336,
    generatedAt: now.toISOString(),
    sources,
    summary: masterShellSourceRegistrySummary(sources),
    stateModel: [
      "UNKNOWN",
      "DISCOVERED",
      "CONFIGURED",
      "AUTHORIZATION_HELD",
      "TEST_VERIFIED",
      "CONNECTED",
      "STALE",
      "DEGRADED",
      "DISCONNECTED",
      "REVOKED",
      "ERROR"
    ],
    policy: {
      exactSixSources: true,
      appendOnlyEvidence: true,
      automaticConnectionInference: false,
      expiredPositiveEvidenceBecomesStale: true,
      unknownIsDerivedFromMissingEvidence: true,
      operatorCanCreateTestVerified: false,
      operatorCanCreateConnected: false,
      independentSourceIngestionRequiredForTestAndConnected: true,
      childTenantCanBecomeSource: false,
      commsHubIsSeventhSource: false
    }
  };
}

export async function recordMasterShellSourceRegistryEvidence(
  userId: string,
  input: Omit<MasterShellSourceEvidence, "recordVersion">,
  options?: {
    evidenceAuthority?: MasterShellEvidenceAuthority;
    now?: Date;
  }
) {
  const authority =
    options?.evidenceAuthority ?? input.evidenceAuthority;
  const now = options?.now ?? new Date();

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["master-shell-registry:" + input.sourceId]
    );

    const latest = await latestEvidenceForSource(client, input.sourceId);
    const currentView = buildMasterShellSourceRegistryView(
      latest ? new Map([[input.sourceId, latest]]) : new Map(),
      now
    ).find((item) => item.sourceId === input.sourceId);

    const currentState = currentView?.effectiveStatus ?? "UNKNOWN";
    validateMasterShellSourceTransition(currentState, input.declaredStatus);

    const nextVersion = (latest?.recordVersion ?? 0) + 1;
    const evidence = validateMasterShellSourceEvidence({
      ...input,
      evidenceAuthority: authority,
      recordVersion: nextVersion
    });

    const result = await client.query<RegistryRow>(
      `insert into app.master_shell_source_registry_evidence (
        evidence_id,actor_user_id,source_id,record_version,environment,
        declared_status,status_observed_at,status_expires_at,evidence_uri,
        manifest_uri,immutable_revision,capability_version,approved_origin,
        signer_key_id,signer_fingerprint,roles_allowed,hold_reason,
        test_evidence_uri,connection_evidence_uri,owner_authorized,
        independent_test_verified,independent_connection_verified,
        evidence_authority,metadata
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,
        $17,$18,$19,$20,$21,$22,$23,$24::jsonb
      )
      returning *`,
      [
        randomUUID(),
        userId,
        evidence.sourceId,
        evidence.recordVersion,
        evidence.environment,
        evidence.declaredStatus,
        evidence.statusObservedAt,
        evidence.statusExpiresAt,
        evidence.evidenceURI,
        evidence.manifestURI,
        evidence.immutableRevision,
        evidence.capabilityVersion,
        evidence.approvedOrigin,
        evidence.signerKeyId,
        evidence.signerFingerprint,
        JSON.stringify(evidence.rolesAllowed),
        evidence.holdReason,
        evidence.testEvidenceURI,
        evidence.connectionEvidenceURI,
        evidence.ownerAuthorized,
        evidence.independentTestVerified,
        evidence.independentConnectionVerified,
        evidence.evidenceAuthority,
        JSON.stringify({
          build: 336,
          previousEffectiveStatus: currentState,
          sourceIngestion: evidence.evidenceAuthority ===
            "independent-source-verification"
        })
      ]
    );

    return rowToEvidence(result.rows[0]);
  });
}

export async function recordOperatorMasterShellSourceEvidence(
  userId: string,
  input: Omit<
    MasterShellSourceEvidence,
    "recordVersion" | "evidenceAuthority"
  >
) {
  if (
    input.declaredStatus === "TEST_VERIFIED" ||
    input.declaredStatus === "CONNECTED"
  ) {
    throw new Error(
      "master_shell_registry_independent_source_ingestion_required"
    );
  }

  return recordMasterShellSourceRegistryEvidence(
    userId,
    {
      ...input,
      evidenceAuthority: "operator-recorded"
    },
    { evidenceAuthority: "operator-recorded" }
  );
}
