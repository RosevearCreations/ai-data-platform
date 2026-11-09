import {
  parseMasterShellEventEnvelope,
  type MasterShellEventEnvelopeV1,
  type MasterShellSourceId
} from "./master-shell-contract-v1";
import {
  isMasterShellSourceState,
  type MasterShellSourceState
} from "./master-shell-source-registry-core";

export const MASTER_SHELL_INGESTION_BUILD = 337 as const;

export const MASTER_SHELL_INGESTION_EVENT_TYPES = [
  "source.health.reported",
  "release.promoted",
  "module.readiness.changed",
  "audit.evidence.recorded"
] as const;

export type MasterShellIngestionEventType =
  (typeof MASTER_SHELL_INGESTION_EVENT_TYPES)[number];

export const MASTER_SHELL_WEBHOOK_SOURCE_MAP = {
  "yard-workers": "yw",
  icamp: "icamp",
  rosiedazzlers: "rosiedazzlers",
  devilndove: "devilndove",
  "rosevear-ai-hub": "rosevear-ai-hub"
} as const satisfies Record<string, MasterShellSourceId>;

export type SupportedWebhookSourceApplication =
  keyof typeof MASTER_SHELL_WEBHOOK_SOURCE_MAP;

type SourceHealthPayload = {
  expiresAt: string;
  registryStatus: Exclude<MasterShellSourceState, "UNKNOWN" | "STALE">;
  manifestURI: string | null;
  capabilityVersion: string | null;
  approvedOrigin: string | null;
  rolesAllowed: string[];
  holdReason: string | null;
  testEvidenceURI: string | null;
  connectionEvidenceURI: string | null;
};

type ReleasePayload = {
  expiresAt: string;
  releaseId: string;
  branch: string;
  deploymentStatus: "GREEN" | "RED" | "HOLD" | "UNKNOWN";
  evidenceURI: string;
};

type ModuleReadinessPayload = {
  expiresAt: string;
  moduleId: string;
  readinessState:
    | "UNKNOWN"
    | "IN_PROGRESS"
    | "BLOCKED"
    | "READY"
    | "ACCEPTED";
  completionPercent: number | null;
  evidenceURI: string;
};

type AuditEvidencePayload = {
  expiresAt: string;
  evidenceType: string;
  result: "passed" | "failed" | "held" | "unknown";
  evidenceURI: string;
};

export type NormalizedMasterShellPayload =
  | SourceHealthPayload
  | ReleasePayload
  | ModuleReadinessPayload
  | AuditEvidencePayload;

export type NormalizedMasterShellSourceUpdate = {
  envelope: MasterShellEventEnvelopeV1;
  sourceId: MasterShellSourceId;
  eventType: MasterShellIngestionEventType;
  tenantId: string | null;
  expiresAt: string;
  freshness: "fresh" | "stale";
  normalizedPayload: NormalizedMasterShellPayload;
};

const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,256}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const URI = /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[]
) {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    actual.every((key) => keys.includes(key))
  );
}

function iso(value: unknown) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error("master_shell_ingestion_time_invalid");
  }
  return value;
}

function uriOrNull(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || !URI.test(value)) {
    throw new Error("master_shell_ingestion_uri_invalid");
  }
  return value;
}

function uri(value: unknown) {
  const result = uriOrNull(value);
  if (!result) throw new Error("master_shell_ingestion_uri_required");
  return result;
}

function safeText(value: unknown, code: string) {
  if (typeof value !== "string" || !SAFE_TEXT.test(value)) {
    throw new Error(code);
  }
  return value;
}

function safeId(value: unknown, code: string) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new Error(code);
  }
  return value;
}

function roles(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length > 50 ||
    value.some(
      (item) =>
        typeof item !== "string" ||
        !SAFE_TEXT.test(item) ||
        item.length > 128
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new Error("master_shell_ingestion_roles_invalid");
  }
  return [...value] as string[];
}

function parseSourceHealthPayload(
  value: Record<string, unknown>
): SourceHealthPayload {
  const keys = [
    "expiresAt",
    "registryStatus",
    "manifestURI",
    "capabilityVersion",
    "approvedOrigin",
    "rolesAllowed",
    "holdReason",
    "testEvidenceURI",
    "connectionEvidenceURI"
  ] as const;
  if (!exactKeys(value, keys)) {
    throw new Error("master_shell_ingestion_health_shape_invalid");
  }

  const registryStatus = value.registryStatus;
  if (
    !isMasterShellSourceState(registryStatus) ||
    registryStatus === "UNKNOWN" ||
    registryStatus === "STALE"
  ) {
    throw new Error("master_shell_ingestion_health_state_invalid");
  }

  const holdReason =
    value.holdReason === null
      ? null
      : safeText(
          value.holdReason,
          "master_shell_ingestion_hold_reason_invalid"
        );

  return {
    expiresAt: iso(value.expiresAt),
    registryStatus,
    manifestURI: uriOrNull(value.manifestURI),
    capabilityVersion:
      value.capabilityVersion === null
        ? null
        : safeId(
            value.capabilityVersion,
            "master_shell_ingestion_capability_version_invalid"
          ),
    approvedOrigin:
      value.approvedOrigin === null
        ? null
        : (() => {
            const result = String(value.approvedOrigin);
            if (!/^https:\/\/[^\s]{1,240}$/.test(result)) {
              throw new Error(
                "master_shell_ingestion_approved_origin_invalid"
              );
            }
            return result;
          })(),
    rolesAllowed: roles(value.rolesAllowed),
    holdReason,
    testEvidenceURI: uriOrNull(value.testEvidenceURI),
    connectionEvidenceURI: uriOrNull(value.connectionEvidenceURI)
  };
}

function parseReleasePayload(
  value: Record<string, unknown>
): ReleasePayload {
  const keys = [
    "expiresAt",
    "releaseId",
    "branch",
    "deploymentStatus",
    "evidenceURI"
  ] as const;
  if (!exactKeys(value, keys)) {
    throw new Error("master_shell_ingestion_release_shape_invalid");
  }
  if (
    value.deploymentStatus !== "GREEN" &&
    value.deploymentStatus !== "RED" &&
    value.deploymentStatus !== "HOLD" &&
    value.deploymentStatus !== "UNKNOWN"
  ) {
    throw new Error("master_shell_ingestion_release_status_invalid");
  }
  return {
    expiresAt: iso(value.expiresAt),
    releaseId: safeId(
      value.releaseId,
      "master_shell_ingestion_release_id_invalid"
    ),
    branch: safeId(
      value.branch,
      "master_shell_ingestion_branch_invalid"
    ),
    deploymentStatus: value.deploymentStatus,
    evidenceURI: uri(value.evidenceURI)
  };
}

function parseModulePayload(
  value: Record<string, unknown>
): ModuleReadinessPayload {
  const keys = [
    "expiresAt",
    "moduleId",
    "readinessState",
    "completionPercent",
    "evidenceURI"
  ] as const;
  if (!exactKeys(value, keys)) {
    throw new Error("master_shell_ingestion_module_shape_invalid");
  }
  if (
    value.readinessState !== "UNKNOWN" &&
    value.readinessState !== "IN_PROGRESS" &&
    value.readinessState !== "BLOCKED" &&
    value.readinessState !== "READY" &&
    value.readinessState !== "ACCEPTED"
  ) {
    throw new Error("master_shell_ingestion_module_state_invalid");
  }
  const completionPercent =
    value.completionPercent === null
      ? null
      : Number(value.completionPercent);
  if (
    completionPercent !== null &&
    (!Number.isFinite(completionPercent) ||
      completionPercent < 0 ||
      completionPercent > 100)
  ) {
    throw new Error(
      "master_shell_ingestion_completion_percent_invalid"
    );
  }
  return {
    expiresAt: iso(value.expiresAt),
    moduleId: safeId(
      value.moduleId,
      "master_shell_ingestion_module_id_invalid"
    ),
    readinessState: value.readinessState,
    completionPercent,
    evidenceURI: uri(value.evidenceURI)
  };
}

function parseAuditPayload(
  value: Record<string, unknown>
): AuditEvidencePayload {
  const keys = [
    "expiresAt",
    "evidenceType",
    "result",
    "evidenceURI"
  ] as const;
  if (!exactKeys(value, keys)) {
    throw new Error("master_shell_ingestion_audit_shape_invalid");
  }
  if (
    value.result !== "passed" &&
    value.result !== "failed" &&
    value.result !== "held" &&
    value.result !== "unknown"
  ) {
    throw new Error("master_shell_ingestion_audit_result_invalid");
  }
  return {
    expiresAt: iso(value.expiresAt),
    evidenceType: safeId(
      value.evidenceType,
      "master_shell_ingestion_evidence_type_invalid"
    ),
    result: value.result,
    evidenceURI: uri(value.evidenceURI)
  };
}

export function mapWebhookSourceToMasterShellSource(
  value: string
): MasterShellSourceId {
  if (value === "rosevear-comms-hub") {
    throw new Error(
      "master_shell_ingestion_comms_control_plane_not_source"
    );
  }
  const mapped =
    MASTER_SHELL_WEBHOOK_SOURCE_MAP[
      value as SupportedWebhookSourceApplication
    ];
  if (!mapped) {
    throw new Error("master_shell_ingestion_transport_source_invalid");
  }
  return mapped;
}

export function normalizeMasterShellSourceUpdate(input: {
  transportSourceApplicationId: string;
  transportTenantId: string | null;
  envelope: unknown;
  now?: Date;
}): NormalizedMasterShellSourceUpdate {
  const envelope = parseMasterShellEventEnvelope(input.envelope);
  const sourceId = mapWebhookSourceToMasterShellSource(
    input.transportSourceApplicationId
  );

  if (envelope.sourceId !== sourceId) {
    throw new Error("master_shell_ingestion_source_mismatch");
  }
  if (envelope.tenantId !== input.transportTenantId) {
    throw new Error("master_shell_ingestion_tenant_mismatch");
  }
  if (!envelope.audience.includes("ai-data-platform")) {
    throw new Error("master_shell_ingestion_audience_denied");
  }
  if (
    !MASTER_SHELL_INGESTION_EVENT_TYPES.includes(
      envelope.eventType as MasterShellIngestionEventType
    )
  ) {
    throw new Error("master_shell_ingestion_event_type_unsupported");
  }

  const payload = object(envelope.payload);
  if (!payload) {
    throw new Error("master_shell_ingestion_payload_invalid");
  }

  let normalizedPayload: NormalizedMasterShellPayload;
  switch (envelope.eventType) {
    case "source.health.reported":
      normalizedPayload = parseSourceHealthPayload(payload);
      break;
    case "release.promoted":
      normalizedPayload = parseReleasePayload(payload);
      break;
    case "module.readiness.changed":
      normalizedPayload = parseModulePayload(payload);
      break;
    case "audit.evidence.recorded":
      normalizedPayload = parseAuditPayload(payload);
      break;
    default:
      throw new Error("master_shell_ingestion_event_type_unsupported");
  }

  if (
    Date.parse(normalizedPayload.expiresAt) <=
    Date.parse(envelope.occurredAt)
  ) {
    throw new Error("master_shell_ingestion_expiry_order_invalid");
  }

  const now = input.now ?? new Date();
  return {
    envelope,
    sourceId,
    eventType: envelope.eventType as MasterShellIngestionEventType,
    tenantId: envelope.tenantId,
    expiresAt: normalizedPayload.expiresAt,
    freshness:
      Date.parse(normalizedPayload.expiresAt) <= now.getTime()
        ? "stale"
        : "fresh",
    normalizedPayload
  };
}

export function canAdvanceRegistryFromNormalizedUpdate(
  update: NormalizedMasterShellSourceUpdate
) {
  return (
    update.eventType === "source.health.reported" &&
    update.freshness === "fresh" &&
    update.envelope.verificationState === "independently-verified"
  );
}
