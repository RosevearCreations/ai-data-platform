export type AutonomousOperationMode = "observe-only" | "safe-recovery";

export type AutonomousOwnerPolicyInput = {
  enabled: boolean;
  killSwitchEngaged: boolean;
  monitoringEnabled: boolean;
  recoveryScanEnabled: boolean;
  safeRecoveryEnabled: boolean;
  maxSafeRecoveriesPerCycle: number;
  maxCyclesPerHour: number;
};

export type AutonomousOwnerPolicy = AutonomousOwnerPolicyInput & {
  mode: AutonomousOperationMode;
};

export type ProductionLearningVIFinding = {
  key: string;
  category: string;
  status: string;
  title: string;
  evidence: string;
  action: string;
};

export type ProductionLearningVICandidate = {
  priority: "P0" | "P1" | "P2";
  area:
    | "connectivity"
    | "recovery"
    | "security"
    | "operations"
    | "data-governance"
    | "adoption"
    | "performance";
  title: string;
  rationale: string;
  evidence: string;
  sourceHref: string;
};

export type ProductionLearningVIInput = {
  certification: {
    runId: string | null;
    passed: number;
    failed: number;
    blocked: number;
  };
  recovery: {
    readySafeRetries: number;
    recovered: number;
    approvalRequired: number;
    approved: number;
    rejected: number;
    exhausted: number;
    notRetryable: number;
  };
  findings: ProductionLearningVIFinding[];
};

function boundedInteger(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function normalizeAutonomousOwnerPolicy(
  input: AutonomousOwnerPolicyInput
): AutonomousOwnerPolicy {
  const maxSafeRecoveriesPerCycle = boundedInteger(
    input.maxSafeRecoveriesPerCycle,
    0,
    10
  );
  const maxCyclesPerHour = boundedInteger(input.maxCyclesPerHour, 1, 12);
  const safeRecoveryEnabled =
    Boolean(input.safeRecoveryEnabled) && maxSafeRecoveriesPerCycle > 0;

  return {
    enabled: Boolean(input.enabled),
    killSwitchEngaged: Boolean(input.killSwitchEngaged),
    monitoringEnabled: Boolean(input.monitoringEnabled),
    recoveryScanEnabled: Boolean(input.recoveryScanEnabled),
    safeRecoveryEnabled,
    maxSafeRecoveriesPerCycle,
    maxCyclesPerHour,
    mode: safeRecoveryEnabled ? "safe-recovery" : "observe-only"
  };
}

function areaForFinding(category: string): ProductionLearningVICandidate["area"] {
  const value = category.toLowerCase();
  if (/security|permission|credential|access|source governance/.test(value)) {
    return "security";
  }
  if (/integration|delivery|connector|remote|provider/.test(value)) {
    return "connectivity";
  }
  if (/retention|data quality|recipe|sync|barcode/.test(value)) {
    return "data-governance";
  }
  if (/adoption|workspace/.test(value)) return "adoption";
  if (/performance|latency|capacity/.test(value)) return "performance";
  return "operations";
}

function priorityForFinding(status: string): "P0" | "P1" | "P2" {
  if (status === "gap") return "P0";
  if (status === "action") return "P1";
  return "P2";
}

export function buildProductionLearningVI(
  input: ProductionLearningVIInput
) {
  const candidates: ProductionLearningVICandidate[] = [];

  if (input.certification.failed > 0) {
    candidates.push({
      priority: "P0",
      area: "connectivity",
      title: "Resolve contradictory six-app certification evidence",
      rationale:
        "Build 304 found evidence that violates at least one authentication, exchange, event, recovery or tenant-isolation invariant. Contradictory evidence must be resolved before connectivity can be treated as certified.",
      evidence:
        String(input.certification.failed) +
        " certification assertion(s) are FAIL; " +
        String(input.certification.passed) +
        " PASS and " +
        String(input.certification.blocked) +
        " BLOCKED.",
      sourceHref: "/integration-certification"
    });
  }

  if (input.certification.blocked > 0) {
    candidates.push({
      priority: input.certification.failed > 0 ? "P1" : "P0",
      area: "connectivity",
      title: "Complete missing six-app integration certification evidence",
      rationale:
        "A production deployment is not proof of peer connectivity. Missing positive or negative runtime evidence remains BLOCKED and should be closed using real authenticated application activity.",
      evidence:
        String(input.certification.blocked) +
        " of 30 certification assertions remain BLOCKED.",
      sourceHref: "/integration-certification"
    });
  }

  if (input.recovery.approvalRequired > 0) {
    candidates.push({
      priority: "P0",
      area: "recovery",
      title: "Resolve owner-controlled recovery decisions",
      rationale:
        "Consequential event replay, credential remediation or connector remediation is waiting for explicit owner/admin review and must not be automated by Autonomous Operations V1.",
      evidence:
        String(input.recovery.approvalRequired) +
        " recovery plan(s) require owner/admin approval.",
      sourceHref: "/integration-recovery"
    });
  }

  if (
    input.recovery.readySafeRetries > 0 ||
    input.recovery.exhausted > 0 ||
    input.recovery.notRetryable > 0
  ) {
    candidates.push({
      priority:
        input.recovery.exhausted > 0 || input.recovery.notRetryable > 0
          ? "P1"
          : "P2",
      area: "recovery",
      title: "Stabilize remaining connector recovery evidence",
      rationale:
        "Safe GET/HEAD recovery is bounded and useful only for transient health failures. Exhausted or non-retryable plans require diagnosis rather than broader automation.",
      evidence:
        String(input.recovery.readySafeRetries) +
        " ready safe retry plan(s), " +
        String(input.recovery.exhausted) +
        " exhausted and " +
        String(input.recovery.notRetryable) +
        " not retryable.",
      sourceHref: "/integration-recovery"
    });
  }

  for (const finding of input.findings) {
    if (!["gap", "action", "watch"].includes(finding.status)) continue;
    candidates.push({
      priority: priorityForFinding(finding.status),
      area: areaForFinding(finding.category),
      title: finding.title,
      rationale: finding.action,
      evidence: finding.evidence,
      sourceHref: "/production-learning"
    });
  }

  const deduped = candidates
    .filter(
      (candidate, index, all) =>
        all.findIndex(
          other =>
            other.title === candidate.title &&
            other.sourceHref === candidate.sourceHref
        ) === index
    )
    .slice(0, 20);

  const actionFindings = input.findings.filter(
    item => item.status === "action" || item.status === "gap"
  ).length;
  const watchFindings = input.findings.filter(
    item => item.status === "watch"
  ).length;

  const overallState =
    input.certification.failed > 0
      ? "blocked"
      : input.certification.blocked > 0 ||
          input.recovery.approvalRequired > 0 ||
          actionFindings > 0
        ? "attention"
        : "healthy";

  return {
    schema: "ai-data-platform.production-learning-vi.v1" as const,
    build: 305 as const,
    batch: "281-305" as const,
    generatedAt: new Date().toISOString(),
    overallState: overallState as "healthy" | "attention" | "blocked",
    summary: {
      certificationPassed: input.certification.passed,
      certificationFailed: input.certification.failed,
      certificationBlocked: input.certification.blocked,
      recoveryReady: input.recovery.readySafeRetries,
      recoveryOwnerApprovalRequired: input.recovery.approvalRequired,
      recoverySucceeded: input.recovery.recovered,
      learningActionFindings: actionFindings,
      learningWatchFindings: watchFindings,
      renewalCandidates: deduped.length
    },
    candidates: deduped,
    roadmapRenewal: {
      checkpointReached: true as const,
      numberedNextBatchAuthorized: false as const,
      nextBuildNumber: null,
      candidatesFromMeasuredEvidenceOnly: true as const,
      ownerAuthorizationRequired: true as const,
      automaticRoadmapExtension: false as const
    },
    boundaries: {
      deploymentIsNotOperationalAcceptance: true as const,
      syntheticEvidenceCreated: false as const,
      connectionAuthorizationInferred: false as const,
      automaticMutatingCapabilityActivation: false as const,
      automaticEventReplay: false as const,
      automaticCredentialMutation: false as const,
      automaticTrustMutation: false as const,
      ql266Resumed: false as const
    }
  };
}
