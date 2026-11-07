import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify
} from "node:crypto";

import { withIntegrationDatabase } from "./database";

const SOURCE_ID = "ai-data-platform" as const;
const APPROVAL_SCHEMA =
  "rosevear.hub.ql362.exact-source-owner-approval.v1" as const;
const APPROVAL_AUDIENCE =
  "rosevear-comms-hub:source-only-health-get:TEST" as const;
const APPROVAL_DECISION =
  "APPROVE_EXACTLY_ONE_SOURCE_HEALTH_GET" as const;
const SHA = /^[0-9a-f]{64}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{86}$/;

type JsonRecord = Record<string, unknown>;

type SourceAuthorizationRow = {
  operation_id: string;
  source_id: string;
  request_sha256: string;
  request_payload: JsonRecord;
  source_owner_approval: JsonRecord;
  master_owner_approval: JsonRecord;
  original_issuer_evidence_sha256: string;
  independent_witness_evidence_sha256: string;
  ql354_enrollment_evidence_sha256: string;
  independently_reviewed: boolean;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
};

type AuthorityPinRow = {
  source_id: string;
  role: "source_owner" | "master_owner" | "source_signer";
  key_id: string;
  public_key_pem: string;
  spki_sha256: string;
  independently_verified: boolean;
  custody_verified: boolean;
  evidence_sha256: string;
  reviewed_at: Date;
  revoked_at: Date | null;
};

type OriginalGetInput = {
  sourceId: string;
  operationId: string;
  requestSha256: string;
  intent: JsonRecord;
};

type SourceSignerEnvironment = {
  [key: string]: string | undefined;
  QL256_SIGNER_PRIVATE_KEY_PEM?: string;
  QL256_SIGNER_PUBLIC_KEY_PEM?: string;
  QL256_SIGNER_SPKI_SHA256?: string;
  QL256_SIGNER_KEY_ID?: string;
  QL256_SIGNER_STATUS?: string;
};

export function canonicalRosevearCommsValue(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalRosevearCommsValue).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const object = value as JsonRecord;
    return (
      "{" +
      Object.keys(object)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalRosevearCommsValue(object[key])
        )
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export function hashRosevearCommsValue(value: unknown) {
  return createHash("sha256")
    .update(canonicalRosevearCommsValue(value))
    .digest("hex");
}

function sameSha(left: unknown, right: unknown) {
  if (
    typeof left !== "string" ||
    typeof right !== "string" ||
    !SHA.test(left) ||
    !SHA.test(right)
  ) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function exactObject(value: unknown, fields: readonly string[]) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as JsonRecord).length === fields.length &&
    Object.keys(value as JsonRecord).every((key) => fields.includes(key))
  );
}

function publicKeyFromPin(pin: AuthorityPinRow) {
  if (
    pin.source_id !== SOURCE_ID ||
    !SHA.test(pin.spki_sha256) ||
    pin.independently_verified !== true ||
    pin.custody_verified !== true ||
    pin.revoked_at !== null
  ) {
    return null;
  }

  try {
    const key = createPublicKey(pin.public_key_pem);
    if (key.asymmetricKeyType !== "ed25519") return null;
    const actual = createHash("sha256")
      .update(key.export({ format: "der", type: "spki" }))
      .digest("hex");
    return sameSha(actual, pin.spki_sha256) ? key : null;
  } catch {
    return null;
  }
}

function verifyOwnerApproval(
  envelope: unknown,
  role: "source_owner" | "master_owner",
  pin: AuthorityPinRow,
  sourceId: string,
  requestSha256: string,
  now: number
) {
  if (
    !exactObject(envelope, ["schema", "payload", "signature"]) ||
    (envelope as JsonRecord).schema !== APPROVAL_SCHEMA ||
    typeof (envelope as JsonRecord).signature !== "string" ||
    !SIGNATURE.test((envelope as JsonRecord).signature as string)
  ) {
    return false;
  }

  const payload = (envelope as JsonRecord).payload;
  const fields = [
    "schema",
    "role",
    "sourceId",
    "requestSha256",
    "audience",
    "decision",
    "issuedAt",
    "expiresAt"
  ];
  if (!exactObject(payload, fields)) return false;
  const body = payload as JsonRecord;
  const issuedAt = Date.parse(String(body.issuedAt ?? ""));
  const expiresAt = Date.parse(String(body.expiresAt ?? ""));

  if (
    body.schema !== APPROVAL_SCHEMA ||
    body.role !== role ||
    body.sourceId !== sourceId ||
    !sameSha(body.requestSha256, requestSha256) ||
    body.audience !== APPROVAL_AUDIENCE ||
    body.decision !== APPROVAL_DECISION ||
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    String(body.issuedAt) !== new Date(issuedAt).toISOString() ||
    String(body.expiresAt) !== new Date(expiresAt).toISOString() ||
    issuedAt > now + 5_000 ||
    expiresAt <= now ||
    expiresAt - issuedAt > 90_000 ||
    pin.role !== role
  ) {
    return false;
  }

  const key = publicKeyFromPin(pin);
  if (!key) return false;

  try {
    const signature = Buffer.from(
      (envelope as JsonRecord).signature as string,
      "base64url"
    );
    return (
      signature.length === 64 &&
      verify(
        null,
        Buffer.from(canonicalRosevearCommsValue(body)),
        key,
        signature
      )
    );
  } catch {
    return false;
  }
}

export function inspectQl365dSourceSigner(
  env: SourceSignerEnvironment = process.env
) {
  const status = env.QL256_SIGNER_STATUS;
  const keyId = env.QL256_SIGNER_KEY_ID;
  const expectedSpki = env.QL256_SIGNER_SPKI_SHA256;
  const publicPem = env.QL256_SIGNER_PUBLIC_KEY_PEM;
  const privatePem = env.QL256_SIGNER_PRIVATE_KEY_PEM;

  if (
    status !== "SIGNER_EXISTS_CUSTODY_VERIFIED" ||
    typeof keyId !== "string" ||
    keyId.length < 12 ||
    keyId.length > 100 ||
    typeof expectedSpki !== "string" ||
    !SHA.test(expectedSpki) ||
    typeof publicPem !== "string" ||
    !publicPem.includes("BEGIN PUBLIC KEY") ||
    typeof privatePem !== "string" ||
    !privatePem.includes("BEGIN PRIVATE KEY")
  ) {
    return {
      ready: false as const,
      state: "HOLD_SOURCE_SIGNER_CUSTODY_OR_PRODUCTION_PROVISIONING_REQUIRED"
    };
  }

  try {
    const publicKey = createPublicKey(publicPem);
    const privateKey = createPrivateKey(privatePem);
    if (
      publicKey.asymmetricKeyType !== "ed25519" ||
      privateKey.asymmetricKeyType !== "ed25519"
    ) {
      throw new Error("wrong key type");
    }
    const publicSpki = createHash("sha256")
      .update(publicKey.export({ format: "der", type: "spki" }))
      .digest("hex");
    const privateSpki = createHash("sha256")
      .update(
        createPublicKey(privateKey).export({ format: "der", type: "spki" })
      )
      .digest("hex");
    if (
      !sameSha(publicSpki, expectedSpki) ||
      !sameSha(privateSpki, expectedSpki)
    ) {
      throw new Error("signer pin mismatch");
    }
    return {
      ready: true as const,
      state: "SOURCE_SIGNER_CUSTODY_VERIFIED_AND_KEY_MATCHED",
      keyId,
      spkiSha256: expectedSpki,
      publicKey,
      privateKey
    };
  } catch {
    return {
      ready: false as const,
      state: "HOLD_SOURCE_SIGNER_KEY_OR_PIN_MISMATCH"
    };
  }
}

async function readAuthorizationAndPins(input: OriginalGetInput) {
  return withIntegrationDatabase(async (client) => {
    const authorization = await client.query<SourceAuthorizationRow>(
      `select
        operation_id, source_id, request_sha256, request_payload,
        source_owner_approval, master_owner_approval,
        original_issuer_evidence_sha256,
        independent_witness_evidence_sha256,
        ql354_enrollment_evidence_sha256,
        independently_reviewed, issued_at, expires_at, revoked_at
       from app.rosevear_comms_source_authorizations
       where operation_id = $1
         and source_id = $2
         and request_sha256 = $3
       limit 1`,
      [input.operationId, input.sourceId, input.requestSha256]
    );

    const pins = await client.query<AuthorityPinRow>(
      `select
        source_id, role, key_id, public_key_pem, spki_sha256,
        independently_verified, custody_verified, evidence_sha256,
        reviewed_at, revoked_at
       from app.rosevear_comms_authority_pins
       where source_id = $1
       order by role`,
      [input.sourceId]
    );

    return {
      authorization: authorization.rows[0] ?? null,
      pins: pins.rows
    };
  });
}

export async function approveOriginalQl365dSourceGet(
  input: OriginalGetInput,
  env: SourceSignerEnvironment = process.env,
  now = Date.now()
) {
  if (
    input.sourceId !== SOURCE_ID ||
    !SHA.test(input.requestSha256) ||
    input.operationId !== input.intent.operationId ||
    hashRosevearCommsValue(input.intent) !== input.requestSha256
  ) {
    return null;
  }

  const { authorization, pins } = await readAuthorizationAndPins(input);
  if (
    !authorization ||
    authorization.source_id !== SOURCE_ID ||
    authorization.operation_id !== input.operationId ||
    !sameSha(authorization.request_sha256, input.requestSha256) ||
    canonicalRosevearCommsValue(authorization.request_payload) !==
      canonicalRosevearCommsValue(input.intent) ||
    authorization.independently_reviewed !== true ||
    authorization.revoked_at !== null ||
    authorization.expires_at.getTime() <= now ||
    authorization.issued_at.getTime() > now + 5_000 ||
    authorization.expires_at.getTime() -
      authorization.issued_at.getTime() >
      90_000 ||
    !SHA.test(authorization.original_issuer_evidence_sha256) ||
    !SHA.test(authorization.independent_witness_evidence_sha256) ||
    !SHA.test(authorization.ql354_enrollment_evidence_sha256)
  ) {
    return null;
  }

  const sourceOwner = pins.find((pin) => pin.role === "source_owner");
  const masterOwner = pins.find((pin) => pin.role === "master_owner");
  const sourceSigner = pins.find((pin) => pin.role === "source_signer");
  if (!sourceOwner || !masterOwner || !sourceSigner) return null;
  if (
    sameSha(sourceOwner.spki_sha256, masterOwner.spki_sha256) ||
    sameSha(sourceOwner.spki_sha256, sourceSigner.spki_sha256) ||
    sameSha(masterOwner.spki_sha256, sourceSigner.spki_sha256)
  ) {
    return null;
  }

  if (
    !verifyOwnerApproval(
      authorization.source_owner_approval,
      "source_owner",
      sourceOwner,
      SOURCE_ID,
      input.requestSha256,
      now
    ) ||
    !verifyOwnerApproval(
      authorization.master_owner_approval,
      "master_owner",
      masterOwner,
      SOURCE_ID,
      input.requestSha256,
      now
    )
  ) {
    return null;
  }

  const signer = inspectQl365dSourceSigner(env);
  if (
    !signer.ready ||
    sourceSigner.key_id !== signer.keyId ||
    !sameSha(sourceSigner.spki_sha256, signer.spkiSha256) ||
    publicKeyFromPin(sourceSigner) === null ||
    input.intent.sourceCommitSha === undefined ||
    input.intent.manifestSha256 === undefined ||
    input.intent.sourceOrigin === undefined
  ) {
    return null;
  }

  return {
    state: "INDEPENDENT_ORIGINAL_SOURCE_AND_MASTER_OWNER_TEST_AUTHORIZED",
    sourceId: SOURCE_ID,
    operationId: input.operationId,
    requestSha256: input.requestSha256,
    sourceCommitSha: input.intent.sourceCommitSha,
    manifestSha256: input.intent.manifestSha256,
    sourceOrigin: input.intent.sourceOrigin,
    revoked: false,
    originalIssuerVerified: true,
    sourceOwnerVerified: true,
    masterOwnerVerified: true,
    originalSignerCustodyVerified: true,
    sourceSignerSpkiSha256: signer.spkiSha256
  };
}

export async function claimQl365dSourceOperation(input: {
  sourceId: string;
  operationId: string;
  requestSha256: string;
  expiresAt: string;
}) {
  if (
    input.sourceId !== SOURCE_ID ||
    !SHA.test(input.requestSha256) ||
    !Number.isFinite(Date.parse(input.expiresAt))
  ) {
    return false;
  }

  return withIntegrationDatabase(async (client) => {
    const result = await client.query(
      `insert into app.rosevear_comms_operation_claims (
        source_id, operation_id, request_sha256, expires_at
       )
       values ($1, $2, $3, $4::timestamptz)
       on conflict do nothing
       returning operation_id`,
      [
        input.sourceId,
        input.operationId,
        input.requestSha256,
        input.expiresAt
      ]
    );
    return result.rowCount === 1;
  });
}

export async function signQl365dSourceReceipt(
  bytes: Uint8Array,
  context: {
    sourceId: string;
    operationId: string;
    requestSha256: string;
  },
  env: SourceSignerEnvironment = process.env
) {
  if (
    context.sourceId !== SOURCE_ID ||
    !SHA.test(context.requestSha256) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 8192
  ) {
    return { attested: false as const };
  }

  const signer = inspectQl365dSourceSigner(env);
  if (!signer.ready) return { attested: false as const };

  const pinMatches = await withIntegrationDatabase(async (client) => {
    const result = await client.query<AuthorityPinRow>(
      `select
        source_id, role, key_id, public_key_pem, spki_sha256,
        independently_verified, custody_verified, evidence_sha256,
        reviewed_at, revoked_at
       from app.rosevear_comms_authority_pins
       where source_id = $1 and role = 'source_signer'
       limit 1`,
      [SOURCE_ID]
    );
    const pin = result.rows[0];
    return Boolean(
      pin &&
        pin.key_id === signer.keyId &&
        sameSha(pin.spki_sha256, signer.spkiSha256) &&
        publicKeyFromPin(pin)
    );
  });

  if (!pinMatches) return { attested: false as const };

  return {
    attested: true as const,
    spkiSha256: signer.spkiSha256,
    keyId: signer.keyId,
    signature: sign(null, Buffer.from(bytes), signer.privateKey).toString(
      "base64url"
    )
  };
}

export const QL365D_AI_DATA_PLATFORM_SOURCE_ADAPTERS = Object.freeze({
  approveOriginalGet: approveOriginalQl365dSourceGet,
  claimOperation: claimQl365dSourceOperation,
  signSourceReceipt: signQl365dSourceReceipt
});
