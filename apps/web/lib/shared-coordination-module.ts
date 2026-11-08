import { createHash } from "node:crypto";

import {
  consentAllowsRequest,
  normalizeConsentEvidence,
  normalizeNotificationRequest,
  type NormalizedConsentEvidence,
  type NormalizedNotificationRequest
} from "./notification-consent-core";
import {
  buildTaskExchangeEnvelope,
  normalizeSharedTask,
  type NormalizedSharedTask
} from "./shared-task-exchange-core";
import {
  buildScheduleExchangeEnvelope,
  normalizeScheduleItem,
  scheduleRangesOverlap,
  type NormalizedScheduleItem
} from "./shared-scheduling-core";
import type { HostEnvironment } from "./universal-module-contract";

export const SHARED_COORDINATION_MODULE_VERSION = "1.0.0" as const;
export const SHARED_COORDINATION_MODULE_SCHEMA =
  "rosevear.ai-data-platform.shared-coordination-module.v1" as const;
export const SHARED_COORDINATION_CORRELATION_SCHEMA =
  "rosevear.ai-data-platform.shared-coordination-correlation.v1" as const;

export type SharedCoordinationModuleKind =
  | "notification"
  | "task-follow-up"
  | "schedule";

export type SharedCoordinationRoutePreference =
  | "direct-governed"
  | "comms-hub";

export type SharedCoordinationHostContext = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  workspaceId: string;
  auditCorrelationId: string;
};

export type SharedCoordinationCorrelation = {
  schema: typeof SHARED_COORDINATION_CORRELATION_SCHEMA;
  version: typeof SHARED_COORDINATION_MODULE_VERSION;
  moduleKind: SharedCoordinationModuleKind;
  correlationSha256: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  workspaceId: string;
  sourceApplicationId: string;
  sourceRecordId: string;
  canonicalTenantKey: string;
  destinationApplicationId: string;
  auditCorrelationId: string;
};

export type SharedCoordinationConflictEvidence = {
  kind: "consent" | "schedule-overlap";
  code: string;
  summary: string;
  localOnly: true;
  evidenceSha256: string;
};

export type NotificationModuleRequestInput = {
  host: SharedCoordinationHostContext;
  request: Parameters<typeof normalizeNotificationRequest>[0];
  consentEvidence:
    | Parameters<typeof normalizeConsentEvidence>[0]
    | null;
  routePreference?: SharedCoordinationRoutePreference;
};

export type NotificationModulePackage = {
  schema: "rosevear.ai-data-platform.notification-module-package.v1";
  version: typeof SHARED_COORDINATION_MODULE_VERSION;
  moduleKind: "notification";
  correlation: SharedCoordinationCorrelation;
  request: NormalizedNotificationRequest;
  consentEvidence: NormalizedConsentEvidence | null;
  consentCheck:
    | "consent-granted"
    | "consent-missing"
    | "consent-scope-mismatch"
    | "consent-not-granted"
    | "consent-expired";
  approvalEligible: boolean;
  state: "held";
  holdReason:
    | "notification-dispatch-not-authorized"
    | "notification-consent-not-granted";
  conflicts: SharedCoordinationConflictEvidence[];
  routing: {
    preference: SharedCoordinationRoutePreference;
    preferredOperatorApplicationId: "rosevear-comms-hub";
    commsHubRoutingRequested: boolean;
    commsHubRoutingAuthorized: false;
  };
  outboundDeliveryRequested: false;
  peerApplicationWriteRequested: false;
};

export type TaskFollowUpModuleRequestInput = {
  host: SharedCoordinationHostContext;
  task: Parameters<typeof normalizeSharedTask>[0];
  routePreference?: SharedCoordinationRoutePreference;
};

export type TaskFollowUpModulePackage = {
  schema: "rosevear.ai-data-platform.task-follow-up-module-package.v1";
  version: typeof SHARED_COORDINATION_MODULE_VERSION;
  moduleKind: "task-follow-up";
  correlation: SharedCoordinationCorrelation;
  task: NormalizedSharedTask;
  exchange: ReturnType<typeof buildTaskExchangeEnvelope>;
  state: "held";
  holdReason: "task-exchange-not-authorized";
  conflicts: [];
  routing: {
    preference: SharedCoordinationRoutePreference;
    preferredOperatorApplicationId: "rosevear-comms-hub" | null;
    commsHubRoutingRequested: boolean;
    commsHubRoutingAuthorized: false;
  };
  outboundDeliveryRequested: false;
  peerApplicationWriteRequested: false;
};

export type ScheduleConflictCandidate = {
  scheduleId: string;
  canonicalTenantKey: string;
  destinationApplicationId: string;
  status: string;
  startAt: string;
  endAt: string | null;
};

export type ScheduleModuleRequestInput = {
  host: SharedCoordinationHostContext;
  item: Parameters<typeof normalizeScheduleItem>[0];
  localCandidates?: ScheduleConflictCandidate[];
  routePreference?: SharedCoordinationRoutePreference;
};

export type ScheduleModulePackage = {
  schema: "rosevear.ai-data-platform.schedule-module-package.v1";
  version: typeof SHARED_COORDINATION_MODULE_VERSION;
  moduleKind: "schedule";
  correlation: SharedCoordinationCorrelation;
  item: NormalizedScheduleItem;
  exchange: ReturnType<typeof buildScheduleExchangeEnvelope>;
  approvalEligible: boolean;
  state: "held";
  holdReason: "schedule-exchange-not-authorized";
  conflicts: SharedCoordinationConflictEvidence[];
  routing: {
    preference: SharedCoordinationRoutePreference;
    preferredOperatorApplicationId: "rosevear-comms-hub" | null;
    commsHubRoutingRequested: boolean;
    commsHubRoutingAuthorized: false;
  };
  outboundDeliveryRequested: false;
  peerCalendarWriteRequested: false;
};

export class SharedCoordinationModuleError extends Error {
  readonly code:
    | "host_context_invalid"
    | "route_preference_invalid"
    | "candidate_invalid";

  constructor(
    code: SharedCoordinationModuleError["code"],
    message: string
  ) {
    super(message);
    this.name = "SharedCoordinationModuleError";
    this.code = code;
  }
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{1,159}$/;
const APP_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;

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

function assertHostContext(host: SharedCoordinationHostContext) {
  if (
    !APP_ID_PATTERN.test(host.hostApplicationId) ||
    !ID_PATTERN.test(host.platformTenantId) ||
    !ID_PATTERN.test(host.workspaceId) ||
    !ID_PATTERN.test(host.auditCorrelationId)
  ) {
    throw new SharedCoordinationModuleError(
      "host_context_invalid",
      "Shared coordination host context is invalid."
    );
  }
}

function routePreference(
  value: SharedCoordinationRoutePreference | undefined
): SharedCoordinationRoutePreference {
  if (value === undefined) return "direct-governed";
  if (value !== "direct-governed" && value !== "comms-hub") {
    throw new SharedCoordinationModuleError(
      "route_preference_invalid",
      "Shared coordination route preference is invalid."
    );
  }
  return value;
}

function createCorrelation(
  moduleKind: SharedCoordinationModuleKind,
  host: SharedCoordinationHostContext,
  sourceApplicationId: string,
  sourceRecordId: string,
  canonicalTenantKey: string,
  destinationApplicationId: string
): SharedCoordinationCorrelation {
  assertHostContext(host);
  if (
    !sourceApplicationId ||
    !destinationApplicationId ||
    !sourceRecordId ||
    CONTROL_PATTERN.test(sourceRecordId)
  ) {
    throw new SharedCoordinationModuleError(
      "host_context_invalid",
      "Shared coordination source correlation is invalid."
    );
  }

  const correlationSha256 = sha256([
    "rosevear-shared-coordination-correlation-v1",
    moduleKind,
    host.hostApplicationId,
    host.hostEnvironment,
    host.platformTenantId,
    host.workspaceId,
    sourceApplicationId,
    sourceRecordId,
    canonicalTenantKey,
    destinationApplicationId,
    host.auditCorrelationId
  ]);

  return Object.freeze({
    schema: SHARED_COORDINATION_CORRELATION_SCHEMA,
    version: SHARED_COORDINATION_MODULE_VERSION,
    moduleKind,
    correlationSha256,
    hostApplicationId: host.hostApplicationId,
    hostEnvironment: host.hostEnvironment,
    platformTenantId: host.platformTenantId,
    workspaceId: host.workspaceId,
    sourceApplicationId,
    sourceRecordId,
    canonicalTenantKey,
    destinationApplicationId,
    auditCorrelationId: host.auditCorrelationId
  });
}

function conflictEvidence(
  kind: SharedCoordinationConflictEvidence["kind"],
  code: string,
  summary: string,
  evidence: unknown
): SharedCoordinationConflictEvidence {
  return Object.freeze({
    kind,
    code,
    summary,
    localOnly: true as const,
    evidenceSha256: sha256([
      "rosevear-shared-coordination-conflict-v1",
      kind,
      code,
      evidence
    ])
  });
}

export function prepareNotificationModuleRequest(
  input: NotificationModuleRequestInput
): NotificationModulePackage {
  const request = normalizeNotificationRequest(input.request);
  const consentEvidence = input.consentEvidence
    ? normalizeConsentEvidence(input.consentEvidence)
    : null;
  const consent = consentAllowsRequest(consentEvidence, request);
  const preference = routePreference(input.routePreference);
  const correlation = createCorrelation(
    "notification",
    input.host,
    request.sourceApplicationId,
    request.sourceRecordId,
    request.canonicalTenantKey,
    request.operatorApplicationId
  );

  const conflicts: SharedCoordinationConflictEvidence[] = consent.allowed
    ? []
    : [
        conflictEvidence(
          "consent",
          consent.code,
          "Notification remains held because current consent evidence is not eligible for approval.",
          {
            correlation: correlation.correlationSha256,
            customerRecordId: request.customerRecordId,
            channel: request.channel,
            consentCode: consent.code,
            consentEvidenceSha256: consentEvidence?.evidenceSha256 ?? null
          }
        )
      ];

  return Object.freeze({
    schema:
      "rosevear.ai-data-platform.notification-module-package.v1" as const,
    version: SHARED_COORDINATION_MODULE_VERSION,
    moduleKind: "notification" as const,
    correlation,
    request,
    consentEvidence,
    consentCheck: consent.code,
    approvalEligible: consent.allowed,
    state: "held" as const,
    holdReason: consent.allowed
      ? ("notification-dispatch-not-authorized" as const)
      : ("notification-consent-not-granted" as const),
    conflicts: [...conflicts],
    routing: Object.freeze({
      preference,
      preferredOperatorApplicationId: "rosevear-comms-hub" as const,
      commsHubRoutingRequested: preference === "comms-hub",
      commsHubRoutingAuthorized: false as const
    }),
    outboundDeliveryRequested: false as const,
    peerApplicationWriteRequested: false as const
  });
}

export function prepareTaskFollowUpModuleRequest(
  input: TaskFollowUpModuleRequestInput
): TaskFollowUpModulePackage {
  const task = normalizeSharedTask(input.task);
  const exchange = buildTaskExchangeEnvelope(task);
  const preference = routePreference(input.routePreference);
  const correlation = createCorrelation(
    "task-follow-up",
    input.host,
    task.sourceApplicationId,
    task.sourceRecordId,
    task.canonicalTenantKey,
    task.destinationApplicationId
  );

  return Object.freeze({
    schema:
      "rosevear.ai-data-platform.task-follow-up-module-package.v1" as const,
    version: SHARED_COORDINATION_MODULE_VERSION,
    moduleKind: "task-follow-up" as const,
    correlation,
    task,
    exchange,
    state: "held" as const,
    holdReason: "task-exchange-not-authorized" as const,
    conflicts: [] as [],
    routing: Object.freeze({
      preference,
      preferredOperatorApplicationId:
        preference === "comms-hub"
          ? ("rosevear-comms-hub" as const)
          : null,
      commsHubRoutingRequested: preference === "comms-hub",
      commsHubRoutingAuthorized: false as const
    }),
    outboundDeliveryRequested: false as const,
    peerApplicationWriteRequested: false as const
  });
}

function scheduleConflicts(
  item: NormalizedScheduleItem,
  candidates: ScheduleConflictCandidate[]
) {
  if (candidates.length > 100) {
    throw new SharedCoordinationModuleError(
      "candidate_invalid",
      "Schedule conflict candidate list exceeds the 100-item limit."
    );
  }

  return candidates.flatMap((candidate) => {
    if (
      !ID_PATTERN.test(candidate.scheduleId) ||
      CONTROL_PATTERN.test(candidate.destinationApplicationId) ||
      CONTROL_PATTERN.test(candidate.canonicalTenantKey)
    ) {
      throw new SharedCoordinationModuleError(
        "candidate_invalid",
        "Schedule conflict candidate is invalid."
      );
    }
    if (
      candidate.status === "cancelled" ||
      candidate.destinationApplicationId !== item.destinationApplicationId ||
      candidate.canonicalTenantKey !== item.canonicalTenantKey ||
      !scheduleRangesOverlap(
        { startAt: item.startAt, endAt: item.endAt },
        { startAt: candidate.startAt, endAt: candidate.endAt }
      )
    ) {
      return [];
    }

    return [
      conflictEvidence(
        "schedule-overlap",
        "local-destination-overlap",
        "Overlapping held schedule items exist for the same destination application. Peer calendar availability was not queried.",
        {
          scheduleSha256: item.scheduleSha256,
          candidateScheduleId: candidate.scheduleId,
          destinationApplicationId: item.destinationApplicationId,
          canonicalTenantKey: item.canonicalTenantKey,
          candidateStartAt: candidate.startAt,
          candidateEndAt: candidate.endAt
        }
      )
    ];
  });
}

export function prepareScheduleModuleRequest(
  input: ScheduleModuleRequestInput
): ScheduleModulePackage {
  const item = normalizeScheduleItem(input.item);
  const exchange = buildScheduleExchangeEnvelope(item);
  const conflicts = scheduleConflicts(item, input.localCandidates ?? []);
  const preference = routePreference(input.routePreference);
  const correlation = createCorrelation(
    "schedule",
    input.host,
    item.sourceApplicationId,
    item.sourceRecordId,
    item.canonicalTenantKey,
    item.destinationApplicationId
  );

  return Object.freeze({
    schema:
      "rosevear.ai-data-platform.schedule-module-package.v1" as const,
    version: SHARED_COORDINATION_MODULE_VERSION,
    moduleKind: "schedule" as const,
    correlation,
    item,
    exchange,
    approvalEligible: conflicts.length === 0,
    state: "held" as const,
    holdReason: "schedule-exchange-not-authorized" as const,
    conflicts: [...conflicts],
    routing: Object.freeze({
      preference,
      preferredOperatorApplicationId:
        preference === "comms-hub"
          ? ("rosevear-comms-hub" as const)
          : null,
      commsHubRoutingRequested: preference === "comms-hub",
      commsHubRoutingAuthorized: false as const
    }),
    outboundDeliveryRequested: false as const,
    peerCalendarWriteRequested: false as const
  });
}

export function sharedCoordinationModuleDescriptor() {
  return Object.freeze({
    schema: SHARED_COORDINATION_MODULE_SCHEMA,
    version: SHARED_COORDINATION_MODULE_VERSION,
    sourceBuilds: Object.freeze([297, 298, 299]),
    modules: Object.freeze([
      Object.freeze({
        id: "notification",
        sourceBuild: 297,
        consentAware: true,
        state: "held",
        operatorSurface: "/notification-consent"
      }),
      Object.freeze({
        id: "task-follow-up",
        sourceBuild: 298,
        consentAware: false,
        state: "held",
        operatorSurface: "/shared-task-exchange"
      }),
      Object.freeze({
        id: "schedule",
        sourceBuild: 299,
        consentAware: false,
        state: "held",
        operatorSurface: "/shared-scheduling"
      })
    ]),
    hostSourceCorrelation: true,
    conflictEvidence: true,
    optionalCommsHubRouting: true,
    commsHubRoutingIsAuthorization: false,
    outboundDeliverySeparatelyGoverned: true,
    peerWritesRequestedByModule: false
  });
}
