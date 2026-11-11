import { randomBytes, randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  canonicalConvergenceReceiptPayload,
  type ConvergenceReceipt
} from "./convergence-receipt-intake";
import { withUserDatabase } from "./database";
import {
  BUILD_365_SOURCE_HANDOFFS,
  trustedSignerFingerprint,
  type ConvergenceLedgerReceipt,
  type SignerRegistryEvent,
  type Source365Id
} from "./source-trust-ledger";
import { recordVerifiedConvergenceReceiptWithClient } from "./source-trust-ledger-database";
import {
  composeSignerEnrollmentAndOwnerReview,
  custodyChallengePayload,
  healthReceiptDigest,
  normalizePin,
  verifyCustodyChallengeSignature,
  type HealthAdmissionEvent,
  type SignerEnrollmentEvent
} from "./source-signer-enrollment";

type EnrollmentRow = {
  event_id: string;
  intake_id: string;
  source_id: Source365Id;
  event_type: SignerEnrollmentEvent["eventType"];
  key_id: string;
  public_key_pem: string | null;
  computed_spki_sha256: string | null;
  independent_pin_spki_sha256: string | null;
  pin_evidence_uri: string | null;
  custody_evidence_uri: string | null;
  witness_evidence_uri: string | null;
  challenge_text: string | null;
  challenge_expires_at: Date | null;
  challenge_signature_base64: string | null;
  detail: string;
  recorded_at: Date;
};

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

async function requireSuiteAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build366_suite_admin_required");
}

async function requireSuiteOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role='owner'
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build366_suite_owner_required");
}

function parseSourceId(value: unknown): Source365Id {
  if (value !== "yw" && value !== "icamp") {
    throw new Error("build366_source_invalid");
  }
  return value;
}

function evidenceURI(value: unknown, name: string) {
  const result = String(value ?? "").trim();
  const allowed =
    result.startsWith("https://") ||
    result.startsWith("urn:rosevear:evidence:");
  if (!allowed || /\s/.test(result) || result.length > 500) {
    throw new Error("build366_" + name + "_invalid");
  }
  return result;
}

function enrollmentRow(row: EnrollmentRow): SignerEnrollmentEvent {
  return {
    eventId: row.event_id,
    intakeId: row.intake_id,
    sourceId: row.source_id,
    eventType: row.event_type,
    keyId: row.key_id,
    publicKeyPem: row.public_key_pem,
    computedSpkiSha256: row.computed_spki_sha256,
    independentPinSpkiSha256: row.independent_pin_spki_sha256,
    pinEvidenceURI: row.pin_evidence_uri,
    custodyEvidenceURI: row.custody_evidence_uri,
    witnessEvidenceURI: row.witness_evidence_uri,
    challengeText: row.challenge_text,
    challengeExpiresAt: row.challenge_expires_at?.toISOString() ?? null,
    challengeSignatureBase64: row.challenge_signature_base64,
    detail: row.detail,
    recordedAt: row.recorded_at.toISOString()
  };
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

async function loadBuild366Evidence(client: PoolClient) {
  const [enrollment, signers, receipts, admissions] = await Promise.all([
    client.query<EnrollmentRow>(
      `select event_id,intake_id,source_id,event_type,key_id,public_key_pem,
              computed_spki_sha256,independent_pin_spki_sha256,pin_evidence_uri,
              custody_evidence_uri,witness_evidence_uri,challenge_text,
              challenge_expires_at,challenge_signature_base64,detail,recorded_at
       from app.master_source_signer_enrollment_intake_events
       order by recorded_at desc
       limit 1000`
    ),
    client.query<SignerRow>(
      `select event_id,source_id,event_type,key_id,public_key_spki_sha256,
              custody_evidence_uri,independently_verified_at,recorded_at
       from app.master_source_signer_registry_events
       order by recorded_at desc
       limit 1000`
    ),
    client.query<ReceiptRow>(
      `select receipt_id,source_id,key_id,source_revision,manifest_revision,
              receipt_sha256,nonce,issued_at,health_observed_at,health_state,
              source_runtime,verification_state,verified_at
       from app.master_convergence_receipt_ledger
       order by verified_at desc
       limit 1000`
    ),
    client.query<AdmissionRow>(
      `select admission_event_id,source_id,key_id,receipt_sha256,
              source_revision,outcome,receipt_id,blockers,recorded_at
       from app.master_source_health_admission_events
       order by recorded_at desc
       limit 1000`
    )
  ]);
  return {
    enrollmentEvents: enrollment.rows.map(enrollmentRow),
    signerEvents: signers.rows.map(signerRow),
    receipts: receipts.rows.map(receiptRow),
    admissionEvents: admissions.rows.map(admissionRow)
  };
}

export async function listSignerEnrollmentAndOwnerReviewForUser(
  userId: string,
  now = new Date()
) {
  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    return composeSignerEnrollmentAndOwnerReview({
      ...(await loadBuild366Evidence(client)),
      now
    });
  });
}

export async function submitSignerEnrollmentIntake(
  userId: string,
  input: {
    sourceId: unknown;
    keyId: unknown;
    publicKeyPem: unknown;
    independentPinSpkiSha256: unknown;
    pinEvidenceURI: unknown;
    custodyEvidenceURI: unknown;
    witnessEvidenceURI: unknown;
  }
) {
  const sourceId = parseSourceId(input.sourceId);
  const keyId = String(input.keyId ?? "").trim();
  const publicKeyPem = String(input.publicKeyPem ?? "");
  const independentPinSpkiSha256 = normalizePin(
    String(input.independentPinSpkiSha256 ?? "")
  );
  const pinEvidence = evidenceURI(input.pinEvidenceURI, "pin_evidence");
  const custodyEvidence = evidenceURI(input.custodyEvidenceURI, "custody_evidence");
  const witnessEvidence = evidenceURI(input.witnessEvidenceURI, "witness_evidence");

  if (!keyId || keyId.length > 160) throw new Error("build366_key_id_invalid");
  if (new Set([pinEvidence, custodyEvidence, witnessEvidence]).size !== 3) {
    throw new Error("build366_independent_evidence_channels_required");
  }

  const computedSpkiSha256 = trustedSignerFingerprint(publicKeyPem);
  const pinMatched = computedSpkiSha256 === independentPinSpkiSha256;
  const intakeId = randomUUID();

  return withUserDatabase(userId, async (client) => {
    await requireSuiteOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build366-intake:" + sourceId
    ]);

    await client.query(
      `insert into app.master_source_signer_enrollment_intake_events (
         event_id,intake_id,actor_user_id,source_id,event_type,key_id,
         public_key_pem,computed_spki_sha256,independent_pin_spki_sha256,
         pin_evidence_uri,custody_evidence_uri,witness_evidence_uri,detail
       ) values (
         $1,$2,nullif(current_setting('app.user_id',true),''),$3,$4,$5,
         $6,$7,$8,$9,$10,$11,$12
       )`,
      [
        randomUUID(),
        intakeId,
        sourceId,
        pinMatched ? "SUBMITTED" : "REJECTED",
        keyId,
        publicKeyPem,
        computedSpkiSha256,
        independentPinSpkiSha256,
        pinEvidence,
        custodyEvidence,
        witnessEvidence,
        pinMatched
          ? "Independent public pin matches the controller-computed Ed25519 SPKI SHA-256; possession challenge is still required."
          : "Independent public pin does not match the controller-computed SPKI SHA-256."
      ]
    );

    if (!pinMatched) {
      return {
        intakeId,
        sourceId,
        state: "REJECTED_PIN_MISMATCH" as const,
        computedSpkiSha256
      };
    }

    return {
      intakeId,
      sourceId,
      state: "PIN_MATCHED_AWAITING_CUSTODY_CHALLENGE" as const,
      computedSpkiSha256
    };
  });
}

async function intakeEvents(client: PoolClient, intakeId: string) {
  const result = await client.query<EnrollmentRow>(
    `select event_id,intake_id,source_id,event_type,key_id,public_key_pem,
            computed_spki_sha256,independent_pin_spki_sha256,pin_evidence_uri,
            custody_evidence_uri,witness_evidence_uri,challenge_text,
            challenge_expires_at,challenge_signature_base64,detail,recorded_at
     from app.master_source_signer_enrollment_intake_events
     where intake_id=$1
     order by recorded_at asc`,
    [intakeId]
  );
  return result.rows;
}

export async function issueSignerCustodyChallenge(
  userId: string,
  input: { intakeId: unknown }
) {
  const intakeId = String(input.intakeId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(intakeId)) {
    throw new Error("build366_intake_id_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireSuiteOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build366-intake:" + intakeId
    ]);
    const events = await intakeEvents(client, intakeId);
    const submitted = events.find((event) => event.event_type === "SUBMITTED");
    if (!submitted?.public_key_pem) throw new Error("build366_submitted_intake_required");
    if (
      submitted.computed_spki_sha256 !== submitted.independent_pin_spki_sha256
    ) {
      throw new Error("build366_pin_match_required");
    }
    if (events.some((event) => event.event_type === "ENROLLMENT_COMMITTED")) {
      throw new Error("build366_intake_already_committed");
    }

    const challengeText = randomBytes(32).toString("hex");
    const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const payload = custodyChallengePayload({
      intakeId,
      sourceId: submitted.source_id,
      keyId: submitted.key_id,
      challengeText,
      challengeExpiresAt
    });

    await client.query(
      `insert into app.master_source_signer_enrollment_intake_events (
         event_id,intake_id,actor_user_id,source_id,event_type,key_id,
         computed_spki_sha256,independent_pin_spki_sha256,pin_evidence_uri,
         custody_evidence_uri,witness_evidence_uri,challenge_text,
         challenge_expires_at,detail
       ) values (
         $1,$2,nullif(current_setting('app.user_id',true),''),$3,
         'CHALLENGE_ISSUED',$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12
       )`,
      [
        randomUUID(),
        intakeId,
        submitted.source_id,
        submitted.key_id,
        submitted.computed_spki_sha256,
        submitted.independent_pin_spki_sha256,
        submitted.pin_evidence_uri,
        submitted.custody_evidence_uri,
        submitted.witness_evidence_uri,
        challengeText,
        challengeExpiresAt,
        "Five-minute source custody challenge issued; signing proves possession only and does not itself establish owner acceptance."
      ]
    );

    return {
      intakeId,
      sourceId: submitted.source_id,
      keyId: submitted.key_id,
      challengeExpiresAt,
      payloadToSign: payload
    };
  });
}

export async function verifySignerCustodyAndEnroll(
  userId: string,
  input: { intakeId: unknown; signatureBase64: unknown }
) {
  const intakeId = String(input.intakeId ?? "");
  const signatureBase64 = String(input.signatureBase64 ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(intakeId)) {
    throw new Error("build366_intake_id_invalid");
  }
  if (signatureBase64.length < 40 || signatureBase64.length > 4096) {
    throw new Error("build366_signature_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireSuiteOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build366-intake:" + intakeId
    ]);
    const events = await intakeEvents(client, intakeId);
    const submitted = events.find((event) => event.event_type === "SUBMITTED");
    const challenge =
      [...events].reverse().find((event) => event.event_type === "CHALLENGE_ISSUED") ??
      null;
    if (!submitted?.public_key_pem || !challenge?.challenge_text || !challenge.challenge_expires_at) {
      throw new Error("build366_current_challenge_required");
    }
    if (challenge.challenge_expires_at.getTime() < Date.now()) {
      throw new Error("build366_challenge_expired");
    }
    if (
      submitted.computed_spki_sha256 !== submitted.independent_pin_spki_sha256
    ) {
      throw new Error("build366_pin_match_required");
    }

    const payload = custodyChallengePayload({
      intakeId,
      sourceId: submitted.source_id,
      keyId: submitted.key_id,
      challengeText: challenge.challenge_text,
      challengeExpiresAt: challenge.challenge_expires_at.toISOString()
    });
    const valid = verifyCustodyChallengeSignature({
      publicKeyPem: submitted.public_key_pem,
      payload,
      signatureBase64
    });
    if (!valid) {
      await client.query(
        `insert into app.master_source_signer_enrollment_intake_events (
           event_id,intake_id,actor_user_id,source_id,event_type,key_id,
           computed_spki_sha256,independent_pin_spki_sha256,pin_evidence_uri,
           custody_evidence_uri,witness_evidence_uri,challenge_text,
           challenge_expires_at,challenge_signature_base64,detail
         ) values (
           $1,$2,nullif(current_setting('app.user_id',true),''),$3,
           'REJECTED',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
         )`,
        [
          randomUUID(),
          intakeId,
          submitted.source_id,
          submitted.key_id,
          submitted.computed_spki_sha256,
          submitted.independent_pin_spki_sha256,
          submitted.pin_evidence_uri,
          submitted.custody_evidence_uri,
          submitted.witness_evidence_uri,
          challenge.challenge_text,
          challenge.challenge_expires_at,
          signatureBase64,
          "Custody challenge signature did not verify against the independently pinned Ed25519 public key."
        ]
      );
      return { intakeId, enrolled: false, state: "REJECTED_INVALID_CUSTODY_SIGNATURE" as const };
    }

    const active = await client.query<{ key_id: string; event_type: string }>(
      `select distinct on (key_id) key_id,event_type
       from app.master_source_signer_registry_events
       where source_id=$1
       order by key_id,recorded_at desc`,
      [submitted.source_id]
    );
    const activeKeys = active.rows
      .filter((row) => row.event_type === "ENROLLED")
      .map((row) => row.key_id);
    if (activeKeys.some((keyId) => keyId !== submitted.key_id)) {
      throw new Error("build366_existing_active_signer_requires_revocation");
    }
    if (activeKeys.includes(submitted.key_id)) {
      return {
        intakeId,
        enrolled: true,
        state: "ALREADY_ENROLLED" as const,
        keyId: submitted.key_id
      };
    }

    const verifiedAt = new Date().toISOString();
    await client.query(
      `insert into app.master_source_signer_enrollment_intake_events (
         event_id,intake_id,actor_user_id,source_id,event_type,key_id,
         computed_spki_sha256,independent_pin_spki_sha256,pin_evidence_uri,
         custody_evidence_uri,witness_evidence_uri,challenge_text,
         challenge_expires_at,challenge_signature_base64,detail
       ) values (
         $1,$2,nullif(current_setting('app.user_id',true),''),$3,
         'CUSTODY_VERIFIED',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
       )`,
      [
        randomUUID(),
        intakeId,
        submitted.source_id,
        submitted.key_id,
        submitted.computed_spki_sha256,
        submitted.independent_pin_spki_sha256,
        submitted.pin_evidence_uri,
        submitted.custody_evidence_uri,
        submitted.witness_evidence_uri,
        challenge.challenge_text,
        challenge.challenge_expires_at,
        signatureBase64,
        "Fresh custody challenge verified against the independently pinned Ed25519 public key."
      ]
    );

    const registryEventId = randomUUID();
    await client.query(
      `insert into app.master_source_signer_registry_events (
         event_id,actor_user_id,source_id,event_type,key_id,public_key_pem,
         public_key_spki_sha256,custody_evidence_uri,independently_verified_at,note
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,'ENROLLED',$3,$4,
         $5,$6,$7::timestamptz,$8
       )`,
      [
        registryEventId,
        submitted.source_id,
        submitted.key_id,
        submitted.public_key_pem,
        submitted.computed_spki_sha256,
        submitted.custody_evidence_uri,
        verifiedAt,
        "Build 366 intake " + intakeId + " verified independent SPKI pin plus fresh possession challenge."
      ]
    );

    await client.query(
      `insert into app.master_source_signer_enrollment_intake_events (
         event_id,intake_id,actor_user_id,source_id,event_type,key_id,
         computed_spki_sha256,independent_pin_spki_sha256,pin_evidence_uri,
         custody_evidence_uri,witness_evidence_uri,detail
       ) values (
         $1,$2,nullif(current_setting('app.user_id',true),''),$3,
         'ENROLLMENT_COMMITTED',$4,$5,$6,$7,$8,$9,$10
       )`,
      [
        randomUUID(),
        intakeId,
        submitted.source_id,
        submitted.key_id,
        submitted.computed_spki_sha256,
        submitted.independent_pin_spki_sha256,
        submitted.pin_evidence_uri,
        submitted.custody_evidence_uri,
        submitted.witness_evidence_uri,
        "Trusted signer registry event " + registryEventId + " committed; private signing key was neither accepted nor stored."
      ]
    );

    return {
      intakeId,
      enrolled: true,
      state: "TRUSTED_SIGNER_ENROLLED" as const,
      keyId: submitted.key_id,
      registryEventId,
      publicKeySpkiSha256: submitted.computed_spki_sha256
    };
  });
}

export async function admitGenuineSignedHealthReceipt(
  userId: string,
  receipt: ConvergenceReceipt
) {
  const sourceId = parseSourceId(receipt.sourceId);
  const expected = BUILD_365_SOURCE_HANDOFFS.find(
    (source) => source.sourceId === sourceId
  );
  if (!expected) throw new Error("build366_source_snapshot_missing");
  if (!/^[a-f0-9]{40}$/.test(receipt.sourceRevision)) {
    throw new Error("build366_source_revision_invalid");
  }

  const payload = canonicalConvergenceReceiptPayload({
    schema: receipt.schema,
    receiptVersion: receipt.receiptVersion,
    handoffToken: receipt.handoffToken,
    sourceId: receipt.sourceId,
    sourceAppId: receipt.sourceAppId,
    repository: receipt.repository,
    sourceRevision: receipt.sourceRevision,
    manifestRevision: receipt.manifestRevision,
    keyId: receipt.keyId,
    issuedAt: receipt.issuedAt,
    nonce: receipt.nonce,
    health: receipt.health
  });
  const receiptSha256 = healthReceiptDigest(payload);

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build366-health-admission:" + sourceId
    ]);

    try {
      const admitted = await recordVerifiedConvergenceReceiptWithClient(
        client,
        receipt
      );
      await client.query(
        `insert into app.master_source_health_admission_events (
           admission_event_id,actor_user_id,source_id,key_id,receipt_sha256,
           source_revision,outcome,receipt_id,blockers
         ) values (
           $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,
           'ADMITTED',$6,'[]'::jsonb
         )`,
        [
          randomUUID(),
          sourceId,
          receipt.keyId,
          receiptSha256,
          receipt.sourceRevision,
          admitted.receiptId
        ]
      );
      return {
        admitted: true,
        sourceId,
        receiptId: admitted.receiptId,
        receiptSha256,
        ownerReviewState: "PREPARED_MASTER_GATE_STILL_APPLIES" as const
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "receipt_rejected";
      if (
        message.startsWith("build365_receipt_") ||
        message.includes("trusted_signer_not_enrolled")
      ) {
        await client.query(
          `insert into app.master_source_health_admission_events (
             admission_event_id,actor_user_id,source_id,key_id,receipt_sha256,
             source_revision,outcome,receipt_id,blockers
           ) values (
             $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,
             'REJECTED',null,$6::jsonb
           )`,
          [
            randomUUID(),
            sourceId,
            receipt.keyId,
            receiptSha256,
            receipt.sourceRevision,
            JSON.stringify([message])
          ]
        );
        return {
          admitted: false,
          sourceId,
          receiptSha256,
          blockers: [message]
        };
      }
      throw error;
    }
  });
}
