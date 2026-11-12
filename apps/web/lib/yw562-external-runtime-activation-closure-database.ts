import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withProtectedDatabase, withUserDatabase } from "./database";
import {
  validateMasterShellSourceEvidence,
  validateMasterShellSourceTransition,
  type MasterShellSourceEvidence
} from "./master-shell-source-registry-core";
import {
  loadBuild379ProtectedActivationFromClient
} from "./yw562-protected-runtime-activation-decision-database";
import {
  BUILD_380_CONTROLLER_BASE_REVISION,
  BUILD_380_RUNTIME,
  composeBuild380ExternalRuntimeActivation,
  type Build380CeremonyEvent,
  type Build380ConnectedTransitionEvent,
  type Build380ExternalActivationEnvelope,
  type Build380RegistryEvidence,
  type Build380SyncClosureEvent
} from "./yw562-external-runtime-activation-closure";

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

type CeremonyRow = {
  ceremony_event_id: string;
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
  build379_protected_admission_event_id: string;
  build379_decision_event_id: string;
  build379_execution_event_id: string;
  exact_receipt_id: string;
  owner_decision_id: string;
  prior_registry_evidence_id: string;
  receiver_instance_id: string;
  receiver_boot_id: string;
  receiver_started_at: Date;
  receiver_probe_observed_at: Date;
  receiver_proof_uri: string;
  receiver_proof_digest: string;
  source_handshake_receipt_id: string;
  source_handshake_digest: string;
  terminal_sync_digest: string;
  evidence_uri: string;
  ceremony_state: "VERIFIED_EXECUTED";
  receiver_state: "ON";
  observed_at: Date;
  recorded_at: Date;
};

type TransitionRow = {
  transition_event_id: string;
  ceremony_event_id: string;
  registry_evidence_id: string;
  exact_receipt_id: string;
  owner_decision_id: string;
  build379_decision_event_id: string;
  transition_state: "CONNECTED_VERIFIED";
  connection_state: "CONNECTED";
  receiver_state: "ON";
  verified_at: Date;
  recorded_at: Date;
};

type ClosureRow = {
  closure_event_id: string;
  ceremony_event_id: string;
  transition_event_id: string;
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
  terminal_sync_digest: string;
  closure_state: "CLOSED_VERIFIED";
  masters_synced: true;
  closed_at: Date;
  recorded_at: Date;
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function registryEvidence(row: RegistryRow): Build380RegistryEvidence {
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

function ceremony(row: CeremonyRow): Build380CeremonyEvent {
  return {
    ceremonyEventId: row.ceremony_event_id,
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
    build379ProtectedAdmissionEventId:
      row.build379_protected_admission_event_id,
    build379DecisionEventId: row.build379_decision_event_id,
    build379ExecutionEventId: row.build379_execution_event_id,
    exactReceiptId: row.exact_receipt_id,
    ownerDecisionId: row.owner_decision_id,
    priorRegistryEvidenceId: row.prior_registry_evidence_id,
    receiverInstanceId: row.receiver_instance_id,
    receiverBootId: row.receiver_boot_id,
    receiverStartedAt: row.receiver_started_at.toISOString(),
    receiverProbeObservedAt: row.receiver_probe_observed_at.toISOString(),
    receiverProofURI: row.receiver_proof_uri,
    receiverProofDigest: row.receiver_proof_digest,
    sourceHandshakeReceiptId: row.source_handshake_receipt_id,
    sourceHandshakeDigest: row.source_handshake_digest,
    terminalSyncDigest: row.terminal_sync_digest,
    evidenceURI: row.evidence_uri,
    ceremonyState: row.ceremony_state,
    receiverState: row.receiver_state,
    observedAt: row.observed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function transition(row: TransitionRow): Build380ConnectedTransitionEvent {
  return {
    transitionEventId: row.transition_event_id,
    ceremonyEventId: row.ceremony_event_id,
    registryEvidenceId: row.registry_evidence_id,
    exactReceiptId: row.exact_receipt_id,
    ownerDecisionId: row.owner_decision_id,
    build379DecisionEventId: row.build379_decision_event_id,
    transitionState: row.transition_state,
    connectionState: row.connection_state,
    receiverState: row.receiver_state,
    verifiedAt: row.verified_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function closure(row: ClosureRow): Build380SyncClosureEvent {
  return {
    closureEventId: row.closure_event_id,
    ceremonyEventId: row.ceremony_event_id,
    transitionEventId: row.transition_event_id,
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
    terminalSyncDigest: row.terminal_sync_digest,
    closureState: row.closure_state,
    mastersSynced: row.masters_synced,
    closedAt: row.closed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build380_suite_admin_required");
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

async function ceremonyEvents(client: PoolClient) {
  const result = await client.query<CeremonyRow>(`
    select *
    from app.master_build380_external_runtime_activation_ceremony_events
    order by recorded_at desc
    limit 100
  `);
  return result.rows.map(ceremony);
}

async function transitionEvents(client: PoolClient) {
  const result = await client.query<TransitionRow>(`
    select *
    from app.master_build380_verified_connected_transition_events
    order by recorded_at desc
    limit 100
  `);
  return result.rows.map(transition);
}

async function closureEvents(client: PoolClient) {
  const result = await client.query<ClosureRow>(`
    select *
    from app.master_build380_three_master_sync_closure_events
    order by recorded_at desc
    limit 100
  `);
  return result.rows.map(closure);
}

export async function loadBuild380ExternalRuntimeActivationFromClient(
  client: PoolClient
) {
  const [build379, registry, ceremonies, transitions, closures] =
    await Promise.all([
      loadBuild379ProtectedActivationFromClient(client),
      latestYwRegistryEvidence(client),
      ceremonyEvents(client),
      transitionEvents(client),
      closureEvents(client)
    ]);

  return composeBuild380ExternalRuntimeActivation({
    build379,
    latestRegistryEvidence: registry,
    ceremonyEvents: ceremonies,
    transitionEvents: transitions,
    closureEvents: closures
  });
}

export async function listBuild380ExternalRuntimeActivationForUser(
  userId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const model = await loadBuild380ExternalRuntimeActivationFromClient(client);
    return {
      model,
      ceremonyHistory: await ceremonyEvents(client),
      transitionHistory: await transitionEvents(client),
      closureHistory: await closureEvents(client)
    };
  });
}

function exactMasterReceipt(
  input: Build380ExternalActivationEnvelope,
  masterId: Build380ExternalActivationEnvelope["masterReceipts"][number]["masterId"]
) {
  const receipt = input.masterReceipts.find((item) => item.masterId === masterId);
  if (!receipt) throw new Error("build380_master_runtime_receipt_missing");
  return receipt;
}

export async function admitBuild380ExternalRuntimeActivation(input: {
  envelope: Build380ExternalActivationEnvelope;
  authorityKeySpkiSha256: string;
  envelopeSha256: string;
  signatureSha256: string;
}) {
  return withProtectedDatabase(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build380-external-runtime-activation"
    ]);

    const build379 = await loadBuild379ProtectedActivationFromClient(client);
    const protectedAdmission = build379.latestProtectedAdmission;
    const decision = build379.latestActivationDecision;
    const execution = build379.latestActivationExecution;
    const receipt = build379.build378.exactCurrentReceipt;
    const ownerDecisionId = build379.build378.exactOwnerDecisionId;

    if (
      build379.supervisedActivationDecisionState !==
        "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME" ||
      build379.build378.sourceReceiptState !== "ACTIVE_CURRENT" ||
      build379.build378.exactOwnerAcceptanceState !== "ACCEPTED_CURRENT" ||
      !protectedAdmission ||
      !decision ||
      !execution ||
      !receipt ||
      !ownerDecisionId
    ) {
      throw new Error("build380_build379_authorization_not_current");
    }

    if (
      input.envelope.controllerRevision !== BUILD_380_CONTROLLER_BASE_REVISION ||
      input.envelope.sourceRevision !== BUILD_380_RUNTIME.yw.main ||
      input.envelope.aiHubMain !== BUILD_380_RUNTIME.aiHub.main ||
      input.envelope.commsMain !== BUILD_380_RUNTIME.comms.main ||
      input.envelope.originalHostId !== BUILD_380_RUNTIME.aiHub.originalHost
    ) {
      throw new Error("build380_runtime_revision_binding_mismatch");
    }

    if (
      input.envelope.build379ProtectedAdmissionEventId !==
        protectedAdmission.admissionEventId ||
      input.envelope.build379DecisionEventId !== decision.decisionEventId ||
      input.envelope.build379ExecutionEventId !== execution.executionEventId ||
      input.envelope.exactReceiptId !== receipt.receiptId ||
      input.envelope.exactReceiptSha256 !== receipt.receiptSha256 ||
      input.envelope.ownerDecisionId !== ownerDecisionId
    ) {
      throw new Error("build380_build379_exact_binding_mismatch");
    }

    if (
      input.envelope.aiHubConnection !== "CONNECTED" ||
      input.envelope.aiHubMasterSync !== "SYNCED" ||
      input.envelope.commsReceiver !== "ON" ||
      input.envelope.commsConnection !== "CONNECTED" ||
      input.envelope.commsOwnerAcceptance !== "ACCEPTED" ||
      input.envelope.commsSlaveGate !== "OPEN" ||
      input.envelope.controllerGate !== "OPEN"
    ) {
      throw new Error("build380_external_runtime_state_not_activated");
    }

    const prior = await latestYwRegistryEvidence(client);
    if (!prior || input.envelope.priorRegistryEvidenceId !== prior.evidenceId) {
      throw new Error("build380_registry_evidence_binding_mismatch");
    }
    if (
      prior.environment !== "production" ||
      prior.immutableRevision !== BUILD_380_RUNTIME.yw.main ||
      prior.evidenceAuthority !== "independent-source-verification" ||
      prior.ownerAuthorized !== true ||
      prior.independentTestVerified !== true ||
      !prior.testEvidenceURI ||
      !prior.signerKeyId ||
      !prior.signerFingerprint ||
      (prior.declaredStatus !== "TEST_VERIFIED" &&
        prior.declaredStatus !== "CONNECTED") ||
      Date.parse(prior.statusExpiresAt) <= Date.now()
    ) {
      throw new Error("build380_registry_not_ready_for_connected_transition");
    }
    validateMasterShellSourceTransition(prior.declaredStatus, "CONNECTED");

    const ownerActor = await client.query<{ actor_user_id: string }>(`
      select actor_user_id
      from app.master_build379_supervised_activation_decision_events
      where decision_event_id=$1
        and decision='APPROVE_ACTIVATION'
        and decision_state='ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME'
      limit 1
    `, [decision.decisionEventId]);
    const actorUserId = ownerActor.rows[0]?.actor_user_id;
    if (!actorUserId) {
      throw new Error("build380_owner_actor_not_available");
    }

    const ceremonyEventId = randomUUID();
    const registryEvidenceId = randomUUID();
    const transitionEventId = randomUUID();
    const closureEventId = randomUUID();
    const observedAt = new Date(input.envelope.observedAt);
    const expiresAt = new Date(observedAt.getTime() + 10 * 60_000);
    const aiHubReceipt = exactMasterReceipt(input.envelope, "rosevear-ai-hub");
    const commsReceipt = exactMasterReceipt(input.envelope, "rosevear-comms-hub");
    const controllerReceipt = exactMasterReceipt(input.envelope, "ai-data-platform");

    await client.query(`insert into app.master_build380_external_runtime_activation_ceremony_events(
      ceremony_event_id,authority_key_id,authority_key_spki_sha256,
      envelope_sha256,signature_sha256,nonce,controller_revision,
      source_revision,ai_hub_main,comms_main,original_host_id,
      build379_protected_admission_event_id,build379_decision_event_id,
      build379_execution_event_id,exact_receipt_id,owner_decision_id,
      prior_registry_evidence_id,receiver_instance_id,receiver_boot_id,
      receiver_started_at,receiver_probe_observed_at,receiver_proof_uri,
      receiver_proof_digest,source_handshake_receipt_id,
      source_handshake_digest,terminal_sync_digest,evidence_uri,
      ceremony_state,receiver_state,observed_at
    ) values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
      $18,$19,$20::timestamptz,$21::timestamptz,$22,$23,$24,$25,$26,$27,
      'VERIFIED_EXECUTED','ON',$28::timestamptz
    )`,[
      ceremonyEventId,
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
      input.envelope.build379ProtectedAdmissionEventId,
      input.envelope.build379DecisionEventId,
      input.envelope.build379ExecutionEventId,
      input.envelope.exactReceiptId,
      input.envelope.ownerDecisionId,
      input.envelope.priorRegistryEvidenceId,
      input.envelope.receiverInstanceId,
      input.envelope.receiverBootId,
      input.envelope.receiverStartedAt,
      input.envelope.receiverProbeObservedAt,
      input.envelope.receiverProofURI,
      input.envelope.receiverProofDigest,
      input.envelope.sourceHandshakeReceiptId,
      input.envelope.sourceHandshakeDigest,
      input.envelope.terminalSyncDigest,
      input.envelope.evidenceURI,
      input.envelope.observedAt
    ]);

    const nextRegistryEvidence = validateMasterShellSourceEvidence({
      sourceId: "yw",
      recordVersion: prior.recordVersion + 1,
      environment: "production",
      declaredStatus: "CONNECTED",
      statusObservedAt: observedAt.toISOString(),
      statusExpiresAt: expiresAt.toISOString(),
      evidenceURI: input.envelope.evidenceURI,
      manifestURI: prior.manifestURI,
      immutableRevision: BUILD_380_RUNTIME.yw.main,
      capabilityVersion: prior.capabilityVersion,
      approvedOrigin: prior.approvedOrigin,
      signerKeyId: prior.signerKeyId,
      signerFingerprint: prior.signerFingerprint,
      rolesAllowed: prior.rolesAllowed,
      holdReason: null,
      testEvidenceURI: prior.testEvidenceURI,
      connectionEvidenceURI: input.envelope.receiverProofURI,
      ownerAuthorized: true,
      independentTestVerified: true,
      independentConnectionVerified: true,
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
      registryEvidenceId,
      actorUserId,
      nextRegistryEvidence.sourceId,
      nextRegistryEvidence.recordVersion,
      nextRegistryEvidence.environment,
      nextRegistryEvidence.declaredStatus,
      nextRegistryEvidence.statusObservedAt,
      nextRegistryEvidence.statusExpiresAt,
      nextRegistryEvidence.evidenceURI,
      nextRegistryEvidence.manifestURI,
      nextRegistryEvidence.immutableRevision,
      nextRegistryEvidence.capabilityVersion,
      nextRegistryEvidence.approvedOrigin,
      nextRegistryEvidence.signerKeyId,
      nextRegistryEvidence.signerFingerprint,
      JSON.stringify(nextRegistryEvidence.rolesAllowed),
      nextRegistryEvidence.holdReason,
      nextRegistryEvidence.testEvidenceURI,
      nextRegistryEvidence.connectionEvidenceURI,
      nextRegistryEvidence.ownerAuthorized,
      nextRegistryEvidence.independentTestVerified,
      nextRegistryEvidence.independentConnectionVerified,
      nextRegistryEvidence.evidenceAuthority,
      JSON.stringify({
        build: 380,
        ceremonyEventId,
        build379DecisionEventId: decision.decisionEventId,
        priorRegistryEvidenceId: prior.evidenceId,
        protectedExternalActivation: true
      })
    ]);

    await client.query(`insert into app.master_build380_verified_connected_transition_events(
      transition_event_id,ceremony_event_id,registry_evidence_id,
      exact_receipt_id,owner_decision_id,build379_decision_event_id,
      transition_state,connection_state,receiver_state,verified_at
    ) values(
      $1,$2,$3,$4,$5,$6,'CONNECTED_VERIFIED','CONNECTED','ON',$7::timestamptz
    )`,[
      transitionEventId,
      ceremonyEventId,
      registryEvidenceId,
      receipt.receiptId,
      ownerDecisionId,
      decision.decisionEventId,
      input.envelope.observedAt
    ]);

    await client.query(`insert into app.master_build380_three_master_sync_closure_events(
      closure_event_id,ceremony_event_id,transition_event_id,
      ai_hub_runtime_receipt_id,ai_hub_runtime_digest,
      ai_hub_signer_key_id,ai_hub_signature_sha256,
      comms_runtime_receipt_id,comms_runtime_digest,
      comms_signer_key_id,comms_signature_sha256,
      controller_runtime_receipt_id,controller_runtime_digest,
      controller_signer_key_id,controller_signature_sha256,
      terminal_sync_digest,closure_state,masters_synced,closed_at
    ) values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
      'CLOSED_VERIFIED',true,$17::timestamptz
    )`,[
      closureEventId,
      ceremonyEventId,
      transitionEventId,
      aiHubReceipt.receiptId,
      aiHubReceipt.digest,
      aiHubReceipt.signerKeyId,
      aiHubReceipt.signatureSha256,
      commsReceipt.receiptId,
      commsReceipt.digest,
      commsReceipt.signerKeyId,
      commsReceipt.signatureSha256,
      controllerReceipt.receiptId,
      controllerReceipt.digest,
      controllerReceipt.signerKeyId,
      controllerReceipt.signatureSha256,
      input.envelope.terminalSyncDigest,
      input.envelope.observedAt
    ]);

    const model = await loadBuild380ExternalRuntimeActivationFromClient(client);
    if (
      model.receiverStateProof !== "ON_VERIFIED_CURRENT" ||
      model.verifiedConnectedTransitionState !== "CONNECTED_VERIFIED" ||
      model.threeMasterSynchronizationClosureState !== "CLOSED_VERIFIED" ||
      model.connectionState !== "CONNECTED" ||
      model.mastersSynced !== true
    ) {
      throw new Error("build380_post_write_connected_closure_not_verified");
    }

    return {
      ceremonyEventId,
      registryEvidenceId,
      transitionEventId,
      closureEventId,
      model
    };
  });
}
