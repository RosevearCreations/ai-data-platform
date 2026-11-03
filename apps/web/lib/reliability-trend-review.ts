import type { ProductionLearningEvidence } from "./production-learning";
import type {
  ReliabilityDashboardModel,
  ReliabilityException,
  ReliabilitySignal
} from "./system-reliability-contract";

export type ReliabilityTrendDirection =
  | "improved"
  | "stable"
  | "worse"
  | "not-comparable";

export type ReliabilityTrendMetric = {
  id: string;
  label: string;
  baseline: number | null;
  current: number;
  delta: number | null;
  direction: ReliabilityTrendDirection;
  detail: string;
};

export type ReliabilityFailurePattern = {
  id: string;
  area: string;
  count: number;
  criticalCount: number;
  recurring: boolean;
  classified: boolean;
  latestAt: string | null;
  detail: string;
  href: string;
  recoveryAction: string | null;
};

export type ReliabilityTrendReview = {
  schema: "ai-data-platform.reliability-trend-review.v1";
  build: 279;
  generatedAt: string;
  baseline: {
    snapshots: number;
    generatedAt: string | null;
    comparable: boolean;
  };
  totals: {
    currentCriticalSignals: number;
    currentExceptions: number;
    recurringPatterns: number;
    unclassifiedCriticalConditions: number;
    recoveryActionsMissing: number;
  };
  metrics: ReliabilityTrendMetric[];
  failurePatterns: ReliabilityFailurePattern[];
  exitCriterion: {
    met: boolean;
    label: string;
    evidence: string;
  };
  boundaries: {
    syntheticIncidentsCreated: false;
    retriesAutomaticallyExecuted: false;
    automaticRemediation: false;
    evidenceOnly: true;
  };
};

type TrendPreference = "lower" | "higher";

function sum(
  evidence: ProductionLearningEvidence,
  selector: (workspace: ProductionLearningEvidence["workspaces"][number]) => number
) {
  return evidence.workspaces.reduce((total, workspace) => total + selector(workspace), 0);
}

function ratioPercent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function trendMetric(
  id: string,
  label: string,
  baseline: number | null,
  current: number,
  preference: TrendPreference,
  detail: string
): ReliabilityTrendMetric {
  if (baseline === null) {
    return {
      id,
      label,
      baseline,
      current,
      delta: null,
      direction: "not-comparable",
      detail
    };
  }
  const delta = current - baseline;
  const direction: ReliabilityTrendDirection =
    delta === 0
      ? "stable"
      : preference === "lower"
        ? delta < 0
          ? "improved"
          : "worse"
        : delta > 0
          ? "improved"
          : "worse";
  return { id, label, baseline, current, delta, direction, detail };
}

type RecoveryClassification = {
  id: string;
  label: string;
  recoveryAction: string;
  href: string;
};

function classifySignal(signal: ReliabilitySignal): RecoveryClassification | null {
  const map: Record<string, RecoveryClassification> = {
    application: {
      id: "application",
      label: "Application",
      recoveryAction:
        "Recheck the authenticated request path and deployment/runtime evidence before retrying affected operator work.",
      href: "/"
    },
    database: {
      id: "database",
      label: "Database",
      recoveryAction:
        "Confirm database reachability and RLS-scoped query health before retrying database-backed operations.",
      href: "/audit-evidence"
    },
    collection: {
      id: "collection",
      label: "Collection",
      recoveryAction:
        "Inspect the failed collection attempt, source readiness and policy evidence; retry only after the blocking cause is understood.",
      href: "/collection-runs"
    },
    connectors: {
      id: "connectors",
      label: "Connectors",
      recoveryAction:
        "Reconcile manifest/version compatibility and the latest connector audit before another connector execution.",
      href: "/connectors"
    },
    integration: {
      id: "integration",
      label: "Integration delivery",
      recoveryAction:
        "Inspect rejection/transport evidence and consumer acknowledgement state; replay only through the existing governed delivery controls.",
      href: "/integration-delivery"
    },
    remote: {
      id: "remote",
      label: "Remote execution",
      recoveryAction:
        "Review provider failure evidence, source approval and kill-switch state before another bounded remote attempt.",
      href: "/remote-execution"
    },
    queues: {
      id: "queues",
      label: "Review queues",
      recoveryAction:
        "Resolve or disposition held review exceptions before repeating the affected review workflow.",
      href: "/data-review/bulk"
    },
    exceptions: {
      id: "exceptions",
      label: "Recent exceptions",
      recoveryAction:
        "Classify the underlying attention item and follow its source-specific recovery path before retrying.",
      href: "/attention"
    }
  };
  return map[signal.id] ?? null;
}

function classifyException(item: ReliabilityException): RecoveryClassification | null {
  const value = (item.area + " " + item.href + " " + item.title).toLowerCase();
  if (value.includes("connector")) {
    return classifySignal({ id: "connectors" } as ReliabilitySignal);
  }
  if (value.includes("integration") || value.includes("delivery") || value.includes("handshake")) {
    return classifySignal({ id: "integration" } as ReliabilitySignal);
  }
  if (value.includes("remote") || value.includes("provider")) {
    return classifySignal({ id: "remote" } as ReliabilitySignal);
  }
  if (value.includes("collection") || value.includes("source")) {
    return classifySignal({ id: "collection" } as ReliabilitySignal);
  }
  if (value.includes("review") || value.includes("approval") || value.includes("queue")) {
    return classifySignal({ id: "queues" } as ReliabilitySignal);
  }
  if (value.includes("database")) {
    return classifySignal({ id: "database" } as ReliabilitySignal);
  }
  return null;
}

export function buildReliabilityTrendReview(input: {
  evidence: ProductionLearningEvidence;
  reliability: ReliabilityDashboardModel;
}): ReliabilityTrendReview {
  const { evidence, reliability } = input;

  const syncConflicts = sum(evidence, (workspace) => workspace.outcomes.sync.conflicts);
  const syncErrors = sum(evidence, (workspace) => workspace.outcomes.sync.errors);
  const repairChecks = sum(
    evidence,
    (workspace) => workspace.outcomes.repair.compatibilityChecks
  );
  const repairHealthy = sum(evidence, (workspace) => workspace.outcomes.repair.healthy);
  const providerRuns = sum(evidence, (workspace) => workspace.remote.providerRuns);
  const providerFailures = sum(evidence, (workspace) => workspace.remote.providerFailures);
  const integrationLiveAccepted = sum(
    evidence,
    (workspace) => workspace.integrations.liveAccepted
  );
  const integrationFailures = sum(
    evidence,
    (workspace) =>
      workspace.integrations.deliveryRejected +
      workspace.integrations.transportErrors +
      workspace.integrations.handshakeRejected
  );
  const retentionBreaches = sum(
    evidence,
    (workspace) => workspace.retention.budgetBreaches
  );
  const retentionFailedRuns = sum(
    evidence,
    (workspace) => workspace.retention.failedRuns
  );
  const adoptionActivityEvents = evidence.workspaces.reduce(
    (total, workspace) =>
      total +
      workspace.outcomes.sync.events +
      workspace.outcomes.repair.proposed +
      workspace.integrations.deliveryAttempts +
      workspace.remote.jobs +
      workspace.connectors.succeeded +
      workspace.connectors.failed +
      workspace.connectors.blocked,
    0
  );

  const baselineRepairHealth = evidence.trend.baselineRepairChecks
    ? ratioPercent(
        evidence.trend.baselineRepairHealthy,
        evidence.trend.baselineRepairChecks
      )
    : null;
  const currentRepairHealth = ratioPercent(repairHealthy, repairChecks);

  const metrics: ReliabilityTrendMetric[] = [
    trendMetric(
      "sync-conflicts",
      "Sync conflicts",
      evidence.trend.baselineSnapshots ? evidence.trend.baselineSyncConflicts : null,
      syncConflicts,
      "lower",
      syncErrors + " current sync error(s) are also retained as current-only evidence."
    ),
    trendMetric(
      "repair-health",
      "Repair compatibility health",
      baselineRepairHealth,
      currentRepairHealth,
      "higher",
      repairHealthy + "/" + repairChecks + " current compatibility checks are healthy."
    ),
    trendMetric(
      "integration-live-accepted",
      "Accepted integration outcomes",
      evidence.trend.baselineSnapshots
        ? evidence.trend.baselineIntegrationLiveAccepted
        : null,
      integrationLiveAccepted,
      "higher",
      integrationFailures + " current integration failure outcome(s) remain visible separately."
    ),
    trendMetric(
      "retention-budget-breaches",
      "Retention budget breaches",
      evidence.trend.baselineSnapshots
        ? evidence.trend.baselineRetentionBudgetBreaches
        : null,
      retentionBreaches,
      "lower",
      retentionFailedRuns + " current cleanup run failure(s)."
    ),
    trendMetric(
      "adoption-activity",
      "Measured adoption activity",
      evidence.trend.baselineSnapshots
        ? evidence.trend.baselineAdoptionActivityEvents
        : null,
      adoptionActivityEvents,
      "higher",
      "Measured activity only; Build 279 never creates activity to improve this metric."
    ),
    trendMetric(
      "high-risk-unused-capabilities",
      "High-risk unused capabilities",
      evidence.trend.baselineSnapshots
        ? evidence.trend.baselineAdoptionHighRiskUnused
        : null,
      evidence.adoption.highRiskUnusedCapabilities,
      "lower",
      "Owner-reviewed least-privilege evidence carried forward from Build 278."
    ),
    trendMetric(
      "unused-connector-grants",
      "Unused connector grants",
      evidence.trend.baselineSnapshots
        ? evidence.trend.baselineConnectorUnusedGrants
        : null,
      evidence.adoption.connectorUnusedGrants,
      "lower",
      "Unused grants remain advisory cleanup evidence and are not revoked automatically."
    ),
    trendMetric(
      "provider-failures",
      "Provider failures",
      null,
      providerFailures,
      "lower",
      providerRuns + " provider run(s) are present; the legacy trend baseline did not persist provider failure count."
    )
  ];

  const grouped = new Map<
    string,
    {
      classification: RecoveryClassification | null;
      area: string;
      items: ReliabilityException[];
    }
  >();

  for (const item of reliability.exceptions) {
    const classification = classifyException(item);
    const key = classification?.id ?? "unclassified:" + item.area.toLowerCase();
    const current = grouped.get(key);
    if (current) current.items.push(item);
    else grouped.set(key, { classification, area: item.area, items: [item] });
  }

  const failurePatterns: ReliabilityFailurePattern[] = [...grouped.entries()]
    .map(([id, group]) => {
      const latest = [...group.items].sort(
        (a, b) =>
          Date.parse(b.observedAt ?? "1970-01-01") -
          Date.parse(a.observedAt ?? "1970-01-01")
      )[0];
      return {
        id,
        area: group.classification?.label ?? group.area,
        count: group.items.length,
        criticalCount: group.items.filter((item) => item.state === "critical").length,
        recurring: group.items.length > 1,
        classified: Boolean(group.classification),
        latestAt: latest?.observedAt ?? null,
        detail:
          group.items.length +
          " current exception(s); latest: " +
          (latest?.title ?? "unclassified reliability evidence"),
        href: group.classification?.href ?? latest?.href ?? "/attention",
        recoveryAction: group.classification?.recoveryAction ?? null
      };
    })
    .sort(
      (a, b) =>
        b.criticalCount - a.criticalCount ||
        b.count - a.count ||
        a.area.localeCompare(b.area)
    );

  const unclassifiedCriticalSignals = reliability.signals.filter(
    (item) => item.state === "critical" && !classifySignal(item)
  ).length;
  const unclassifiedCriticalExceptions = reliability.exceptions.filter(
    (item) => item.state === "critical" && !classifyException(item)
  ).length;
  const recurringPatterns = failurePatterns.filter((item) => item.recurring);
  const recoveryActionsMissing = recurringPatterns.filter(
    (item) => !item.recoveryAction
  ).length;
  const unclassifiedCriticalConditions =
    unclassifiedCriticalSignals + unclassifiedCriticalExceptions;
  const baselineComparable = evidence.trend.baselineSnapshots > 0;

  const exitMet =
    baselineComparable &&
    unclassifiedCriticalConditions === 0 &&
    recoveryActionsMissing === 0;

  return {
    schema: "ai-data-platform.reliability-trend-review.v1",
    build: 279,
    generatedAt: reliability.generatedAt,
    baseline: {
      snapshots: evidence.trend.baselineSnapshots,
      generatedAt: evidence.trend.baselineGeneratedAt,
      comparable: baselineComparable
    },
    totals: {
      currentCriticalSignals: reliability.totals.critical,
      currentExceptions: reliability.totals.exceptions,
      recurringPatterns: recurringPatterns.length,
      unclassifiedCriticalConditions,
      recoveryActionsMissing
    },
    metrics,
    failurePatterns,
    exitCriterion: {
      met: exitMet,
      label:
        "A durable Production Learning baseline exists, no critical condition is left unclassified, and every recurring failure pattern has an explicit recovery action.",
      evidence:
        evidence.trend.baselineSnapshots +
        " baseline snapshot(s); " +
        unclassifiedCriticalConditions +
        " unclassified critical condition(s); " +
        recoveryActionsMissing +
        " recurring pattern(s) missing recovery action."
    },
    boundaries: {
      syntheticIncidentsCreated: false,
      retriesAutomaticallyExecuted: false,
      automaticRemediation: false,
      evidenceOnly: true
    }
  };
}
