import { BUILD_405_APPLICATION_IDS } from "./master-assurance-renewal-security-comms-recertification";
import type { IncidentRunbookRecoveryModel } from "./incident-runbook-recovery-orchestration";
import type { Build411GovernanceAssessment } from "./master-privileged-operations-server-custody";

export const BUILD_412 = 412 as const;
export const BUILD_412_SCHEMA =
  "rosevear.ai-data-platform.security-incident-fusion.v1" as const;

export const BUILD_412_TELEMETRY_DIMENSIONS = [
  "DEPLOYMENT","RUNTIME","SOURCE","SIGNER","RECEIVER","QUEUE",
  "DLQ","LATENCY","ERROR","MIGRATION","SECURITY","QUOTA"
] as const;
export type Build412TelemetryDimension =
  (typeof BUILD_412_TELEMETRY_DIMENSIONS)[number];

export const BUILD_412_SUPERVISED_ACTIONS = [
  "CONTAIN","RECOVER","ROLLBACK","RESTART"
] as const;
export type Build412SupervisedAction =
  (typeof BUILD_412_SUPERVISED_ACTIONS)[number];
export type Build412ApplicationId = (typeof BUILD_405_APPLICATION_IDS)[number];

export type Build412TelemetryEvidence = {
  evidenceId: string;
  appId: Build412ApplicationId;
  dimension: Build412TelemetryDimension;
  state: "HEALTHY" | "DEGRADED" | "FAILED" | "UNKNOWN";
  evidenceDigest: string;
  observedAt: string;
  expiresAt: string;
  sourceOwned: boolean;
  rawSecretPresent: boolean;
  independentlyVerified: boolean;
};

export type Build412IncidentSignal = {
  signalId: string;
  appId: Build412ApplicationId;
  correlationId: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  category: "SECURITY" | "RUNTIME" | "DELIVERY" | "DATABASE" | "QUOTA" | "DEPENDENCY";
  sourceEvidenceDigest: string;
  observedAt: string;
  independentlyVerified: boolean;
};

export type Build412RemediationReceipt = {
  receiptId: string;
  appId: Build412ApplicationId;
  action: Build412SupervisedAction;
  sourceAuthority: string;
  ownerApprovalReceiptId: string;
  custodianReceiptId: string;
  beforeState: string;
  afterState: string;
  actionDigest: string;
  postActionTelemetryDigest: string;
  executedAt: string;
  sourceExecutionVerified: boolean;
  authorityTransferOccurred: boolean;
};

function key(appId: string, dimension: string) {
  return appId + ":" + dimension;
}

export function evaluateBuild412SupervisedAction(input: {
  appId: Build412ApplicationId;
  action: Build412SupervisedAction;
  requesterRole: "owner" | "operator" | null;
  requesterUserId: string;
  reasonDigest: string;
  custodianUserId?: string | null;
  custodianReceiptVerified: boolean;
}) {
  const digestValid = /^sha256:[a-f0-9]{64}$/.test(input.reasonDigest);
  const state =
    input.requesterRole !== "owner"
      ? ("HOLD_MASTER_SYSOP_OWNER_REQUIRED" as const)
      : !digestValid
        ? ("HOLD_REASON_DIGEST_INVALID" as const)
        : !input.custodianReceiptVerified
          ? ("HOLD_INDEPENDENT_CUSTODIAN_REQUIRED" as const)
          : !input.custodianUserId ||
              input.custodianUserId === input.requesterUserId
            ? ("HOLD_ADMINISTRATIVE_SEPARATION_REQUIRED" as const)
            : ("AUTHORIZED_FOR_SOURCE_HANDOFF" as const);

  return {
    appId: input.appId,
    action: input.action,
    state,
    digestValid,
    aiDataPlatformExecutesPeerAction: false,
    sourceApplicationExecutionRequired: true,
    sourceExecutionReceiptRequired: true,
    postActionTelemetryRequired: true,
    authorityTransferAllowed: false
  };
}

export function assessBuild412IncidentFusion(input: {
  build411: Pick<Build411GovernanceAssessment, "governanceState">;
  telemetry?: readonly Build412TelemetryEvidence[];
  incidentSignals?: readonly Build412IncidentSignal[];
  remediationReceipts?: readonly Build412RemediationReceipt[];
  nowIso: string;
}) {
  const build411Eligible =
    input.build411.governanceState ===
    "PRIVILEGED_OPERATIONS_AND_SERVER_MODULE_CUSTODY_ASSURED";
  const now = Date.parse(input.nowIso);

  const telemetryMap = new Map<string, Build412TelemetryEvidence>();
  for (const item of input.telemetry ?? []) {
    telemetryMap.set(key(item.appId, item.dimension), item);
  }

  const missingTelemetry: string[] = [];
  const staleTelemetry: string[] = [];
  const invalidTelemetry: string[] = [];
  for (const appId of BUILD_405_APPLICATION_IDS) {
    for (const dimension of BUILD_412_TELEMETRY_DIMENSIONS) {
      const item = telemetryMap.get(key(appId, dimension));
      if (!item) {
        missingTelemetry.push(key(appId, dimension));
        continue;
      }
      if (
        !/^sha256:[a-f0-9]{64}$/.test(item.evidenceDigest) ||
        item.rawSecretPresent ||
        !item.sourceOwned ||
        !item.independentlyVerified
      ) invalidTelemetry.push(key(appId, dimension));
      if (Date.parse(item.expiresAt) <= now) staleTelemetry.push(key(appId, dimension));
    }
  }

  const invalidSignals = (input.incidentSignals ?? []).filter(
    (signal) =>
      !/^sha256:[a-f0-9]{64}$/.test(signal.sourceEvidenceDigest) ||
      !signal.independentlyVerified ||
      !signal.correlationId
  );

  const invalidReceipts = (input.remediationReceipts ?? []).filter(
    (receipt) =>
      !receipt.ownerApprovalReceiptId ||
      !receipt.custodianReceiptId ||
      !/^sha256:[a-f0-9]{64}$/.test(receipt.actionDigest) ||
      !/^sha256:[a-f0-9]{64}$/.test(receipt.postActionTelemetryDigest) ||
      !receipt.sourceExecutionVerified ||
      receipt.authorityTransferOccurred
  );

  const groupedCorrelations = new Map<string, Set<Build412ApplicationId>>();
  for (const signal of input.incidentSignals ?? []) {
    const set = groupedCorrelations.get(signal.correlationId) ?? new Set();
    set.add(signal.appId);
    groupedCorrelations.set(signal.correlationId, set);
  }
  const crossApplicationCorrelations = [...groupedCorrelations.entries()]
    .filter(([, apps]) => apps.size > 1)
    .map(([correlationId, apps]) => ({
      correlationId,
      appIds: [...apps]
    }));

  const governanceState =
    !build411Eligible
      ? ("HOLD_BUILD411_NOT_ASSURED" as const)
      : missingTelemetry.length
        ? ("SHARED_TELEMETRY_EVIDENCE_REQUIRED" as const)
        : staleTelemetry.length
          ? ("SHARED_TELEMETRY_STALE" as const)
          : invalidTelemetry.length
            ? ("SHARED_TELEMETRY_INVALID" as const)
            : invalidSignals.length
              ? ("INCIDENT_SIGNAL_INVALID" as const)
              : invalidReceipts.length
                ? ("REMEDIATION_RECEIPT_INVALID" as const)
                : ("SECURITY_INCIDENT_FUSION_AND_RECOVERY_ASSURED" as const);

  return {
    schema: BUILD_412_SCHEMA,
    build: BUILD_412,
    governanceState,
    build411Eligible,
    missingTelemetry,
    staleTelemetry,
    invalidTelemetry,
    invalidSignals,
    invalidReceipts,
    crossApplicationCorrelations,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      telemetryDimensions: BUILD_412_TELEMETRY_DIMENSIONS.length,
      requiredTelemetryEvidence:
        BUILD_405_APPLICATION_IDS.length * BUILD_412_TELEMETRY_DIMENSIONS.length,
      incidentSignals: (input.incidentSignals ?? []).length,
      remediationReceipts: (input.remediationReceipts ?? []).length
    },
    policy: {
      missingTelemetryIsHealthy: false,
      staleTelemetryMayAuthorizeRecovery: false,
      rawSecretTelemetryAllowed: false,
      localOperationalAuthorityPreserved: true,
      commsAuthorityPreserved: true,
      aiDataPlatformExecutesPeerRecovery: false,
      ownerApprovalRequired: true,
      independentCustodianRequired: true,
      sourceExecutionReceiptRequired: true,
      postActionTelemetryRequired: true,
      productionGreenImpliesIncidentResolved: false,
      productionGreenImpliesPeerRecovered: false,
      protocol: "1.1",
      lockstepReleaseRequired: false
    }
  };
}

export function summarizeBuild412FromRunbooks(
  model: IncidentRunbookRecoveryModel
) {
  const sourceStates = new Map(
    model.plans.map((plan) => [
      plan.sourceId,
      {
        severity: plan.severity,
        state: plan.state,
        dependencyState: plan.dependencyState,
        connectionState: plan.connectionState
      }
    ])
  );
  return {
    activePlans: model.plans.length,
    critical: model.summary.critical,
    blocked: model.summary.blocked,
    yw: sourceStates.get("yw") ?? null,
    icamp: sourceStates.get("icamp") ?? null,
    note:
      "This view is alert/runbook evidence only; absent telemetry dimensions remain UNKNOWN and are never inferred healthy."
  };
}

export type Build412GovernanceAssessment = ReturnType<
  typeof assessBuild412IncidentFusion
>;
