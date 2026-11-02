import type { IntegrationTarget } from "./integration-delivery";

export type ConsumerAcceptanceEvidenceClass =
  | "conformance"
  | "live-dry-run"
  | "controlled-live";

export type ConsumerAcceptanceReconciliationWorkspace = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  deliveryAttempts: number;
  conformanceAccepts: number;
  liveDryRunAccepts: number;
  controlledLiveAccepts: number;
  rejections: number;
  transportErrors: number;
  durableReceipts: number;
  acceptedDurableReceipts: number;
  replaySignals: number;
  duplicateConformanceRejections: number;
  controlledLiveRetryAttempts: number;
  activeLiveActivations: number;
  configuredTargets: number;
  receiptCoverage: {
    controlledLiveAcceptedWithAcknowledgement: number;
    controlledLiveAcceptedMissingAcknowledgement: number;
  };
  status: "live-evidence" | "dry-run-only" | "conformance-only" | "no-acceptance";
};

export type ConsumerAcceptanceReconciliationModel = {
  schema: "ai-data-platform.consumer-acceptance-reconciliation.v1";
  generatedAt: string;
  build: 276;
  exitCriterion: {
    met: boolean;
    label: string;
    evidence: string;
  };
  totals: {
    workspaces: number;
    deliveryAttempts: number;
    conformanceAccepts: number;
    liveDryRunAccepts: number;
    controlledLiveAccepts: number;
    rejections: number;
    transportErrors: number;
    durableReceipts: number;
    acceptedDurableReceipts: number;
    replaySignals: number;
    controlledLiveAcceptedWithAcknowledgement: number;
    controlledLiveAcceptedMissingAcknowledgement: number;
  };
  boundaries: {
    conformanceIsLiveAuthorization: false;
    dryRunIsLiveMutation: false;
    liveAcceptanceSource: "workspace_publication_live_deliveries";
    replayKeySource: "replayKey";
    duplicateBehavior: "return-original-ack";
  };
  workspaces: ConsumerAcceptanceReconciliationWorkspace[];
};

export type IntegrationEventEvidence = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  target: IntegrationTarget;
  transportMode: "conformance" | "live";
  eventType:
    | "handshake-accepted"
    | "handshake-rejected"
    | "delivery-attempted"
    | "delivery-accepted"
    | "delivery-rejected"
    | "transport-error";
  validationCode: string;
  details: Record<string, unknown>;
};

export type PublicationReceiptEvidence = {
  workspaceId: string;
  target: IntegrationTarget;
  transportMode: "conformance" | "live";
  receiptStatus: "accepted" | "rejected" | "transport-error";
  dryRun: boolean;
};

export type ControlledLiveDeliveryEvidence = {
  workspaceId: string;
  status: "reserved" | "accepted" | "rejected" | "transport-error";
  attemptCount: number;
  replayKey: string;
  idempotencyKey: string;
  acknowledgement: Record<string, unknown>;
};

export type ConsumerLiveActivationEvidence = {
  workspaceId: string;
  status: "active" | "revoked";
  expired: boolean;
};

export type ConsumerConfigEvidence = {
  target: IntegrationTarget;
  configured: boolean;
};

function boolDetail(details: Record<string, unknown>, key: string) {
  return details[key] === true;
}

export function buildConsumerAcceptanceReconciliation(input: {
  events: IntegrationEventEvidence[];
  receipts: PublicationReceiptEvidence[];
  liveDeliveries: ControlledLiveDeliveryEvidence[];
  activations: ConsumerLiveActivationEvidence[];
  configurations: ConsumerConfigEvidence[];
  generatedAt?: string;
}): ConsumerAcceptanceReconciliationModel {
  const workspaceMeta = new Map<
    string,
    { workspaceName: string; role: "owner" | "admin" | "member" }
  >();
  for (const event of input.events) {
    workspaceMeta.set(event.workspaceId, {
      workspaceName: event.workspaceName,
      role: event.role
    });
  }

  const workspaceIds = new Set<string>([
    ...input.events.map((event) => event.workspaceId),
    ...input.receipts.map((receipt) => receipt.workspaceId),
    ...input.liveDeliveries.map((delivery) => delivery.workspaceId),
    ...input.activations.map((activation) => activation.workspaceId)
  ]);

  const configuredTargets = input.configurations.filter((item) => item.configured).length;

  const workspaces = [...workspaceIds].map(
    (workspaceId): ConsumerAcceptanceReconciliationWorkspace => {
      const events = input.events.filter((event) => event.workspaceId === workspaceId);
      const receipts = input.receipts.filter((receipt) => receipt.workspaceId === workspaceId);
      const liveDeliveries = input.liveDeliveries.filter(
        (delivery) => delivery.workspaceId === workspaceId
      );
      const activations = input.activations.filter(
        (activation) => activation.workspaceId === workspaceId
      );
      const meta = workspaceMeta.get(workspaceId) ?? {
        workspaceName: workspaceId,
        role: "member" as const
      };

      const deliveryAttempts = events.filter(
        (event) => event.eventType === "delivery-attempted"
      ).length;
      const conformanceAccepts = events.filter(
        (event) =>
          event.transportMode === "conformance" &&
          event.eventType === "delivery-accepted"
      ).length;
      const liveDryRunAccepts = events.filter(
        (event) =>
          event.transportMode === "live" &&
          event.eventType === "delivery-accepted" &&
          boolDetail(event.details, "dryRun")
      ).length;
      const controlledLiveAccepts = liveDeliveries.filter(
        (delivery) => delivery.status === "accepted"
      ).length;
      const rejections =
        events.filter((event) => event.eventType === "delivery-rejected").length +
        liveDeliveries.filter((delivery) => delivery.status === "rejected").length;
      const transportErrors =
        events.filter((event) => event.eventType === "transport-error").length +
        liveDeliveries.filter((delivery) => delivery.status === "transport-error").length;
      const acceptedDurableReceipts = receipts.filter(
        (receipt) => receipt.receiptStatus === "accepted"
      ).length;
      const duplicateConformanceRejections = events.filter(
        (event) =>
          event.transportMode === "conformance" &&
          event.eventType === "delivery-rejected" &&
          event.validationCode === "duplicate"
      ).length;
      const controlledLiveRetryAttempts = liveDeliveries.reduce(
        (total, delivery) => total + Math.max(0, delivery.attemptCount - 1),
        0
      );
      const replaySignals =
        duplicateConformanceRejections +
        liveDeliveries.filter(
          (delivery) =>
            delivery.idempotencyKey === delivery.replayKey &&
            delivery.attemptCount > 1
        ).length;
      const controlledLiveAcceptedWithAcknowledgement = liveDeliveries.filter(
        (delivery) =>
          delivery.status === "accepted" &&
          Object.keys(delivery.acknowledgement ?? {}).length > 0
      ).length;
      const controlledLiveAcceptedMissingAcknowledgement =
        controlledLiveAccepts - controlledLiveAcceptedWithAcknowledgement;
      const activeLiveActivations = activations.filter(
        (activation) => activation.status === "active" && !activation.expired
      ).length;

      const status: ConsumerAcceptanceReconciliationWorkspace["status"] =
        controlledLiveAccepts > 0
          ? "live-evidence"
          : liveDryRunAccepts > 0
            ? "dry-run-only"
            : conformanceAccepts > 0
              ? "conformance-only"
              : "no-acceptance";

      return {
        workspaceId,
        workspaceName: meta.workspaceName,
        role: meta.role,
        deliveryAttempts,
        conformanceAccepts,
        liveDryRunAccepts,
        controlledLiveAccepts,
        rejections,
        transportErrors,
        durableReceipts: receipts.length,
        acceptedDurableReceipts,
        replaySignals,
        duplicateConformanceRejections,
        controlledLiveRetryAttempts,
        activeLiveActivations,
        configuredTargets,
        receiptCoverage: {
          controlledLiveAcceptedWithAcknowledgement,
          controlledLiveAcceptedMissingAcknowledgement
        },
        status
      };
    }
  );

  const totals = workspaces.reduce(
    (total, workspace) => ({
      workspaces: total.workspaces + 1,
      deliveryAttempts: total.deliveryAttempts + workspace.deliveryAttempts,
      conformanceAccepts: total.conformanceAccepts + workspace.conformanceAccepts,
      liveDryRunAccepts: total.liveDryRunAccepts + workspace.liveDryRunAccepts,
      controlledLiveAccepts:
        total.controlledLiveAccepts + workspace.controlledLiveAccepts,
      rejections: total.rejections + workspace.rejections,
      transportErrors: total.transportErrors + workspace.transportErrors,
      durableReceipts: total.durableReceipts + workspace.durableReceipts,
      acceptedDurableReceipts:
        total.acceptedDurableReceipts + workspace.acceptedDurableReceipts,
      replaySignals: total.replaySignals + workspace.replaySignals,
      controlledLiveAcceptedWithAcknowledgement:
        total.controlledLiveAcceptedWithAcknowledgement +
        workspace.receiptCoverage.controlledLiveAcceptedWithAcknowledgement,
      controlledLiveAcceptedMissingAcknowledgement:
        total.controlledLiveAcceptedMissingAcknowledgement +
        workspace.receiptCoverage.controlledLiveAcceptedMissingAcknowledgement
    }),
    {
      workspaces: 0,
      deliveryAttempts: 0,
      conformanceAccepts: 0,
      liveDryRunAccepts: 0,
      controlledLiveAccepts: 0,
      rejections: 0,
      transportErrors: 0,
      durableReceipts: 0,
      acceptedDurableReceipts: 0,
      replaySignals: 0,
      controlledLiveAcceptedWithAcknowledgement: 0,
      controlledLiveAcceptedMissingAcknowledgement: 0
    }
  );

  const met =
    totals.controlledLiveAccepts > 0 &&
    totals.controlledLiveAcceptedMissingAcknowledgement === 0;

  return {
    schema: "ai-data-platform.consumer-acceptance-reconciliation.v1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    build: 276,
    exitCriterion: {
      met,
      label:
        "A supported consumer has durable controlled-live acknowledgement evidence, rejection and transport outcomes remain visible, replay behavior is retained, and conformance-only evidence is never labeled as live acceptance.",
      evidence:
        String(totals.conformanceAccepts) +
        " conformance accept(s); " +
        String(totals.liveDryRunAccepts) +
        " live dry-run accept(s); " +
        String(totals.controlledLiveAccepts) +
        " controlled-live accept(s); " +
        String(totals.rejections) +
        " rejection(s); " +
        String(totals.transportErrors) +
        " transport error(s); " +
        String(totals.replaySignals) +
        " replay signal(s)."
    },
    totals,
    boundaries: {
      conformanceIsLiveAuthorization: false,
      dryRunIsLiveMutation: false,
      liveAcceptanceSource: "workspace_publication_live_deliveries",
      replayKeySource: "replayKey",
      duplicateBehavior: "return-original-ack"
    },
    workspaces
  };
}
