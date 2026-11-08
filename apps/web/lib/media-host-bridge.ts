import { createHash } from "node:crypto";

import {
  normalizeMediaReference,
  type NormalizedMediaReference
} from "./media-asset-exchange-core";
import type { HostEnvironment } from "./universal-module-contract";

export const MEDIA_HOST_BRIDGE_VERSION = "1.0.0" as const;
export const MEDIA_HOST_BRIDGE_SCHEMA =
  "rosevear.ai-data-platform.media-host-bridge.v1" as const;
export const MEDIA_HOST_REFERENCE_SCHEMA =
  "rosevear.ai-data-platform.media-host-reference.v1" as const;
export const MEDIA_HOST_HANDOFF_SCHEMA =
  "rosevear.ai-data-platform.media-host-transfer-handoff.v1" as const;
export const MEDIA_LIFECYCLE_EVIDENCE_SCHEMA =
  "rosevear.ai-data-platform.media-lifecycle-evidence.v1" as const;

export type MediaHostContext = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  workspaceId: string;
  auditCorrelationId: string;
};

export type MediaPolicyStatus =
  | "eligible"
  | "review-required"
  | "blocked";

export type MediaPolicyDecision = {
  status: MediaPolicyStatus;
  codes: string[];
  maximumBytes: number;
  observedBytes: number | null;
  observedMimeType: string | null;
  mediaType: NormalizedMediaReference["mediaType"];
  contentChecksumPresent: boolean;
  dedupeBasis: NormalizedMediaReference["dedupeBasis"];
};

export type MediaSourceOwnership = {
  declared: boolean;
  ownerKind: string | null;
  ownerRecordId: string | null;
  sourceApplicationId: NormalizedMediaReference["sourceApplicationId"];
  sourceRecordId: string;
  sourceRecordVersion: string | null;
};

export type MediaPreviewReference = {
  schema: "rosevear.ai-data-platform.media-preview-reference.v1";
  mode: "reference-only";
  url: string;
  mediaType: NormalizedMediaReference["mediaType"];
  mimeType: string | null;
  altText: string | null;
  caption: string | null;
  previewEligible: boolean;
  contentFetchedByBridge: false;
  binaryCopiedByBridge: false;
  automaticSensitiveContentRendering: false;
};

export type MediaHostReferenceRegistration = {
  schema: typeof MEDIA_HOST_REFERENCE_SCHEMA;
  version: typeof MEDIA_HOST_BRIDGE_VERSION;
  correlationSha256: string;
  host: MediaHostContext;
  reference: NormalizedMediaReference;
  ownership: MediaSourceOwnership;
  policy: MediaPolicyDecision;
  preview: MediaPreviewReference;
  checksum: {
    contentSha256: string | null;
    dedupeSha256: string;
    dedupeBasis: NormalizedMediaReference["dedupeBasis"];
    contentChecksumPreferred: true;
    stableUrlFallbackAllowed: true;
  };
  security: {
    rawBinaryAccepted: false;
    binaryCopied: false;
    outboundNetworkRequestPerformed: false;
  };
};

export type MediaTransferDirection = "download" | "upload";

export type MediaTransferAuthorization = {
  capability: "media.binary.download" | "media.binary.upload";
  granted: boolean;
  grantId: string;
  subjectId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  workspaceId: string;
  dedupeSha256: string;
  sensitiveBinaryCopyAuthorized: boolean;
  expiresAt: string;
  reviewAt: string;
};

export type MediaHostTransferHandoffInput = {
  handoffId: string;
  direction: MediaTransferDirection;
  sensitiveBinary: boolean;
  authorization?: MediaTransferAuthorization | null;
  createdAt: string;
};

export type MediaHostTransferHandoff = {
  schema: typeof MEDIA_HOST_HANDOFF_SCHEMA;
  version: typeof MEDIA_HOST_BRIDGE_VERSION;
  handoffId: string;
  direction: MediaTransferDirection;
  correlationSha256: string;
  workspaceId: string;
  hostApplicationId: string;
  sourceApplicationId: NormalizedMediaReference["sourceApplicationId"];
  sourceRecordId: string;
  referenceSha256: string;
  dedupeSha256: string;
  sourceUrl: string;
  mimeType: string | null;
  byteSize: number | null;
  sensitiveBinary: boolean;
  state: "held" | "authorized-for-host-transfer";
  holdReason:
    | "binary-transfer-not-authorized"
    | "sensitive-binary-copy-not-authorized"
    | "media-policy-review-required"
    | "media-policy-blocked"
    | null;
  authorizationEvidenceId: string | null;
  idempotencyKeySha256: string;
  createdAt: string;
  security: {
    binaryTransferPerformed: false;
    bridgeFetchedSourceContent: false;
    bridgeUploadedDestinationContent: false;
    exactTransferGrantRequired: true;
    sensitiveBinaryRequiresExplicitGrant: true;
    retryMustReuseIdempotencyKey: true;
  };
};

export type MediaRetentionState =
  | "active"
  | "retain-until"
  | "legal-hold"
  | "expired-review-required";

export type MediaDeletionState =
  | "not-requested"
  | "requested"
  | "approved"
  | "deleted"
  | "denied";

export type MediaLifecycleEvidenceInput = {
  evidenceId: string;
  retentionState: MediaRetentionState;
  retainUntil?: string | null;
  deletionState: MediaDeletionState;
  sourceReceiptId?: string | null;
  observedAt: string;
  reason: string;
};

export type MediaLifecycleEvidence = {
  schema: typeof MEDIA_LIFECYCLE_EVIDENCE_SCHEMA;
  version: typeof MEDIA_HOST_BRIDGE_VERSION;
  evidenceId: string;
  correlationSha256: string;
  dedupeSha256: string;
  retentionState: MediaRetentionState;
  retainUntil: string | null;
  deletionState: MediaDeletionState;
  sourceReceiptId: string | null;
  observedAt: string;
  reason: string;
  evidenceSha256: string;
  security: {
    binaryDeletionPerformedByBridge: false;
    sourceReceiptRequiredForDeletedState: true;
    lifecycleEvidenceMutatesSource: false;
  };
};

export class MediaHostBridgeError extends Error {
  readonly code:
    | "host_context_invalid"
    | "policy_blocked"
    | "handoff_invalid"
    | "authorization_denied"
    | "authorization_scope_mismatch"
    | "authorization_expired"
    | "authorization_review_required"
    | "lifecycle_evidence_invalid";

  constructor(
    code: MediaHostBridgeError["code"],
    message: string
  ) {
    super(message);
    this.name = "MediaHostBridgeError";
    this.code = code;
  }
}

const HOST_APP_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{1,159}$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;

const MAX_BYTES = Object.freeze({
  image: 104_857_600,
  video: 2_147_483_648,
  document: 262_144_000,
  audio: 1_073_741_824
} satisfies Record<NormalizedMediaReference["mediaType"], number>);

const MIME_PREFIXES = Object.freeze({
  image: ["image/"],
  video: ["video/"],
  document: ["application/", "text/"],
  audio: ["audio/"]
} satisfies Record<NormalizedMediaReference["mediaType"], readonly string[]>);

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function validTimestamp(value: string, code: MediaHostBridgeError["code"]) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new MediaHostBridgeError(code, "Timestamp is invalid.");
  }
  return new Date(time).toISOString();
}

function safeText(
  value: unknown,
  min: number,
  max: number,
  code: MediaHostBridgeError["code"],
  field: string
) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (
    normalized.length < min ||
    normalized.length > max ||
    CONTROL_PATTERN.test(normalized)
  ) {
    throw new MediaHostBridgeError(code, field + " is invalid.");
  }
  return normalized;
}

function assertHostContext(host: MediaHostContext) {
  if (
    !HOST_APP_PATTERN.test(host.hostApplicationId) ||
    !OPAQUE_ID_PATTERN.test(host.platformTenantId) ||
    !OPAQUE_ID_PATTERN.test(host.workspaceId) ||
    !OPAQUE_ID_PATTERN.test(host.auditCorrelationId)
  ) {
    throw new MediaHostBridgeError(
      "host_context_invalid",
      "Media host context is invalid."
    );
  }
}

function sourceUrl(reference: NormalizedMediaReference) {
  const value = reference.portableRecord.url;
  if (typeof value !== "string" || !value.startsWith("https://")) {
    throw new MediaHostBridgeError(
      "host_context_invalid",
      "Normalized media reference does not contain a stable HTTPS source URL."
    );
  }
  return value;
}

function optionalPortableText(
  reference: NormalizedMediaReference,
  key: string
) {
  const value = reference.portableRecord[key];
  return typeof value === "string" ? value : null;
}

export function evaluateMediaHostPolicy(
  reference: NormalizedMediaReference
): MediaPolicyDecision {
  const codes: string[] = [];
  const maximumBytes = MAX_BYTES[reference.mediaType];

  if (reference.mimeType === null) {
    codes.push("mime-type-review-required");
  } else if (
    !MIME_PREFIXES[reference.mediaType].some((prefix) =>
      reference.mimeType?.startsWith(prefix)
    )
  ) {
    codes.push("mime-type-media-family-mismatch");
  }

  if (reference.byteSize === null) {
    codes.push("byte-size-review-required");
  } else if (reference.byteSize > maximumBytes) {
    codes.push("byte-size-policy-exceeded");
  }

  if (reference.contentSha256 === null) {
    codes.push("content-checksum-unavailable-stable-url-dedupe");
  }

  const blocked = codes.some((code) =>
    code === "mime-type-media-family-mismatch" ||
    code === "byte-size-policy-exceeded"
  );
  const reviewRequired =
    !blocked &&
    codes.some((code) =>
      code.endsWith("review-required")
    );

  return Object.freeze({
    status: blocked
      ? ("blocked" as const)
      : reviewRequired
        ? ("review-required" as const)
        : ("eligible" as const),
    codes: [...codes],
    maximumBytes,
    observedBytes: reference.byteSize,
    observedMimeType: reference.mimeType,
    mediaType: reference.mediaType,
    contentChecksumPresent: reference.contentSha256 !== null,
    dedupeBasis: reference.dedupeBasis
  });
}

export function registerMediaHostReference(input: {
  host: MediaHostContext;
  reference: Parameters<typeof normalizeMediaReference>[0];
}): MediaHostReferenceRegistration {
  assertHostContext(input.host);
  const reference = normalizeMediaReference(input.reference);
  const policy = evaluateMediaHostPolicy(reference);
  const ownerKind = optionalPortableText(reference, "ownerKind");
  const ownerRecordId = optionalPortableText(reference, "ownerRecordId");
  const url = sourceUrl(reference);

  const ownership = Object.freeze({
    declared: Boolean(ownerKind || ownerRecordId),
    ownerKind,
    ownerRecordId,
    sourceApplicationId: reference.sourceApplicationId,
    sourceRecordId: reference.sourceRecordId,
    sourceRecordVersion: reference.sourceRecordVersion
  });

  const preview = Object.freeze({
    schema:
      "rosevear.ai-data-platform.media-preview-reference.v1" as const,
    mode: "reference-only" as const,
    url,
    mediaType: reference.mediaType,
    mimeType: reference.mimeType,
    altText: optionalPortableText(reference, "altText"),
    caption: optionalPortableText(reference, "caption"),
    previewEligible: policy.status !== "blocked",
    contentFetchedByBridge: false as const,
    binaryCopiedByBridge: false as const,
    automaticSensitiveContentRendering: false as const
  });

  const correlationSha256 = sha256([
    "rosevear-media-host-reference-v1",
    input.host.hostApplicationId,
    input.host.hostEnvironment,
    input.host.platformTenantId,
    input.host.workspaceId,
    input.host.auditCorrelationId,
    reference.sourceApplicationId,
    reference.canonicalTenantKey,
    reference.sourceRecordId,
    reference.referenceSha256,
    reference.dedupeSha256
  ]);

  return Object.freeze({
    schema: MEDIA_HOST_REFERENCE_SCHEMA,
    version: MEDIA_HOST_BRIDGE_VERSION,
    correlationSha256,
    host: Object.freeze({ ...input.host }),
    reference,
    ownership,
    policy,
    preview,
    checksum: Object.freeze({
      contentSha256: reference.contentSha256,
      dedupeSha256: reference.dedupeSha256,
      dedupeBasis: reference.dedupeBasis,
      contentChecksumPreferred: true as const,
      stableUrlFallbackAllowed: true as const
    }),
    security: Object.freeze({
      rawBinaryAccepted: false as const,
      binaryCopied: false as const,
      outboundNetworkRequestPerformed: false as const
    })
  });
}

function validateAuthorization(
  registration: MediaHostReferenceRegistration,
  direction: MediaTransferDirection,
  sensitiveBinary: boolean,
  authorization: MediaTransferAuthorization | null | undefined,
  now: number
) {
  if (!authorization || !authorization.granted) {
    return {
      authorized: false as const,
      holdReason: "binary-transfer-not-authorized" as const,
      evidenceId: null
    };
  }

  const expectedCapability =
    direction === "download"
      ? "media.binary.download"
      : "media.binary.upload";

  if (authorization.capability !== expectedCapability) {
    throw new MediaHostBridgeError(
      "authorization_denied",
      "Media transfer grant does not match the requested handoff direction."
    );
  }
  if (
    authorization.hostApplicationId !==
      registration.host.hostApplicationId ||
    authorization.hostEnvironment !==
      registration.host.hostEnvironment ||
    authorization.platformTenantId !==
      registration.host.platformTenantId ||
    authorization.workspaceId !== registration.host.workspaceId ||
    authorization.dedupeSha256 !==
      registration.reference.dedupeSha256
  ) {
    throw new MediaHostBridgeError(
      "authorization_scope_mismatch",
      "Media transfer authorization does not match the active host, workspace, or asset."
    );
  }
  if (
    !OPAQUE_ID_PATTERN.test(authorization.grantId) ||
    !OPAQUE_ID_PATTERN.test(authorization.subjectId)
  ) {
    throw new MediaHostBridgeError(
      "authorization_denied",
      "Media transfer authorization evidence is invalid."
    );
  }

  const expiresAt = Date.parse(authorization.expiresAt);
  const reviewAt = Date.parse(authorization.reviewAt);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(reviewAt)) {
    throw new MediaHostBridgeError(
      "authorization_denied",
      "Media transfer authorization timestamps are invalid."
    );
  }
  if (expiresAt <= now) {
    throw new MediaHostBridgeError(
      "authorization_expired",
      "Media transfer authorization has expired."
    );
  }
  if (reviewAt <= now) {
    throw new MediaHostBridgeError(
      "authorization_review_required",
      "Media transfer authorization requires review."
    );
  }
  if (sensitiveBinary && !authorization.sensitiveBinaryCopyAuthorized) {
    return {
      authorized: false as const,
      holdReason:
        "sensitive-binary-copy-not-authorized" as const,
      evidenceId: authorization.grantId
    };
  }

  return {
    authorized: true as const,
    holdReason: null,
    evidenceId: authorization.grantId
  };
}

export function createMediaHostTransferHandoff(
  registration: MediaHostReferenceRegistration,
  input: MediaHostTransferHandoffInput,
  now = Date.now()
): MediaHostTransferHandoff {
  if (
    !OPAQUE_ID_PATTERN.test(input.handoffId) ||
    (input.direction !== "download" &&
      input.direction !== "upload")
  ) {
    throw new MediaHostBridgeError(
      "handoff_invalid",
      "Media transfer handoff is invalid."
    );
  }

  const createdAt = validTimestamp(
    input.createdAt,
    "handoff_invalid"
  );
  let holdReason:
    | MediaHostTransferHandoff["holdReason"] = null;
  let authorizationEvidenceId: string | null = null;

  if (registration.policy.status === "blocked") {
    holdReason = "media-policy-blocked";
  } else if (registration.policy.status === "review-required") {
    holdReason = "media-policy-review-required";
  } else {
    const authorization = validateAuthorization(
      registration,
      input.direction,
      input.sensitiveBinary,
      input.authorization,
      now
    );
    holdReason = authorization.holdReason;
    authorizationEvidenceId = authorization.evidenceId;
  }

  const state =
    holdReason === null
      ? ("authorized-for-host-transfer" as const)
      : ("held" as const);

  const idempotencyKeySha256 = sha256([
    "rosevear-media-host-transfer-v1",
    registration.correlationSha256,
    input.direction,
    input.sensitiveBinary,
    registration.reference.referenceSha256,
    registration.reference.dedupeSha256
  ]);

  return Object.freeze({
    schema: MEDIA_HOST_HANDOFF_SCHEMA,
    version: MEDIA_HOST_BRIDGE_VERSION,
    handoffId: input.handoffId,
    direction: input.direction,
    correlationSha256: registration.correlationSha256,
    workspaceId: registration.host.workspaceId,
    hostApplicationId: registration.host.hostApplicationId,
    sourceApplicationId:
      registration.reference.sourceApplicationId,
    sourceRecordId: registration.reference.sourceRecordId,
    referenceSha256: registration.reference.referenceSha256,
    dedupeSha256: registration.reference.dedupeSha256,
    sourceUrl: registration.preview.url,
    mimeType: registration.reference.mimeType,
    byteSize: registration.reference.byteSize,
    sensitiveBinary: input.sensitiveBinary,
    state,
    holdReason,
    authorizationEvidenceId,
    idempotencyKeySha256,
    createdAt,
    security: Object.freeze({
      binaryTransferPerformed: false as const,
      bridgeFetchedSourceContent: false as const,
      bridgeUploadedDestinationContent: false as const,
      exactTransferGrantRequired: true as const,
      sensitiveBinaryRequiresExplicitGrant: true as const,
      retryMustReuseIdempotencyKey: true as const
    })
  });
}

export function recordMediaLifecycleEvidence(
  registration: MediaHostReferenceRegistration,
  input: MediaLifecycleEvidenceInput
): MediaLifecycleEvidence {
  if (!OPAQUE_ID_PATTERN.test(input.evidenceId)) {
    throw new MediaHostBridgeError(
      "lifecycle_evidence_invalid",
      "Media lifecycle evidence ID is invalid."
    );
  }
  if (
    !["active", "retain-until", "legal-hold", "expired-review-required"].includes(
      input.retentionState
    ) ||
    !["not-requested", "requested", "approved", "deleted", "denied"].includes(
      input.deletionState
    )
  ) {
    throw new MediaHostBridgeError(
      "lifecycle_evidence_invalid",
      "Media lifecycle state is invalid."
    );
  }

  const observedAt = validTimestamp(
    input.observedAt,
    "lifecycle_evidence_invalid"
  );
  const reason = safeText(
    input.reason,
    8,
    500,
    "lifecycle_evidence_invalid",
    "Lifecycle reason"
  );
  const retainUntil =
    input.retainUntil === null ||
    input.retainUntil === undefined ||
    input.retainUntil === ""
      ? null
      : validTimestamp(
          input.retainUntil,
          "lifecycle_evidence_invalid"
        );
  if (
    input.retentionState === "retain-until" &&
    !retainUntil
  ) {
    throw new MediaHostBridgeError(
      "lifecycle_evidence_invalid",
      "retain-until state requires a retention timestamp."
    );
  }

  const sourceReceiptId =
    input.sourceReceiptId === null ||
    input.sourceReceiptId === undefined ||
    input.sourceReceiptId === ""
      ? null
      : safeText(
          input.sourceReceiptId,
          2,
          160,
          "lifecycle_evidence_invalid",
          "Source receipt ID"
        );
  if (
    input.deletionState === "deleted" &&
    sourceReceiptId === null
  ) {
    throw new MediaHostBridgeError(
      "lifecycle_evidence_invalid",
      "Deleted state requires source-system receipt evidence."
    );
  }

  const evidenceSha256 = sha256([
    "rosevear-media-lifecycle-evidence-v1",
    input.evidenceId,
    registration.correlationSha256,
    registration.reference.dedupeSha256,
    input.retentionState,
    retainUntil,
    input.deletionState,
    sourceReceiptId,
    observedAt,
    reason
  ]);

  return Object.freeze({
    schema: MEDIA_LIFECYCLE_EVIDENCE_SCHEMA,
    version: MEDIA_HOST_BRIDGE_VERSION,
    evidenceId: input.evidenceId,
    correlationSha256: registration.correlationSha256,
    dedupeSha256: registration.reference.dedupeSha256,
    retentionState: input.retentionState,
    retainUntil,
    deletionState: input.deletionState,
    sourceReceiptId,
    observedAt,
    reason,
    evidenceSha256,
    security: Object.freeze({
      binaryDeletionPerformedByBridge: false as const,
      sourceReceiptRequiredForDeletedState: true as const,
      lifecycleEvidenceMutatesSource: false as const
    })
  });
}

export function mediaHostBridgeDescriptor() {
  return Object.freeze({
    schema: MEDIA_HOST_BRIDGE_SCHEMA,
    version: MEDIA_HOST_BRIDGE_VERSION,
    sourceBuild: 296,
    mediaReferenceRegistration: true,
    checksumAndDeduplication: true,
    sourceOwnershipMetadata: true,
    mimeAndSizePolicy: true,
    hostDownloadHandoff: true,
    hostUploadHandoff: true,
    referenceOnlyPreviews: true,
    retentionAndDeletionEvidence: true,
    rawBinaryAccepted: false,
    binaryTransferPerformedByBridge: false,
    sensitiveBinaryCopyRequiresExplicitAuthorization: true,
    lifecycleEvidenceMutatesSource: false
  });
}
