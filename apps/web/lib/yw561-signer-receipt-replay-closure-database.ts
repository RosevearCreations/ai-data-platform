import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  BUILD_372_YW561_OBSERVATION,
  composeBuild372Yw561Closure,
  type Build372CustodyEvidenceEvent,
  type Build372ReplayCorrelationEvent
} from "./yw561-signer-receipt-replay-closure";
import type {
  ConvergenceLedgerReceipt,
  OwnerDecisionAuditEvent,
  SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { CustodyIntakeEvent } from "./manifest-custody-receipt-decision";

type SignerRow = {
  event_id: string;
  source_id: "yw";
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
  source_id: "yw";
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
  source_id: "yw";
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
  source_id: "yw";
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
  source_id: "yw";
  receipt_id: string | null;
  decision: "HOLD" | "ACCEPT" | "REJECT";
  evidence_uri: string;
  detail: string;
  decided_at: Date;
  recorded_at: Date;
};
type Build372CustodyRow = {
  evidence_event_id: string;
  source_production_revision: string;
  key_id: string;
  public_key_spki_sha256: string;
  pin_evidence_uri: string;
  custody_evidence_uri: string;
  witness_evidence_uri: string;
  registry_event_id: string | null;
  enrollment_event_id: string | null;
  custody_state: Build372CustodyEvidenceEvent["custodyState"];
  blockers: unknown;
  checked_at: Date;
  recorded_at: Date;
};
type Build372ReplayRow = {
  replay_event_id: string;
  source_production_revision: string;
  manifest_revision: string;
  receipt_id: string;
  receipt_sha256: string;
  nonce_sha256: string;
  replay_evidence_uri: string;
  replay_evidence_digest: string;
  correlation_state: Build372ReplayCorrelationEvent["correlationState"];
  blockers: unknown;
  checked_at: Date;
  recorded_at: Date;
};

async function requireAdmin(client: PoolClient) {
  const r = await client.query<{ allowed: boolean }>(`
    select exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    ) as allowed`
  );
  if (!r.rows[0]?.allowed) throw new Error("build372_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const r = await client.query<{ allowed: boolean }>(`
    select exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
    ) as allowed`
  );
  if (!r.rows[0]?.allowed) throw new Error("build372_suite_owner_required");
}

function evidenceURI(value: unknown, code: string) {
  const uri = String(value ?? "").trim();
  if (
    !(uri.startsWith("https://") || uri.startsWith("urn:rosevear:evidence:")) ||
    /\s/.test(uri) ||
    uri.length > 500
  ) {
    throw new Error(code);
  }
  return uri;
}

function spkiSha(value: unknown) {
  const digest = String(value ?? "").trim().toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error("build372_spki_sha256_invalid");
  }
  return digest;
}

function evidenceDigest(value: unknown) {
  const digest = String(value ?? "").trim().toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error("build372_replay_digest_invalid");
  }
  return digest;
}

function keyId(value: unknown) {
  const id = String(value ?? "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(id)) {
    throw new Error("build372_key_id_invalid");
  }
  return id;
}

const signerRow = (r: SignerRow): SignerRegistryEvent => ({
  eventId: r.event_id,
  sourceId: r.source_id,
  eventType: r.event_type,
  keyId: r.key_id,
  publicKeySpkiSha256: r.public_key_spki_sha256,
  custodyEvidenceURI: r.custody_evidence_uri,
  independentlyVerifiedAt: r.independently_verified_at.toISOString(),
  recordedAt: r.recorded_at.toISOString()
});

const custodyRow = (r: CustodyRow): CustodyIntakeEvent => ({
  eventId: r.event_id,
  intakeId: r.intake_id,
  sourceId: r.source_id,
  eventType: r.event_type,
  keyId: r.key_id,
  computedSpkiSha256: r.computed_spki_sha256,
  independentPinSpkiSha256: r.independent_pin_spki_sha256,
  pinEvidenceURI: r.pin_evidence_uri,
  custodyEvidenceURI: r.custody_evidence_uri,
  witnessEvidenceURI: r.witness_evidence_uri,
  recordedAt: r.recorded_at.toISOString()
});

const receiptRow = (r: ReceiptRow): ConvergenceLedgerReceipt => ({
  receiptId: r.receipt_id,
  sourceId: r.source_id,
  keyId: r.key_id,
  sourceRevision: r.source_revision,
  manifestRevision: r.manifest_revision,
  receiptSha256: r.receipt_sha256,
  nonce: r.nonce,
  issuedAt: r.issued_at.toISOString(),
  healthObservedAt: r.health_observed_at.toISOString(),
  healthState: r.health_state,
  sourceRuntime: r.source_runtime,
  verificationState: r.verification_state,
  verifiedAt: r.verified_at.toISOString()
});

const admissionRow = (r: AdmissionRow): HealthAdmissionEvent => ({
  admissionEventId: r.admission_event_id,
  sourceId: r.source_id,
  keyId: r.key_id,
  receiptSha256: r.receipt_sha256,
  sourceRevision: r.source_revision,
  outcome: r.outcome,
  receiptId: r.receipt_id,
  blockers: Array.isArray(r.blockers)
    ? r.blockers.filter((item): item is string => typeof item === "string")
    : [],
  recordedAt: r.recorded_at.toISOString()
});

const decisionRow = (r: DecisionRow): OwnerDecisionAuditEvent => ({
  decisionId: r.decision_id,
  sourceId: r.source_id,
  receiptId: r.receipt_id,
  decision: r.decision,
  evidenceURI: r.evidence_uri,
  detail: r.detail,
  decidedAt: r.decided_at.toISOString(),
  recordedAt: r.recorded_at.toISOString()
});

const build372CustodyRow = (r: Build372CustodyRow): Build372CustodyEvidenceEvent => ({
  evidenceEventId: r.evidence_event_id,
  sourceProductionRevision: r.source_production_revision,
  keyId: r.key_id,
  publicKeySpkiSha256: r.public_key_spki_sha256,
  pinEvidenceURI: r.pin_evidence_uri,
  custodyEvidenceURI: r.custody_evidence_uri,
  witnessEvidenceURI: r.witness_evidence_uri,
  registryEventId: r.registry_event_id,
  enrollmentEventId: r.enrollment_event_id,
  custodyState: r.custody_state,
  blockers: Array.isArray(r.blockers)
    ? r.blockers.filter((item): item is string => typeof item === "string")
    : [],
  checkedAt: r.checked_at.toISOString(),
  recordedAt: r.recorded_at.toISOString()
});

const build372ReplayRow = (r: Build372ReplayRow): Build372ReplayCorrelationEvent => ({
  replayEventId: r.replay_event_id,
  sourceProductionRevision: r.source_production_revision,
  manifestRevision: r.manifest_revision,
  receiptId: r.receipt_id,
  receiptSha256: r.receipt_sha256,
  nonceSha256: r.nonce_sha256,
  replayEvidenceURI: r.replay_evidence_uri,
  replayEvidenceDigest: r.replay_evidence_digest,
  correlationState: r.correlation_state,
  blockers: Array.isArray(r.blockers)
    ? r.blockers.filter((item): item is string => typeof item === "string")
    : [],
  checkedAt: r.checked_at.toISOString(),
  recordedAt: r.recorded_at.toISOString()
});

async function loadEvidence(client: PoolClient) {
  const [signers, custody, receipts, admissions, decisions, custodyEvidence, replay] =
    await Promise.all([
      client.query<SignerRow>(`
        select event_id,source_id,event_type,key_id,public_key_spki_sha256,
               custody_evidence_uri,independently_verified_at,recorded_at
        from app.master_source_signer_registry_events
        where source_id='yw'
        order by recorded_at desc limit 500`
      ),
      client.query<CustodyRow>(`
        select event_id,intake_id,source_id,event_type,key_id,computed_spki_sha256,
               independent_pin_spki_sha256,pin_evidence_uri,custody_evidence_uri,
               witness_evidence_uri,recorded_at
        from app.master_source_signer_enrollment_intake_events
        where source_id='yw'
        order by recorded_at desc limit 500`
      ),
      client.query<ReceiptRow>(`
        select receipt_id,source_id,key_id,source_revision,manifest_revision,
               receipt_sha256,nonce,issued_at,health_observed_at,health_state,
               source_runtime,verification_state,verified_at
        from app.master_convergence_receipt_ledger
        where source_id='yw'
        order by verified_at desc limit 500`
      ),
      client.query<AdmissionRow>(`
        select admission_event_id,source_id,key_id,receipt_sha256,source_revision,
               outcome,receipt_id,blockers,recorded_at
        from app.master_source_health_admission_events
        where source_id='yw'
        order by recorded_at desc limit 500`
      ),
      client.query<DecisionRow>(`
        select decision_id,source_id,receipt_id,decision,evidence_uri,detail,
               decided_at,recorded_at
        from app.master_owner_decision_audit
        where source_id='yw'
        order by recorded_at desc limit 500`
      ),
      client.query<Build372CustodyRow>(`
        select evidence_event_id,source_production_revision,key_id,
               public_key_spki_sha256,pin_evidence_uri,custody_evidence_uri,
               witness_evidence_uri,registry_event_id,enrollment_event_id,
               custody_state,blockers,checked_at,recorded_at
        from app.master_yw561_custody_evidence_intake_events
        order by recorded_at desc limit 500`
      ),
      client.query<Build372ReplayRow>(`
        select replay_event_id,source_production_revision,manifest_revision,
               receipt_id,receipt_sha256,nonce_sha256,replay_evidence_uri,
               replay_evidence_digest,correlation_state,blockers,checked_at,recorded_at
        from app.master_yw561_replay_correlation_events
        order by recorded_at desc limit 500`
      )
    ]);

  return {
    signerEvents: signers.rows.map(signerRow),
    custodyEvents: custody.rows.map(custodyRow),
    receipts: receipts.rows.map(receiptRow),
    admissionEvents: admissions.rows.map(admissionRow),
    ownerDecisions: decisions.rows.map(decisionRow),
    custodyEvidenceEvents: custodyEvidence.rows.map(build372CustodyRow),
    replayEvents: replay.rows.map(build372ReplayRow)
  };
}

export async function listBuild372Yw561ClosureForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const [custodyHistory, replayHistory, closureHistory] = await Promise.all([
      client.query(`
        select * from app.master_yw561_custody_evidence_intake_events
        order by recorded_at desc limit 100`
      ),
      client.query(`
        select * from app.master_yw561_replay_correlation_events
        order by recorded_at desc limit 100`
      ),
      client.query(`
        select * from app.master_yw561_runtime_closure_rechecks
        order by recorded_at desc limit 100`
      )
    ]);
    return {
      model: composeBuild372Yw561Closure(await loadEvidence(client)),
      custodyHistory: custodyHistory.rows,
      replayHistory: replayHistory.rows,
      closureHistory: closureHistory.rows
    };
  });
}

export async function recordBuild372CustodyEvidence(
  userId: string,
  input: {
    keyId: unknown;
    publicKeySpkiSha256: unknown;
    pinEvidenceURI: unknown;
    custodyEvidenceURI: unknown;
    witnessEvidenceURI: unknown;
  }
) {
  const submittedKeyId = keyId(input.keyId);
  const submittedSpki = spkiSha(input.publicKeySpkiSha256);
  const pinURI = evidenceURI(input.pinEvidenceURI, "build372_pin_evidence_uri_invalid");
  const custodyURI = evidenceURI(
    input.custodyEvidenceURI,
    "build372_custody_evidence_uri_invalid"
  );
  const witnessURI = evidenceURI(
    input.witnessEvidenceURI,
    "build372_witness_evidence_uri_invalid"
  );
  if (new Set([pinURI, custodyURI, witnessURI]).size !== 3) {
    throw new Error("build372_custody_evidence_must_be_distinct");
  }

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build372-yw561-custody-evidence"
    ]);

    const evidence = await loadEvidence(client);
    const base = composeBuild372Yw561Closure(evidence);
    const blockers: string[] = [];
    let state: Build372CustodyEvidenceEvent["custodyState"];

    if (base.signerState === "HOLD_AMBIGUOUS") {
      state = "HOLD_AMBIGUOUS";
      blockers.push("Multiple active controller-trusted YW source-health signers exist.");
    } else if (!base.signer) {
      state = "HOLD_UNENROLLED";
      blockers.push("No active controller-trusted YW source-health signer is enrolled.");
    } else if (
      base.signer.keyId !== submittedKeyId ||
      base.signer.publicKeySpkiSha256 !== submittedSpki
    ) {
      state = "HOLD_CUSTODY_MISMATCH";
      blockers.push("Submitted key ID or SPKI fingerprint does not match the trusted YW signer.");
    } else if (!base.custodyIntake) {
      state = "HOLD_CUSTODY_EVIDENCE";
      blockers.push("Matching committed controller custody intake is missing.");
    } else {
      const intake = base.custodyIntake;
      const intakeMatches =
        intake.computedSpkiSha256 === submittedSpki &&
        intake.independentPinSpkiSha256 === submittedSpki &&
        intake.pinEvidenceURI === pinURI &&
        intake.custodyEvidenceURI === custodyURI &&
        intake.witnessEvidenceURI === witnessURI;
      if (!intakeMatches) {
        state = "HOLD_CUSTODY_MISMATCH";
        blockers.push("Submitted custody references do not match the committed controller intake.");
      } else {
        state = "VERIFIED_CORRELATED";
      }
    }

    const eventId = randomUUID();
    const checkedAt = new Date().toISOString();
    await client.query(
      `insert into app.master_yw561_custody_evidence_intake_events (
         evidence_event_id,actor_user_id,source_id,source_production_revision,
         key_id,public_key_spki_sha256,pin_evidence_uri,custody_evidence_uri,
         witness_evidence_uri,registry_event_id,enrollment_event_id,custody_state,
         blockers,checked_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11::jsonb,$12::timestamptz
       )`,
      [
        eventId,
        BUILD_372_YW561_OBSERVATION.productionMain,
        submittedKeyId,
        submittedSpki,
        pinURI,
        custodyURI,
        witnessURI,
        base.signer?.eventId ?? null,
        base.custodyIntake?.eventId ?? null,
        state,
        JSON.stringify(blockers),
        checkedAt
      ]
    );

    return {
      evidenceEventId: eventId,
      custodyState: state,
      blockers
    };
  });
}

export async function recordBuild372ReplayCorrelation(
  userId: string,
  input: {
    receiptId: unknown;
    replayEvidenceURI: unknown;
    replayEvidenceDigest: unknown;
  }
) {
  const receiptId = String(input.receiptId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(receiptId)) {
    throw new Error("build372_receipt_id_invalid");
  }
  const replayURI = evidenceURI(
    input.replayEvidenceURI,
    "build372_replay_evidence_uri_invalid"
  );
  const replayDigest = evidenceDigest(input.replayEvidenceDigest);

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build372-yw561-replay-correlation"
    ]);

    const evidence = await loadEvidence(client);
    const model = composeBuild372Yw561Closure(evidence);
    const receipt = evidence.receipts.find((item) => item.receiptId === receiptId);
    if (!receipt) throw new Error("build372_receipt_not_found");

    const admission = evidence.admissionEvents.find(
      (event) => event.outcome === "ADMITTED" && event.receiptId === receipt.receiptId
    );
    const blockers: string[] = [];
    let state: Build372ReplayCorrelationEvent["correlationState"];

    if (
      receipt.sourceRevision !== BUILD_372_YW561_OBSERVATION.productionMain ||
      receipt.manifestRevision !== BUILD_372_YW561_OBSERVATION.productionMain
    ) {
      state = "HOLD_RECEIPT_NOT_CURRENT";
      blockers.push("Receipt does not bind the exact YW561 production and manifest revision.");
    } else if (
      model.signerState !== "VERIFIED_CORRELATED" ||
      model.custodyIntakeState !== "VERIFIED_CORRELATED" ||
      receipt.keyId !== model.signer?.keyId
    ) {
      state = "HOLD_SIGNER_CUSTODY";
      blockers.push("Current receipt is not correlated to verified independent YW signer custody.");
    } else if (!admission) {
      state = "HOLD_RECEIPT_NOT_ADMITTED";
      blockers.push("Current YW561 receipt has not been controller-admitted.");
    } else {
      state = "VERIFIED_CORRELATED";
    }

    const nonceSha256 =
      "sha256:" + createHash("sha256").update(receipt.nonce, "utf8").digest("hex");
    const replayEventId = randomUUID();
    const checkedAt = new Date().toISOString();

    await client.query(
      `insert into app.master_yw561_replay_correlation_events (
         replay_event_id,actor_user_id,source_id,source_production_revision,
         manifest_revision,receipt_id,receipt_sha256,nonce_sha256,
         replay_evidence_uri,replay_evidence_digest,correlation_state,
         blockers,checked_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,
         $8,$9,$10::jsonb,$11::timestamptz
       )`,
      [
        replayEventId,
        BUILD_372_YW561_OBSERVATION.productionMain,
        BUILD_372_YW561_OBSERVATION.deployedManifestRevision,
        receipt.receiptId,
        receipt.receiptSha256,
        nonceSha256,
        replayURI,
        replayDigest,
        state,
        JSON.stringify(blockers),
        checkedAt
      ]
    );

    return {
      replayEventId,
      correlationState: state,
      nonceSha256,
      blockers
    };
  });
}

export async function recordBuild372RuntimeClosureRecheck(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build372-yw561-runtime-closure"
    ]);

    const model = composeBuild372Yw561Closure(await loadEvidence(client));
    const closureRecheckId = randomUUID();
    const checkedAt = new Date().toISOString();

    await client.query(
      `insert into app.master_yw561_runtime_closure_rechecks (
         closure_recheck_id,actor_user_id,source_id,source_production_revision,
         deployment_id,custody_evidence_event_id,receipt_id,replay_event_id,
         controller_base_revision,ai_hub_main,comms_main,identity_state,
         signer_state,receipt_state,replay_state,master_gate_state,closure_state,
         blockers,checked_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::timestamptz
       )`,
      [
        closureRecheckId,
        model.observation.productionMain,
        model.observation.deploymentId,
        model.custodyEvidenceEvent?.evidenceEventId ?? null,
        model.latestReceipt?.receiptId ?? null,
        model.replayEvent?.replayEventId ?? null,
        model.controllerBaseRevision,
        model.master.snapshot.aiHub.main,
        model.master.snapshot.comms.main,
        model.identityState,
        model.signerState,
        model.receiptState,
        model.replayState,
        model.master.gateState,
        model.closureState,
        JSON.stringify(model.blockers),
        checkedAt
      ]
    );

    return {
      closureRecheckId,
      identityState: model.identityState,
      signerState: model.signerState,
      custodyIntakeState: model.custodyIntakeState,
      receiptState: model.receiptState,
      replayState: model.replayState,
      threeMasterGate: model.master.gateState,
      closureState: model.closureState,
      blockers: model.blockers
    };
  });
}
