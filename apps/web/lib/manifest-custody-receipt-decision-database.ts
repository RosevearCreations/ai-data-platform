import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  BUILD_370_MANIFEST_OBSERVATIONS,
  composeBuild370Decision,
  type CustodyIntakeEvent
} from "./manifest-custody-receipt-decision";
import type {
  ConvergenceLedgerReceipt,
  OwnerDecisionAuditEvent,
  SignerRegistryEvent,
  Source365Id
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";

type SignerRow = {
  event_id: string;
  source_id: Source365Id;
  event_type: "ENROLLED" | "REVOKED";
  key_id: string;
  public_key_spki_sha256: string;
  custody_evidence_uri: string;
  independently_verified_at: Date;
  recorded_at: Date;
};
type CustodyRow = {
  event_id: string;
  intake_id: string;
  source_id: Source365Id;
  event_type: CustodyIntakeEvent["eventType"];
  key_id: string;
  computed_spki_sha256: string | null;
  independent_pin_spki_sha256: string | null;
  pin_evidence_uri: string | null;
  custody_evidence_uri: string | null;
  witness_evidence_uri: string | null;
  recorded_at: Date;
};
type ReceiptRow = {
  receipt_id: string;
  source_id: Source365Id;
  key_id: string;
  source_revision: string;
  manifest_revision: string;
  receipt_sha256: string;
  nonce: string;
  issued_at: Date;
  health_observed_at: Date;
  health_state: "HEALTHY";
  source_runtime: string;
  verification_state: "VERIFIED_SOURCE_BOUND_HEALTH";
  verified_at: Date;
};
type AdmissionRow = {
  admission_event_id: string;
  source_id: Source365Id;
  key_id: string;
  receipt_sha256: string;
  source_revision: string;
  outcome: "ADMITTED" | "REJECTED";
  receipt_id: string | null;
  blockers: unknown;
  recorded_at: Date;
};
type DecisionRow = {
  decision_id: string;
  source_id: Source365Id;
  receipt_id: string | null;
  decision: "HOLD" | "ACCEPT" | "REJECT";
  evidence_uri: string;
  detail: string;
  decided_at: Date;
  recorded_at: Date;
};

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build370_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role='owner'
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build370_suite_owner_required");
}

function signerRow(row: SignerRow): SignerRegistryEvent {
  return {
    eventId: row.event_id,
    sourceId: row.source_id,
    eventType: row.event_type,
    keyId: row.key_id,
    publicKeySpkiSha256: row.public_key_spki_sha256,
    custodyEvidenceURI: row.custody_evidence_uri,
    independentlyVerifiedAt: row.independently_verified_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function custodyRow(row: CustodyRow): CustodyIntakeEvent {
  return {
    eventId: row.event_id,
    intakeId: row.intake_id,
    sourceId: row.source_id,
    eventType: row.event_type,
    keyId: row.key_id,
    computedSpkiSha256: row.computed_spki_sha256,
    independentPinSpkiSha256: row.independent_pin_spki_sha256,
    pinEvidenceURI: row.pin_evidence_uri,
    custodyEvidenceURI: row.custody_evidence_uri,
    witnessEvidenceURI: row.witness_evidence_uri,
    recordedAt: row.recorded_at.toISOString()
  };
}

function receiptRow(row: ReceiptRow): ConvergenceLedgerReceipt {
  return {
    receiptId: row.receipt_id,
    sourceId: row.source_id,
    keyId: row.key_id,
    sourceRevision: row.source_revision,
    manifestRevision: row.manifest_revision,
    receiptSha256: row.receipt_sha256,
    nonce: row.nonce,
    issuedAt: row.issued_at.toISOString(),
    healthObservedAt: row.health_observed_at.toISOString(),
    healthState: row.health_state,
    sourceRuntime: row.source_runtime,
    verificationState: row.verification_state,
    verifiedAt: row.verified_at.toISOString()
  };
}

function admissionRow(row: AdmissionRow): HealthAdmissionEvent {
  return {
    admissionEventId: row.admission_event_id,
    sourceId: row.source_id,
    keyId: row.key_id,
    receiptSha256: row.receipt_sha256,
    sourceRevision: row.source_revision,
    outcome: row.outcome,
    receiptId: row.receipt_id,
    blockers: Array.isArray(row.blockers)
      ? row.blockers.filter((item): item is string => typeof item === "string")
      : [],
    recordedAt: row.recorded_at.toISOString()
  };
}

function decisionRow(row: DecisionRow): OwnerDecisionAuditEvent {
  return {
    decisionId: row.decision_id,
    sourceId: row.source_id,
    receiptId: row.receipt_id,
    decision: row.decision,
    evidenceURI: row.evidence_uri,
    detail: row.detail,
    decidedAt: row.decided_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

async function loadEvidence(client: PoolClient) {
  const [signers, custody, receipts, admissions, decisions] = await Promise.all([
    client.query<SignerRow>(
      `select event_id,source_id,event_type,key_id,public_key_spki_sha256,
              custody_evidence_uri,independently_verified_at,recorded_at
       from app.master_source_signer_registry_events
       order by recorded_at desc limit 1000`
    ),
    client.query<CustodyRow>(
      `select event_id,intake_id,source_id,event_type,key_id,computed_spki_sha256,
              independent_pin_spki_sha256,pin_evidence_uri,custody_evidence_uri,
              witness_evidence_uri,recorded_at
       from app.master_source_signer_enrollment_intake_events
       order by recorded_at desc limit 1000`
    ),
    client.query<ReceiptRow>(
      `select receipt_id,source_id,key_id,source_revision,manifest_revision,
              receipt_sha256,nonce,issued_at,health_observed_at,health_state,
              source_runtime,verification_state,verified_at
       from app.master_convergence_receipt_ledger
       order by verified_at desc limit 1000`
    ),
    client.query<AdmissionRow>(
      `select admission_event_id,source_id,key_id,receipt_sha256,source_revision,
              outcome,receipt_id,blockers,recorded_at
       from app.master_source_health_admission_events
       order by recorded_at desc limit 1000`
    ),
    client.query<DecisionRow>(
      `select decision_id,source_id,receipt_id,decision,evidence_uri,detail,
              decided_at,recorded_at
       from app.master_owner_decision_audit
       order by recorded_at desc limit 1000`
    )
  ]);
  return {
    signerEvents: signers.rows.map(signerRow),
    custodyEvents: custody.rows.map(custodyRow),
    receipts: receipts.rows.map(receiptRow),
    admissionEvents: admissions.rows.map(admissionRow),
    ownerDecisions: decisions.rows.map(decisionRow)
  };
}

export async function listBuild370DecisionForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const [observations, correlations, closures, rechecks] = await Promise.all([
      client.query(
        `select * from app.master_deployed_manifest_observation_events
         order by recorded_at desc limit 100`
      ),
      client.query(
        `select * from app.master_source_custody_correlation_events
         order by recorded_at desc limit 100`
      ),
      client.query(
        `select * from app.master_fresh_receipt_admission_closure_events
         order by recorded_at desc limit 100`
      ),
      client.query(
        `select * from app.master_three_master_runtime_decision_rechecks
         order by recorded_at desc limit 100`
      )
    ]);

    return {
      model: composeBuild370Decision(await loadEvidence(client)),
      manifestObservations: observations.rows,
      custodyCorrelations: correlations.rows,
      receiptClosures: closures.rows,
      runtimeDecisionRechecks: rechecks.rows
    };
  });
}

export async function recordBuild370CurrentObservationAndRecheck(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build370-manifest-custody-receipt-decision"
    ]);

    const model = composeBuild370Decision(await loadEvidence(client));
    const checkedAt = new Date().toISOString();
    const results = [];

    for (const source of model.sources) {
      const observationId = randomUUID();
      await client.query(
        `insert into app.master_deployed_manifest_observation_events (
           observation_id,actor_user_id,source_id,source_production_revision,
           deployment_id,deployment_url,deployment_git_revision,
           observed_manifest_revision,observed_source_id,observed_source_role,
           tenant_boundary,signature_state,connection_state,observation_state,
           response_etag,request_trace,evidence_uri,observed_at
         ) values (
           $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,$13,$14,$15,$16,$17::timestamptz
         )`,
        [
          observationId,
          source.sourceId,
          source.productionMain,
          source.deploymentId,
          source.deploymentUrl,
          source.deploymentGitRevision,
          source.observedManifestRevision,
          source.observedSourceId,
          source.observedSourceRole,
          source.tenantBoundary,
          source.signatureState,
          source.connectionState,
          source.manifestState,
          source.responseEtag,
          source.requestTrace,
          source.evidenceURI,
          source.observedAt
        ]
      );

      const correlationId = randomUUID();
      await client.query(
        `insert into app.master_source_custody_correlation_events (
           correlation_id,actor_user_id,source_id,source_production_revision,
           signer_key_id,registry_event_id,enrollment_intake_id,
           computed_spki_sha256,independent_pin_spki_sha256,
           custody_evidence_uri,witness_evidence_uri,custody_state,blockers,checked_at
         ) values (
           $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12::jsonb,$13::timestamptz
         )`,
        [
          correlationId,
          source.sourceId,
          source.productionMain,
          source.signer?.keyId ?? null,
          source.signer?.eventId ?? null,
          source.custodyIntake?.intakeId ?? null,
          source.custodyIntake?.computedSpkiSha256 ?? null,
          source.custodyIntake?.independentPinSpkiSha256 ?? null,
          source.custodyIntake?.custodyEvidenceURI ?? null,
          source.custodyIntake?.witnessEvidenceURI ?? null,
          source.custodyState,
          JSON.stringify(
            source.blockers.filter((blocker) =>
              /signer|custody|SPKI|pin|witness/i.test(blocker)
            )
          ),
          checkedAt
        ]
      );

      const closureId = randomUUID();
      await client.query(
        `insert into app.master_fresh_receipt_admission_closure_events (
           closure_id,actor_user_id,source_id,source_production_revision,
           manifest_observation_id,custody_correlation_id,receipt_id,
           receipt_state,closure_state,blockers,checked_at
         ) values (
           $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,
           $8,$9::jsonb,$10::timestamptz
         )`,
        [
          closureId,
          source.sourceId,
          source.productionMain,
          observationId,
          correlationId,
          source.latestReceipt?.receiptId ?? null,
          source.receiptState,
          source.sourceClosureState === "READY" ? "VERIFIED_CURRENT" : "HOLD",
          JSON.stringify(source.blockers),
          checkedAt
        ]
      );

      const decisionRecheckId = randomUUID();
      await client.query(
        `insert into app.master_three_master_runtime_decision_rechecks (
           decision_recheck_id,actor_user_id,source_id,source_production_revision,
           manifest_observation_id,custody_correlation_id,receipt_closure_id,
           controller_base_revision,ai_hub_ack,ai_hub_main,comms_handoff,comms_main,
           master_gate_state,source_closure_state,decision_state,blockers,checked_at
         ) values (
           $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,$8,
           $9,$10,$11,$12,$13,$14,$15::jsonb,$16::timestamptz
         )`,
        [
          decisionRecheckId,
          source.sourceId,
          source.productionMain,
          observationId,
          correlationId,
          closureId,
          model.controllerBaseRevision,
          model.master.snapshot.aiHub.ack,
          model.master.snapshot.aiHub.main,
          model.master.snapshot.comms.handoff,
          model.master.snapshot.comms.main,
          model.master.gateState,
          source.sourceClosureState,
          source.decisionState,
          JSON.stringify(source.blockers),
          checkedAt
        ]
      );

      results.push({
        sourceId: source.sourceId,
        observationId,
        correlationId,
        closureId,
        decisionRecheckId,
        manifestState: source.manifestState,
        custodyState: source.custodyState,
        receiptState: source.receiptState,
        decisionState: source.decisionState
      });
    }

    return {
      checkedAt,
      threeMasterGate: model.master.gateState,
      results
    };
  });
}
