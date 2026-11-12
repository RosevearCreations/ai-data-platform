import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withProtectedDatabase, withUserDatabase } from "./database";
import {
  validateMasterShellSourceEvidence,
  validateMasterShellSourceTransition,
  type MasterShellSourceEvidence
} from "./master-shell-source-registry-core";
import {
  loadBuild380ExternalRuntimeActivationFromClient
} from "./yw562-external-runtime-activation-closure-database";
import {
  BUILD_381_CONTROLLER_BASE_REVISION,
  BUILD_381_RUNTIME,
  composeBuild381ReceiverHealthContinuity,
  type Build381MasterRenewalReceipt,
  type Build381RenewalEnvelope,
  type Build381RenewalEvent,
  type Build381RollbackEnvelope,
  type Build381RollbackEvent
} from "./yw562-receiver-health-continuity";

type RegistryRow = {
  evidence_id: string;
  source_id: "yw";
  record_version: string;
  environment: "nonproduction" | "production";
  declared_status: MasterShellSourceEvidence["declaredStatus"];
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
  evidence_authority: MasterShellSourceEvidence["evidenceAuthority"];
  metadata: Record<string, unknown>;
  recorded_at: Date;
};

type RenewalRow = {
  renewal_event_id: string;
  authority_key_id: string;
  authority_key_spki_sha256: string;
  envelope_sha256: string;
  signature_sha256: string;
  nonce: string;
  controller_revision: string;
  source_revision: string;
  ai_hub_main: string;
  comms_main: string;
  original_host_id: string;
  build380_ceremony_event_id: string;
  build380_transition_event_id: string;
  build380_closure_event_id: string;
  registry_evidence_id: string;
  renewed_registry_evidence_id: string;
  receiver_instance_id: string;
  receiver_boot_id: string;
  receiver_health_sequence: string;
  receiver_state: "ON";
  receiver_observed_at: Date;
  receiver_health_uri: string;
  receiver_health_digest: string;
  ai_hub_runtime_receipt_id: string;
  ai_hub_runtime_digest: string;
  ai_hub_signer_key_id: string;
  ai_hub_signature_sha256: string;
  comms_runtime_receipt_id: string;
  comms_runtime_digest: string;
  comms_signer_key_id: string;
  comms_signature_sha256: string;
  controller_runtime_receipt_id: string;
  controller_runtime_digest: string;
  controller_signer_key_id: string;
  controller_signature_sha256: string;
  renewal_digest: string;
  evidence_uri: string;
  renewal_state: "RENEWED_VERIFIED";
  observed_at: Date;
  valid_until: Date;
  recorded_at: Date;
};

type RollbackRow = {
  rollback_event_id: string;
  renewal_event_id: string | null;
  prior_registry_evidence_id: string;
  rollback_registry_evidence_id: string;
  authority_key_id: string;
  authority_key_spki_sha256: string;
  envelope_sha256: string;
  signature_sha256: string;
  nonce: string;
  controller_revision: string;
  source_revision: string;
  ai_hub_main: string;
  comms_main: string;
  original_host_id: string;
  receiver_instance_id: string;
  receiver_boot_id: string;
  receiver_state: "OFF";
  reason: Build381RollbackEnvelope["reason"];
  receiver_off_observed_at: Date;
  receiver_off_proof_uri: string;
  receiver_off_digest: string;
  receiver_off_signer_key_id: string;
  receiver_off_signature_sha256: string;
  evidence_uri: string;
  rollback_state: "ROLLED_BACK_VERIFIED";
  observed_at: Date;
  recorded_at: Date;
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function registryEvidence(row: RegistryRow) {
  const evidence = validateMasterShellSourceEvidence({
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
  return { ...evidence, evidenceId: row.evidence_id };
}

function renewal(row: RenewalRow): Build381RenewalEvent {
  return {
    renewalEventId: row.renewal_event_id,
    authorityKeyId: row.authority_key_id,
    authorityKeySpkiSha256: row.authority_key_spki_sha256,
    envelopeSha256: row.envelope_sha256,
    signatureSha256: row.signature_sha256,
    nonce: row.nonce,
    controllerRevision: row.controller_revision,
    sourceRevision: row.source_revision,
    aiHubMain: row.ai_hub_main,
    commsMain: row.comms_main,
    originalHostId: row.original_host_id,
    build380CeremonyEventId: row.build380_ceremony_event_id,
    build380TransitionEventId: row.build380_transition_event_id,
    build380ClosureEventId: row.build380_closure_event_id,
    registryEvidenceId: row.registry_evidence_id,
    renewedRegistryEvidenceId: row.renewed_registry_evidence_id,
    receiverInstanceId: row.receiver_instance_id,
    receiverBootId: row.receiver_boot_id,
    receiverHealthSequence: Number(row.receiver_health_sequence),
    receiverState: row.receiver_state,
    receiverObservedAt: row.receiver_observed_at.toISOString(),
    receiverHealthURI: row.receiver_health_uri,
    receiverHealthDigest: row.receiver_health_digest,
    aiHubRuntimeReceiptId: row.ai_hub_runtime_receipt_id,
    aiHubRuntimeDigest: row.ai_hub_runtime_digest,
    aiHubSignerKeyId: row.ai_hub_signer_key_id,
    aiHubSignatureSha256: row.ai_hub_signature_sha256,
    commsRuntimeReceiptId: row.comms_runtime_receipt_id,
    commsRuntimeDigest: row.comms_runtime_digest,
    commsSignerKeyId: row.comms_signer_key_id,
    commsSignatureSha256: row.comms_signature_sha256,
    controllerRuntimeReceiptId: row.controller_runtime_receipt_id,
    controllerRuntimeDigest: row.controller_runtime_digest,
    controllerSignerKeyId: row.controller_signer_key_id,
    controllerSignatureSha256: row.controller_signature_sha256,
    renewalDigest: row.renewal_digest,
    evidenceURI: row.evidence_uri,
    renewalState: row.renewal_state,
    observedAt: row.observed_at.toISOString(),
    validUntil: row.valid_until.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function rollback(row: RollbackRow): Build381RollbackEvent {
  return {
    rollbackEventId: row.rollback_event_id,
    renewalEventId: row.renewal_event_id,
    priorRegistryEvidenceId: row.prior_registry_evidence_id,
    rollbackRegistryEvidenceId: row.rollback_registry_evidence_id,
    authorityKeyId: row.authority_key_id,
    authorityKeySpkiSha256: row.authority_key_spki_sha256,
    envelopeSha256: row.envelope_sha256,
    signatureSha256: row.signature_sha256,
    nonce: row.nonce,
    controllerRevision: row.controller_revision,
    sourceRevision: row.source_revision,
    aiHubMain: row.ai_hub_main,
    commsMain: row.comms_main,
    originalHostId: row.original_host_id,
    receiverInstanceId: row.receiver_instance_id,
    receiverBootId: row.receiver_boot_id,
    receiverState: row.receiver_state,
    reason: row.reason,
    receiverOffObservedAt: row.receiver_off_observed_at.toISOString(),
    receiverOffProofURI: row.receiver_off_proof_uri,
    receiverOffDigest: row.receiver_off_digest,
    receiverOffSignerKeyId: row.receiver_off_signer_key_id,
    receiverOffSignatureSha256: row.receiver_off_signature_sha256,
    evidenceURI: row.evidence_uri,
    rollbackState: row.rollback_state,
    observedAt: row.observed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) {
    throw new Error("build381_suite_admin_required");
  }
}

async function latestYwRegistryEvidence(client: PoolClient) {
  const result = await client.query<RegistryRow>(`
    select *
    from app.master_shell_source_registry_evidence
    where source_id='yw'
    order by record_version desc
    limit 1
  `);
  return result.rows[0] ? registryEvidence(result.rows[0]) : null;
}

async function renewalEvents(client: PoolClient) {
  const result = await client.query<RenewalRow>(`
    select *
    from app.master_build381_receiver_health_renewal_events
    order by recorded_at desc
    limit 100
  `);
  return result.rows.map(renewal);
}

async function rollbackEvents(client: PoolClient) {
  const result = await client.query<RollbackRow>(`
    select *
    from app.master_build381_fail_closed_rollback_events
    order by recorded_at desc
    limit 100
  `);
  return result.rows.map(rollback);
}

export async function loadBuild381ReceiverHealthContinuityFromClient(
  client: PoolClient
) {
  const [build380, renewals, rollbacks] = await Promise.all([
    loadBuild380ExternalRuntimeActivationFromClient(client),
    renewalEvents(client),
    rollbackEvents(client)
  ]);
  return composeBuild381ReceiverHealthContinuity({
    build380,
    renewalEvents: renewals,
    rollbackEvents: rollbacks
  });
}

export async function listBuild381ReceiverHealthContinuityForUser(
  userId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    return {
      model: await loadBuild381ReceiverHealthContinuityFromClient(client),
      renewalHistory: await renewalEvents(client),
      rollbackHistory: await rollbackEvents(client)
    };
  });
}

function exactMasterReceipt(
  receipts: Build381MasterRenewalReceipt[],
  masterId: Build381MasterRenewalReceipt["masterId"]
) {
  const receipt = receipts.find((item) => item.masterId === masterId);
  if (!receipt) throw new Error("build381_master_renewal_receipt_missing");
  return receipt;
}

async function ownerActorFromBuild380(client: PoolClient) {
  const build380 = await loadBuild380ExternalRuntimeActivationFromClient(client);
  const decisionId = build380.build379.latestActivationDecision?.decisionEventId;
  if (!decisionId) throw new Error("build381_owner_actor_not_available");
  const result = await client.query<{ actor_user_id: string }>(`
    select actor_user_id
    from app.master_build379_supervised_activation_decision_events
    where decision_event_id=$1
    limit 1
  `, [decisionId]);
  const actor = result.rows[0]?.actor_user_id;
  if (!actor) throw new Error("build381_owner_actor_not_available");
  return actor;
}

export async function admitBuild381RuntimeRenewal(input: {
  envelope: Build381RenewalEnvelope;
  authorityKeySpkiSha256: string;
  envelopeSha256: string;
  signatureSha256: string;
}) {
  return withProtectedDatabase(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build381-receiver-health-continuity"
    ]);

    const build380 = await loadBuild380ExternalRuntimeActivationFromClient(client);
    const prior = await latestYwRegistryEvidence(client);
    const ceremony = build380.latestCeremony;
    const transition = build380.latestConnectedTransition;
    const closure = build380.latestThreeMasterClosure;

    if (!ceremony || !transition || !closure || !prior) {
      throw new Error("build381_build380_connected_baseline_missing");
    }
    if (
      transition.transitionState !== "CONNECTED_VERIFIED" ||
      transition.connectionState !== "CONNECTED" ||
      closure.closureState !== "CLOSED_VERIFIED" ||
      closure.mastersSynced !== true
    ) {
      throw new Error("build381_build380_connected_baseline_invalid");
    }
    if (
      prior.declaredStatus !== "CONNECTED" ||
      prior.environment !== "production" ||
      prior.immutableRevision !== BUILD_381_RUNTIME.yw.main ||
      prior.evidenceAuthority !== "independent-source-verification" ||
      prior.independentConnectionVerified !== true ||
      Date.parse(prior.statusExpiresAt) <= Date.now()
    ) {
      throw new Error("build381_current_registry_not_connected");
    }

    if (
      input.envelope.controllerRevision !== BUILD_381_CONTROLLER_BASE_REVISION ||
      input.envelope.sourceRevision !== BUILD_381_RUNTIME.yw.main ||
      input.envelope.aiHubMain !== BUILD_381_RUNTIME.aiHub.main ||
      input.envelope.commsMain !== BUILD_381_RUNTIME.comms.main ||
      input.envelope.originalHostId !== BUILD_381_RUNTIME.aiHub.originalHost
    ) {
      throw new Error("build381_runtime_revision_binding_mismatch");
    }
    if (
      input.envelope.build380CeremonyEventId !== ceremony.ceremonyEventId ||
      input.envelope.build380TransitionEventId !== transition.transitionEventId ||
      input.envelope.build380ClosureEventId !== closure.closureEventId ||
      input.envelope.registryEvidenceId !== prior.evidenceId
    ) {
      throw new Error("build381_build380_exact_binding_mismatch");
    }

    const sequence = await client.query<{ max_sequence: string | null }>(`
      select max(receiver_health_sequence)::text as max_sequence
      from app.master_build381_receiver_health_renewal_events
      where receiver_instance_id=$1 and receiver_boot_id=$2
    `, [input.envelope.receiverInstanceId, input.envelope.receiverBootId]);
    const maxSequence = Number(sequence.rows[0]?.max_sequence ?? 0);
    if (
      !Number.isSafeInteger(input.envelope.receiverHealthSequence) ||
      input.envelope.receiverHealthSequence <= maxSequence
    ) {
      throw new Error("build381_receiver_health_sequence_replay");
    }

    const observedAt = new Date(input.envelope.observedAt);
    const validUntil = new Date(observedAt.getTime() + 5 * 60_000);
    const actorUserId = await ownerActorFromBuild380(client);
    const renewalEventId = randomUUID();
    const renewedRegistryEvidenceId = randomUUID();
    const aiHub = exactMasterReceipt(
      input.envelope.masterReceipts,
      "rosevear-ai-hub"
    );
    const comms = exactMasterReceipt(
      input.envelope.masterReceipts,
      "rosevear-comms-hub"
    );
    const controller = exactMasterReceipt(
      input.envelope.masterReceipts,
      "ai-data-platform"
    );

    const nextRegistry = validateMasterShellSourceEvidence({
      sourceId: "yw",
      recordVersion: prior.recordVersion + 1,
      environment: "production",
      declaredStatus: "CONNECTED",
      statusObservedAt: observedAt.toISOString(),
      statusExpiresAt: validUntil.toISOString(),
      evidenceURI: input.envelope.evidenceURI,
      manifestURI: prior.manifestURI,
      immutableRevision: BUILD_381_RUNTIME.yw.main,
      capabilityVersion: prior.capabilityVersion,
      approvedOrigin: prior.approvedOrigin,
      signerKeyId: prior.signerKeyId,
      signerFingerprint: prior.signerFingerprint,
      rolesAllowed: prior.rolesAllowed,
      holdReason: null,
      testEvidenceURI: prior.testEvidenceURI,
      connectionEvidenceURI: input.envelope.receiverHealthURI,
      ownerAuthorized: true,
      independentTestVerified: true,
      independentConnectionVerified: true,
      evidenceAuthority: "independent-source-verification"
    });
    validateMasterShellSourceTransition(prior.declaredStatus, "CONNECTED");

    await client.query(`insert into app.master_shell_source_registry_evidence(
      evidence_id,actor_user_id,source_id,record_version,environment,
      declared_status,status_observed_at,status_expires_at,evidence_uri,
      manifest_uri,immutable_revision,capability_version,approved_origin,
      signer_key_id,signer_fingerprint,roles_allowed,hold_reason,
      test_evidence_uri,connection_evidence_uri,owner_authorized,
      independent_test_verified,independent_connection_verified,
      evidence_authority,metadata
    ) values(
      $1,$2,$3,$4,$5,$6,$7::timestamptz,$8::timestamptz,$9,$10,$11,$12,$13,
      $14,$15,$16::jsonb,$17,$18,$19,$20,$21,$22,$23,$24::jsonb
    )`,[
      renewedRegistryEvidenceId,
      actorUserId,
      nextRegistry.sourceId,
      nextRegistry.recordVersion,
      nextRegistry.environment,
      nextRegistry.declaredStatus,
      nextRegistry.statusObservedAt,
      nextRegistry.statusExpiresAt,
      nextRegistry.evidenceURI,
      nextRegistry.manifestURI,
      nextRegistry.immutableRevision,
      nextRegistry.capabilityVersion,
      nextRegistry.approvedOrigin,
      nextRegistry.signerKeyId,
      nextRegistry.signerFingerprint,
      JSON.stringify(nextRegistry.rolesAllowed),
      nextRegistry.holdReason,
      nextRegistry.testEvidenceURI,
      nextRegistry.connectionEvidenceURI,
      nextRegistry.ownerAuthorized,
      nextRegistry.independentTestVerified,
      nextRegistry.independentConnectionVerified,
      nextRegistry.evidenceAuthority,
      JSON.stringify({
        build: 381,
        event: "runtime-renewal",
        renewalEventId,
        priorRegistryEvidenceId: prior.evidenceId
      })
    ]);

    await client.query(`insert into app.master_build381_receiver_health_renewal_events(
      renewal_event_id,authority_key_id,authority_key_spki_sha256,
      envelope_sha256,signature_sha256,nonce,controller_revision,
      source_revision,ai_hub_main,comms_main,original_host_id,
      build380_ceremony_event_id,build380_transition_event_id,
      build380_closure_event_id,registry_evidence_id,
      renewed_registry_evidence_id,receiver_instance_id,receiver_boot_id,
      receiver_health_sequence,receiver_state,receiver_observed_at,
      receiver_health_uri,receiver_health_digest,
      ai_hub_runtime_receipt_id,ai_hub_runtime_digest,
      ai_hub_signer_key_id,ai_hub_signature_sha256,
      comms_runtime_receipt_id,comms_runtime_digest,
      comms_signer_key_id,comms_signature_sha256,
      controller_runtime_receipt_id,controller_runtime_digest,
      controller_signer_key_id,controller_signature_sha256,
      renewal_digest,evidence_uri,renewal_state,observed_at,valid_until
    ) values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
      $19,'ON',$20::timestamptz,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
      $31,$32,$33,$34,$35,$36,$37,'RENEWED_VERIFIED',$38::timestamptz,
      $39::timestamptz
    )`,[
      renewalEventId,
      input.envelope.authorityKeyId,
      input.authorityKeySpkiSha256,
      input.envelopeSha256,
      input.signatureSha256,
      input.envelope.nonce,
      input.envelope.controllerRevision,
      input.envelope.sourceRevision,
      input.envelope.aiHubMain,
      input.envelope.commsMain,
      input.envelope.originalHostId,
      input.envelope.build380CeremonyEventId,
      input.envelope.build380TransitionEventId,
      input.envelope.build380ClosureEventId,
      prior.evidenceId,
      renewedRegistryEvidenceId,
      input.envelope.receiverInstanceId,
      input.envelope.receiverBootId,
      input.envelope.receiverHealthSequence,
      input.envelope.receiverObservedAt,
      input.envelope.receiverHealthURI,
      input.envelope.receiverHealthDigest,
      aiHub.receiptId,
      aiHub.digest,
      aiHub.signerKeyId,
      aiHub.signatureSha256,
      comms.receiptId,
      comms.digest,
      comms.signerKeyId,
      comms.signatureSha256,
      controller.receiptId,
      controller.digest,
      controller.signerKeyId,
      controller.signatureSha256,
      input.envelope.renewalDigest,
      input.envelope.evidenceURI,
      input.envelope.observedAt,
      validUntil.toISOString()
    ]);

    const model = await loadBuild381ReceiverHealthContinuityFromClient(client);
    if (
      model.receiverHealthContinuityState !== "HEALTHY_RENEWED_CURRENT" ||
      model.threeMasterConnectedRevalidationState !== "CONNECTED_REVALIDATED" ||
      model.connectionState !== "CONNECTED" ||
      model.mastersSynced !== true
    ) {
      throw new Error("build381_post_write_renewal_not_connected");
    }
    return { renewalEventId, renewedRegistryEvidenceId, model };
  });
}

export async function admitBuild381FailClosedRollback(input: {
  envelope: Build381RollbackEnvelope;
  authorityKeySpkiSha256: string;
  envelopeSha256: string;
  signatureSha256: string;
}) {
  return withProtectedDatabase(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build381-receiver-health-continuity"
    ]);

    const prior = await latestYwRegistryEvidence(client);
    const renewals = await renewalEvents(client);
    const latestRenewal = renewals[0] ?? null;
    if (!prior || prior.declaredStatus !== "CONNECTED") {
      throw new Error("build381_rollback_connected_registry_required");
    }
    if (
      input.envelope.controllerRevision !== BUILD_381_CONTROLLER_BASE_REVISION ||
      input.envelope.sourceRevision !== BUILD_381_RUNTIME.yw.main ||
      input.envelope.aiHubMain !== BUILD_381_RUNTIME.aiHub.main ||
      input.envelope.commsMain !== BUILD_381_RUNTIME.comms.main ||
      input.envelope.originalHostId !== BUILD_381_RUNTIME.aiHub.originalHost ||
      input.envelope.registryEvidenceId !== prior.evidenceId
    ) {
      throw new Error("build381_rollback_binding_mismatch");
    }
    if (
      input.envelope.renewalEventId !== null &&
      input.envelope.renewalEventId !== latestRenewal?.renewalEventId
    ) {
      throw new Error("build381_rollback_renewal_mismatch");
    }

    validateMasterShellSourceTransition(prior.declaredStatus, "DISCONNECTED");
    const actorUserId = await ownerActorFromBuild380(client);
    const rollbackEventId = randomUUID();
    const rollbackRegistryEvidenceId = randomUUID();
    const observedAt = new Date(input.envelope.observedAt);
    const expiresAt = new Date(observedAt.getTime() + 24 * 60 * 60_000);

    const disconnected = validateMasterShellSourceEvidence({
      sourceId: "yw",
      recordVersion: prior.recordVersion + 1,
      environment: "production",
      declaredStatus: "DISCONNECTED",
      statusObservedAt: observedAt.toISOString(),
      statusExpiresAt: expiresAt.toISOString(),
      evidenceURI: input.envelope.evidenceURI,
      manifestURI: prior.manifestURI,
      immutableRevision: BUILD_381_RUNTIME.yw.main,
      capabilityVersion: prior.capabilityVersion,
      approvedOrigin: prior.approvedOrigin,
      signerKeyId: prior.signerKeyId,
      signerFingerprint: prior.signerFingerprint,
      rolesAllowed: prior.rolesAllowed,
      holdReason: "build381_" + input.envelope.reason.toLowerCase(),
      testEvidenceURI: prior.testEvidenceURI,
      connectionEvidenceURI: input.envelope.receiverOffProofURI,
      ownerAuthorized: true,
      independentTestVerified: prior.independentTestVerified,
      independentConnectionVerified: false,
      evidenceAuthority: "independent-source-verification"
    });

    await client.query(`insert into app.master_shell_source_registry_evidence(
      evidence_id,actor_user_id,source_id,record_version,environment,
      declared_status,status_observed_at,status_expires_at,evidence_uri,
      manifest_uri,immutable_revision,capability_version,approved_origin,
      signer_key_id,signer_fingerprint,roles_allowed,hold_reason,
      test_evidence_uri,connection_evidence_uri,owner_authorized,
      independent_test_verified,independent_connection_verified,
      evidence_authority,metadata
    ) values(
      $1,$2,$3,$4,$5,$6,$7::timestamptz,$8::timestamptz,$9,$10,$11,$12,$13,
      $14,$15,$16::jsonb,$17,$18,$19,$20,$21,$22,$23,$24::jsonb
    )`,[
      rollbackRegistryEvidenceId,
      actorUserId,
      disconnected.sourceId,
      disconnected.recordVersion,
      disconnected.environment,
      disconnected.declaredStatus,
      disconnected.statusObservedAt,
      disconnected.statusExpiresAt,
      disconnected.evidenceURI,
      disconnected.manifestURI,
      disconnected.immutableRevision,
      disconnected.capabilityVersion,
      disconnected.approvedOrigin,
      disconnected.signerKeyId,
      disconnected.signerFingerprint,
      JSON.stringify(disconnected.rolesAllowed),
      disconnected.holdReason,
      disconnected.testEvidenceURI,
      disconnected.connectionEvidenceURI,
      disconnected.ownerAuthorized,
      disconnected.independentTestVerified,
      disconnected.independentConnectionVerified,
      disconnected.evidenceAuthority,
      JSON.stringify({
        build: 381,
        event: "fail-closed-rollback",
        rollbackEventId,
        reason: input.envelope.reason,
        priorRegistryEvidenceId: prior.evidenceId
      })
    ]);

    await client.query(`insert into app.master_build381_fail_closed_rollback_events(
      rollback_event_id,renewal_event_id,prior_registry_evidence_id,
      rollback_registry_evidence_id,authority_key_id,authority_key_spki_sha256,
      envelope_sha256,signature_sha256,nonce,controller_revision,
      source_revision,ai_hub_main,comms_main,original_host_id,
      receiver_instance_id,receiver_boot_id,receiver_state,reason,
      receiver_off_observed_at,receiver_off_proof_uri,receiver_off_digest,
      receiver_off_signer_key_id,receiver_off_signature_sha256,
      evidence_uri,rollback_state,observed_at
    ) values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'OFF',$17,
      $18::timestamptz,$19,$20,$21,$22,$23,'ROLLED_BACK_VERIFIED',$24::timestamptz
    )`,[
      rollbackEventId,
      input.envelope.renewalEventId,
      prior.evidenceId,
      rollbackRegistryEvidenceId,
      input.envelope.authorityKeyId,
      input.authorityKeySpkiSha256,
      input.envelopeSha256,
      input.signatureSha256,
      input.envelope.nonce,
      input.envelope.controllerRevision,
      input.envelope.sourceRevision,
      input.envelope.aiHubMain,
      input.envelope.commsMain,
      input.envelope.originalHostId,
      input.envelope.receiverInstanceId,
      input.envelope.receiverBootId,
      input.envelope.reason,
      input.envelope.receiverOffObservedAt,
      input.envelope.receiverOffProofURI,
      input.envelope.receiverOffDigest,
      input.envelope.receiverOffSignerKeyId,
      input.envelope.receiverOffSignatureSha256,
      input.envelope.evidenceURI,
      input.envelope.observedAt
    ]);

    const model = await loadBuild381ReceiverHealthContinuityFromClient(client);
    if (
      model.rollbackState !== "ROLLED_BACK_VERIFIED" ||
      model.connectionState !== "DISCONNECTED_HOLD" ||
      model.mastersSynced !== false
    ) {
      throw new Error("build381_post_write_rollback_not_fail_closed");
    }
    return { rollbackEventId, rollbackRegistryEvidenceId, model };
  });
}
