import type { MasterShellSourceId } from "./master-shell-contract-v1";

export const MODULE_HEALTH_INTELLIGENCE_BUILD = 344 as const;
export const DEFAULT_STUCK_AFTER_HOURS = 24 as const;

export type ModuleHealthState =
  | "HOLD"
  | "BLOCKED"
  | "STALE"
  | "STUCK_CANDIDATE"
  | "IN_PROGRESS"
  | "HEALTHY_SIGNAL"
  | "UNMEASURED";

export type ModuleHealthBlocker = {
  code: string;
  kind: "HARD_BLOCKER" | "EVIDENCE_BLOCKER" | "EVIDENCE_GAP";
  detail: string;
  evidenceURI: string | null;
};

export type ModuleHealthInventoryInput = {
  applications: Array<{
    sourceId: MasterShellSourceId;
    displayName: string;
    applicationState: {
      effectiveStatus: string;
      freshness: string;
      evidenceURI: string | null;
    };
    versionEvidence: {
      latestRelease:
        | {
            deploymentStatus: string;
            freshness: string;
            evidenceURI: string;
          }
        | null;
    };
    modules: Array<{
      moduleId: string;
      sourceReportedReadiness: {
        readinessState: string;
        completionPercent: number | null;
        evidenceURI: string | null;
        freshness: string;
        observedAt: string | null;
        expiresAt: string | null;
        verificationState: string;
      };
      masterCompletion: {
        scopeKey: string | null;
        evidenceState: string;
        completion:
          | {
              percent: number | null;
              blockedByUnknown: number;
              blockedByStale: number;
            }
          | null;
        counts:
          | {
              failed: number;
              criticalFailed: number;
              unknown: number;
              stale: number;
            }
          | null;
      };
    }>;
  }>;
};

function hoursSince(value: string | null, now: Date) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (now.getTime() - time) / 3_600_000);
}

function sourceStateBlocks(status: string) {
  return (
    status === "ERROR" ||
    status === "REVOKED" ||
    status === "DISCONNECTED" ||
    status === "DEGRADED"
  );
}

function stateRank(state: ModuleHealthState) {
  return state === "HOLD"
    ? 7
    : state === "BLOCKED"
      ? 6
      : state === "STALE"
        ? 5
        : state === "STUCK_CANDIDATE"
          ? 4
          : state === "UNMEASURED"
            ? 3
            : state === "IN_PROGRESS"
              ? 2
              : 1;
}

export function composeModuleHealthIntelligence(input: {
  inventory: ModuleHealthInventoryInput;
  now?: Date;
  stuckAfterHours?: number;
}) {
  const now = input.now ?? new Date();
  const stuckAfterHours =
    input.stuckAfterHours ?? DEFAULT_STUCK_AFTER_HOURS;

  if (!Number.isFinite(stuckAfterHours) || stuckAfterHours <= 0) {
    throw new Error("module_health_stuck_threshold_invalid");
  }

  const applications = input.inventory.applications.map((application) => {
    const modules = application.modules.map((module) => {
      const readiness = module.sourceReportedReadiness;
      const completion = module.masterCompletion;
      const blockers: ModuleHealthBlocker[] = [];

      if (application.applicationState.effectiveStatus === "AUTHORIZATION_HELD") {
        blockers.push({
          code: "SOURCE_AUTHORIZATION_HELD",
          kind: "HARD_BLOCKER",
          detail: "The source registry is authorization-held.",
          evidenceURI: application.applicationState.evidenceURI
        });
      } else if (sourceStateBlocks(application.applicationState.effectiveStatus)) {
        blockers.push({
          code: "SOURCE_STATE_BLOCKER",
          kind: "HARD_BLOCKER",
          detail:
            "The source registry state is " +
            application.applicationState.effectiveStatus +
            ".",
          evidenceURI: application.applicationState.evidenceURI
        });
      }

      if (application.applicationState.freshness === "STALE") {
        blockers.push({
          code: "SOURCE_REGISTRY_STALE",
          kind: "EVIDENCE_BLOCKER",
          detail: "Source registry evidence is stale.",
          evidenceURI: application.applicationState.evidenceURI
        });
      }

      if (application.versionEvidence.latestRelease?.deploymentStatus === "HOLD") {
        blockers.push({
          code: "LATEST_RELEASE_HOLD",
          kind: "HARD_BLOCKER",
          detail: "The latest source-reported release is on HOLD.",
          evidenceURI: application.versionEvidence.latestRelease.evidenceURI
        });
      } else if (
        application.versionEvidence.latestRelease?.deploymentStatus === "RED"
      ) {
        blockers.push({
          code: "LATEST_RELEASE_RED",
          kind: "HARD_BLOCKER",
          detail: "The latest source-reported release is RED.",
          evidenceURI: application.versionEvidence.latestRelease.evidenceURI
        });
      }

      if (readiness.readinessState === "BLOCKED") {
        blockers.push({
          code: "SOURCE_REPORTED_BLOCKED",
          kind: "HARD_BLOCKER",
          detail: "The source explicitly reports this module as BLOCKED.",
          evidenceURI: readiness.evidenceURI
        });
      }

      if (readiness.freshness === "STALE") {
        blockers.push({
          code: "MODULE_READINESS_STALE",
          kind: "EVIDENCE_BLOCKER",
          detail: "The latest module-readiness evidence has expired.",
          evidenceURI: readiness.evidenceURI
        });
      } else if (readiness.freshness === "UNMEASURED") {
        blockers.push({
          code: "MODULE_READINESS_UNMEASURED",
          kind: "EVIDENCE_GAP",
          detail: "No current source-reported module-readiness evidence is measured.",
          evidenceURI: null
        });
      }

      if (
        readiness.verificationState !== "independently-verified" &&
        readiness.verificationState !== "unknown"
      ) {
        blockers.push({
          code: "MODULE_READINESS_NOT_INDEPENDENTLY_VERIFIED",
          kind: "EVIDENCE_BLOCKER",
          detail:
            "Module-readiness verification state is " +
            readiness.verificationState +
            ".",
          evidenceURI: readiness.evidenceURI
        });
      }

      if (completion.scopeKey === null) {
        blockers.push({
          code: "MASTER_COMPLETION_SCOPE_MISSING",
          kind: "EVIDENCE_GAP",
          detail: "No approved module-level Master Completion scope is present.",
          evidenceURI: null
        });
      }

      if ((completion.counts?.criticalFailed ?? 0) > 0) {
        blockers.push({
          code: "MASTER_COMPLETION_CRITICAL_FAILURE",
          kind: "HARD_BLOCKER",
          detail:
            String(completion.counts?.criticalFailed ?? 0) +
            " critical Master Completion requirement(s) are failed.",
          evidenceURI: null
        });
      } else if ((completion.counts?.failed ?? 0) > 0) {
        blockers.push({
          code: "MASTER_COMPLETION_FAILURE",
          kind: "HARD_BLOCKER",
          detail:
            String(completion.counts?.failed ?? 0) +
            " Master Completion requirement(s) are failed.",
          evidenceURI: null
        });
      }

      if (
        (completion.completion?.blockedByUnknown ?? 0) > 0 ||
        (completion.completion?.blockedByStale ?? 0) > 0
      ) {
        blockers.push({
          code: "MASTER_COMPLETION_EVIDENCE_BLOCKED",
          kind: "EVIDENCE_BLOCKER",
          detail:
            "Master Completion is blocked by " +
            String(completion.completion?.blockedByUnknown ?? 0) +
            " unknown and " +
            String(completion.completion?.blockedByStale ?? 0) +
            " stale requirement(s).",
          evidenceURI: null
        });
      }

      const ageHours = hoursSince(readiness.observedAt, now);
      const hardBlockers = blockers.filter(
        (item) => item.kind === "HARD_BLOCKER"
      );
      const evidenceBlockers = blockers.filter(
        (item) => item.kind === "EVIDENCE_BLOCKER"
      );
      const stuckCandidate =
        readiness.readinessState === "IN_PROGRESS" &&
        readiness.freshness === "FRESH" &&
        ageHours !== null &&
        ageHours >= stuckAfterHours;

      let healthState: ModuleHealthState;
      if (
        application.applicationState.effectiveStatus === "AUTHORIZATION_HELD"
      ) {
        healthState = "HOLD";
      } else if (hardBlockers.length > 0) {
        healthState = "BLOCKED";
      } else if (
        application.applicationState.freshness === "STALE" ||
        readiness.freshness === "STALE"
      ) {
        healthState = "STALE";
      } else if (stuckCandidate) {
        healthState = "STUCK_CANDIDATE";
      } else if (
        readiness.readinessState === "UNKNOWN" ||
        readiness.freshness === "UNMEASURED"
      ) {
        healthState = "UNMEASURED";
      } else if (readiness.readinessState === "IN_PROGRESS") {
        healthState = "IN_PROGRESS";
      } else if (
        (readiness.readinessState === "READY" ||
          readiness.readinessState === "ACCEPTED") &&
        evidenceBlockers.length === 0
      ) {
        healthState = "HEALTHY_SIGNAL";
      } else {
        healthState = "UNMEASURED";
      }

      return {
        sourceId: application.sourceId,
        displayName: application.displayName,
        moduleId: module.moduleId,
        healthState,
        sourceEffectiveStatus: application.applicationState.effectiveStatus,
        sourceFreshness: application.applicationState.freshness,
        readinessState: readiness.readinessState,
        readinessFreshness: readiness.freshness,
        readinessCompletionPercent: readiness.completionPercent,
        readinessObservedAt: readiness.observedAt,
        readinessExpiresAt: readiness.expiresAt,
        readinessAgeHours:
          ageHours === null ? null : Math.round(ageHours * 100) / 100,
        stuckAfterHours,
        stuckCandidate,
        blockerCount: blockers.length,
        hardBlockerCount: hardBlockers.length,
        evidenceBlockerCount: evidenceBlockers.length,
        evidenceGapCount: blockers.filter(
          (item) => item.kind === "EVIDENCE_GAP"
        ).length,
        blockers,
        masterCompletionState: completion.evidenceState,
        masterCompletionPercent: completion.completion?.percent ?? null,
        sourceAcceptanceInferred: false,
        productionAcceptanceInferred: false,
        stuckStateWrittenToSource: false
      };
    });

    return {
      sourceId: application.sourceId,
      displayName: application.displayName,
      sourceEffectiveStatus: application.applicationState.effectiveStatus,
      sourceFreshness: application.applicationState.freshness,
      modules,
      summary: {
        modules: modules.length,
        hold: modules.filter((item) => item.healthState === "HOLD").length,
        blocked: modules.filter((item) => item.healthState === "BLOCKED").length,
        stale: modules.filter((item) => item.healthState === "STALE").length,
        stuckCandidates: modules.filter(
          (item) => item.healthState === "STUCK_CANDIDATE"
        ).length,
        inProgress: modules.filter(
          (item) => item.healthState === "IN_PROGRESS"
        ).length,
        healthySignals: modules.filter(
          (item) => item.healthState === "HEALTHY_SIGNAL"
        ).length,
        unmeasured: modules.filter(
          (item) => item.healthState === "UNMEASURED"
        ).length,
        hardBlockers: modules.reduce(
          (sum, item) => sum + item.hardBlockerCount,
          0
        ),
        evidenceBlockers: modules.reduce(
          (sum, item) => sum + item.evidenceBlockerCount,
          0
        ),
        evidenceGaps: modules.reduce(
          (sum, item) => sum + item.evidenceGapCount,
          0
        )
      }
    };
  });

  const moduleQueue = applications
    .flatMap((application) => application.modules)
    .filter((module) => module.healthState !== "HEALTHY_SIGNAL")
    .sort(
      (a, b) =>
        stateRank(b.healthState) - stateRank(a.healthState) ||
        b.hardBlockerCount - a.hardBlockerCount ||
        (b.readinessAgeHours ?? -1) - (a.readinessAgeHours ?? -1) ||
        a.sourceId.localeCompare(b.sourceId) ||
        a.moduleId.localeCompare(b.moduleId)
    );

  const allModules = applications.flatMap((application) => application.modules);

  return {
    schema: "ai-data-platform.module-health-intelligence.v1",
    build: MODULE_HEALTH_INTELLIGENCE_BUILD,
    generatedAt: now.toISOString(),
    stuckAfterHours,
    applications,
    moduleQueue,
    summary: {
      applications: applications.length,
      modules: allModules.length,
      hold: allModules.filter((item) => item.healthState === "HOLD").length,
      blocked: allModules.filter((item) => item.healthState === "BLOCKED").length,
      stale: allModules.filter((item) => item.healthState === "STALE").length,
      stuckCandidates: allModules.filter(
        (item) => item.healthState === "STUCK_CANDIDATE"
      ).length,
      inProgress: allModules.filter(
        (item) => item.healthState === "IN_PROGRESS"
      ).length,
      healthySignals: allModules.filter(
        (item) => item.healthState === "HEALTHY_SIGNAL"
      ).length,
      unmeasured: allModules.filter(
        (item) => item.healthState === "UNMEASURED"
      ).length,
      hardBlockers: allModules.reduce(
        (sum, item) => sum + item.hardBlockerCount,
        0
      ),
      evidenceBlockers: allModules.reduce(
        (sum, item) => sum + item.evidenceBlockerCount,
        0
      ),
      evidenceGaps: allModules.reduce(
        (sum, item) => sum + item.evidenceGapCount,
        0
      )
    },
    policy: {
      readOnly: true,
      sourceMutationPerformed: false,
      peerWritePerformed: false,
      externalProbePerformed: false,
      automaticRecoveryPerformed: false,
      stuckCandidateIsSourceTruth: false,
      missingEvidenceMeansHealthy: false,
      holdAutomaticallyReleased: false,
      moduleAcceptanceInferred: false,
      productionAcceptanceInferred: false,
      sourceProvenanceRetained: true
    }
  };
}

export type ModuleHealthIntelligenceModel = ReturnType<
  typeof composeModuleHealthIntelligence
>;
