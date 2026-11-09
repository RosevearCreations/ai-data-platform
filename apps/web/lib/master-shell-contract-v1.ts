import { createHash, randomUUID } from "node:crypto";

export const MASTER_SHELL_EVENT_SCHEMA = "rosevear.master-shell.event.v1" as const;
export const MASTER_SHELL_EVENT_SCHEMA_VERSION = "1.0.0" as const;
export const MASTER_SHELL_CONTRACT_BUILD = 335 as const;

export const MASTER_SHELL_SOURCE_IDS = [
  "yw",
  "icamp",
  "rosiedazzlers",
  "devilndove",
  "ai-data-platform",
  "rosevear-ai-hub"
] as const;

export type MasterShellSourceId = (typeof MASTER_SHELL_SOURCE_IDS)[number];

export const MASTER_SHELL_CONTROL_PLANE_IDS = [
  "rosevear-comms-hub"
] as const;

export type MasterShellControlPlaneId =
  (typeof MASTER_SHELL_CONTROL_PLANE_IDS)[number];

export const MASTER_SHELL_AUDIENCES = [
  ...MASTER_SHELL_SOURCE_IDS,
  ...MASTER_SHELL_CONTROL_PLANE_IDS,
  "rosevear-suite-owner",
  "rosevear-it"
] as const;

export type MasterShellAudience = (typeof MASTER_SHELL_AUDIENCES)[number];

export const MASTER_SHELL_EVENT_FAMILIES = [
  "source.health.reported",
  "release.promoted",
  "module.readiness.changed",
  "incident.opened",
  "incident.updated",
  "consent.changed",
  "workflow.status.changed",
  "audit.evidence.recorded"
] as const;

export type MasterShellEventType =
  (typeof MASTER_SHELL_EVENT_FAMILIES)[number];

export const MASTER_SHELL_VERIFICATION_STATES = [
  "observed",
  "reported",
  "independently-verified",
  "stale",
  "disconnected",
  "held",
  "unknown"
] as const;

export type MasterShellVerificationState =
  (typeof MASTER_SHELL_VERIFICATION_STATES)[number];

export const MASTER_SHELL_SENSITIVITY = [
  "internal",
  "confidential",
  "restricted"
] as const;

export type MasterShellSensitivity =
  (typeof MASTER_SHELL_SENSITIVITY)[number];

export type MasterShellSourceDefinition = {
  sourceId: MasterShellSourceId;
  shellId: string;
  repository: string;
  shellBoundary: string;
  tenancyModel:
    | "platform-shell-with-child-tenants"
    | "owned-business-shell"
    | "support-broker-no-customer-tenant"
    | "local-support-server";
  legacyInternalId: string | null;
};

export const MASTER_SHELL_SOURCE_DEFINITIONS:
  readonly MasterShellSourceDefinition[] = Object.freeze([
    {
      sourceId: "yw",
      shellId: "yard-workers",
      repository: "RosevearCreations/yw",
      shellBoundary: "Yard Workers platform shell",
      tenancyModel: "platform-shell-with-child-tenants",
      legacyInternalId: "yard-workers"
    },
    {
      sourceId: "icamp",
      shellId: "icamp",
      repository: "RosevearCreations/iCamp",
      shellBoundary: "iCamp platform shell",
      tenancyModel: "platform-shell-with-child-tenants",
      legacyInternalId: null
    },
    {
      sourceId: "rosiedazzlers",
      shellId: "rosiedazzlers",
      repository: "RosevearCreations/rosiedazzlers",
      shellBoundary: "Rosie Dazzlers owned-business shell",
      tenancyModel: "owned-business-shell",
      legacyInternalId: null
    },
    {
      sourceId: "devilndove",
      shellId: "devilndove",
      repository: "RosevearCreations/devilndove-site",
      shellBoundary: "Devil n Dove owned-business shell",
      tenancyModel: "owned-business-shell",
      legacyInternalId: null
    },
    {
      sourceId: "ai-data-platform",
      shellId: "ai-data-platform",
      repository: "RosevearCreations/ai-data-platform",
      shellBoundary: "AI Data Platform support broker and module boundary",
      tenancyModel: "support-broker-no-customer-tenant",
      legacyInternalId: null
    },
    {
      sourceId: "rosevear-ai-hub",
      shellId: "rosevear-ai-hub",
      repository: "RosevearCreations/rosevear-ai-hub",
      shellBoundary: "Rosevear AI Hub original local Windows support server",
      tenancyModel: "local-support-server",
      legacyInternalId: null
    }
  ]);

export const MASTER_SHELL_REGISTRY_REQUIRED_FIELDS = [
  "sourceId",
  "repository",
  "environment",
  "shellBoundary",
  "productOwner",
  "manifestURI",
  "immutableRevision",
  "capabilityVersion",
  "contractVersion",
  "approvedOrigin",
  "signerKeyId",
  "signerFingerprint",
  "status",
  "statusObservedAt",
  "statusExpiresAt",
  "lastVerifiedEvidenceURI",
  "rolesAllowed",
  "tenancyModel"
] as const;

export interface MasterShellEventEnvelopeV1 {
  eventId: string;
  schema: typeof MASTER_SHELL_EVENT_SCHEMA;
  schemaVersion: typeof MASTER_SHELL_EVENT_SCHEMA_VERSION;
  sourceId: MasterShellSourceId;
  sourceRevision: string;
  shellId: string;
  tenantId: string | null;
  eventType: MasterShellEventType;
  occurredAt: string;
  publishedAt: string;
  sourceSequence: number;
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string;
  sensitivity: MasterShellSensitivity;
  audience: MasterShellAudience[];
  evidenceURI: string;
  verificationState: MasterShellVerificationState;
  payloadHash: string;
  payload: Record<string, unknown>;
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const EVENT_ID = /^evt_[A-Za-z0-9_-]{12,100}$/;
const CORRELATION_ID = /^corr_[A-Za-z0-9_-]{12,100}$/;
const CAUSATION_ID = /^cause_[A-Za-z0-9_-]{12,100}$/;
const HASH = /^[a-f0-9]{64}$/;
const URI = /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sortedObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => {
        const item = value[key];
        if (Array.isArray(item)) {
          return [
            key,
            item.map((entry) =>
              entry && typeof entry === "object" && !Array.isArray(entry)
                ? sortedObject(entry as Record<string, unknown>)
                : entry
            )
          ];
        }
        if (item && typeof item === "object") {
          return [key, sortedObject(item as Record<string, unknown>)];
        }
        return [key, item];
      })
  );
}

export function masterShellPayloadHash(payload: Record<string, unknown>) {
  return createHash("sha256")
    .update(JSON.stringify(sortedObject(payload)))
    .digest("hex");
}

function exactKeys(
  input: Record<string, unknown>,
  expected: readonly string[]
) {
  const actual = Object.keys(input);
  return (
    actual.length === expected.length &&
    actual.every((key) => expected.includes(key))
  );
}

function validIso(value: unknown) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function includesValue<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export class MasterShellContractError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "MasterShellContractError";
    this.code = code;
  }
}

export function parseMasterShellEventEnvelope(
  value: unknown
): MasterShellEventEnvelopeV1 {
  const input = object(value);
  const keys = [
    "eventId",
    "schema",
    "schemaVersion",
    "sourceId",
    "sourceRevision",
    "shellId",
    "tenantId",
    "eventType",
    "occurredAt",
    "publishedAt",
    "sourceSequence",
    "correlationId",
    "causationId",
    "idempotencyKey",
    "sensitivity",
    "audience",
    "evidenceURI",
    "verificationState",
    "payloadHash",
    "payload"
  ] as const;

  if (!input || !exactKeys(input, keys)) {
    throw new MasterShellContractError("master_shell_event_shape_invalid");
  }
  if (
    input.schema !== MASTER_SHELL_EVENT_SCHEMA ||
    input.schemaVersion !== MASTER_SHELL_EVENT_SCHEMA_VERSION
  ) {
    throw new MasterShellContractError("master_shell_event_schema_invalid");
  }
  if (
    typeof input.eventId !== "string" ||
    !EVENT_ID.test(input.eventId)
  ) {
    throw new MasterShellContractError("master_shell_event_id_invalid");
  }
  if (!includesValue(MASTER_SHELL_SOURCE_IDS, input.sourceId)) {
    throw new MasterShellContractError("master_shell_source_id_invalid");
  }
  if (
    typeof input.sourceRevision !== "string" ||
    !SAFE_ID.test(input.sourceRevision)
  ) {
    throw new MasterShellContractError("master_shell_source_revision_invalid");
  }
  if (
    typeof input.shellId !== "string" ||
    !SAFE_ID.test(input.shellId)
  ) {
    throw new MasterShellContractError("master_shell_shell_id_invalid");
  }
  const sourceDefinition = MASTER_SHELL_SOURCE_DEFINITIONS.find(
    (item) => item.sourceId === input.sourceId
  );
  if (!sourceDefinition || input.shellId !== sourceDefinition.shellId) {
    throw new MasterShellContractError("master_shell_shell_identity_mismatch");
  }
  if (
    input.tenantId !== null &&
    (typeof input.tenantId !== "string" || !SAFE_ID.test(input.tenantId))
  ) {
    throw new MasterShellContractError("master_shell_tenant_id_invalid");
  }
  if (!includesValue(MASTER_SHELL_EVENT_FAMILIES, input.eventType)) {
    throw new MasterShellContractError("master_shell_event_type_invalid");
  }
  if (!validIso(input.occurredAt) || !validIso(input.publishedAt)) {
    throw new MasterShellContractError("master_shell_event_time_invalid");
  }
  if (
    Date.parse(input.publishedAt as string) <
    Date.parse(input.occurredAt as string)
  ) {
    throw new MasterShellContractError("master_shell_event_time_order_invalid");
  }
  if (
    !Number.isSafeInteger(input.sourceSequence) ||
    Number(input.sourceSequence) < 0
  ) {
    throw new MasterShellContractError("master_shell_source_sequence_invalid");
  }
  if (
    typeof input.correlationId !== "string" ||
    !CORRELATION_ID.test(input.correlationId)
  ) {
    throw new MasterShellContractError("master_shell_correlation_id_invalid");
  }
  if (
    input.causationId !== null &&
    (typeof input.causationId !== "string" ||
      !CAUSATION_ID.test(input.causationId))
  ) {
    throw new MasterShellContractError("master_shell_causation_id_invalid");
  }
  if (
    typeof input.idempotencyKey !== "string" ||
    !SAFE_ID.test(input.idempotencyKey)
  ) {
    throw new MasterShellContractError("master_shell_idempotency_key_invalid");
  }
  if (!includesValue(MASTER_SHELL_SENSITIVITY, input.sensitivity)) {
    throw new MasterShellContractError("master_shell_sensitivity_invalid");
  }
  if (
    !Array.isArray(input.audience) ||
    input.audience.length < 1 ||
    input.audience.length > 10 ||
    !input.audience.every((item) =>
      includesValue(MASTER_SHELL_AUDIENCES, item)
    ) ||
    new Set(input.audience).size !== input.audience.length
  ) {
    throw new MasterShellContractError("master_shell_audience_invalid");
  }
  if (
    typeof input.evidenceURI !== "string" ||
    !URI.test(input.evidenceURI)
  ) {
    throw new MasterShellContractError("master_shell_evidence_uri_invalid");
  }
  if (
    !includesValue(
      MASTER_SHELL_VERIFICATION_STATES,
      input.verificationState
    )
  ) {
    throw new MasterShellContractError(
      "master_shell_verification_state_invalid"
    );
  }
  if (
    typeof input.payloadHash !== "string" ||
    !HASH.test(input.payloadHash)
  ) {
    throw new MasterShellContractError("master_shell_payload_hash_invalid");
  }

  const payload = object(input.payload);
  if (!payload) {
    throw new MasterShellContractError("master_shell_payload_invalid");
  }
  if (masterShellPayloadHash(payload) !== input.payloadHash) {
    throw new MasterShellContractError("master_shell_payload_hash_mismatch");
  }

  return {
    eventId: input.eventId,
    schema: MASTER_SHELL_EVENT_SCHEMA,
    schemaVersion: MASTER_SHELL_EVENT_SCHEMA_VERSION,
    sourceId: input.sourceId,
    sourceRevision: input.sourceRevision,
    shellId: input.shellId,
    tenantId: input.tenantId as string | null,
    eventType: input.eventType,
    occurredAt: input.occurredAt as string,
    publishedAt: input.publishedAt as string,
    sourceSequence: Number(input.sourceSequence),
    correlationId: input.correlationId,
    causationId: input.causationId as string | null,
    idempotencyKey: input.idempotencyKey,
    sensitivity: input.sensitivity,
    audience: [...input.audience] as MasterShellAudience[],
    evidenceURI: input.evidenceURI,
    verificationState: input.verificationState,
    payloadHash: input.payloadHash,
    payload
  };
}

export function newMasterShellCorrelationId() {
  return "corr_" + randomUUID().replaceAll("-", "");
}

export function newMasterShellCausationId() {
  return "cause_" + randomUUID().replaceAll("-", "");
}

export function deterministicMasterShellIdempotencyKey(input: {
  sourceId: MasterShellSourceId;
  sourceRevision: string;
  sourceSequence: number;
  eventType: MasterShellEventType;
  payloadHash: string;
}) {
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        input.sourceId,
        input.sourceRevision,
        input.sourceSequence,
        input.eventType,
        input.payloadHash
      ])
    )
    .digest("hex");
  return "master-shell:" + digest;
}

export function buildAiDataMasterShellEnvelope(input: {
  sourceRevision: string;
  sourceSequence: number;
  eventType: MasterShellEventType;
  tenantId?: string | null;
  occurredAt: string;
  publishedAt?: string;
  correlationId?: string;
  causationId?: string | null;
  sensitivity: MasterShellSensitivity;
  audience: MasterShellAudience[];
  evidenceURI: string;
  verificationState: MasterShellVerificationState;
  payload: Record<string, unknown>;
}) {
  const payloadHash = masterShellPayloadHash(input.payload);
  const correlationId = input.correlationId ?? newMasterShellCorrelationId();
  const causationId =
    input.causationId === undefined ? null : input.causationId;

  return parseMasterShellEventEnvelope({
    eventId: "evt_" + randomUUID().replaceAll("-", ""),
    schema: MASTER_SHELL_EVENT_SCHEMA,
    schemaVersion: MASTER_SHELL_EVENT_SCHEMA_VERSION,
    sourceId: "ai-data-platform",
    sourceRevision: input.sourceRevision,
    shellId: "ai-data-platform",
    tenantId: input.tenantId ?? null,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    publishedAt: input.publishedAt ?? new Date().toISOString(),
    sourceSequence: input.sourceSequence,
    correlationId,
    causationId,
    idempotencyKey: deterministicMasterShellIdempotencyKey({
      sourceId: "ai-data-platform",
      sourceRevision: input.sourceRevision,
      sourceSequence: input.sourceSequence,
      eventType: input.eventType,
      payloadHash
    }),
    sensitivity: input.sensitivity,
    audience: input.audience,
    evidenceURI: input.evidenceURI,
    verificationState: input.verificationState,
    payloadHash,
    payload: input.payload
  });
}

export function buildMasterShellContractDescriptor(
  generatedAt = new Date().toISOString()
) {
  return {
    schema: "ai-data-platform.master-shell-contract.v1",
    contractVersion: MASTER_SHELL_EVENT_SCHEMA_VERSION,
    build: MASTER_SHELL_CONTRACT_BUILD,
    generatedAt,
    eventSchema: MASTER_SHELL_EVENT_SCHEMA,
    sourceApplications: MASTER_SHELL_SOURCE_DEFINITIONS,
    controlPlanes: [...MASTER_SHELL_CONTROL_PLANE_IDS],
    audiences: [...MASTER_SHELL_AUDIENCES],
    eventFamilies: [...MASTER_SHELL_EVENT_FAMILIES],
    verificationStates: [...MASTER_SHELL_VERIFICATION_STATES],
    registryRequiredFields: [...MASTER_SHELL_REGISTRY_REQUIRED_FIELDS],
    envelopeRequiredFields: [
      "eventId",
      "schema",
      "schemaVersion",
      "sourceId",
      "sourceRevision",
      "shellId",
      "tenantId",
      "eventType",
      "occurredAt",
      "publishedAt",
      "sourceSequence",
      "correlationId",
      "causationId",
      "idempotencyKey",
      "sensitivity",
      "audience",
      "evidenceURI",
      "verificationState",
      "payloadHash",
      "payload"
    ],
    policy: {
      exactSixSourceIds: true,
      commsHubIsComplementaryControlPlane: true,
      childTenantNeverPromotedToSourceIdentity: true,
      payloadHashRequired: true,
      correlationRequired: true,
      causationNullableForRootEvent: true,
      idempotencyRequired: true,
      exactAudienceRequired: true,
      ingestionImplementedInThisBuild: false,
      legacyReceiptUpgradedToV1Automatically: false,
      sourceConnectivityInferred: false,
      missingEvidenceBecomesSuccess: false
    }
  } as const;
}
