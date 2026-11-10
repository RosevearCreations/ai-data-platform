import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";
import type { MasterProductionReadinessModel } from "./master-production-readiness-core";

export const PRODUCTION_LEARNING_VIII_BUILD = 350 as const;
export const PRODUCTION_LEARNING_VIII_SCHEMA =
  "rosevear.ai-data-platform.production-learning-viii.v1" as const;
export const PRODUCTION_LEARNING_VIII_CANDIDATE_LIMIT = 12 as const;

export const PRODUCTION_LEARNING_VIII_PRIORITIES = [
  "P0",
  "P1",
  "P2"
] as const;

export const PRODUCTION_LEARNING_VIII_AREAS = [
  "source-readiness",
  "owner-acceptance",
  "recovery",
  "accessibility",
  "production-safeguards",
  "rollback",
  "evidence-freshness"
] as const;

export type ProductionLearningVIIIPriority =
  (typeof PRODUCTION_LEARNING_VIII_PRIORITIES)[number];
export type ProductionLearningVIIIArea =
  (typeof PRODUCTION_LEARNING_VIII_AREAS)[number];

export type ProductionLearningVIIICandidate = {
  priority: ProductionLearningVIIIPriority;
  area: ProductionLearningVIIIArea;
  sourceId: MasterShellSourceId | null;
  title: string;
  rationale: string;
  evidence: string;
  sourceHref: string;
};

function priorityRank(priority: ProductionLearningVIIIPriority) {
  return priority === "P0" ? 0 : priority === "P1" ? 1 : 2;
}

function candidate(input: ProductionLearningVIIICandidate) {
  return input;
}

function sourceGapCandidate(
  source: MasterProductionReadinessModel["sources"][number]
): ProductionLearningVIIICandidate | null {
  if (source.effectiveState === "ACCEPTED") return null;

  if (source.effectiveState === "FAIL") {
    return candidate({
      priority: "P0",
      area: "source-readiness",
      sourceId: source.sourceId,
      title: "Resolve failed production-readiness evidence for " + source.sourceId,
      rationale:
        "A failed Build 349 source cannot be included in Master Shell acceptance. Resolve the failing readiness evidence and record a fresh owner-reviewed Build 349 run before any next roadmap expands the suite.",
      evidence:
        source.sourceId +
        " Build 349 effective state is FAIL; owner decision is " +
        (source.run?.ownerDecision ?? "missing") +
        ".",
      sourceHref: "/master-production-readiness"
    });
  }

  if (source.effectiveState === "STALE") {
    return candidate({
      priority: "P0",
      area: "evidence-freshness",
      sourceId: source.sourceId,
      title: "Refresh expired production-readiness evidence for " + source.sourceId,
      rationale:
        "Expired Build 349 evidence cannot establish current Master Shell acceptance. Re-observe the readiness dimensions and owner decision using fresh evidence.",
      evidence:
        source.sourceId +
        " Build 349 effective state is STALE; latest readiness evidence expired.",
      sourceHref: "/master-production-readiness"
    });
  }

  if (source.effectiveState === "READY_FOR_OWNER") {
    return candidate({
      priority: "P1",
      area: "owner-acceptance",
      sourceId: source.sourceId,
      title: "Complete explicit owner review for " + source.sourceId,
      rationale:
        "All current Build 349 readiness dimensions pass, but no explicit owner acceptance exists. The Master Shell must remain unaccepted until the suite owner records a decision.",
      evidence:
        source.sourceId +
        " is READY_FOR_OWNER in Build 349; owner decision is not-reviewed.",
      sourceHref: "/master-production-readiness"
    });
  }

  return candidate({
    priority: "P1",
    area: "source-readiness",
    sourceId: source.sourceId,
    title: "Close production-readiness HOLD for " + source.sourceId,
    rationale:
      "Build 349 remains HOLD for this source. Preserve the HOLD until missing or blocked readiness evidence is independently resolved; deployment status cannot substitute for that evidence.",
    evidence:
      source.sourceId +
      " Build 349 effective state is HOLD; owner decision is " +
      (source.run?.ownerDecision ?? "missing") +
      ".",
    sourceHref: "/master-production-readiness"
  });
}

function dimensionCandidates(
  source: MasterProductionReadinessModel["sources"][number]
) {
  if (!source.run || source.effectiveState === "ACCEPTED") return [];

  const candidates: ProductionLearningVIIICandidate[] = [];
  for (const assertion of source.run.assertions) {
    if (assertion.outcome === "pass") continue;

    const priority: ProductionLearningVIIIPriority =
      assertion.outcome === "fail" ? "P0" : "P1";

    const area: ProductionLearningVIIIArea =
      assertion.dimension === "operational-recovery"
        ? "recovery"
        : assertion.dimension === "accessibility"
          ? "accessibility"
          : assertion.dimension === "production-safeguards"
            ? "production-safeguards"
            : assertion.dimension === "rollback"
              ? "rollback"
              : "source-readiness";

    candidates.push(
      candidate({
        priority,
        area,
        sourceId: source.sourceId,
        title:
          "Resolve " +
          assertion.dimension +
          " evidence for " +
          source.sourceId,
        rationale:
          "This Build 349 dimension is not PASS and remains part of the current Master Shell acceptance gap. Resolve it at the source-specific authority surface and then record fresh Build 349 evidence.",
        evidence:
          assertion.outcome.toUpperCase() +
          ": " +
          assertion.detail +
          " (" +
          assertion.evidenceURI +
          ")",
        sourceHref: "/master-production-readiness"
      })
    );
  }
  return candidates;
}

export function buildProductionLearningVIII(input: {
  readiness: MasterProductionReadinessModel;
  generatedAt?: Date;
}) {
  const generatedAt = input.generatedAt ?? new Date();

  const sourceOutcomes = MASTER_SHELL_SOURCE_IDS.map((sourceId) => {
    const source = input.readiness.sources.find(
      (item) => item.sourceId === sourceId
    );
    if (!source) {
      throw new Error("production_learning_viii_source_missing");
    }

    return {
      sourceId,
      effectiveState: source.effectiveState,
      ownerDecision: source.run?.ownerDecision ?? "missing",
      readinessVersion: source.run?.readinessVersion ?? null,
      observedAt: source.run?.observedAt ?? null,
      expiresAt: source.run?.expiresAt ?? null,
      commitSha: source.run?.commitSha ?? null
    };
  });

  const sourceGapCandidates = input.readiness.sources
    .map(sourceGapCandidate)
    .filter(
      (item): item is ProductionLearningVIIICandidate => item !== null
    );

  const detailCandidates =
    input.readiness.sources.flatMap(dimensionCandidates);

  const candidates = [...sourceGapCandidates, ...detailCandidates]
    .filter(
      (item, index, all) =>
        all.findIndex(
          (other) =>
            other.title === item.title &&
            other.sourceId === item.sourceId &&
            other.sourceHref === item.sourceHref
        ) === index
    )
    .sort((a, b) => {
      const priority = priorityRank(a.priority) - priorityRank(b.priority);
      if (priority !== 0) return priority;
      return a.title.localeCompare(b.title);
    })
    .slice(0, PRODUCTION_LEARNING_VIII_CANDIDATE_LIMIT);

  const accepted =
    sourceOutcomes.filter((item) => item.effectiveState === "ACCEPTED").length;
  const readyForOwner =
    sourceOutcomes.filter(
      (item) => item.effectiveState === "READY_FOR_OWNER"
    ).length;
  const hold =
    sourceOutcomes.filter((item) => item.effectiveState === "HOLD").length;
  const failed =
    sourceOutcomes.filter((item) => item.effectiveState === "FAIL").length;
  const stale =
    sourceOutcomes.filter((item) => item.effectiveState === "STALE").length;

  const suiteAcceptance =
    accepted === MASTER_SHELL_SOURCE_IDS.length
      ? "ACCEPTED"
      : failed > 0
        ? "FAIL"
        : stale > 0
          ? "STALE"
          : hold > 0
            ? "HOLD"
            : readyForOwner > 0
              ? "READY_FOR_OWNER"
              : "HOLD";

  return {
    schema: PRODUCTION_LEARNING_VIII_SCHEMA,
    build: PRODUCTION_LEARNING_VIII_BUILD,
    closedBatch: "331-350" as const,
    generatedAt: generatedAt.toISOString(),
    sourceOutcomes,
    summary: {
      sources: sourceOutcomes.length,
      accepted,
      readyForOwner,
      hold,
      failed,
      stale,
      unresolvedSources: sourceOutcomes.length - accepted,
      candidateCount: candidates.length,
      suiteAcceptance
    },
    candidates,
    roadmapRenewal: {
      checkpointReached: true as const,
      currentBatchClosed: true as const,
      closedBatch: "331-350" as const,
      finiteCandidateLimit:
        PRODUCTION_LEARNING_VIII_CANDIDATE_LIMIT,
      candidatesAreUnnumbered: true as const,
      candidatesAuthorizeExecution: false as const,
      numberedBuilds351PlusAuthorized: false as const,
      nextBuildNumber: null,
      automaticRoadmapExtension: false as const,
      explicitOwnerAuthorizationRequired: true as const,
      separateAuthorizationAfterBuild350Required: true as const
    },
    acceptance: {
      build349RemainsSourceOfTruth: true as const,
      suiteAcceptanceDerivedFromExactSixSources: true as const,
      allSixAcceptedRequired: true as const,
      deploymentGreenImpliesAcceptance: false as const,
      build350CreatesOwnerAcceptance: false as const
    },
    boundaries: {
      sourceMutationPerformed: false as const,
      peerWritePerformed: false as const,
      connectionActivationPerformed: false as const,
      rollbackExecuted: false as const,
      holdReleased: false as const,
      authorizationChanged: false as const,
      roadmapAuthorized: false as const
    }
  };
}

export type ProductionLearningVIIIModel = ReturnType<
  typeof buildProductionLearningVIII
>;
