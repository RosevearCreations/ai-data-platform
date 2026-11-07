import {
  AI_DATA_MODULE_ID,
  HOST_ENVIRONMENTS,
  type HostEnvironment,
  type HostRuntimeContext
} from "./universal-module-contract";

export const HOST_SESSION_BRIDGE_VERSION = "1.0.0" as const;
export const HOST_SESSION_ASSERTION_SCHEMA =
  "rosevear.ai-data-platform.host-session-assertion.v1" as const;
export const HOST_SESSION_BRIDGE_SCHEMA =
  "rosevear.ai-data-platform.host-session-bridge.v1" as const;

export const HOST_SESSION_SIGNATURE_ALGORITHMS = [
  "Ed25519",
  "ES256"
] as const;

export type HostSessionSignatureAlgorithm =
  (typeof HOST_SESSION_SIGNATURE_ALGORITHMS)[number];

export type HostSessionAssertionClaims = {
  issuer: string;
  audience: typeof AI_DATA_MODULE_ID;
  assertionId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  hostSubjectId: string;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
  auditCorrelationId: string;
};

export type HostSessionAssertionEnvelope = {
  schema: typeof HOST_SESSION_ASSERTION_SCHEMA;
  algorithm: HostSessionSignatureAlgorithm;
  keyId: string;
  claims: HostSessionAssertionClaims;
  signature: string;
};

export type HostSessionAssertionSignatureVerifier = {
  verify(input: {
    algorithm: HostSessionSignatureAlgorithm;
    keyId: string;
    issuer: string;
    signingInput: string;
    signature: string;
  }): boolean | Promise<boolean>;
};

export type HostSubjectMappingResult = {
  moduleSubjectId: string;
  status: "active" | "disabled";
};

export type HostSubjectMapper = {
  mapSubject(input: {
    issuer: string;
    hostApplicationId: string;
    hostSubjectId: string;
  }): HostSubjectMappingResult | null | Promise<HostSubjectMappingResult | null>;
};

export type HostSessionAssertionReplayGuard = {
  consume(input: {
    issuer: string;
    assertionId: string;
    sessionId: string;
    expiresAt: string;
  }): boolean | Promise<boolean>;
};

export type HostSessionAuditStatus =
  | "accepted"
  | "rejected"
  | "reauthentication_required";

export type HostSessionAuditReason =
  | "accepted"
  | "malformed_assertion"
  | "unsupported_algorithm"
  | "signature_invalid"
  | "audience_mismatch"
  | "host_identity_mismatch"
  | "subject_identity_mismatch"
  | "subject_mapping_missing"
  | "subject_mapping_disabled"
  | "session_expired"
  | "session_not_yet_valid"
  | "session_lifetime_invalid"
  | "assertion_replayed";

export type HostSessionAuditEvent = {
  schema: "rosevear.ai-data-platform.host-session-audit.v1";
  bridgeVersion: typeof HOST_SESSION_BRIDGE_VERSION;
  status: HostSessionAuditStatus;
  reason: HostSessionAuditReason;
  issuer: string | null;
  hostApplicationId: string | null;
  hostEnvironment: HostEnvironment | null;
  hostInstanceId: string | null;
  hostSubjectId: string | null;
  moduleSubjectId: string | null;
  sessionId: string | null;
  assertionId: string | null;
  auditCorrelationId: string | null;
  occurredAt: string;
};

export type HostSessionAuditSink = {
  record(event: HostSessionAuditEvent): void | Promise<void>;
};

export type HostSessionExpectedIdentity = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  expectedHostSubjectId?: string;
  expectedModuleSubjectId?: string;
};

export type AuthenticatedHostSessionContext = {
  schema: "rosevear.ai-data-platform.authenticated-host-session.v1";
  bridgeVersion: typeof HOST_SESSION_BRIDGE_VERSION;
  issuer: string;
  keyId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  hostSubjectId: string;
  moduleSubjectId: string;
  sessionId: string;
  assertionId: string;
  issuedAt: string;
  expiresAt: string;
  auditCorrelationId: string;
  signatureValidated: true;
  subjectMapped: true;
  authorizationGranted: false;
};

export type HostReauthenticationHandoff = {
  schema: "rosevear.ai-data-platform.host-reauthentication-handoff.v1";
  mode: "host-reauthentication";
  reason: "session_expired" | "session_not_yet_valid";
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  sessionId: string;
  auditCorrelationId: string;
  instruction:
    "reauthenticate-with-host-then-submit-a-new-signed-session-assertion";
  carriesCredential: false;
  grantsAuthorization: false;
};

export type HostSessionValidationResult =
  | {
      status: "accepted";
      context: AuthenticatedHostSessionContext;
      reauthentication: null;
    }
  | {
      status: "reauthentication_required";
      context: null;
      reauthentication: HostReauthenticationHandoff;
    };

export type HostSessionBridgeOptions = {
  signatureVerifier: HostSessionAssertionSignatureVerifier;
  subjectMapper: HostSubjectMapper;
  replayGuard: HostSessionAssertionReplayGuard;
  auditSink?: HostSessionAuditSink;
  now?: () => string;
  maxClockSkewMs?: number;
  maxSessionLifetimeMs?: number;
};

export class HostSessionBridgeError extends Error {
  readonly code:
    | "malformed_assertion"
    | "unsupported_algorithm"
    | "signature_invalid"
    | "audience_mismatch"
    | "host_identity_mismatch"
    | "subject_identity_mismatch"
    | "subject_mapping_missing"
    | "subject_mapping_disabled"
    | "session_lifetime_invalid"
    | "assertion_replayed";

  constructor(code: HostSessionBridgeError["code"], message: string) {
    super(message);
    this.name = "HostSessionBridgeError";
    this.code = code;
  }
}

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/;
const APPLICATION_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const ISSUER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{2,159}$/;
const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{2,159}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{32,2048}$/;

const ENVELOPE_KEYS = [
  "schema",
  "algorithm",
  "keyId",
  "claims",
  "signature"
] as const;

const CLAIM_KEYS = [
  "issuer",
  "audience",
  "assertionId",
  "hostApplicationId",
  "hostEnvironment",
  "hostInstanceId",
  "hostSubjectId",
  "sessionId",
  "issuedAt",
  "expiresAt",
  "auditCorrelationId"
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
) {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return (
    actual.length === keys.length &&
    actual.every((key, index) => key === keys[index])
  );
}

function asTimestamp(value: string, label: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      label + " must be a valid ISO timestamp."
    );
  }
  return timestamp;
}

function validateOpaqueId(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !OPAQUE_ID_PATTERN.test(value)
  ) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      label + " is invalid."
    );
  }
  return value;
}

function validateAssertionShape(
  input: unknown
): HostSessionAssertionEnvelope {
  if (!isPlainRecord(input) || !exactKeys(input, ENVELOPE_KEYS)) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      "Host session assertion envelope shape is invalid."
    );
  }

  if (
    input.schema !== HOST_SESSION_ASSERTION_SCHEMA ||
    typeof input.algorithm !== "string" ||
    typeof input.keyId !== "string" ||
    typeof input.signature !== "string" ||
    !isPlainRecord(input.claims) ||
    !exactKeys(input.claims, CLAIM_KEYS)
  ) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      "Host session assertion envelope fields are invalid."
    );
  }

  if (
    !HOST_SESSION_SIGNATURE_ALGORITHMS.includes(
      input.algorithm as HostSessionSignatureAlgorithm
    )
  ) {
    throw new HostSessionBridgeError(
      "unsupported_algorithm",
      "Host session assertion signature algorithm is unsupported."
    );
  }

  if (!KEY_ID_PATTERN.test(input.keyId)) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      "Host session assertion key ID is invalid."
    );
  }

  if (!SIGNATURE_PATTERN.test(input.signature)) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      "Host session assertion signature encoding is invalid."
    );
  }

  const claims = input.claims;

  if (
    typeof claims.issuer !== "string" ||
    !ISSUER_PATTERN.test(claims.issuer) ||
    typeof claims.audience !== "string" ||
    typeof claims.hostApplicationId !== "string" ||
    !APPLICATION_ID_PATTERN.test(claims.hostApplicationId) ||
    typeof claims.hostEnvironment !== "string" ||
    !HOST_ENVIRONMENTS.includes(claims.hostEnvironment as HostEnvironment)
  ) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      "Host session assertion identity claims are invalid."
    );
  }

  validateOpaqueId(claims.assertionId, "Assertion ID");
  validateOpaqueId(claims.hostInstanceId, "Host instance ID");
  validateOpaqueId(claims.hostSubjectId, "Host subject ID");
  validateOpaqueId(claims.sessionId, "Session ID");
  validateOpaqueId(claims.auditCorrelationId, "Audit correlation ID");

  if (
    typeof claims.issuedAt !== "string" ||
    typeof claims.expiresAt !== "string"
  ) {
    throw new HostSessionBridgeError(
      "malformed_assertion",
      "Host session assertion time claims are invalid."
    );
  }

  asTimestamp(claims.issuedAt, "issuedAt");
  asTimestamp(claims.expiresAt, "expiresAt");

  return {
    schema: HOST_SESSION_ASSERTION_SCHEMA,
    algorithm: input.algorithm as HostSessionSignatureAlgorithm,
    keyId: input.keyId,
    claims: {
      issuer: claims.issuer,
      audience: claims.audience as typeof AI_DATA_MODULE_ID,
      assertionId: claims.assertionId as string,
      hostApplicationId: claims.hostApplicationId,
      hostEnvironment: claims.hostEnvironment as HostEnvironment,
      hostInstanceId: claims.hostInstanceId as string,
      hostSubjectId: claims.hostSubjectId as string,
      sessionId: claims.sessionId as string,
      issuedAt: claims.issuedAt,
      expiresAt: claims.expiresAt,
      auditCorrelationId: claims.auditCorrelationId as string
    },
    signature: input.signature
  };
}

export function hostSessionAssertionSigningInput(
  envelope: Pick<
    HostSessionAssertionEnvelope,
    "schema" | "algorithm" | "keyId" | "claims"
  >
) {
  return JSON.stringify({
    schema: envelope.schema,
    algorithm: envelope.algorithm,
    keyId: envelope.keyId,
    claims: {
      issuer: envelope.claims.issuer,
      audience: envelope.claims.audience,
      assertionId: envelope.claims.assertionId,
      hostApplicationId: envelope.claims.hostApplicationId,
      hostEnvironment: envelope.claims.hostEnvironment,
      hostInstanceId: envelope.claims.hostInstanceId,
      hostSubjectId: envelope.claims.hostSubjectId,
      sessionId: envelope.claims.sessionId,
      issuedAt: envelope.claims.issuedAt,
      expiresAt: envelope.claims.expiresAt,
      auditCorrelationId: envelope.claims.auditCorrelationId
    }
  });
}

function reauthenticationHandoff(
  claims: HostSessionAssertionClaims,
  reason: "session_expired" | "session_not_yet_valid"
): HostReauthenticationHandoff {
  return Object.freeze({
    schema: "rosevear.ai-data-platform.host-reauthentication-handoff.v1",
    mode: "host-reauthentication",
    reason,
    hostApplicationId: claims.hostApplicationId,
    hostEnvironment: claims.hostEnvironment,
    hostInstanceId: claims.hostInstanceId,
    sessionId: claims.sessionId,
    auditCorrelationId: claims.auditCorrelationId,
    instruction:
      "reauthenticate-with-host-then-submit-a-new-signed-session-assertion",
    carriesCredential: false,
    grantsAuthorization: false
  });
}

function emptyAuditContext() {
  return {
    issuer: null,
    hostApplicationId: null,
    hostEnvironment: null,
    hostInstanceId: null,
    hostSubjectId: null,
    moduleSubjectId: null,
    sessionId: null,
    assertionId: null,
    auditCorrelationId: null
  };
}

export class HostSessionContextBridge {
  readonly schema = HOST_SESSION_BRIDGE_SCHEMA;
  readonly version = HOST_SESSION_BRIDGE_VERSION;

  private readonly options: HostSessionBridgeOptions;

  constructor(options: HostSessionBridgeOptions) {
    this.options = options;
  }

  async validate(input: {
    assertion: unknown;
    expected: HostSessionExpectedIdentity;
  }): Promise<HostSessionValidationResult> {
    let assertion: HostSessionAssertionEnvelope;

    try {
      assertion = validateAssertionShape(input.assertion);
    } catch (error) {
      const bridgeError =
        error instanceof HostSessionBridgeError
          ? error
          : new HostSessionBridgeError(
              "malformed_assertion",
              "Host session assertion could not be parsed."
            );
      await this.audit({
        status: "rejected",
        reason:
          bridgeError.code === "unsupported_algorithm"
            ? "unsupported_algorithm"
            : "malformed_assertion",
        ...emptyAuditContext()
      });
      throw bridgeError;
    }

    const claims = assertion.claims;
    const auditBase = {
      issuer: claims.issuer,
      hostApplicationId: claims.hostApplicationId,
      hostEnvironment: claims.hostEnvironment,
      hostInstanceId: claims.hostInstanceId,
      hostSubjectId: claims.hostSubjectId,
      moduleSubjectId: null as string | null,
      sessionId: claims.sessionId,
      assertionId: claims.assertionId,
      auditCorrelationId: claims.auditCorrelationId
    };

    const signatureValid = await this.options.signatureVerifier.verify({
      algorithm: assertion.algorithm,
      keyId: assertion.keyId,
      issuer: claims.issuer,
      signingInput: hostSessionAssertionSigningInput(assertion),
      signature: assertion.signature
    });

    if (!signatureValid) {
      await this.audit({
        status: "rejected",
        reason: "signature_invalid",
        ...auditBase
      });
      throw new HostSessionBridgeError(
        "signature_invalid",
        "Host session assertion signature validation failed."
      );
    }

    if (claims.audience !== AI_DATA_MODULE_ID) {
      await this.audit({
        status: "rejected",
        reason: "audience_mismatch",
        ...auditBase
      });
      throw new HostSessionBridgeError(
        "audience_mismatch",
        "Host session assertion audience does not match the AI Data Platform module."
      );
    }

    if (
      claims.hostApplicationId !== input.expected.hostApplicationId ||
      claims.hostEnvironment !== input.expected.hostEnvironment ||
      claims.hostInstanceId !== input.expected.hostInstanceId
    ) {
      await this.audit({
        status: "rejected",
        reason: "host_identity_mismatch",
        ...auditBase
      });
      throw new HostSessionBridgeError(
        "host_identity_mismatch",
        "Host session assertion identity does not match the expected host."
      );
    }

    if (
      input.expected.expectedHostSubjectId &&
      claims.hostSubjectId !== input.expected.expectedHostSubjectId
    ) {
      await this.audit({
        status: "rejected",
        reason: "subject_identity_mismatch",
        ...auditBase
      });
      throw new HostSessionBridgeError(
        "subject_identity_mismatch",
        "Host session assertion subject does not match the expected host subject."
      );
    }

    const now = Date.parse(this.options.now?.() ?? new Date().toISOString());
    if (!Number.isFinite(now)) {
      throw new Error("Host session bridge now() returned an invalid timestamp.");
    }

    const issuedAt = asTimestamp(claims.issuedAt, "issuedAt");
    const expiresAt = asTimestamp(claims.expiresAt, "expiresAt");
    const maxClockSkewMs = this.options.maxClockSkewMs ?? 30_000;
    const maxSessionLifetimeMs =
      this.options.maxSessionLifetimeMs ?? 8 * 60 * 60 * 1000;

    if (
      expiresAt <= issuedAt ||
      expiresAt - issuedAt > maxSessionLifetimeMs
    ) {
      await this.audit({
        status: "rejected",
        reason: "session_lifetime_invalid",
        ...auditBase
      });
      throw new HostSessionBridgeError(
        "session_lifetime_invalid",
        "Host session assertion lifetime is invalid."
      );
    }

    if (issuedAt > now + maxClockSkewMs) {
      await this.audit({
        status: "reauthentication_required",
        reason: "session_not_yet_valid",
        ...auditBase
      });
      return {
        status: "reauthentication_required",
        context: null,
        reauthentication: reauthenticationHandoff(
          claims,
          "session_not_yet_valid"
        )
      };
    }

    if (expiresAt <= now - maxClockSkewMs) {
      await this.audit({
        status: "reauthentication_required",
        reason: "session_expired",
        ...auditBase
      });
      return {
        status: "reauthentication_required",
        context: null,
        reauthentication: reauthenticationHandoff(claims, "session_expired")
      };
    }

    const replayAccepted = await this.options.replayGuard.consume({
      issuer: claims.issuer,
      assertionId: claims.assertionId,
      sessionId: claims.sessionId,
      expiresAt: claims.expiresAt
    });

    if (!replayAccepted) {
      await this.audit({
        status: "rejected",
        reason: "assertion_replayed",
        ...auditBase
      });
      throw new HostSessionBridgeError(
        "assertion_replayed",
        "Host session assertion has already been consumed."
      );
    }

    const mapping = await this.options.subjectMapper.mapSubject({
      issuer: claims.issuer,
      hostApplicationId: claims.hostApplicationId,
      hostSubjectId: claims.hostSubjectId
    });

    if (!mapping) {
      await this.audit({
        status: "rejected",
        reason: "subject_mapping_missing",
        ...auditBase
      });
      throw new HostSessionBridgeError(
        "subject_mapping_missing",
        "Host subject does not have an AI Data Platform subject mapping."
      );
    }

    if (mapping.status !== "active") {
      await this.audit({
        status: "rejected",
        reason: "subject_mapping_disabled",
        ...auditBase,
        moduleSubjectId: mapping.moduleSubjectId
      });
      throw new HostSessionBridgeError(
        "subject_mapping_disabled",
        "Mapped AI Data Platform subject is disabled."
      );
    }

    validateOpaqueId(mapping.moduleSubjectId, "Module subject ID");

    if (
      input.expected.expectedModuleSubjectId &&
      mapping.moduleSubjectId !== input.expected.expectedModuleSubjectId
    ) {
      await this.audit({
        status: "rejected",
        reason: "subject_identity_mismatch",
        ...auditBase,
        moduleSubjectId: mapping.moduleSubjectId
      });
      throw new HostSessionBridgeError(
        "subject_identity_mismatch",
        "Mapped AI Data Platform subject does not match the expected module subject."
      );
    }

    const context: AuthenticatedHostSessionContext = Object.freeze({
      schema: "rosevear.ai-data-platform.authenticated-host-session.v1",
      bridgeVersion: HOST_SESSION_BRIDGE_VERSION,
      issuer: claims.issuer,
      keyId: assertion.keyId,
      hostApplicationId: claims.hostApplicationId,
      hostEnvironment: claims.hostEnvironment,
      hostInstanceId: claims.hostInstanceId,
      hostSubjectId: claims.hostSubjectId,
      moduleSubjectId: mapping.moduleSubjectId,
      sessionId: claims.sessionId,
      assertionId: claims.assertionId,
      issuedAt: claims.issuedAt,
      expiresAt: claims.expiresAt,
      auditCorrelationId: claims.auditCorrelationId,
      signatureValidated: true,
      subjectMapped: true,
      authorizationGranted: false
    });

    await this.audit({
      status: "accepted",
      reason: "accepted",
      ...auditBase,
      moduleSubjectId: mapping.moduleSubjectId
    });

    return {
      status: "accepted",
      context,
      reauthentication: null
    };
  }

  private async audit(
    input: Omit<
      HostSessionAuditEvent,
      "schema" | "bridgeVersion" | "occurredAt"
    >
  ) {
    await this.options.auditSink?.record({
      schema: "rosevear.ai-data-platform.host-session-audit.v1",
      bridgeVersion: HOST_SESSION_BRIDGE_VERSION,
      ...input,
      occurredAt: this.options.now?.() ?? new Date().toISOString()
    });
  }
}

export function bindAuthenticatedHostSessionToContext(
  context: HostRuntimeContext,
  authenticated: AuthenticatedHostSessionContext
): HostRuntimeContext {
  if (
    context.hostApplication.id !== authenticated.hostApplicationId ||
    context.hostApplication.environment !== authenticated.hostEnvironment ||
    context.hostApplication.instanceId !== authenticated.hostInstanceId
  ) {
    throw new HostSessionBridgeError(
      "host_identity_mismatch",
      "Authenticated host session cannot be bound to a different host context."
    );
  }

  if (context.auditCorrelationId !== authenticated.auditCorrelationId) {
    throw new HostSessionBridgeError(
      "host_identity_mismatch",
      "Authenticated host session audit correlation does not match the host context."
    );
  }

  return {
    ...context,
    subject: {
      id: authenticated.moduleSubjectId
    }
  };
}
