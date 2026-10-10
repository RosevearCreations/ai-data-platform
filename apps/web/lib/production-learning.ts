export type LearningStatus = "healthy" | "watch" | "action" | "gap";

export interface ProductionLearningWorkspaceEvidence {
  workspaceId: string;
  workspaceName: string;
  profileKey: string;
  profileName: string;
  role: "owner" | "admin" | "member";
  sync: {
    activeScrapers: number;
    deletedScrapers: number;
    reviewedDatasets: number;
    deletedDatasets: number;
    reviewedRows: number;
    versionChanges: number;
    storageBytes: number;
  };
  outcomes: {
    storageBytes: number;
    sync: {
      events: number;
      applied: number;
      deleted: number;
      conflicts: number;
      noops: number;
      errors: number;
    };
    repair: {
      proposed: number;
      approved: number;
      rejected: number;
      rolledBack: number;
      compatibilityChecks: number;
      healthy: number;
      degraded: number;
      broken: number;
    };
  };
  continuity: {
    previousSnapshotAt: string | null;
    previousSyncEvents: number;
    previousSyncConflicts: number;
    previousRepairCompatibilityChecks: number;
    previousRepairHealthyChecks: number;
  };
  intelligence: {
    modules: number;
    storageBytes: number;
    sourcePolicy: {
      present: boolean;
      sources: number;
      approved: number;
      blocked: number;
      reviewRequired: number;
      expired: number;
    };
    scheduled: {
      present: boolean;
      jobs: number;
      enabled: number;
      due: number;
      unread: number;
      attempts: number;
    };
  };
  integrations: {
    dryRuns: number;
    approved: number;
    exported: number;
    cancelled: number;
    deliveryAttempts: number;
    conformanceAccepted: number;
    liveAccepted: number;
    deliveryRejected: number;
    transportErrors: number;
    handshakeAccepted: number;
    handshakeRejected: number;
    storageBytes: number;
  };
  retention: {
    policyPresent: boolean;
    cleanupApproved: boolean;
    archiveEligibleRows: number;
    deleteEligibleRows: number;
    deleteEligibleBytes: number;
    cleanupRuns: number;
    deletedRows: number;
    failedRuns: number;
    budgetBreaches: number;
  };
  barcode: {
    captures: number;
    pending: number;
    approved: number;
    rejected: number;
    duplicates: number;
    camera: number;
    manual: number;
    storageBytes: number;
  };
  remote: {
    jobs: number;
    succeededJobs: number;
    failedJobs: number;
    cancelledJobs: number;
    timedOutJobs: number;
    providerRuns: number;
    providerSuccesses: number;
    providerFailures: number;
    providerUnits: number;
    averageDurationMs: number | null;
    approvedPublicSources: number;
    lastRun: {
      status: "succeeded" | "failed";
      units: number;
      durationMs: number | null;
      responseCode: number | null;
      finalUrl: string | null;
      contentSha256: string | null;
    } | null;
    allowlistedSources: number;
    workspaceEnabled: boolean;
    workspaceKilled: boolean;
    storageBytes: number;
  };
  connectors: {
    installations: number;
    enabled: number;
    succeeded: number;
    failed: number;
    blocked: number;
    storageBytes: number;
  };
  security: {
    owners: number;
    admins: number;
    members: number;
  };
}

export interface ProductionLearningEvidence {
  generatedAt: string;
  browserless: {
    tokenConfigured: boolean;
    executionEnabled: boolean;
    globalKillSwitchActive: boolean;
    readyForLivePilot: boolean;
  };
  profiles: {
    visible: number;
    customActive: number;
    customArchived: number;
  };
  adoption: {
    reviewSnapshots: number;
    activeWorkspaces: number;
    noActivityWorkspaces: number;
    enabledCapabilities: number;
    usedCapabilities: number;
    unusedEnabledCapabilities: number;
    highRiskUnusedCapabilities: number;
    disabledUsedCapabilities: number;
    connectorGrants: number;
    connectorUsedGrants: number;
    connectorUnusedGrants: number;
    connectorStaleGrants: number;
    permissionReviewWorkspaces: number;
    barcodeWorkspaces: number;
    scheduledWorkspaces: number;
    remoteWorkspaces: number;
    integrationWorkspaces: number;
  };
  workspaces: ProductionLearningWorkspaceEvidence[];
}

export interface ProductionLearningFinding {
  key: string;
  category: string;
  status: LearningStatus;
  title: string;
  evidence: string;
  action: string;
  owner: "platform" | "workspace-owner" | "operations";
}

export interface RoadmapRecommendation {
  build: number;
  priority: "P0" | "P1" | "P2";
  title: string;
  rationale: string;
  evidenceKeys: string[];
}

function sum(
  evidence: ProductionLearningEvidence,
  selector: (workspace: ProductionLearningWorkspaceEvidence) => number
) {
  return evidence.workspaces.reduce((total, workspace) => total + selector(workspace), 0);
}

function percent(value: number | null) {
  if (value === null) return "not measured";
  return Math.round(value * 100) + "%";
}

export function summarizeProductionLearningEvidence(
  evidence: ProductionLearningEvidence
) {
  const barcodeCaptures = sum(evidence, (w) => w.barcode.captures);
  const barcodePending = sum(evidence, (w) => w.barcode.pending);
  const sourcePolicies = sum(evidence, (w) => w.intelligence.sourcePolicy.sources);
  const sourcePolicyExpired = sum(evidence, (w) => w.intelligence.sourcePolicy.expired);
  const sourcePolicyReview = sum(evidence, (w) => w.intelligence.sourcePolicy.reviewRequired);
  const providerRuns = sum(evidence, (w) => w.remote.providerRuns);
  const providerSuccesses = sum(evidence, (w) => w.remote.providerSuccesses);
  const providerUnits = sum(evidence, (w) => w.remote.providerUnits);
  const approvedPublicSources = sum(
    evidence,
    (w) => w.remote.approvedPublicSources
  );
  const allowlistedSources = sum(
    evidence,
    (w) => w.remote.allowlistedSources
  );
  const armedWorkspaces = evidence.workspaces.filter(
    (workspace) =>
      workspace.remote.workspaceEnabled && !workspace.remote.workspaceKilled
  ).length;
  const durationSamples = evidence.workspaces
    .filter((workspace) => workspace.remote.providerRuns > 0)
    .map((workspace) => ({
      runs: workspace.remote.providerRuns,
      duration: workspace.remote.averageDurationMs ?? 0
    }));
  const weightedDurationTotal = durationSamples.reduce(
    (total, item) => total + item.runs * item.duration,
    0
  );
  const integrationExports = sum(evidence, (w) => w.integrations.exported);
  const integrationDeliveryAttempts = sum(
    evidence,
    (w) => w.integrations.deliveryAttempts
  );
  const integrationConformanceAccepted = sum(
    evidence,
    (w) => w.integrations.conformanceAccepted
  );
  const integrationLiveAccepted = sum(
    evidence,
    (w) => w.integrations.liveAccepted
  );
  const integrationDeliveryRejected = sum(
    evidence,
    (w) => w.integrations.deliveryRejected
  );
  const integrationTransportErrors = sum(
    evidence,
    (w) => w.integrations.transportErrors
  );
  const integrationHandshakeAccepted = sum(
    evidence,
    (w) => w.integrations.handshakeAccepted
  );
  const retentionPolicies = sum(evidence, (w) => (w.retention.policyPresent ? 1 : 0));
  const retentionApprovedWorkspaces = sum(evidence, (w) => (w.retention.cleanupApproved ? 1 : 0));
  const retentionArchiveEligibleRows = sum(evidence, (w) => w.retention.archiveEligibleRows);
  const retentionDeleteEligibleRows = sum(evidence, (w) => w.retention.deleteEligibleRows);
  const retentionDeleteEligibleBytes = sum(evidence, (w) => w.retention.deleteEligibleBytes);
  const retentionCleanupRuns = sum(evidence, (w) => w.retention.cleanupRuns);
  const retentionDeletedRows = sum(evidence, (w) => w.retention.deletedRows);
  const retentionFailedRuns = sum(evidence, (w) => w.retention.failedRuns);
  const retentionBudgetBreaches = sum(evidence, (w) => w.retention.budgetBreaches);
  const adoptionReviewSnapshots = evidence.adoption.reviewSnapshots;
  const adoptionActiveWorkspaces = evidence.adoption.activeWorkspaces;
  const adoptionNoActivityWorkspaces = evidence.adoption.noActivityWorkspaces;
  const adoptionEnabledCapabilities = evidence.adoption.enabledCapabilities;
  const adoptionUsedCapabilities = evidence.adoption.usedCapabilities;
  const adoptionUnusedEnabledCapabilities =
    evidence.adoption.unusedEnabledCapabilities;
  const adoptionHighRiskUnusedCapabilities =
    evidence.adoption.highRiskUnusedCapabilities;
  const adoptionDisabledUsedCapabilities =
    evidence.adoption.disabledUsedCapabilities;
  const adoptionConnectorGrants = evidence.adoption.connectorGrants;
  const adoptionConnectorUsedGrants = evidence.adoption.connectorUsedGrants;
  const adoptionConnectorUnusedGrants = evidence.adoption.connectorUnusedGrants;
  const adoptionConnectorStaleGrants = evidence.adoption.connectorStaleGrants;
  const adoptionPermissionReviewWorkspaces =
    evidence.adoption.permissionReviewWorkspaces;
  const adoptionBarcodeWorkspaces = evidence.adoption.barcodeWorkspaces;
  const adoptionScheduledWorkspaces = evidence.adoption.scheduledWorkspaces;
  const adoptionRemoteWorkspaces = evidence.adoption.remoteWorkspaces;
  const adoptionIntegrationWorkspaces = evidence.adoption.integrationWorkspaces;
  const connectorInstallations = sum(evidence, (w) => w.connectors.installations);
  const connectorExecutions = sum(
    evidence,
    (w) => w.connectors.succeeded + w.connectors.failed + w.connectors.blocked
  );
  const syncEvents = sum(evidence, (w) => w.outcomes.sync.events);
  const syncConflicts = sum(evidence, (w) => w.outcomes.sync.conflicts);
  const syncErrors = sum(evidence, (w) => w.outcomes.sync.errors);
  const repairProposals = sum(evidence, (w) => w.outcomes.repair.proposed);
  const repairApprovals = sum(evidence, (w) => w.outcomes.repair.approved);
  const repairRejections = sum(evidence, (w) => w.outcomes.repair.rejected);
  const repairRollbacks = sum(evidence, (w) => w.outcomes.repair.rolledBack);
  const repairCompatibilityChecks = sum(
    evidence,
    (w) => w.outcomes.repair.compatibilityChecks
  );
  const repairHealthyChecks = sum(evidence, (w) => w.outcomes.repair.healthy);
  const previousSyncEvents = sum(
    evidence,
    (w) => w.continuity.previousSyncEvents
  );
  const previousSyncConflicts = sum(
    evidence,
    (w) => w.continuity.previousSyncConflicts
  );
  const previousRepairCompatibilityChecks = sum(
    evidence,
    (w) => w.continuity.previousRepairCompatibilityChecks
  );
  const previousRepairHealthyChecks = sum(
    evidence,
    (w) => w.continuity.previousRepairHealthyChecks
  );
  const storageBytes = sum(
    evidence,
    (w) =>
      w.sync.storageBytes +
      w.intelligence.storageBytes +
      w.barcode.storageBytes +
      w.remote.storageBytes +
      w.integrations.storageBytes +
      w.connectors.storageBytes +
      w.outcomes.storageBytes
  );
  const ownerlessWorkspaces = evidence.workspaces.filter(
    (workspace) => workspace.security.owners === 0
  ).length;

  return {
    workspaces: evidence.workspaces.length,
    barcodeCaptures,
    barcodePending,
    sourcePolicies,
    sourcePolicyExpired,
    sourcePolicyReview,
    providerRuns,
    providerSuccesses,
    providerSuccessRate:
      providerRuns === 0 ? null : providerSuccesses / providerRuns,
    providerUnits,
    providerAverageUnitsPerRun:
      providerRuns === 0 ? null : providerUnits / providerRuns,
    providerAverageDurationMs:
      providerRuns === 0 ? null : Math.round(weightedDurationTotal / providerRuns),
    approvedPublicSources,
    allowlistedSources,
    armedWorkspaces,
    browserlessBaselineDecision:
      providerRuns === 0
        ? "pending"
        : providerSuccesses === providerRuns &&
            providerUnits / providerRuns <= 2
          ? "go-bounded"
          : "no-go",
    integrationExports,
    integrationDeliveryAttempts,
    integrationConformanceAccepted,
    integrationLiveAccepted,
    integrationDeliveryRejected,
    integrationTransportErrors,
    integrationHandshakeAccepted,
    integrationDeliveryAcceptanceRate:
      integrationDeliveryAttempts === 0
        ? null
        : (integrationConformanceAccepted + integrationLiveAccepted) /
          integrationDeliveryAttempts,
    retentionPolicies,
    retentionApprovedWorkspaces,
    retentionArchiveEligibleRows,
    retentionDeleteEligibleRows,
    retentionDeleteEligibleBytes,
    retentionCleanupRuns,
    retentionDeletedRows,
    retentionFailedRuns,
    retentionBudgetBreaches,
    adoptionReviewSnapshots,
    adoptionActiveWorkspaces,
    adoptionNoActivityWorkspaces,
    adoptionEnabledCapabilities,
    adoptionUsedCapabilities,
    adoptionUnusedEnabledCapabilities,
    adoptionHighRiskUnusedCapabilities,
    adoptionDisabledUsedCapabilities,
    adoptionConnectorGrants,
    adoptionConnectorUsedGrants,
    adoptionConnectorUnusedGrants,
    adoptionConnectorStaleGrants,
    adoptionPermissionReviewWorkspaces,
    adoptionBarcodeWorkspaces,
    adoptionScheduledWorkspaces,
    adoptionRemoteWorkspaces,
    adoptionIntegrationWorkspaces,
    connectorInstallations,
    connectorExecutions,
    syncEvents,
    syncConflicts,
    syncErrors,
    syncConflictRate: syncEvents === 0 ? null : syncConflicts / syncEvents,
    repairProposals,
    repairApprovals,
    repairRejections,
    repairRollbacks,
    repairCompatibilityChecks,
    repairHealthyChecks,
    repairSuccessRate:
      repairCompatibilityChecks === 0
        ? null
        : repairHealthyChecks / repairCompatibilityChecks,
    repairRollbackRate:
      repairApprovals + repairRollbacks === 0
        ? null
        : repairRollbacks / (repairApprovals + repairRollbacks),
    previousSyncConflictRate:
      previousSyncEvents === 0
        ? null
        : previousSyncConflicts / previousSyncEvents,
    previousRepairSuccessRate:
      previousRepairCompatibilityChecks === 0
        ? null
        : previousRepairHealthyChecks / previousRepairCompatibilityChecks,
    storageBytes,
    ownerlessWorkspaces
  };
}

export function buildProductionLearningAssessment(
  evidence: ProductionLearningEvidence
) {
  const totals = summarizeProductionLearningEvidence(evidence);
  const findings: ProductionLearningFinding[] = [];

  findings.push({
    key: "sync-outcome-telemetry",
    category: "Synchronization",
    status:
      totals.syncEvents === 0
        ? "watch"
        : totals.syncErrors > 0 || (totals.syncConflictRate ?? 0) > 0.1
          ? "action"
          : "healthy",
    title:
      totals.syncEvents === 0
        ? "Sync outcome telemetry is active; no production attempts are recorded yet."
        : "Synchronization outcomes are durably measurable.",
    evidence:
      String(totals.syncEvents) +
      " append-only sync outcomes; " +
      String(totals.syncConflicts) +
      " conflicts and " +
      String(totals.syncErrors) +
      " errors. Conflict rate: " +
      percent(totals.syncConflictRate) +
      (totals.previousSyncConflictRate === null
        ? "."
        : "; previous changed snapshot: " +
          percent(totals.previousSyncConflictRate) +
          "."),
    action:
      totals.syncErrors > 0 || (totals.syncConflictRate ?? 0) > 0.1
        ? "Review recent conflict/error outcomes before expanding synchronization volume."
        : "Keep monitoring bounded append-only outcomes and investigate material rate changes.",
    owner: "platform"
  });

  findings.push({
    key: "repair-outcome-telemetry",
    category: "Recipe repair",
    status:
      totals.repairCompatibilityChecks === 0
        ? "watch"
        : (totals.repairSuccessRate ?? 0) < 0.8 || totals.repairRollbacks > 0
          ? "action"
          : "healthy",
    title:
      totals.repairCompatibilityChecks === 0
        ? "Recipe-repair telemetry is active; post-repair compatibility evidence is still accumulating."
        : "Recipe-repair outcomes are durably measurable.",
    evidence:
      String(totals.repairProposals) +
      " proposals · " +
      String(totals.repairApprovals) +
      " approvals · " +
      String(totals.repairRejections) +
      " rejections · " +
      String(totals.repairRollbacks) +
      " rollbacks · " +
      String(totals.repairCompatibilityChecks) +
      " compatibility checks; healthy rate " +
      percent(totals.repairSuccessRate) +
      (totals.previousRepairSuccessRate === null
        ? "."
        : "; previous changed snapshot " +
          percent(totals.previousRepairSuccessRate) +
          "."),
    action:
      totals.repairCompatibilityChecks === 0
        ? "Run normal compatibility checks after repaired revisions; do not create synthetic evidence."
        : (totals.repairSuccessRate ?? 0) < 0.8 || totals.repairRollbacks > 0
          ? "Review degraded/broken post-repair checks and rollback evidence before broadening automated repair guidance."
          : "Continue explicit approval and post-repair compatibility review.",
    owner: "platform"
  });

  findings.push({
    key: "barcode-adoption",
    category: "Barcode intake",
    status:
      totals.barcodeCaptures === 0
        ? "watch"
        : totals.barcodePending / totals.barcodeCaptures > 0.25
          ? "action"
          : "healthy",
    title:
      totals.barcodeCaptures === 0
        ? "No durable barcode adoption evidence exists yet."
        : "Barcode review outcomes are measurable.",
    evidence:
      totals.barcodeCaptures === 0
        ? "No persisted captures are visible in the authorized workspaces."
        : String(totals.barcodeCaptures) +
          " captures are visible; " +
          String(totals.barcodePending) +
          " remain pending.",
    action:
      totals.barcodeCaptures === 0
        ? "Use the mobile intake workflow when operationally useful; do not create synthetic usage."
        : totals.barcodePending > 0
          ? "Review pending captures so intake evidence reaches an explicit terminal decision."
          : "Continue monitoring reviewed handoff quality.",
    owner: "workspace-owner"
  });

  findings.push({
    key: "source-policy-health",
    category: "Source governance",
    status:
      totals.sourcePolicyExpired > 0 || totals.sourcePolicyReview > 0
        ? "action"
        : totals.sourcePolicies === 0
          ? "watch"
          : "healthy",
    title:
      totals.sourcePolicies === 0
        ? "Source-policy adoption is not yet visible."
        : "Source-policy registry health is measurable.",
    evidence:
      String(totals.sourcePolicies) +
      " registered sources; " +
      String(totals.sourcePolicyExpired) +
      " expired and " +
      String(totals.sourcePolicyReview) +
      " require review.",
    action:
      totals.sourcePolicyExpired > 0 || totals.sourcePolicyReview > 0
        ? "Renew or resolve stale source approvals before scheduled or remote execution."
        : "Keep source review expiry dates current.",
    owner: "workspace-owner"
  });

  let remoteStatus: LearningStatus = "gap";
  let remoteEvidence = "No completed Browserless provider runs are visible.";
  let remoteAction =
    "Complete the fail-closed production pilot prerequisites before enabling the global run window.";
  if (totals.providerRuns > 0) {
    remoteStatus =
      totals.browserlessBaselineDecision === "go-bounded" ? "healthy" : "action";
    remoteEvidence =
      String(totals.providerRuns) +
      " provider runs; " +
      percent(totals.providerSuccessRate) +
      " success; " +
      String(totals.providerUnits) +
      " estimated provider units; average " +
      String(totals.providerAverageUnitsPerRun?.toFixed(2) ?? "n/a") +
      " units/run and " +
      String(totals.providerAverageDurationMs ?? 0) +
      " ms/run. Baseline decision: " +
      totals.browserlessBaselineDecision +
      ".";
    remoteAction =
      totals.browserlessBaselineDecision === "go-bounded"
        ? "Keep the global kill switch active outside explicit pilot windows and retain one-page/two-unit limits."
        : "Keep the pilot gated and investigate the failed or over-budget baseline before any expansion.";
  } else if (totals.approvedPublicSources === 0) {
    remoteStatus = "action";
    remoteEvidence =
      "Browserless production prerequisites are fail-closed: no approved public-facts/public-webpage source policy exists yet.";
    remoteAction =
      "Approve one owned or otherwise authorized public source policy with robots allowed; then allowlist and arm exactly one workspace.";
  } else if (totals.allowlistedSources === 0) {
    remoteStatus = "watch";
    remoteEvidence =
      String(totals.approvedPublicSources) +
      " approved public source policies exist, but none is allowlisted for the controlled pilot.";
    remoteAction =
      "Allowlist one exact policy revision/fingerprint for one workspace while the global kill switch remains active.";
  } else if (totals.armedWorkspaces === 0) {
    remoteStatus = "watch";
    remoteEvidence =
      String(totals.allowlistedSources) +
      " pilot sources are allowlisted, but no workspace is armed.";
    remoteAction =
      "Arm one workspace, verify provider readiness, then open only the one-run global pilot window.";
  } else if (
    evidence.browserless.tokenConfigured &&
    evidence.browserless.executionEnabled
  ) {
    remoteStatus = "watch";
    remoteEvidence =
      "Browserless token, execution flag and workspace/source gates are prepared; no completed provider run is visible.";
    remoteAction =
      "Temporarily disable the global kill switch for exactly one one-page run, then restore it immediately.";
  } else if (evidence.browserless.tokenConfigured) {
    remoteStatus = "watch";
    remoteEvidence =
      "Browserless token is configured, but provider execution remains disabled.";
    remoteAction =
      "Enable the provider execution master flag while keeping the global kill switch active.";
  }
  findings.push({
    key: "remote-cost-reliability",
    category: "Remote execution",
    status: remoteStatus,
    title: "Remote browser cost/reliability needs a production baseline.",
    evidence: remoteEvidence,
    action: remoteAction,
    owner: "operations"
  });

  findings.push({
    key: "integration-consumer-readiness",
    category: "Business integrations",
    status:
      totals.integrationLiveAccepted > 0
        ? "healthy"
        : totals.integrationDeliveryAttempts > 0 ||
            totals.integrationConformanceAccepted > 0
          ? "watch"
          : "gap",
    title:
      totals.integrationLiveAccepted > 0
        ? "A live consumer has durably acknowledged a package."
        : totals.integrationConformanceAccepted > 0
          ? "Consumer conformance is proven; live business-app acknowledgement is still gated."
          : "Consumer-side delivery evidence is still missing.",
    evidence:
      String(totals.integrationExports) +
      " approved exports · " +
      String(totals.integrationConformanceAccepted) +
      " conformance acceptances · " +
      String(totals.integrationLiveAccepted) +
      " live acceptances · " +
      String(totals.integrationDeliveryRejected) +
      " rejections · " +
      String(totals.integrationTransportErrors) +
      " transport errors.",
    action:
      totals.integrationLiveAccepted > 0
        ? "Keep live delivery dry-run/review gated and monitor replay/rejection evidence before enabling any consumer mutation."
        : totals.integrationConformanceAccepted > 0
          ? "Implement and approve the documented receiver in one business application, configure its endpoint/credential, then prove one live dry-run acknowledgement."
          : "Run the authenticated Build 033 conformance receiver before any external transport is configured.",
    owner: "platform"
  });

  findings.push({
    key: "connector-readiness",
    category: "Connectors",
    status:
      totals.adoptionConnectorUnusedGrants > 0 ||
      totals.adoptionConnectorStaleGrants > 0
        ? "watch"
        : totals.connectorInstallations === 0
          ? "watch"
          : totals.connectorExecutions === 0
            ? "watch"
            : "healthy",
    title: "Connector installation, grant and execution outcomes are measurable.",
    evidence:
      String(totals.connectorInstallations) +
      " workspace installations · " +
      String(totals.connectorExecutions) +
      " audited executions · " +
      String(totals.adoptionConnectorUsedGrants) +
      "/" +
      String(totals.adoptionConnectorGrants) +
      " grants have execution evidence · " +
      String(totals.adoptionConnectorStaleGrants) +
      " stale unused grants.",
    action:
      totals.adoptionConnectorUnusedGrants > 0
        ? "Review unused connector grants in /adoption and remove them manually only when they are no longer required."
        : totals.connectorInstallations === 0
          ? "Keep the no-secret sample available as the acceptance baseline; add real connectors only for a demonstrated need."
          : "Keep grants aligned with observed connector capabilities and continue append-only audit review.",
    owner: "platform"
  });

  findings.push({
    key: "adoption-permission-outcomes",
    category: "Adoption & least privilege",
    status:
      totals.adoptionDisabledUsedCapabilities > 0
        ? "action"
        : totals.adoptionHighRiskUnusedCapabilities > 0 ||
            totals.adoptionConnectorUnusedGrants > 0 ||
            totals.adoptionPermissionReviewWorkspaces > 0 ||
            totals.adoptionActiveWorkspaces === 0
          ? "watch"
          : "healthy",
    title:
      totals.adoptionReviewSnapshots === 0
        ? "Durable adoption/permission review evidence is not yet recorded."
        : "Workspace, profile, connector and permission outcomes are durably reviewable.",
    evidence:
      String(totals.adoptionActiveWorkspaces) +
      "/" +
      String(totals.workspaces) +
      " workspaces show durable activity · " +
      String(totals.adoptionUsedCapabilities) +
      "/" +
      String(totals.adoptionEnabledCapabilities) +
      " enabled capability slots are used · " +
      String(totals.adoptionHighRiskUnusedCapabilities) +
      " high-risk enabled slots are unused · " +
      String(totals.adoptionConnectorUnusedGrants) +
      " connector grants are unused · " +
      String(totals.adoptionPermissionReviewWorkspaces) +
      " workspaces have a least-privilege review recommendation.",
    action:
      totals.adoptionDisabledUsedCapabilities > 0
        ? "Investigate profile capability/configuration mismatches before expanding automation."
        : totals.adoptionHighRiskUnusedCapabilities > 0 ||
            totals.adoptionConnectorUnusedGrants > 0
          ? "Use /adoption to review unused capability slots and connector grants; Build 035 never changes roles, profiles or grants automatically."
          : totals.adoptionActiveWorkspaces === 0
            ? "Keep expansion conservative until real workspace activity appears; do not manufacture adoption evidence."
            : "Prioritize future investment in profiles/features with measured durable use and continue periodic least-privilege review.",
    owner: "operations"
  });

  findings.push({
    key: "storage-retention",
    category: "Storage & retention",
    status:
      totals.retentionBudgetBreaches > 0 || totals.retentionFailedRuns > 0
        ? "action"
        : totals.retentionDeleteEligibleRows > 0 ||
            totals.retentionArchiveEligibleRows > 0
          ? "watch"
          : "healthy",
    title:
      totals.retentionBudgetBreaches > 0
        ? "One or more retention classes exceed their workspace storage budget."
        : "Build 034 retention budgets and cleanup eligibility are measurable.",
    evidence:
      String(totals.storageBytes) +
      " bytes of legacy storage proxy · " +
      String(totals.retentionBudgetBreaches) +
      " class budget breaches · " +
      String(totals.retentionDeleteEligibleRows) +
      " bounded-delete candidates (" +
      String(totals.retentionDeleteEligibleBytes) +
      " bytes) · " +
      String(totals.retentionArchiveEligibleRows) +
      " manual-archive candidates · " +
      String(totals.retentionCleanupRuns) +
      " cleanup runs · " +
      String(totals.retentionDeletedRows) +
      " rows deleted.",
    action:
      totals.retentionBudgetBreaches > 0
        ? "Review /retention and reduce only eligible low-risk data; protected append-only/security evidence stays excluded."
        : totals.retentionDeleteEligibleRows > 0
          ? "Preview candidates in /retention. Destructive cleanup remains fail-closed until an owner/admin explicitly approves it."
          : totals.retentionArchiveEligibleRows > 0
            ? "Review old synchronized tombstones for manual archive; Build 034 does not auto-delete them."
            : "Keep the fixed class budgets and age gates; no destructive production cleanup is currently required.",
    owner: "operations"
  });

  findings.push({
    key: "permission-health",
    category: "Security & permissions",
    status:
      totals.ownerlessWorkspaces > 0 ||
      totals.adoptionDisabledUsedCapabilities > 0
        ? "action"
        : totals.adoptionPermissionReviewWorkspaces > 0
          ? "watch"
          : "healthy",
    title: "Workspace ownership and elevated-permission outcomes are measurable.",
    evidence:
      totals.ownerlessWorkspaces === 0
        ? "Every visible workspace has at least one owner; " +
          String(totals.adoptionPermissionReviewWorkspaces) +
          " workspace(s) have additional least-privilege review recommendations."
        : String(totals.ownerlessWorkspaces) + " visible workspaces have no owner.",
    action:
      totals.ownerlessWorkspaces > 0
        ? "Assign an accountable owner before expanding automation."
        : totals.adoptionPermissionReviewWorkspaces > 0
          ? "Review the specific recommendations in /adoption; do not broaden or revoke privileges automatically."
          : "Continue periodic least-privilege review for admins, remote controls and connector grants.",
    owner: "operations"
  });

  const roadmap: RoadmapRecommendation[] = [
    ...(totals.providerRuns === 0
      ? [{
          build: 32,
          priority: "P0" as const,
          title: "Browserless Live Pilot & Provider Cost Baseline",
          rationale:
            totals.approvedPublicSources === 0
              ? "The provider boundary is ready, but production has no approved public source policy for the one-run baseline."
              : "The provider boundary is ready but has no completed production-run baseline yet.",
          evidenceKeys: ["remote-cost-reliability", "source-policy-health"]
        }]
      : []),
    ...(totals.integrationLiveAccepted === 0
      ? [{
          build: 33,
          priority:
            totals.integrationConformanceAccepted > 0 ? "P2" as const : "P1" as const,
          title: "Integration Consumer Acceptance & Delivery Observability",
          rationale:
            totals.integrationConformanceAccepted > 0
              ? "Build 033 conformance is proven, but no supported business application has returned a live dry-run acknowledgement yet."
              : "Contract readiness exists, but consumer acceptance/replay/delivery evidence must be proven before automated transport.",
          evidenceKeys: ["integration-consumer-readiness"]
        }]
      : []),
    ...(totals.retentionBudgetBreaches > 0 ||
    totals.retentionDeleteEligibleRows > 0 ||
    totals.retentionFailedRuns > 0
      ? [{
          build: 34,
          priority: totals.retentionBudgetBreaches > 0 ? "P1" as const : "P2" as const,
          title: "Retention, Storage Budgets & Cleanup Automation",
          rationale:
            totals.retentionBudgetBreaches > 0
              ? "Retention controls are implemented, but one or more class budgets are currently exceeded."
              : totals.retentionFailedRuns > 0
                ? "Retention controls are implemented, but a cleanup failure requires review."
                : "Retention controls are implemented and delete-eligible rows are waiting for explicit operator approval/execution.",
          evidenceKeys: ["storage-retention"]
        }]
      : []),
    ...(totals.adoptionReviewSnapshots === 0
      ? [{
          build: 35,
          priority: "P2" as const,
          title: "Workspace, Profile & Connector Adoption / Permission Outcomes",
          rationale:
            "The adoption/least-privilege review has not yet produced a durable workspace snapshot.",
          evidenceKeys: [
            "adoption-permission-outcomes",
            "connector-readiness",
            "permission-health",
            "barcode-adoption"
          ]
        }]
      : []),
    {
      build: 36,
      priority: "P2",
      title: "Production Learning II & Roadmap Renewal",
      rationale:
        "Repeat the evidence review after Builds 031–035 and renew the queue only from observed reliability, cost and adoption.",
      evidenceKeys: [
        "sync-outcome-telemetry",
        "remote-cost-reliability",
        "integration-consumer-readiness",
        "storage-retention",
        "adoption-permission-outcomes"
      ]
    }
  ];

  return { totals, findings, roadmap };
}
