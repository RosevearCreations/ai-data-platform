import {
  MASTER_SHELL_SOURCE_DEFINITIONS,
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const MASTER_SHELL_SOURCE_STATES = [
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
] as const;

export type MasterShellSourceState =
  (typeof MASTER_SHELL_SOURCE_STATES)[number];

export type MasterShellEvidenceAuthority =
  | "operator-recorded"
  | "independent-source-verification";

export type MasterShellSourceEvidence = {
  sourceId: MasterShellSourceId;
  recordVersion: number;
  environment: "nonproduction" | "production";
  declaredStatus: Exclude<MasterShellSourceState, "UNKNOWN">;
  statusObservedAt: string;
  statusExpiresAt: string;
  evidenceURI: string;
  manifestURI: string | null;
  immutableRevision: string | null;
  capabilityVersion: string | null;
  approvedOrigin: string | null;
  signerKeyId: string | null;
  signerFingerprint: string | null;
  rolesAllowed: string[];
  holdReason: string | null;
  testEvidenceURI: string | null;
  connectionEvidenceURI: string | null;
  ownerAuthorized: boolean;
  independentTestVerified: boolean;
  independentConnectionVerified: boolean;
  evidenceAuthority: MasterShellEvidenceAuthority;
};

export type MasterShellSourceRegistryView = {
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
  declaredStatus: MasterShellSourceState;
  effectiveStatus: MasterShellSourceState;
  freshness: "UNMEASURED" | "FRESH" | "STALE";
  statusObservedAt: string | null;
  statusExpiresAt: string | null;
  evidenceURI: string | null;
  recordVersion: number | null;
  evidenceAuthority: MasterShellEvidenceAuthority | null;
  contractRecordReady: boolean;
  missingContractFields: string[];
  transitionNote: string;
};

const POSITIVE_SEQUENCE: readonly MasterShellSourceState[] = [
  "UNKNOWN",
  "DISCOVERED",
  "CONFIGURED",
  "AUTHORIZATION_HELD",
  "TEST_VERIFIED",
  "CONNECTED"
];

const INTERRUPTION_STATES: readonly MasterShellSourceState[] = [
  "STALE",
  "DEGRADED",
  "DISCONNECTED",
  "REVOKED",
  "ERROR"
];

const HTTPS_OR_EVIDENCE_URN =
  /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,512}$/;
const SAFE_REVISION = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
const SAFE_FINGERPRINT = /^[A-Za-z0-9:+/=_-]{16,256}$/;

function validIso(value: string) {
  return (
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export function isMasterShellSourceState(
  value: unknown
): value is MasterShellSourceState {
  return (
    typeof value === "string" &&
    MASTER_SHELL_SOURCE_STATES.includes(value as MasterShellSourceState)
  );
}

function requiresConfiguredFields(
  state: MasterShellSourceState
) {
  return [
    "CONFIGURED",
    "AUTHORIZATION_HELD",
    "TEST_VERIFIED",
    "CONNECTED"
  ].includes(state);
}

function requiresIndependentTest(
  state: MasterShellSourceState
) {
  return state === "TEST_VERIFIED" || state === "CONNECTED";
}

function contractMissingFields(
  evidence: MasterShellSourceEvidence | null
) {
  if (!evidence) {
    return [
      "manifestURI",
      "immutableRevision",
      "capabilityVersion",
      "approvedOrigin",
      "signerKeyId",
      "signerFingerprint",
      "rolesAllowed",
      "lastVerifiedEvidenceURI"
    ];
  }

  const missing: string[] = [];
  if (!evidence.manifestURI) missing.push("manifestURI");
  if (!evidence.immutableRevision) missing.push("immutableRevision");
  if (!evidence.capabilityVersion) missing.push("capabilityVersion");
  if (!evidence.approvedOrigin) missing.push("approvedOrigin");
  if (!evidence.signerKeyId) missing.push("signerKeyId");
  if (!evidence.signerFingerprint) missing.push("signerFingerprint");
  if (evidence.rolesAllowed.length < 1) missing.push("rolesAllowed");
  if (!evidence.evidenceURI) missing.push("lastVerifiedEvidenceURI");
  return missing;
}

export function evaluateMasterShellSourceFreshness(
  state: MasterShellSourceState,
  statusExpiresAt: string | null,
  now = new Date()
) {
  if (state === "UNKNOWN" || !statusExpiresAt) {
    return {
      effectiveStatus: state,
      freshness: "UNMEASURED" as const
    };
  }

  if (!validIso(statusExpiresAt)) {
    return {
      effectiveStatus: "ERROR" as const,
      freshness: "UNMEASURED" as const
    };
  }

  const expired = Date.parse(statusExpiresAt) <= now.getTime();
  if (!expired) {
    return {
      effectiveStatus: state,
      freshness: "FRESH" as const
    };
  }

  if (
    state === "DISCOVERED" ||
    state === "CONFIGURED" ||
    state === "AUTHORIZATION_HELD" ||
    state === "TEST_VERIFIED" ||
    state === "CONNECTED"
  ) {
    return {
      effectiveStatus: "STALE" as const,
      freshness: "STALE" as const
    };
  }

  return {
    effectiveStatus: state,
    freshness: "STALE" as const
  };
}

export function validateMasterShellSourceEvidence(
  evidence: MasterShellSourceEvidence
) {
  if (!MASTER_SHELL_SOURCE_IDS.includes(evidence.sourceId)) {
    throw new Error("master_shell_registry_source_invalid");
  }
  if (!Number.isSafeInteger(evidence.recordVersion) || evidence.recordVersion < 1) {
    throw new Error("master_shell_registry_version_invalid");
  }
  if (
    evidence.environment !== "nonproduction" &&
    evidence.environment !== "production"
  ) {
    throw new Error("master_shell_registry_environment_invalid");
  }
  if (
    evidence.declaredStatus === "UNKNOWN" ||
    !isMasterShellSourceState(evidence.declaredStatus)
  ) {
    throw new Error("master_shell_registry_status_invalid");
  }
  if (
    !validIso(evidence.statusObservedAt) ||
    !validIso(evidence.statusExpiresAt) ||
    Date.parse(evidence.statusExpiresAt) <=
      Date.parse(evidence.statusObservedAt)
  ) {
    throw new Error("master_shell_registry_freshness_invalid");
  }
  if (!HTTPS_OR_EVIDENCE_URN.test(evidence.evidenceURI)) {
    throw new Error("master_shell_registry_evidence_uri_invalid");
  }
  if (
    evidence.manifestURI !== null &&
    !HTTPS_OR_EVIDENCE_URN.test(evidence.manifestURI)
  ) {
    throw new Error("master_shell_registry_manifest_uri_invalid");
  }
  if (
    evidence.immutableRevision !== null &&
    !SAFE_REVISION.test(evidence.immutableRevision)
  ) {
    throw new Error("master_shell_registry_revision_invalid");
  }
  if (
    evidence.capabilityVersion !== null &&
    !SAFE_VERSION.test(evidence.capabilityVersion)
  ) {
    throw new Error("master_shell_registry_capability_version_invalid");
  }
  if (
    evidence.approvedOrigin !== null &&
    !/^https:\/\/[^\s]{1,240}$/.test(evidence.approvedOrigin)
  ) {
    throw new Error("master_shell_registry_origin_invalid");
  }
  if (
    evidence.signerKeyId !== null &&
    !SAFE_TEXT.test(evidence.signerKeyId)
  ) {
    throw new Error("master_shell_registry_signer_key_invalid");
  }
  if (
    evidence.signerFingerprint !== null &&
    !SAFE_FINGERPRINT.test(evidence.signerFingerprint)
  ) {
    throw new Error("master_shell_registry_signer_fingerprint_invalid");
  }
  if (
    evidence.rolesAllowed.length > 50 ||
    evidence.rolesAllowed.some(
      (role) => !SAFE_TEXT.test(role) || role.length > 128
    ) ||
    new Set(evidence.rolesAllowed).size !== evidence.rolesAllowed.length
  ) {
    throw new Error("master_shell_registry_roles_invalid");
  }
  if (
    evidence.holdReason !== null &&
    (!SAFE_TEXT.test(evidence.holdReason) ||
      evidence.holdReason.length > 256)
  ) {
    throw new Error("master_shell_registry_hold_reason_invalid");
  }
  for (const uri of [
    evidence.testEvidenceURI,
    evidence.connectionEvidenceURI
  ]) {
    if (uri !== null && !HTTPS_OR_EVIDENCE_URN.test(uri)) {
      throw new Error("master_shell_registry_verification_uri_invalid");
    }
  }

  if (requiresConfiguredFields(evidence.declaredStatus)) {
    if (
      !evidence.manifestURI ||
      !evidence.immutableRevision ||
      !evidence.capabilityVersion ||
      !evidence.approvedOrigin
    ) {
      throw new Error("master_shell_registry_configuration_evidence_required");
    }
  }

  if (evidence.declaredStatus === "AUTHORIZATION_HELD") {
    if (!evidence.holdReason) {
      throw new Error("master_shell_registry_hold_reason_required");
    }
    if (evidence.ownerAuthorized) {
      throw new Error("master_shell_registry_hold_cannot_be_authorized");
    }
  }

  if (requiresIndependentTest(evidence.declaredStatus)) {
    if (
      evidence.evidenceAuthority !== "independent-source-verification" ||
      !evidence.ownerAuthorized ||
      !evidence.independentTestVerified ||
      !evidence.testEvidenceURI ||
      !evidence.signerKeyId ||
      !evidence.signerFingerprint
    ) {
      throw new Error("master_shell_registry_independent_test_required");
    }
  }

  if (evidence.declaredStatus === "CONNECTED") {
    if (
      !evidence.independentConnectionVerified ||
      !evidence.connectionEvidenceURI
    ) {
      throw new Error(
        "master_shell_registry_independent_connection_required"
      );
    }
  }

  return evidence;
}

export function validateMasterShellSourceTransition(
  current: MasterShellSourceState,
  next: MasterShellSourceState
) {
  if (next === "UNKNOWN") {
    throw new Error("master_shell_registry_unknown_is_derived_only");
  }
  if (current === next) return true;

  if (INTERRUPTION_STATES.includes(next)) {
    if (current === "UNKNOWN" && next !== "ERROR" && next !== "DISCONNECTED") {
      throw new Error("master_shell_registry_transition_invalid");
    }
    return true;
  }

  const currentIndex = POSITIVE_SEQUENCE.indexOf(current);
  const nextIndex = POSITIVE_SEQUENCE.indexOf(next);

  if (currentIndex >= 0 && nextIndex === currentIndex + 1) {
    return true;
  }

  if (
    INTERRUPTION_STATES.includes(current) &&
    next === "DISCOVERED"
  ) {
    return true;
  }

  throw new Error("master_shell_registry_transition_invalid");
}

export function buildMasterShellSourceRegistryView(
  latestEvidence:
    | Partial<Record<MasterShellSourceId, MasterShellSourceEvidence>>
    | Map<MasterShellSourceId, MasterShellSourceEvidence>,
  now = new Date()
): MasterShellSourceRegistryView[] {
  return MASTER_SHELL_SOURCE_DEFINITIONS.map((definition) => {
    const evidence =
      latestEvidence instanceof Map
        ? latestEvidence.get(definition.sourceId) ?? null
        : latestEvidence[definition.sourceId] ?? null;

    const declaredStatus =
      evidence?.declaredStatus ?? ("UNKNOWN" as const);
    const freshness = evaluateMasterShellSourceFreshness(
      declaredStatus,
      evidence?.statusExpiresAt ?? null,
      now
    );
    const missingContractFields = contractMissingFields(evidence);

    return {
      sourceId: definition.sourceId,
      shellId: definition.shellId,
      repository: definition.repository,
      shellBoundary: definition.shellBoundary,
      tenancyModel: definition.tenancyModel,
      legacyInternalId: definition.legacyInternalId,
      declaredStatus,
      effectiveStatus: freshness.effectiveStatus,
      freshness: freshness.freshness,
      statusObservedAt: evidence?.statusObservedAt ?? null,
      statusExpiresAt: evidence?.statusExpiresAt ?? null,
      evidenceURI: evidence?.evidenceURI ?? null,
      recordVersion: evidence?.recordVersion ?? null,
      evidenceAuthority: evidence?.evidenceAuthority ?? null,
      contractRecordReady: missingContractFields.length === 0,
      missingContractFields,
      transitionNote:
        declaredStatus === "UNKNOWN"
          ? "No accepted Master Shell registry evidence has been recorded."
          : freshness.effectiveStatus === "STALE"
            ? "Latest positive evidence has expired; STALE is derived without inventing a disconnect."
            : declaredStatus === "AUTHORIZATION_HELD"
              ? "Configuration is recorded but authorization remains explicitly held."
              : declaredStatus === "TEST_VERIFIED"
                ? "Independent TEST evidence is recorded; live connectivity is not yet accepted."
                : declaredStatus === "CONNECTED"
                  ? "Independent TEST and connection evidence are both fresh."
                  : "State is derived from the latest append-only evidence record."
    };
  });
}

export function masterShellSourceRegistrySummary(
  views: MasterShellSourceRegistryView[]
) {
  return {
    sources: views.length,
    unknown: views.filter((item) => item.effectiveStatus === "UNKNOWN").length,
    held: views.filter(
      (item) => item.effectiveStatus === "AUTHORIZATION_HELD"
    ).length,
    testVerified: views.filter(
      (item) => item.effectiveStatus === "TEST_VERIFIED"
    ).length,
    connected: views.filter(
      (item) => item.effectiveStatus === "CONNECTED"
    ).length,
    stale: views.filter((item) => item.effectiveStatus === "STALE").length,
    degraded: views.filter(
      (item) => item.effectiveStatus === "DEGRADED"
    ).length,
    disconnected: views.filter(
      (item) => item.effectiveStatus === "DISCONNECTED"
    ).length
  };
}
