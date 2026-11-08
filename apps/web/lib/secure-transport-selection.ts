import { createHash } from "node:crypto";

import { normalizeTrustedOrigin } from "./embedded-module-runtime";
import type { HostEnvironment } from "./universal-module-contract";

export const SECURE_TRANSPORT_VERSION = "1.0.0" as const;
export const SECURE_TRANSPORT_MANIFEST_SCHEMA =
  "rosevear.ai-data-platform.transport-manifest.v1" as const;
export const SECURE_TRANSPORT_HEALTH_SCHEMA =
  "rosevear.ai-data-platform.transport-health.v1" as const;
export const SECURE_TRANSPORT_SELECTION_SCHEMA =
  "rosevear.ai-data-platform.transport-selection.v1" as const;
export const SECURE_TRANSPORT_AUDIT_SCHEMA =
  "rosevear.ai-data-platform.transport-selection-audit.v1" as const;

export const SECURE_TRANSPORT_KINDS = [
  "direct-https",
  "trusted-local-relay",
  "approved-cloud-relay"
] as const;

export const TRANSPORT_SECURITY_LEVELS = [
  "standard",
  "hardened"
] as const;

export type SecureTransportKind =
  (typeof SECURE_TRANSPORT_KINDS)[number];
export type TransportSecurityLevel =
  (typeof TRANSPORT_SECURITY_LEVELS)[number];
export type TransportHealthStatus =
  | "unknown"
  | "healthy"
  | "degraded"
  | "unhealthy";

export type TransportHealthContract = {
  method: "GET" | "HEAD";
  path: string;
  expectedStatuses: number[];
  timeoutMs: number;
};

export type LocalRelayRegistration = {
  relayId: string;
  trustReference: string;
  trustReferenceKind: "configured-reference";
  rawTrustMaterialIncluded: false;
};

export type SecureTransportManifest = {
  schema: typeof SECURE_TRANSPORT_MANIFEST_SCHEMA;
  version: typeof SECURE_TRANSPORT_VERSION;
  transportId: string;
  transportVersion: string;
  displayName: string;
  kind: SecureTransportKind;
  environment: HostEnvironment;
  destinationOrigin: string;
  originAllowlist: string[];
  priority: number;
  enabled: boolean;
  failoverEligible: boolean;
  securityLevel: TransportSecurityLevel;
  securityStrength: number;
  health: TransportHealthContract;
  localRelay: LocalRelayRegistration | null;
  security: {
    exactOriginsRequired: true;
    wildcardOriginsAllowed: false;
    rawCredentialsIncluded: false;
    transportSelectionGrantsAuthorization: false;
    silentSecurityDowngradeAllowed: false;
  };
};

export type TransportHealthEvidence = {
  schema: typeof SECURE_TRANSPORT_HEALTH_SCHEMA;
  version: typeof SECURE_TRANSPORT_VERSION;
  transportId: string;
  probeId: string;
  status: TransportHealthStatus;
  checkedAt: string;
  latencyMs: number | null;
  observedOrigin: string;
  externalRequestPerformedBySelector: false;
};

export type TransportSelectionAudit = {
  schema: typeof SECURE_TRANSPORT_AUDIT_SCHEMA;
  version: typeof SECURE_TRANSPORT_VERSION;
  selectionIdSha256: string;
  auditCorrelationId: string;
  environment: HostEnvironment;
  requestedTransportId: string | null;
  chosenTransportId: string | null;
  failoverFromTransportId: string | null;
  outcome: "selected" | "held";
  reasonCode:
    | "requested-transport-selected"
    | "priority-transport-selected"
    | "failover-transport-selected"
    | "requested-transport-unavailable"
    | "no-healthy-transport"
    | "security-downgrade-denied";
  chosenSecurityLevel: TransportSecurityLevel | null;
  minimumSecurityLevel: TransportSecurityLevel;
  healthEvidenceIds: string[];
  networkRequestPerformedBySelector: false;
  authorizationGrantedBySelection: false;
  silentDowngradePerformed: false;
  occurredAt: string;
};

export type SecureTransportSelection = {
  schema: typeof SECURE_TRANSPORT_SELECTION_SCHEMA;
  version: typeof SECURE_TRANSPORT_VERSION;
  state: "selected" | "held";
  transport: SecureTransportManifest | null;
  audit: TransportSelectionAudit;
};

const TRANSPORT_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const OPAQUE_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{5,159}$/;
const HEALTH_PATH_PATTERN =
  /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]"
]);
const MAX_HEALTH_AGE_MS = 300_000;

function strength(level: TransportSecurityLevel) {
  return level === "hardened" ? 300 : 200;
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function exactOrigin(value: string) {
  return normalizeTrustedOrigin(value);
}

function isHttps(origin: string) {
  return new URL(origin).protocol === "https:";
}

function isLoopback(origin: string) {
  return LOCAL_HOSTS.has(new URL(origin).hostname);
}

function normalizeAllowlist(values: readonly string[]) {
  if (values.length < 1 || values.length > 25) {
    throw new Error("transport_origin_allowlist_size_invalid");
  }
  const normalized = values.map(exactOrigin);
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("transport_origin_allowlist_duplicate");
  }
  return normalized;
}

function normalizeHealthContract(
  input: TransportHealthContract
): TransportHealthContract {
  if (
    (input.method !== "GET" && input.method !== "HEAD") ||
    !HEALTH_PATH_PATTERN.test(input.path) ||
    input.path.includes("//") ||
    !Number.isInteger(input.timeoutMs) ||
    input.timeoutMs < 100 ||
    input.timeoutMs > 15_000 ||
    input.expectedStatuses.length < 1 ||
    input.expectedStatuses.length > 10 ||
    input.expectedStatuses.some(
      (status) =>
        !Number.isInteger(status) || status < 200 || status > 399
    ) ||
    new Set(input.expectedStatuses).size !==
      input.expectedStatuses.length
  ) {
    throw new Error("transport_health_contract_invalid");
  }

  return Object.freeze({
    method: input.method,
    path: input.path,
    expectedStatuses: [...input.expectedStatuses],
    timeoutMs: input.timeoutMs
  });
}

export function createSecureTransportManifest(input: {
  transportId: string;
  transportVersion?: string;
  displayName: string;
  kind: SecureTransportKind;
  environment: HostEnvironment;
  destinationOrigin: string;
  originAllowlist: readonly string[];
  priority?: number;
  enabled?: boolean;
  failoverEligible?: boolean;
  securityLevel?: TransportSecurityLevel;
  health: TransportHealthContract;
  localRelay?: {
    relayId: string;
    trustReference: string;
  } | null;
}): SecureTransportManifest {
  const transportVersion =
    input.transportVersion ?? SECURE_TRANSPORT_VERSION;
  if (
    !TRANSPORT_ID_PATTERN.test(input.transportId) ||
    input.transportId.length > 120
  ) {
    throw new Error("transport_id_invalid");
  }
  if (!SEMVER_PATTERN.test(transportVersion)) {
    throw new Error("transport_version_invalid");
  }
  const displayName = input.displayName.trim();
  if (
    !displayName ||
    displayName.length > 160 ||
    /[\r\n\0]/.test(displayName)
  ) {
    throw new Error("transport_display_name_invalid");
  }
  if (!SECURE_TRANSPORT_KINDS.includes(input.kind)) {
    throw new Error("transport_kind_invalid");
  }

  const destinationOrigin = exactOrigin(
    input.destinationOrigin
  );
  const originAllowlist = normalizeAllowlist(
    input.originAllowlist
  );
  if (!originAllowlist.includes(destinationOrigin)) {
    throw new Error("transport_destination_not_allowlisted");
  }

  if (
    (input.kind === "direct-https" ||
      input.kind === "approved-cloud-relay") &&
    !isHttps(destinationOrigin)
  ) {
    throw new Error("transport_https_required");
  }

  const securityLevel = input.securityLevel ?? "standard";
  if (!TRANSPORT_SECURITY_LEVELS.includes(securityLevel)) {
    throw new Error("transport_security_level_invalid");
  }

  let localRelay: LocalRelayRegistration | null = null;
  if (input.kind === "trusted-local-relay") {
    if (!input.localRelay) {
      throw new Error("transport_local_relay_registration_required");
    }
    if (
      !OPAQUE_ID_PATTERN.test(input.localRelay.relayId) ||
      !OPAQUE_ID_PATTERN.test(input.localRelay.trustReference)
    ) {
      throw new Error("transport_local_relay_registration_invalid");
    }
    if (
      !isHttps(destinationOrigin) &&
      !(
        input.environment !== "production" &&
        isLoopback(destinationOrigin)
      )
    ) {
      throw new Error("transport_local_relay_origin_invalid");
    }
    localRelay = Object.freeze({
      relayId: input.localRelay.relayId,
      trustReference: input.localRelay.trustReference,
      trustReferenceKind: "configured-reference" as const,
      rawTrustMaterialIncluded: false as const
    });
  } else if (input.localRelay) {
    throw new Error("transport_local_relay_not_applicable");
  }

  const priority = input.priority ?? 100;
  if (
    !Number.isInteger(priority) ||
    priority < 1 ||
    priority > 1000
  ) {
    throw new Error("transport_priority_invalid");
  }

  return Object.freeze({
    schema: SECURE_TRANSPORT_MANIFEST_SCHEMA,
    version: SECURE_TRANSPORT_VERSION,
    transportId: input.transportId,
    transportVersion,
    displayName,
    kind: input.kind,
    environment: input.environment,
    destinationOrigin,
    originAllowlist,
    priority,
    enabled: input.enabled ?? true,
    failoverEligible: input.failoverEligible ?? true,
    securityLevel,
    securityStrength: strength(securityLevel),
    health: normalizeHealthContract(input.health),
    localRelay,
    security: Object.freeze({
      exactOriginsRequired: true as const,
      wildcardOriginsAllowed: false as const,
      rawCredentialsIncluded: false as const,
      transportSelectionGrantsAuthorization: false as const,
      silentSecurityDowngradeAllowed: false as const
    })
  });
}

export function registerTrustedLocalRelay(input: {
  transportId: string;
  displayName: string;
  environment: HostEnvironment;
  relayOrigin: string;
  originAllowlist?: readonly string[];
  relayId: string;
  trustReference: string;
  priority?: number;
  securityLevel?: TransportSecurityLevel;
  health?: Partial<TransportHealthContract>;
}): SecureTransportManifest {
  return createSecureTransportManifest({
    transportId: input.transportId,
    displayName: input.displayName,
    kind: "trusted-local-relay",
    environment: input.environment,
    destinationOrigin: input.relayOrigin,
    originAllowlist:
      input.originAllowlist ?? [input.relayOrigin],
    priority: input.priority,
    securityLevel: input.securityLevel ?? "hardened",
    health: {
      method: input.health?.method ?? "GET",
      path: input.health?.path ?? "/health",
      expectedStatuses:
        input.health?.expectedStatuses ?? [200],
      timeoutMs: input.health?.timeoutMs ?? 3_000
    },
    localRelay: {
      relayId: input.relayId,
      trustReference: input.trustReference
    }
  });
}

export function createTransportHealthEvidence(input: {
  manifest: SecureTransportManifest;
  probeId: string;
  status: TransportHealthStatus;
  checkedAt: string;
  latencyMs?: number | null;
  observedOrigin?: string;
}): TransportHealthEvidence {
  if (!OPAQUE_ID_PATTERN.test(input.probeId)) {
    throw new Error("transport_health_probe_id_invalid");
  }
  if (
    !["unknown", "healthy", "degraded", "unhealthy"].includes(
      input.status
    )
  ) {
    throw new Error("transport_health_status_invalid");
  }
  const checkedAtMs = Date.parse(input.checkedAt);
  if (!Number.isFinite(checkedAtMs)) {
    throw new Error("transport_health_checked_at_invalid");
  }
  const latencyMs = input.latencyMs ?? null;
  if (
    latencyMs !== null &&
    (!Number.isInteger(latencyMs) ||
      latencyMs < 0 ||
      latencyMs > 120_000)
  ) {
    throw new Error("transport_health_latency_invalid");
  }

  const observedOrigin = exactOrigin(
    input.observedOrigin ?? input.manifest.destinationOrigin
  );
  if (
    observedOrigin !== input.manifest.destinationOrigin ||
    !input.manifest.originAllowlist.includes(observedOrigin)
  ) {
    throw new Error("transport_health_origin_mismatch");
  }

  return Object.freeze({
    schema: SECURE_TRANSPORT_HEALTH_SCHEMA,
    version: SECURE_TRANSPORT_VERSION,
    transportId: input.manifest.transportId,
    probeId: input.probeId,
    status: input.status,
    checkedAt: new Date(checkedAtMs).toISOString(),
    latencyMs,
    observedOrigin,
    externalRequestPerformedBySelector: false as const
  });
}

function freshHealthyEvidence(
  manifest: SecureTransportManifest,
  evidence: readonly TransportHealthEvidence[],
  nowMs: number,
  allowDegraded: boolean
) {
  const matching = evidence
    .filter(
      (item) =>
        item.transportId === manifest.transportId &&
        item.observedOrigin === manifest.destinationOrigin
    )
    .sort(
      (left, right) =>
        Date.parse(right.checkedAt) - Date.parse(left.checkedAt)
    )[0];

  if (!matching) return null;
  const checkedAt = Date.parse(matching.checkedAt);
  if (
    !Number.isFinite(checkedAt) ||
    checkedAt > nowMs + 30_000 ||
    nowMs - checkedAt > MAX_HEALTH_AGE_MS
  ) {
    return null;
  }
  if (
    matching.status !== "healthy" &&
    !(allowDegraded && matching.status === "degraded")
  ) {
    return null;
  }
  return matching;
}

function auditId(input: {
  auditCorrelationId: string;
  environment: HostEnvironment;
  requestedTransportId: string | null;
  chosenTransportId: string | null;
  occurredAt: string;
  reasonCode: TransportSelectionAudit["reasonCode"];
}) {
  return sha256([
    "rosevear-secure-transport-selection-v1",
    input.auditCorrelationId,
    input.environment,
    input.requestedTransportId,
    input.chosenTransportId,
    input.occurredAt,
    input.reasonCode
  ]);
}

export function selectSecureTransport(input: {
  transports: readonly SecureTransportManifest[];
  healthEvidence: readonly TransportHealthEvidence[];
  environment: HostEnvironment;
  auditCorrelationId: string;
  requestedTransportId?: string | null;
  allowFailover?: boolean;
  allowDegraded?: boolean;
  minimumSecurityLevel?: TransportSecurityLevel;
  now?: string;
}): SecureTransportSelection {
  if (
    !OPAQUE_ID_PATTERN.test(input.auditCorrelationId)
  ) {
    throw new Error("transport_audit_correlation_invalid");
  }
  if (
    input.transports.length < 1 ||
    input.transports.length > 50
  ) {
    throw new Error("transport_manifest_set_invalid");
  }

  const ids = new Set<string>();
  for (const transport of input.transports) {
    if (ids.has(transport.transportId)) {
      throw new Error("transport_manifest_duplicate");
    }
    ids.add(transport.transportId);
  }

  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) {
    throw new Error("transport_selection_time_invalid");
  }

  const minimumSecurityLevel =
    input.minimumSecurityLevel ?? "standard";
  if (
    !TRANSPORT_SECURITY_LEVELS.includes(
      minimumSecurityLevel
    )
  ) {
    throw new Error("transport_minimum_security_invalid");
  }
  const minimumStrength = strength(minimumSecurityLevel);
  const requestedTransportId =
    input.requestedTransportId ?? null;
  const requested = requestedTransportId
    ? input.transports.find(
        (item) => item.transportId === requestedTransportId
      ) ?? null
    : null;

  const available = input.transports
    .filter(
      (transport) =>
        transport.environment === input.environment &&
        transport.enabled &&
        transport.securityStrength >= minimumStrength
    )
    .map((transport) => ({
      transport,
      health: freshHealthyEvidence(
        transport,
        input.healthEvidence,
        nowMs,
        input.allowDegraded === true
      )
    }))
    .filter(
      (
        item
      ): item is {
        transport: SecureTransportManifest;
        health: TransportHealthEvidence;
      } => item.health !== null
    )
    .sort(
      (left, right) =>
        left.transport.priority - right.transport.priority ||
        right.transport.securityStrength -
          left.transport.securityStrength ||
        left.transport.transportId.localeCompare(
          right.transport.transportId
        )
    );

  let chosen:
    | {
        transport: SecureTransportManifest;
        health: TransportHealthEvidence;
      }
    | null = null;
  let reasonCode: TransportSelectionAudit["reasonCode"];
  let failoverFromTransportId: string | null = null;

  if (requestedTransportId) {
    const requestedAvailable =
      available.find(
        (item) =>
          item.transport.transportId === requestedTransportId
      ) ?? null;
    if (requestedAvailable) {
      chosen = requestedAvailable;
      reasonCode = "requested-transport-selected";
    } else if (input.allowFailover !== true) {
      reasonCode = "requested-transport-unavailable";
    } else {
      const baselineStrength =
        requested?.securityStrength ?? minimumStrength;
      const failover = available.find(
        (item) =>
          item.transport.transportId !== requestedTransportId &&
          item.transport.failoverEligible &&
          item.transport.securityStrength >= baselineStrength
      ) ?? null;

      if (failover) {
        chosen = failover;
        failoverFromTransportId = requestedTransportId;
        reasonCode = "failover-transport-selected";
      } else {
        const weakerCandidate = available.some(
          (item) =>
            item.transport.transportId !== requestedTransportId &&
            item.transport.failoverEligible &&
            item.transport.securityStrength < baselineStrength
        );
        reasonCode = weakerCandidate
          ? "security-downgrade-denied"
          : "requested-transport-unavailable";
      }
    }
  } else if (available[0]) {
    chosen = available[0];
    reasonCode = "priority-transport-selected";
  } else {
    reasonCode = "no-healthy-transport";
  }

  const occurredAt = new Date(nowMs).toISOString();
  const audit: TransportSelectionAudit = Object.freeze({
    schema: SECURE_TRANSPORT_AUDIT_SCHEMA,
    version: SECURE_TRANSPORT_VERSION,
    selectionIdSha256: auditId({
      auditCorrelationId: input.auditCorrelationId,
      environment: input.environment,
      requestedTransportId,
      chosenTransportId:
        chosen?.transport.transportId ?? null,
      occurredAt,
      reasonCode
    }),
    auditCorrelationId: input.auditCorrelationId,
    environment: input.environment,
    requestedTransportId,
    chosenTransportId:
      chosen?.transport.transportId ?? null,
    failoverFromTransportId,
    outcome: chosen ? ("selected" as const) : ("held" as const),
    reasonCode,
    chosenSecurityLevel:
      chosen?.transport.securityLevel ?? null,
    minimumSecurityLevel,
    healthEvidenceIds: chosen
      ? [chosen.health.probeId]
      : [],
    networkRequestPerformedBySelector: false as const,
    authorizationGrantedBySelection: false as const,
    silentDowngradePerformed: false as const,
    occurredAt
  });

  return Object.freeze({
    schema: SECURE_TRANSPORT_SELECTION_SCHEMA,
    version: SECURE_TRANSPORT_VERSION,
    state: chosen ? ("selected" as const) : ("held" as const),
    transport: chosen?.transport ?? null,
    audit
  });
}

export function secureTransportDescriptor() {
  return Object.freeze({
    schema:
      "rosevear.ai-data-platform.secure-transport-module.v1",
    version: SECURE_TRANSPORT_VERSION,
    transportKinds: [...SECURE_TRANSPORT_KINDS],
    originAllowlist: {
      exactOriginsOnly: true,
      wildcardAllowed: false,
      httpsRequiredForDirectAndCloud: true,
      loopbackHttpOnlyForNonproductionLocalRelay: true
    },
    localRelayRegistration: {
      supported: true,
      trustMaterialReferenceOnly: true,
      rawTrustMaterialAccepted: false
    },
    cloudDirectMode: true,
    transportHealth: {
      declarativeContract: true,
      evidenceMaximumAgeMs: MAX_HEALTH_AGE_MS,
      selectorPerformsProbe: false
    },
    failover: {
      explicitOptInRequired: true,
      candidateMustBeEnabled: true,
      candidateMustBeHealthy: true,
      candidateMustAllowFailover: true,
      equalOrStrongerSecurityRequired: true,
      silentDowngradeAllowed: false
    },
    auditEvidence: {
      chosenTransportRecorded: true,
      healthEvidenceReferenced: true,
      authorizationGrantedBySelection: false
    },
    security: {
      transportPresenceActivatesConnection: false,
      transportSelectionGrantsAuthorization: false,
      rawCredentialsAccepted: false,
      selectorPerformsNetworkRequest: false
    }
  });
}
