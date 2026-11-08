export const PRODUCTION_LEARNING_VII_VERSION = "1.0.0" as const;
export const PRODUCTION_LEARNING_VII_SCHEMA =
  "rosevear.ai-data-platform.production-learning-vii.v1" as const;

export type RenewalPriority = "P0" | "P1" | "P2";
export type RenewalArea =
  | "adoption"
  | "capability-governance"
  | "certification"
  | "lifecycle"
  | "autonomy"
  | "recovery"
  | "tenant-isolation"
  | "activity"
  | "health"
  | "owner-policy";

export type ProductionLearningVIIInput = {
  installedHosts: number;
  capabilities: {
    enabled: number;
    used: number;
    unusedEnabled: number;
    highRiskUnused: number;
    disabledUsed: number;
  };
  certification: {
    latestHosts: number;
    liveCertified: number;
    fixtureCertified: number;
    failed: number;
    blocked: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  };
  lifecycle: {
    upgradeRuns: number;
    applied: number;
    failed: number;
    rollbackPrepared: number;
    rolledBack: number;
  };
  autonomy: {
    cycles: number;
    completed: number;
    blocked: number;
    failed: number;
    safeRecoveriesExecuted: number;
    safeRecoveriesSucceeded: number;
    safeRecoveriesFailed: number;
  };
  recovery: {
    total: number;
    recovered: number;
    approvalRequired: number;
    exhausted: number;
    notRetryable: number;
  };
  tenantIsolation: {
    livePass: number;
    liveFail: number;
    liveBlocked: number;
  };
  activity: {
    eventPublications: number;
    workflowIntents: number;
    liveSearchEvidencePass: number;
  };
  health: {
    connectorSucceeded: number;
    connectorFailed: number;
    offlineLivePass: number;
    offlineLiveFail: number;
    offlineLiveBlocked: number;
    relayRuntimeEvidenceCount: number;
  };
  ownerPolicy: {
    globalPolicyConfigured: boolean;
    globalEmergencyStopEngaged: boolean;
    hostPolicies: number;
    enabledHostPolicies: number;
    hostKillSwitchesEngaged: number;
    reservations24h: number;
    policyEvents: number;
  };
  existingLearningFindings: Array<{
    key: string;
    category: string;
    status: string;
    title: string;
    evidence: string;
    action: string;
  }>;
};

export type ProductionLearningVIICandidate = {
  priority: RenewalPriority;
  area: RenewalArea;
  title: string;
  rationale: string;
  evidence: string;
  sourceHref: string;
};

function candidate(
  priority: RenewalPriority,
  area: RenewalArea,
  title: string,
  rationale: string,
  evidence: string,
  sourceHref: string
): ProductionLearningVIICandidate {
  return { priority, area, title, rationale, evidence, sourceHref };
}

function priorityRank(value: RenewalPriority) {
  return value === "P0" ? 0 : value === "P1" ? 1 : 2;
}

export function buildProductionLearningVII(
  input: ProductionLearningVIIInput
) {
  const candidates: ProductionLearningVIICandidate[] = [];

  if (input.installedHosts === 0) {
    candidates.push(
      candidate(
        "P0",
        "adoption",
        "Establish genuine installed-host adoption evidence",
        "The module batch is complete, but no owner-observed installed host exists. Future host features should wait for real installation evidence rather than synthetic adoption.",
        "0 installed hosts are recorded in the Build 328 installed-host inventory.",
        "/module-lifecycle"
      )
    );
  }

  if (
    input.capabilities.unusedEnabled > 0 ||
    input.capabilities.highRiskUnused > 0 ||
    input.capabilities.disabledUsed > 0
  ) {
    candidates.push(
      candidate(
        input.capabilities.disabledUsed > 0 ? "P0" : "P1",
        "capability-governance",
        "Right-size capabilities from measured use",
        "Enabled-but-unused and disabled-but-observed capabilities are concrete permission-review evidence. Reduce or reconcile authority before adding broader capability automation.",
        [
          input.capabilities.used + " used",
          input.capabilities.unusedEnabled + " enabled but unused",
          input.capabilities.highRiskUnused + " high-risk unused",
          input.capabilities.disabledUsed + " disabled but observed"
        ].join("; ") + ".",
        "/adoption"
      )
    );
  }

  if (
    input.certification.failed > 0 ||
    input.certification.blocked > 0 ||
    input.certification.unhealthy > 0 ||
    input.certification.unknown > 0
  ) {
    candidates.push(
      candidate(
        input.certification.failed > 0 || input.certification.unhealthy > 0
          ? "P0"
          : "P1",
        "certification",
        "Close live host certification gaps",
        "Synthetic fixtures and production deployment do not establish live host correctness. Resolve failed, blocked, unhealthy or unknown latest-host evidence before broadening supported host claims.",
        [
          input.certification.liveCertified + " live-certified",
          input.certification.fixtureCertified + " fixture-certified",
          input.certification.failed + " failed latest runs",
          input.certification.blocked + " blocked latest runs",
          input.certification.unhealthy + " unhealthy",
          input.certification.unknown + " unknown"
        ].join("; ") + ".",
        "/module-certification"
      )
    );
  }

  if (input.lifecycle.failed > 0 || input.lifecycle.rollbackPrepared > 0) {
    candidates.push(
      candidate(
        input.lifecycle.failed > 0 ? "P0" : "P1",
        "lifecycle",
        "Harden upgrade and rollback reliability",
        "Failed upgrades or prepared-but-unreconciled rollback evidence should be resolved before increasing zero-touch lifecycle automation.",
        [
          input.lifecycle.upgradeRuns + " upgrade runs",
          input.lifecycle.applied + " applied",
          input.lifecycle.failed + " failed",
          input.lifecycle.rollbackPrepared + " rollback-prepared",
          input.lifecycle.rolledBack + " rolled back"
        ].join("; ") + ".",
        "/module-lifecycle"
      )
    );
  }

  if (input.autonomy.failed > 0 || input.autonomy.safeRecoveriesFailed > 0) {
    candidates.push(
      candidate(
        "P0",
        "autonomy",
        "Resolve autonomous-cycle or safe-recovery failures",
        "Autonomous Operations V2 must not widen the executable envelope while existing cycles or bounded safe-health recoveries have failed.",
        [
          input.autonomy.cycles + " cycles",
          input.autonomy.failed + " failed",
          input.autonomy.blocked + " blocked",
          input.autonomy.safeRecoveriesExecuted + " safe recoveries executed",
          input.autonomy.safeRecoveriesFailed + " safe recoveries failed"
        ].join("; ") + ".",
        "/autonomous-operations"
      )
    );
  }

  if (
    input.recovery.approvalRequired > 0 ||
    input.recovery.exhausted > 0 ||
    input.recovery.notRetryable > 0
  ) {
    candidates.push(
      candidate(
        input.recovery.exhausted > 0 || input.recovery.notRetryable > 0
          ? "P0"
          : "P1",
        "recovery",
        "Resolve remaining recovery exceptions",
        "Owner-controlled, exhausted and non-retryable recovery evidence must be reconciled before any broader autonomous recovery policy is considered.",
        [
          input.recovery.total + " recovery plans",
          input.recovery.recovered + " recovered",
          input.recovery.approvalRequired + " owner approval required",
          input.recovery.exhausted + " exhausted",
          input.recovery.notRetryable + " not retryable"
        ].join("; ") + ".",
        "/integration-recovery"
      )
    );
  }

  if (
    input.tenantIsolation.liveFail > 0 ||
    input.tenantIsolation.liveBlocked > 0
  ) {
    candidates.push(
      candidate(
        input.tenantIsolation.liveFail > 0 ? "P0" : "P1",
        "tenant-isolation",
        "Close tenant-isolation certification evidence",
        "Tenant/workspace isolation is authoritative. Any live failure or blocked evidence must be resolved before host support or autonomy expands.",
        [
          input.tenantIsolation.livePass + " live PASS",
          input.tenantIsolation.liveFail + " live FAIL",
          input.tenantIsolation.liveBlocked + " live BLOCKED"
        ].join("; ") + ".",
        "/module-certification"
      )
    );
  }

  const hasNoActivity =
    input.installedHosts > 0 &&
    input.activity.eventPublications === 0 &&
    input.activity.workflowIntents === 0 &&
    input.activity.liveSearchEvidencePass === 0;
  if (hasNoActivity) {
    candidates.push(
      candidate(
        "P2",
        "activity",
        "Collect real event, workflow and search adoption evidence",
        "Installed hosts exist but the measured event/workflow/search footprint is empty. Preserve the current feature set and learn from real use before adding more coordination surfaces.",
        "0 event publications; 0 workflow intents; 0 live search certification PASS evidence.",
        "/production-learning-vii"
      )
    );
  }

  if (
    input.health.connectorFailed > 0 ||
    input.health.offlineLiveFail > 0 ||
    input.health.offlineLiveBlocked > 0
  ) {
    candidates.push(
      candidate(
        input.health.connectorFailed > 0 || input.health.offlineLiveFail > 0
          ? "P0"
          : "P1",
        "health",
        "Stabilize connector and offline health evidence",
        "Connector failures or failed/blocked live offline synchronization evidence should be addressed before autonomy or host support expands.",
        [
          input.health.connectorSucceeded + " connector operations succeeded",
          input.health.connectorFailed + " connector operations failed",
          input.health.offlineLivePass + " offline live PASS",
          input.health.offlineLiveFail + " offline live FAIL",
          input.health.offlineLiveBlocked + " offline live BLOCKED"
        ].join("; ") + ".",
        "/app-connections"
      )
    );
  }

  if (
    input.installedHosts > 0 &&
    input.health.relayRuntimeEvidenceCount === 0
  ) {
    candidates.push(
      candidate(
        "P2",
        "health",
        "Add durable relay runtime health evidence before relay automation expands",
        "Build 323 transport selection is safety-critical, but the current durable production evidence set does not contain a dedicated relay runtime sample ledger. Treat relay health as unproven rather than inferred.",
        "Installed hosts exist; dedicated durable relay runtime evidence count is 0.",
        "/app-connections"
      )
    );
  }

  if (
    input.installedHosts > 0 &&
    (input.ownerPolicy.hostPolicies < input.installedHosts ||
      input.ownerPolicy.hostKillSwitchesEngaged > 0)
  ) {
    candidates.push(
      candidate(
        "P1",
        "owner-policy",
        "Reconcile per-host autonomy policy coverage",
        "Per-host owner policy is the authoritative autonomy boundary. Missing policy coverage or engaged host kill switches should remain explicit before any wider autonomous operation is considered.",
        [
          input.installedHosts + " installed hosts",
          input.ownerPolicy.hostPolicies + " host policies",
          input.ownerPolicy.enabledHostPolicies + " enabled policies",
          input.ownerPolicy.hostKillSwitchesEngaged + " host kill switches engaged"
        ].join("; ") + ".",
        "/autonomous-operations"
      )
    );
  }

  for (const finding of input.existingLearningFindings) {
    if (!["gap", "action"].includes(finding.status)) continue;
    candidates.push(
      candidate(
        finding.status === "gap" ? "P0" : "P1",
        "adoption",
        finding.title,
        finding.action,
        finding.evidence,
        "/production-learning"
      )
    );
  }

  const deduped = candidates
    .filter(
      (item, index, all) =>
        all.findIndex(
          other =>
            other.title === item.title &&
            other.sourceHref === item.sourceHref
        ) === index
    )
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 12);

  const blockers = deduped.filter(item => item.priority === "P0").length;
  const attention = deduped.filter(item => item.priority === "P1").length;
  const overallState =
    blockers > 0 ? "blocked" : attention > 0 ? "attention" : "healthy";

  return Object.freeze({
    schema: PRODUCTION_LEARNING_VII_SCHEMA,
    version: PRODUCTION_LEARNING_VII_VERSION,
    build: 330 as const,
    closedBatch: "306-330" as const,
    generatedAt: new Date().toISOString(),
    overallState: overallState as "healthy" | "attention" | "blocked",
    evidence: input,
    summary: {
      installedHosts: input.installedHosts,
      liveCertifiedHosts: input.certification.liveCertified,
      upgradeRuns: input.lifecycle.upgradeRuns,
      autonomousCycles: input.autonomy.cycles,
      recoveryPlans: input.recovery.total,
      blockers,
      attention,
      candidateCount: deduped.length
    },
    candidates: deduped,
    autonomousOperationsV2: {
      currentAutomaticActionEnvelope:
        "connector-health-get-head-only" as const,
      automaticActionEnvelopeExpanded: false as const,
      consequentialPeerWritesAutomatic: false as const,
      eventReplayAutomatic: false as const,
      credentialMutationAutomatic: false as const,
      trustMutationAutomatic: false as const,
      policyAndKillSwitchRemainAuthoritative: true as const,
      evidenceReviewMayRecommendWork: true as const,
      evidenceReviewExecutesRecommendedWork: false as const
    },
    roadmapRenewal: {
      checkpointReached: true as const,
      finiteCandidateLimit: 12 as const,
      candidatesAreUnnumbered: true as const,
      numberedNextBatchAuthorized: false as const,
      nextBuildNumber: null,
      candidatesFromMeasuredEvidenceOnly: true as const,
      staleAssumptionsRemoved: true as const,
      automaticRoadmapExtension: false as const,
      ownerAuthorizationRequired: true as const
    },
    boundaries: {
      installationIsConnectionAuthorization: false as const,
      mountedUiIsPermission: false as const,
      discoveredCapabilityIsGrant: false as const,
      syntheticTestIsLiveCertification: false as const,
      rawSecretsExposed: false as const,
      automaticTrustInference: false as const,
      automaticOwnerConsentInference: false as const,
      ql266Resumed: false as const
    }
  });
}

export const productionLearningVIIDescriptor = Object.freeze({
  schema: PRODUCTION_LEARNING_VII_SCHEMA,
  version: PRODUCTION_LEARNING_VII_VERSION,
  build: 330,
  closedBatch: "306-330",
  finiteCandidateLimit: 12,
  candidateNumberingAutomatic: false,
  roadmapExtensionAutomatic: false,
  automaticActionEnvelopeExpanded: false,
  ql266Resumed: false
});
