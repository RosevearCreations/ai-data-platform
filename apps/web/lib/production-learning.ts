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
  const integrationExports = sum(evidence, (w) => w.integrations.exported);
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
    integrationExports,
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
    "Configure the production Browserless secret and controlled gates, then run one allowlisted pilot to establish the first real cost/reliability baseline.";
  if (totals.providerRuns > 0) {
    remoteStatus =
      (totals.providerSuccessRate ?? 0) < 0.8 ? "action" : "healthy";
    remoteEvidence =
      String(totals.providerRuns) +
      " provider runs; " +
      percent(totals.providerSuccessRate) +
      " success; " +
      String(totals.providerUnits) +
      " estimated provider units.";
    remoteAction =
      remoteStatus === "action"
        ? "Keep the pilot gated and investigate failures before increasing usage."
        : "Retain the one-page pilot limits and accumulate a larger evidence sample before expansion.";
  } else if (
    evidence.browserless.tokenConfigured &&
    evidence.browserless.executionEnabled
  ) {
    remoteStatus = "watch";
    remoteEvidence =
      "Browserless token and execution flag are configured, but no completed provider run is visible.";
  } else if (evidence.browserless.tokenConfigured) {
    remoteStatus = "watch";
    remoteEvidence =
      "Browserless token is configured, but live provider execution remains gated.";
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
    status: totals.integrationExports > 0 ? "healthy" : "gap",
    title:
      totals.integrationExports > 0
        ? "Approved integration export evidence exists."
        : "Consumer-side delivery evidence is still missing.",
    evidence:
      totals.integrationExports > 0
        ? String(totals.integrationExports) + " approved export events are visible."
        : "Contract conformance exists, but no durable exported event is visible in the authorized workspaces.",
    action:
      totals.integrationExports > 0
        ? "Verify downstream consumer acceptance/replay evidence before enabling automated delivery."
        : "Complete one explicit consumer acceptance path before adding transport automation.",
    owner: "platform"
  });

  findings.push({
    key: "connector-readiness",
    category: "Connectors",
    status:
      totals.connectorInstallations === 0
        ? "watch"
        : totals.connectorExecutions === 0
          ? "watch"
          : "healthy",
    title: "Connector SDK readiness is measurable without credential exposure.",
    evidence:
      String(totals.connectorInstallations) +
      " workspace installations and " +
      String(totals.connectorExecutions) +
      " audited executions are visible.",
    action:
      totals.connectorInstallations === 0
        ? "Keep the no-secret sample available as the acceptance baseline; add real connectors only for a demonstrated need."
        : "Review grants and audit outcomes before adding credentialed connectors.",
    owner: "platform"
  });

  findings.push({
    key: "storage-retention",
    category: "Storage & retention",
    status:
      totals.storageBytes >= 25_000_000
        ? "action"
        : totals.storageBytes >= 5_000_000
          ? "watch"
          : "healthy",
    title: "Approximate durable payload storage is measurable.",
    evidence:
      String(totals.storageBytes) +
      " bytes of measured JSON/evidence payload storage are visible across authorized workspaces. This is a storage proxy, not provider billing.",
    action:
      totals.storageBytes >= 5_000_000
        ? "Add retention/cleanup budgets before payload growth becomes a recurring cost."
        : "Keep bounded retention limits and re-measure after meaningful production adoption.",
    owner: "operations"
  });

  findings.push({
    key: "permission-health",
    category: "Security & permissions",
    status: totals.ownerlessWorkspaces > 0 ? "action" : "healthy",
    title: "Workspace ownership remains the primary operational permission check.",
    evidence:
      totals.ownerlessWorkspaces === 0
        ? "Every visible workspace has at least one owner in the measured membership view."
        : String(totals.ownerlessWorkspaces) + " visible workspaces have no owner.",
    action:
      totals.ownerlessWorkspaces === 0
        ? "Continue least-privilege review for admins, remote controls and connector grants."
        : "Assign an accountable owner before expanding automation.",
    owner: "operations"
  });

  const roadmap: RoadmapRecommendation[] = [
    {
      build: 32,
      priority:
        totals.providerRuns === 0 || (totals.providerSuccessRate ?? 1) < 0.8
          ? "P0"
          : "P1",
      title: "Browserless Live Pilot & Provider Cost Baseline",
      rationale:
        totals.providerRuns === 0
          ? "The provider boundary is built but has no completed production-run baseline yet."
          : "Existing provider runs need a larger bounded sample before remote execution can expand.",
      evidenceKeys: ["remote-cost-reliability", "source-policy-health"]
    },
    {
      build: 33,
      priority: totals.integrationExports === 0 ? "P1" : "P2",
      title: "Integration Consumer Acceptance & Delivery Observability",
      rationale:
        "Contract readiness exists, but consumer acceptance/replay/delivery evidence must be proven before automated transport.",
      evidenceKeys: ["integration-consumer-readiness"]
    },
    {
      build: 34,
      priority: totals.storageBytes >= 25_000_000 ? "P1" : "P2",
      title: "Retention, Storage Budgets & Cleanup Automation",
      rationale:
        "Build 030 can measure payload size but the platform does not yet have a durable retention/cleanup outcome loop.",
      evidenceKeys: ["storage-retention"]
    },
    {
      build: 35,
      priority: "P2",
      title: "Workspace, Profile & Connector Adoption / Permission Outcomes",
      rationale:
        "Profile and connector infrastructure is ready; broader functionality should follow measured adoption and least-privilege review rather than assumptions.",
      evidenceKeys: ["connector-readiness", "permission-health", "barcode-adoption"]
    },
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
        "storage-retention"
      ]
    }
  ];

  return { totals, findings, roadmap };
}
