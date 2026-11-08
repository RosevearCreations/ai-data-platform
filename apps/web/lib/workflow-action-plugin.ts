import { createHash } from "node:crypto";

import {
  WORKFLOW_AUTOMATION_ACTION_KINDS,
  normalizeWorkflowAutomationConfig,
  workflowAutomationActionHref,
  type WorkflowAutomationActionKind
} from "./workflow-automation-core";
import {
  WEBHOOK_SOURCE_APPLICATIONS,
  type WebhookSourceApplication
} from "./webhook-gateway-core";
import type { HostEnvironment } from "./universal-module-contract";

export const WORKFLOW_ACTION_PLUGIN_VERSION = "1.0.0" as const;
export const WORKFLOW_ACTION_PLUGIN_SCHEMA =
  "rosevear.ai-data-platform.workflow-action-plugin.v1" as const;
export const WORKFLOW_ACTION_INTENT_SCHEMA =
  "rosevear.ai-data-platform.workflow-action-plugin-intent.v1" as const;
export const WORKFLOW_ACTION_DECISION_SCHEMA =
  "rosevear.ai-data-platform.workflow-action-decision.v1" as const;
export const WORKFLOW_ACTION_HANDOFF_SCHEMA =
  "rosevear.ai-data-platform.workflow-action-handoff.v1" as const;
export const WORKFLOW_ACTION_CALLBACK_SCHEMA =
  "rosevear.ai-data-platform.workflow-action-callback-receipt.v1" as const;

export type WorkflowActionInputType = "string" | "number" | "boolean";

export type WorkflowActionInputField = {
  key: string;
  type: WorkflowActionInputType;
  required: boolean;
  description: string;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: readonly string[];
};

export type WorkflowActionCapabilityDescriptor = {
  capabilityId: string;
  actionKind: WorkflowAutomationActionKind;
  displayName: string;
  description: string;
  destinationSurface: string;
  inputSchema: {
    schema: "rosevear.ai-data-platform.workflow-action-input-schema.v1";
    additionalProperties: false;
    fields: readonly WorkflowActionInputField[];
  };
  consequential: true;
  requiresOwnerOrReviewerDecision: true;
  executesOnRuleMatch: false;
  executesOnApproval: false;
  hostCallbackRequired: true;
};

export type Build302HeldIntentSource = {
  intentId: string;
  workspaceId: string;
  ruleId: string;
  ruleReviewId: string;
  publicationId: string;
  sourceApplicationId: WebhookSourceApplication;
  destinationApplicationId: WebhookSourceApplication;
  eventId: string;
  eventType: string;
  actionKind: WorkflowAutomationActionKind;
  actionConfig: Record<string, unknown>;
  targetHref: string;
  state: "held";
  holdReason: "workflow-action-not-authorized";
  createdBy: string;
  createdAt: string | Date;
};

export type WorkflowActionPluginIntent = {
  schema: typeof WORKFLOW_ACTION_INTENT_SCHEMA;
  version: typeof WORKFLOW_ACTION_PLUGIN_VERSION;
  intentId: string;
  workspaceId: string;
  ruleId: string;
  ruleReviewId: string;
  publicationId: string;
  sourceApplicationId: WebhookSourceApplication;
  destinationApplicationId: WebhookSourceApplication;
  eventId: string;
  eventType: string;
  capabilityId: string;
  actionKind: WorkflowAutomationActionKind;
  input: Readonly<Record<string, string | number | boolean>>;
  inputFingerprintSha256: string;
  targetHref: string;
  sourceCreatedAt: string;
  state: "held";
  holdReason: "workflow-action-not-authorized";
  sourceBoundary: "build-302-held-intent";
  security: {
    ruleMatchExecutesAction: false;
    heldIntentExecutesAction: false;
    sourceMutationPerformed: false;
  };
};

export type WorkflowActionDecisionInput = {
  decisionId: string;
  decision: "approve" | "reject";
  reviewerRole: "owner" | "admin" | "reviewer";
  reviewedBy: string;
  reason: string;
  decidedAt: string;
};

export type WorkflowActionDecision = {
  schema: typeof WORKFLOW_ACTION_DECISION_SCHEMA;
  version: typeof WORKFLOW_ACTION_PLUGIN_VERSION;
  decisionId: string;
  intentId: string;
  workspaceId: string;
  capabilityId: string;
  decision: "approve" | "reject";
  reviewerRole: "owner" | "admin" | "reviewer";
  reviewedBy: string;
  reason: string;
  decidedAt: string;
  state: "approved-for-handoff" | "rejected";
  actionExecuted: false;
  immutableEvidenceFingerprintSha256: string;
};

export type WorkflowActionHandoffAuthorization = {
  capability: "workflow-actions.handoff";
  granted: boolean;
  grantId: string;
  subjectId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  workspaceId: string;
  expiresAt: string;
  reviewAt: string;
};

export type WorkflowActionExecutionHandoffInput = {
  handoffId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  auditCorrelationId: string;
  authorization: WorkflowActionHandoffAuthorization;
  createdAt: string;
};

export type WorkflowActionExecutionHandoff = {
  schema: typeof WORKFLOW_ACTION_HANDOFF_SCHEMA;
  version: typeof WORKFLOW_ACTION_PLUGIN_VERSION;
  handoffId: string;
  intentId: string;
  decisionId: string;
  capabilityId: string;
  actionKind: WorkflowAutomationActionKind;
  destinationApplicationId: WebhookSourceApplication;
  workspaceId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  input: Readonly<Record<string, string | number | boolean>>;
  inputFingerprintSha256: string;
  auditCorrelationId: string;
  authorizationEvidenceId: string;
  idempotencyKeySha256: string;
  createdAt: string;
  state: "ready-for-host-callback";
  security: {
    executionPerformedByPlugin: false;
    ownerDecisionReplacedByGrant: false;
    hostCallbackStillRequired: true;
    duplicateHandoffUsesSameIdempotencyKey: true;
  };
};

export type WorkflowActionCallbackInput = {
  callbackId: string;
  idempotencyKeySha256: string;
  outcome: "accepted" | "rejected" | "error";
  receivedAt: string;
  hostReceiptId?: string | null;
  rejectionReason?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type WorkflowActionCallbackReceipt = {
  schema: typeof WORKFLOW_ACTION_CALLBACK_SCHEMA;
  version: typeof WORKFLOW_ACTION_PLUGIN_VERSION;
  callbackId: string;
  handoffId: string;
  intentId: string;
  decisionId: string;
  capabilityId: string;
  destinationApplicationId: WebhookSourceApplication;
  workspaceId: string;
  idempotencyKeySha256: string;
  outcome: "accepted" | "rejected" | "error";
  hostReceiptId: string | null;
  rejectionReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  receivedAt: string;
  evidenceFingerprintSha256: string;
  security: {
    callbackReceiptProvesExternalSideEffect: false;
    callbackMayReleaseOtherGovernanceGates: false;
    retryMustReuseIdempotencyKey: true;
  };
};

export class WorkflowActionPluginError extends Error {
  readonly code:
    | "descriptor_invalid"
    | "input_invalid"
    | "intent_invalid"
    | "decision_invalid"
    | "decision_rejected"
    | "authorization_denied"
    | "authorization_scope_mismatch"
    | "authorization_expired"
    | "authorization_review_required"
    | "handoff_invalid"
    | "callback_invalid"
    | "idempotency_mismatch";

  constructor(
    code: WorkflowActionPluginError["code"],
    message: string
  ) {
    super(message);
    this.name = "WorkflowActionPluginError";
    this.code = code;
  }
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,159}$/;
const CAPABILITY_PATTERN =
  /^[a-z][a-z0-9]*(?:[.:/_-][a-z0-9]+)*$/;
const FIELD_KEY_PATTERN = /^[a-z][A-Za-z0-9]{0,63}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function normalizedTimestamp(
  value: string | Date,
  code: WorkflowActionPluginError["code"],
  field: string
) {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new WorkflowActionPluginError(
      code,
      field + " must be a valid timestamp."
    );
  }
  return new Date(time).toISOString();
}

function safeText(
  value: unknown,
  min: number,
  max: number,
  code: WorkflowActionPluginError["code"],
  field: string
) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text.length < min ||
    text.length > max ||
    CONTROL_PATTERN.test(text)
  ) {
    throw new WorkflowActionPluginError(
      code,
      field + " is invalid."
    );
  }
  return text;
}

function assertId(
  value: string,
  code: WorkflowActionPluginError["code"],
  field: string
) {
  if (!ID_PATTERN.test(value)) {
    throw new WorkflowActionPluginError(
      code,
      field + " is invalid."
    );
  }
}

function assertApplication(value: string) {
  if (
    !WEBHOOK_SOURCE_APPLICATIONS.includes(
      value as WebhookSourceApplication
    )
  ) {
    throw new WorkflowActionPluginError(
      "intent_invalid",
      "Application identity is not supported by the workflow action plug-in."
    );
  }
}

function descriptor(
  actionKind: WorkflowAutomationActionKind,
  displayName: string,
  description: string,
  fields: WorkflowActionInputField[]
): WorkflowActionCapabilityDescriptor {
  return Object.freeze({
    capabilityId: "workflow-action." + actionKind,
    actionKind,
    displayName,
    description,
    destinationSurface: workflowAutomationActionHref(actionKind),
    inputSchema: Object.freeze({
      schema:
        "rosevear.ai-data-platform.workflow-action-input-schema.v1" as const,
      additionalProperties: false as const,
      fields: Object.freeze(fields.map((field) => Object.freeze({ ...field })))
    }),
    consequential: true as const,
    requiresOwnerOrReviewerDecision: true as const,
    executesOnRuleMatch: false as const,
    executesOnApproval: false as const,
    hostCallbackRequired: true as const
  });
}

export function createWorkflowActionCapabilityDescriptors() {
  const descriptors = [
    descriptor(
      "prepare-shared-task",
      "Prepare shared task",
      "Prepare a held shared task for the governed task workbench.",
      [
        {
          key: "title",
          type: "string",
          required: true,
          description: "Task title.",
          maxLength: 160
        },
        {
          key: "priority",
          type: "string",
          required: true,
          description: "Task priority.",
          enum: ["low", "normal", "high", "urgent"]
        }
      ]
    ),
    descriptor(
      "prepare-notification",
      "Prepare notification",
      "Prepare a held notification for consent-aware review.",
      [
        {
          key: "subject",
          type: "string",
          required: true,
          description: "Notification subject.",
          maxLength: 160
        },
        {
          key: "channel",
          type: "string",
          required: true,
          description: "Requested notification channel.",
          enum: ["email", "sms", "in-app"]
        }
      ]
    ),
    descriptor(
      "prepare-schedule",
      "Prepare schedule item",
      "Prepare a held appointment, booking, job, maintenance or event item.",
      [
        {
          key: "title",
          type: "string",
          required: true,
          description: "Schedule item title.",
          maxLength: 160
        },
        {
          key: "itemType",
          type: "string",
          required: true,
          description: "Schedule item type.",
          enum: [
            "appointment",
            "booking",
            "job",
            "maintenance",
            "event",
            "hold"
          ]
        }
      ]
    ),
    descriptor(
      "review-event-recovery",
      "Review event recovery",
      "Open governed event recovery review without initiating replay.",
      [
        {
          key: "reason",
          type: "string",
          required: true,
          description: "Reason for recovery review.",
          maxLength: 240
        }
      ]
    ),
    descriptor(
      "review-integration-recovery",
      "Review integration recovery",
      "Open governed integration recovery review without activating a connection.",
      [
        {
          key: "reason",
          type: "string",
          required: true,
          description: "Reason for integration recovery review.",
          maxLength: 240
        }
      ]
    )
  ] as const;

  if (
    descriptors.length !== WORKFLOW_AUTOMATION_ACTION_KINDS.length ||
    new Set(descriptors.map((item) => item.capabilityId)).size !==
      descriptors.length
  ) {
    throw new WorkflowActionPluginError(
      "descriptor_invalid",
      "Workflow action capability descriptors are incomplete or duplicated."
    );
  }

  return Object.freeze(descriptors);
}

export function validateWorkflowActionInput(
  descriptor: WorkflowActionCapabilityDescriptor,
  value: unknown
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkflowActionPluginError(
      "input_invalid",
      "Workflow action input must be an object."
    );
  }

  if (
    !CAPABILITY_PATTERN.test(descriptor.capabilityId) ||
    descriptor.capabilityId.length > 160 ||
    descriptor.destinationSurface !==
      workflowAutomationActionHref(descriptor.actionKind)
  ) {
    throw new WorkflowActionPluginError(
      "descriptor_invalid",
      "Workflow action capability descriptor is invalid."
    );
  }

  const input = value as Record<string, unknown>;
  const allowed = new Set(descriptor.inputSchema.fields.map((field) => field.key));
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new WorkflowActionPluginError(
        "input_invalid",
        "Workflow action input contains an unsupported field: " + key
      );
    }
  }

  const normalized: Record<string, string | number | boolean> = {};
  for (const field of descriptor.inputSchema.fields) {
    if (!FIELD_KEY_PATTERN.test(field.key)) {
      throw new WorkflowActionPluginError(
        "descriptor_invalid",
        "Workflow action input schema contains an invalid field key."
      );
    }
    const raw = input[field.key];
    if (raw === undefined || raw === null || raw === "") {
      if (field.required) {
        throw new WorkflowActionPluginError(
          "input_invalid",
          "Required workflow action field is missing: " + field.key
        );
      }
      continue;
    }

    if (field.type === "string") {
      if (typeof raw !== "string") {
        throw new WorkflowActionPluginError(
          "input_invalid",
          "Workflow action field must be a string: " + field.key
        );
      }
      const text = raw.trim();
      if (!text || CONTROL_PATTERN.test(text)) {
        throw new WorkflowActionPluginError(
          "input_invalid",
          "Workflow action string field is invalid: " + field.key
        );
      }
      if (field.maxLength && text.length > field.maxLength) {
        throw new WorkflowActionPluginError(
          "input_invalid",
          "Workflow action string field is too long: " + field.key
        );
      }
      if (field.enum && !field.enum.includes(text)) {
        throw new WorkflowActionPluginError(
          "input_invalid",
          "Workflow action field is not an allowed value: " + field.key
        );
      }
      normalized[field.key] = text;
      continue;
    }

    if (field.type === "number") {
      if (
        typeof raw !== "number" ||
        !Number.isFinite(raw) ||
        (field.minimum !== undefined && raw < field.minimum) ||
        (field.maximum !== undefined && raw > field.maximum)
      ) {
        throw new WorkflowActionPluginError(
          "input_invalid",
          "Workflow action numeric field is invalid: " + field.key
        );
      }
      normalized[field.key] = raw;
      continue;
    }

    if (typeof raw !== "boolean") {
      throw new WorkflowActionPluginError(
        "input_invalid",
        "Workflow action field must be boolean: " + field.key
      );
    }
    normalized[field.key] = raw;
  }

  return Object.freeze(normalized);
}

export function createHeldWorkflowActionPluginIntent(
  source: Build302HeldIntentSource,
  descriptor: WorkflowActionCapabilityDescriptor
): WorkflowActionPluginIntent {
  for (const [field, value] of [
    ["intentId", source.intentId],
    ["workspaceId", source.workspaceId],
    ["ruleId", source.ruleId],
    ["ruleReviewId", source.ruleReviewId],
    ["publicationId", source.publicationId],
    ["eventId", source.eventId],
    ["createdBy", source.createdBy]
  ] as const) {
    assertId(value, "intent_invalid", field);
  }
  assertApplication(source.sourceApplicationId);
  assertApplication(source.destinationApplicationId);

  if (
    source.state !== "held" ||
    source.holdReason !== "workflow-action-not-authorized"
  ) {
    throw new WorkflowActionPluginError(
      "intent_invalid",
      "Only the exact Build 302 held action-intent boundary may enter the plug-in interface."
    );
  }
  if (
    source.actionKind !== descriptor.actionKind ||
    source.destinationApplicationId === source.sourceApplicationId ||
    source.targetHref !== descriptor.destinationSurface
  ) {
    throw new WorkflowActionPluginError(
      "intent_invalid",
      "Build 302 action intent does not match the selected capability descriptor."
    );
  }

  const config = normalizeWorkflowAutomationConfig(
    source.actionKind,
    source.actionConfig
  );
  const input = validateWorkflowActionInput(descriptor, config);
  const createdAt = normalizedTimestamp(
    source.createdAt,
    "intent_invalid",
    "createdAt"
  );
  const inputFingerprintSha256 = sha256([
    "rosevear-workflow-action-input-v1",
    source.intentId,
    descriptor.capabilityId,
    input
  ]);

  return Object.freeze({
    schema: WORKFLOW_ACTION_INTENT_SCHEMA,
    version: WORKFLOW_ACTION_PLUGIN_VERSION,
    intentId: source.intentId,
    workspaceId: source.workspaceId,
    ruleId: source.ruleId,
    ruleReviewId: source.ruleReviewId,
    publicationId: source.publicationId,
    sourceApplicationId: source.sourceApplicationId,
    destinationApplicationId: source.destinationApplicationId,
    eventId: source.eventId,
    eventType: safeText(
      source.eventType,
      1,
      160,
      "intent_invalid",
      "eventType"
    ),
    capabilityId: descriptor.capabilityId,
    actionKind: source.actionKind,
    input,
    inputFingerprintSha256,
    targetHref: descriptor.destinationSurface,
    sourceCreatedAt: createdAt,
    state: "held" as const,
    holdReason: "workflow-action-not-authorized" as const,
    sourceBoundary: "build-302-held-intent" as const,
    security: Object.freeze({
      ruleMatchExecutesAction: false as const,
      heldIntentExecutesAction: false as const,
      sourceMutationPerformed: false as const
    })
  });
}

export function recordWorkflowActionDecision(
  intent: WorkflowActionPluginIntent,
  input: WorkflowActionDecisionInput
): WorkflowActionDecision {
  assertId(input.decisionId, "decision_invalid", "decisionId");
  assertId(input.reviewedBy, "decision_invalid", "reviewedBy");
  if (
    !["approve", "reject"].includes(input.decision) ||
    !["owner", "admin", "reviewer"].includes(input.reviewerRole)
  ) {
    throw new WorkflowActionPluginError(
      "decision_invalid",
      "Workflow action review decision is invalid."
    );
  }

  const reason = safeText(
    input.reason,
    8,
    500,
    "decision_invalid",
    "decision reason"
  );
  const decidedAt = normalizedTimestamp(
    input.decidedAt,
    "decision_invalid",
    "decidedAt"
  );

  const immutableEvidenceFingerprintSha256 = sha256([
    "rosevear-workflow-action-decision-v1",
    input.decisionId,
    intent.intentId,
    intent.workspaceId,
    intent.capabilityId,
    input.decision,
    input.reviewerRole,
    input.reviewedBy,
    reason,
    decidedAt,
    intent.inputFingerprintSha256
  ]);

  return Object.freeze({
    schema: WORKFLOW_ACTION_DECISION_SCHEMA,
    version: WORKFLOW_ACTION_PLUGIN_VERSION,
    decisionId: input.decisionId,
    intentId: intent.intentId,
    workspaceId: intent.workspaceId,
    capabilityId: intent.capabilityId,
    decision: input.decision,
    reviewerRole: input.reviewerRole,
    reviewedBy: input.reviewedBy,
    reason,
    decidedAt,
    state:
      input.decision === "approve"
        ? ("approved-for-handoff" as const)
        : ("rejected" as const),
    actionExecuted: false as const,
    immutableEvidenceFingerprintSha256
  });
}

function assertHandoffAuthorization(
  authorization: WorkflowActionHandoffAuthorization,
  input: WorkflowActionExecutionHandoffInput,
  workspaceId: string,
  now: number
) {
  if (
    authorization.capability !== "workflow-actions.handoff" ||
    !authorization.granted
  ) {
    throw new WorkflowActionPluginError(
      "authorization_denied",
      "Workflow action handoff capability is not granted."
    );
  }
  if (
    authorization.hostApplicationId !== input.hostApplicationId ||
    authorization.hostEnvironment !== input.hostEnvironment ||
    authorization.platformTenantId !== input.platformTenantId ||
    authorization.workspaceId !== workspaceId
  ) {
    throw new WorkflowActionPluginError(
      "authorization_scope_mismatch",
      "Workflow action handoff authorization does not match the active host and workspace scope."
    );
  }
  for (const [field, value] of [
    ["grantId", authorization.grantId],
    ["subjectId", authorization.subjectId]
  ] as const) {
    assertId(value, "authorization_denied", field);
  }

  const expiresAt = Date.parse(authorization.expiresAt);
  const reviewAt = Date.parse(authorization.reviewAt);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(reviewAt)) {
    throw new WorkflowActionPluginError(
      "authorization_denied",
      "Workflow action authorization timestamps are invalid."
    );
  }
  if (expiresAt <= now) {
    throw new WorkflowActionPluginError(
      "authorization_expired",
      "Workflow action handoff authorization has expired."
    );
  }
  if (reviewAt <= now) {
    throw new WorkflowActionPluginError(
      "authorization_review_required",
      "Workflow action handoff authorization requires review."
    );
  }
}

export function createWorkflowActionExecutionHandoff(
  intent: WorkflowActionPluginIntent,
  decision: WorkflowActionDecision,
  input: WorkflowActionExecutionHandoffInput,
  now = Date.now()
): WorkflowActionExecutionHandoff {
  if (
    decision.intentId !== intent.intentId ||
    decision.workspaceId !== intent.workspaceId ||
    decision.capabilityId !== intent.capabilityId
  ) {
    throw new WorkflowActionPluginError(
      "handoff_invalid",
      "Workflow action decision does not belong to this held intent."
    );
  }
  if (
    decision.decision !== "approve" ||
    decision.state !== "approved-for-handoff"
  ) {
    throw new WorkflowActionPluginError(
      "decision_rejected",
      "Rejected workflow action intents cannot be handed to a host."
    );
  }

  assertId(input.handoffId, "handoff_invalid", "handoffId");
  assertId(
    input.auditCorrelationId,
    "handoff_invalid",
    "auditCorrelationId"
  );
  if (!CAPABILITY_PATTERN.test(intent.capabilityId)) {
    throw new WorkflowActionPluginError(
      "handoff_invalid",
      "Workflow action capability ID is invalid."
    );
  }

  const createdAt = normalizedTimestamp(
    input.createdAt,
    "handoff_invalid",
    "createdAt"
  );
  assertHandoffAuthorization(
    input.authorization,
    input,
    intent.workspaceId,
    now
  );

  const idempotencyKeySha256 = sha256([
    "rosevear-workflow-action-handoff-v1",
    intent.workspaceId,
    intent.intentId,
    decision.decisionId,
    intent.capabilityId,
    intent.destinationApplicationId,
    intent.inputFingerprintSha256
  ]);

  return Object.freeze({
    schema: WORKFLOW_ACTION_HANDOFF_SCHEMA,
    version: WORKFLOW_ACTION_PLUGIN_VERSION,
    handoffId: input.handoffId,
    intentId: intent.intentId,
    decisionId: decision.decisionId,
    capabilityId: intent.capabilityId,
    actionKind: intent.actionKind,
    destinationApplicationId: intent.destinationApplicationId,
    workspaceId: intent.workspaceId,
    hostApplicationId: input.hostApplicationId,
    hostEnvironment: input.hostEnvironment,
    platformTenantId: input.platformTenantId,
    input: intent.input,
    inputFingerprintSha256: intent.inputFingerprintSha256,
    auditCorrelationId: input.auditCorrelationId,
    authorizationEvidenceId: input.authorization.grantId,
    idempotencyKeySha256,
    createdAt,
    state: "ready-for-host-callback" as const,
    security: Object.freeze({
      executionPerformedByPlugin: false as const,
      ownerDecisionReplacedByGrant: false as const,
      hostCallbackStillRequired: true as const,
      duplicateHandoffUsesSameIdempotencyKey: true as const
    })
  });
}

export function createWorkflowActionCallbackReceipt(
  handoff: WorkflowActionExecutionHandoff,
  input: WorkflowActionCallbackInput
): WorkflowActionCallbackReceipt {
  assertId(input.callbackId, "callback_invalid", "callbackId");
  if (
    !SHA256_PATTERN.test(input.idempotencyKeySha256) ||
    input.idempotencyKeySha256 !== handoff.idempotencyKeySha256
  ) {
    throw new WorkflowActionPluginError(
      "idempotency_mismatch",
      "Host callback does not carry the exact workflow-action handoff idempotency key."
    );
  }
  if (!["accepted", "rejected", "error"].includes(input.outcome)) {
    throw new WorkflowActionPluginError(
      "callback_invalid",
      "Workflow action callback outcome is invalid."
    );
  }

  const receivedAt = normalizedTimestamp(
    input.receivedAt,
    "callback_invalid",
    "receivedAt"
  );
  const hostReceiptId =
    input.hostReceiptId === null || input.hostReceiptId === undefined
      ? null
      : safeText(
          input.hostReceiptId,
          1,
          160,
          "callback_invalid",
          "hostReceiptId"
        );
  const rejectionReason =
    input.rejectionReason === null || input.rejectionReason === undefined
      ? null
      : safeText(
          input.rejectionReason,
          8,
          500,
          "callback_invalid",
          "rejectionReason"
        );
  const errorCode =
    input.errorCode === null || input.errorCode === undefined
      ? null
      : safeText(
          input.errorCode,
          2,
          120,
          "callback_invalid",
          "errorCode"
        );
  const errorMessage =
    input.errorMessage === null || input.errorMessage === undefined
      ? null
      : safeText(
          input.errorMessage,
          8,
          500,
          "callback_invalid",
          "errorMessage"
        );

  if (input.outcome === "accepted" && !hostReceiptId) {
    throw new WorkflowActionPluginError(
      "callback_invalid",
      "Accepted host callbacks require a host receipt ID."
    );
  }
  if (input.outcome === "rejected" && !rejectionReason) {
    throw new WorkflowActionPluginError(
      "callback_invalid",
      "Rejected host callbacks require rejection evidence."
    );
  }
  if (input.outcome === "error" && (!errorCode || !errorMessage)) {
    throw new WorkflowActionPluginError(
      "callback_invalid",
      "Error callbacks require an error code and message."
    );
  }

  const evidenceFingerprintSha256 = sha256([
    "rosevear-workflow-action-callback-v1",
    input.callbackId,
    handoff.handoffId,
    handoff.intentId,
    handoff.decisionId,
    handoff.idempotencyKeySha256,
    input.outcome,
    hostReceiptId,
    rejectionReason,
    errorCode,
    errorMessage,
    receivedAt
  ]);

  return Object.freeze({
    schema: WORKFLOW_ACTION_CALLBACK_SCHEMA,
    version: WORKFLOW_ACTION_PLUGIN_VERSION,
    callbackId: input.callbackId,
    handoffId: handoff.handoffId,
    intentId: handoff.intentId,
    decisionId: handoff.decisionId,
    capabilityId: handoff.capabilityId,
    destinationApplicationId: handoff.destinationApplicationId,
    workspaceId: handoff.workspaceId,
    idempotencyKeySha256: handoff.idempotencyKeySha256,
    outcome: input.outcome,
    hostReceiptId,
    rejectionReason,
    errorCode,
    errorMessage,
    receivedAt,
    evidenceFingerprintSha256,
    security: Object.freeze({
      callbackReceiptProvesExternalSideEffect: false as const,
      callbackMayReleaseOtherGovernanceGates: false as const,
      retryMustReuseIdempotencyKey: true as const
    })
  });
}

export function workflowActionPluginDescriptor() {
  return Object.freeze({
    schema: WORKFLOW_ACTION_PLUGIN_SCHEMA,
    version: WORKFLOW_ACTION_PLUGIN_VERSION,
    sourceIntentBoundary: "Build 302 held action intents",
    capabilities: createWorkflowActionCapabilityDescriptors(),
    typedInputSchemas: true,
    heldActionIntents: true,
    ownerReviewerDecisions: true,
    hostCallbackReceipts: true,
    idempotentExecutionHandoff: true,
    rejectionAndErrorEvidence: true,
    ruleMatchExecutesAction: false,
    approvalExecutesAction: false,
    callbackReceiptProvesExternalSideEffect: false
  });
}
