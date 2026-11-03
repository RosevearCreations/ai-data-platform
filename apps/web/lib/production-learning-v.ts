import type {
  ProductionEvidenceBaselineItem,
  ProductionEvidenceBaselineModel
} from "./production-evidence-baseline";
import type { ProductionLearningFinding } from "./production-learning";
import type { ReliabilityTrendReview } from "./reliability-trend-review";

export type ProductionLearningVCriterionState = "closed" | "blocked" | "open";
export type ProductionLearningVFindingState =
  | "closed"
  | "blocked"
  | "open"
  | "historical-removed";

export type ProductionLearningVCriterion = {
  build: 273 | 274 | 275 | 276 | 277 | 278 | 279;
  title: string;
  state: ProductionLearningVCriterionState;
  criterion: string;
  evidence: string;
  href: string;
  blocker: string | null;
};

export type ProductionLearningVFinding = {
  id: string;
  title: string;
  state: ProductionLearningVFindingState;
  source: string;
  evidence: string;
  action: string;
  targetBuild: number | null;
  href: string;
};

export type ProductionLearningVRenewalCandidate = {
  key: string;
  sourceBuild: number | null;
  title: string;
  rationale: string;
  evidence: string;
  href: string;
};

export type ProductionLearningVReview = {
  schema: "ai-data-platform.production-learning-v.v1";
  build: 280;
  generatedAt: string;
  batch: "273-280";
  summary: {
    criteriaClosed: number;
    criteriaBlocked: number;
    criteriaOpen: number;
    findingsClosed: number;
    findingsBlocked: number;
    findingsOpen: number;
    historicalRemoved: number;
    renewalCandidates: number;
  };
  criteria: ProductionLearningVCriterion[];
  findings: ProductionLearningVFinding[];
  renewalCandidates: ProductionLearningVRenewalCandidate[];
  ownerAcceptance: {
    state: "review-required";
    productionAcceptedAutomatically: false;
    explicitOwnerDecisionRequired: true;
    deploymentIsNotAcceptance: true;
  };
  roadmapRenewal: {
    numberedNextBatchAuthorized: false;
    nextBuildNumber: null;
    candidatesFromMeasuredEvidenceOnly: true;
    ownerAuthorizationRequired: true;
  };
  exitCriterion: {
    met: boolean;
    label: string;
    evidence: string;
  };
  boundaries: {
    syntheticEvidenceCreated: false;
    staleHistoricalItemsRequeued: false;
    externalAuthorizationInferred: false;
    automaticPermissionChanges: false;
    automaticNumberedNextBatch: false;
  };
};

function textForItem(item: ProductionEvidenceBaselineItem) {
  return [item.title, item.evidence, item.action, item.status].join(" ").toLowerCase();
}

function isExplicitBlocker(text: string) {
  return [
    "blocked",
    "authorization",
    "not authorized",
    "disconnected",
    "not configured",
    "not available",
    "unavailable",
    "not enabled",
    "missing prerequisite",
    "requires owner",
    "source policy",
    "review deferred",
    "held"
  ].some((token) => text.includes(token));
}

function criterionState(
  build: number,
  met: boolean,
  baseline: ProductionEvidenceBaselineModel
): { state: ProductionLearningVCriterionState; blocker: string | null } {
  if (met) return { state: "closed", blocker: null };

  const related = baseline.items.filter(
    (item) => item.disposition === "active" && item.targetBuild === build
  );
  const blocker = related.find((item) => isExplicitBlocker(textForItem(item)));
  if (blocker) {
    return {
      state: "blocked",
      blocker: blocker.title + ": " + blocker.evidence
    };
  }
  return { state: "open", blocker: null };
}

function findingState(item: ProductionEvidenceBaselineItem): ProductionLearningVFindingState {
  if (item.disposition === "historical") return "historical-removed";
  if (item.disposition === "validated") return "closed";
  return isExplicitBlocker(textForItem(item)) ? "blocked" : "open";
}

export function buildProductionLearningVReview(input: {
  baseline: ProductionEvidenceBaselineModel;
  reliabilityTrend: ReliabilityTrendReview;
  findings: ProductionLearningFinding[];
}): ProductionLearningVReview {
  const criteria: ProductionLearningVCriterion[] = [
    {
      build: 273,
      title: "Production Evidence Baseline & Owner Finding Triage",
      state: "closed",
      criterion:
        "A finite 273–280 evidence baseline exists with active, validated and historical findings separated and measurable exit criteria for Builds 274–279.",
      evidence:
        input.baseline.counts.total +
        " baseline item(s); " +
        input.baseline.counts.active +
        " active, " +
        input.baseline.counts.validated +
        " validated and " +
        input.baseline.counts.historical +
        " historical.",
      href: "/evidence-baseline",
      blocker: null
    },
    ...input.baseline.exitCriteria.map((criterion) => {
      const effectiveMet =
        criterion.build === 279
          ? input.reliabilityTrend.exitCriterion.met
          : criterion.met;
      const classification = criterionState(
        criterion.build,
        effectiveMet,
        input.baseline
      );
      return {
        build: criterion.build,
        title: criterion.title,
        state: classification.state,
        criterion:
          criterion.build === 279
            ? input.reliabilityTrend.exitCriterion.label
            : criterion.criterion,
        evidence:
          criterion.build === 279
            ? input.reliabilityTrend.exitCriterion.evidence
            : criterion.currentEvidence,
        href: criterion.href,
        blocker: classification.blocker
      };
    })
  ];

  const findings: ProductionLearningVFinding[] = input.baseline.items.map((item) => ({
    id: item.id,
    title: item.title,
    state: findingState(item),
    source: item.source,
    evidence: item.evidence,
    action:
      item.disposition === "historical"
        ? "Removed from the active operating queue; retain only as historical context unless fresh measured evidence reactivates it."
        : item.action,
    targetBuild: item.targetBuild,
    href: item.href
  }));

  const unresolvedCriteria = criteria.filter((item) => item.state !== "closed");
  const candidates: ProductionLearningVRenewalCandidate[] = unresolvedCriteria.map(
    (criterion) => ({
      key: "criterion:" + String(criterion.build),
      sourceBuild: criterion.build,
      title:
        criterion.state === "blocked"
          ? "Resolve Build " + String(criterion.build) + " dependency before renewal"
          : "Close remaining Build " + String(criterion.build) + " measured evidence gap",
      rationale:
        criterion.state === "blocked"
          ? "The prior-cycle criterion remains dependency-blocked and must not be converted into a pass by deployment."
          : "Current measured evidence does not yet satisfy the prior-cycle exit criterion.",
      evidence: criterion.blocker ?? criterion.evidence,
      href: criterion.href
    })
  );

  const knownCandidateKeys = new Set(candidates.map((item) => item.sourceBuild));
  for (const finding of input.findings) {
    if (finding.status === "healthy") continue;
    const baselineItem = input.baseline.items.find(
      (item) => item.id === "learning:" + finding.key
    );
    if (baselineItem?.targetBuild && knownCandidateKeys.has(baselineItem.targetBuild)) {
      continue;
    }
    candidates.push({
      key: "learning:" + finding.key,
      sourceBuild: baselineItem?.targetBuild ?? null,
      title: finding.title,
      rationale: finding.action,
      evidence: finding.evidence,
      href: "/production-learning"
    });
  }

  const dedupedCandidates = candidates.filter(
    (candidate, index, all) =>
      all.findIndex((other) => other.key === candidate.key) === index
  );

  const summary = {
    criteriaClosed: criteria.filter((item) => item.state === "closed").length,
    criteriaBlocked: criteria.filter((item) => item.state === "blocked").length,
    criteriaOpen: criteria.filter((item) => item.state === "open").length,
    findingsClosed: findings.filter((item) => item.state === "closed").length,
    findingsBlocked: findings.filter((item) => item.state === "blocked").length,
    findingsOpen: findings.filter((item) => item.state === "open").length,
    historicalRemoved: findings.filter(
      (item) => item.state === "historical-removed"
    ).length,
    renewalCandidates: dedupedCandidates.length
  };

  const reconciliationComplete =
    criteria.length === 7 &&
    criteria.every((item) =>
      ["closed", "blocked", "open"].includes(item.state)
    ) &&
    findings.every((item) =>
      ["closed", "blocked", "open", "historical-removed"].includes(item.state)
    );

  return {
    schema: "ai-data-platform.production-learning-v.v1",
    build: 280,
    generatedAt: input.baseline.generatedAt,
    batch: "273-280",
    summary,
    criteria,
    findings,
    renewalCandidates: dedupedCandidates,
    ownerAcceptance: {
      state: "review-required",
      productionAcceptedAutomatically: false,
      explicitOwnerDecisionRequired: true,
      deploymentIsNotAcceptance: true
    },
    roadmapRenewal: {
      numberedNextBatchAuthorized: false,
      nextBuildNumber: null,
      candidatesFromMeasuredEvidenceOnly: true,
      ownerAuthorizationRequired: true
    },
    exitCriterion: {
      met:
        reconciliationComplete &&
        dedupedCandidates.every((item) => Boolean(item.evidence)) &&
        criteria[0]?.state === "closed",
      label:
        "The 273–280 cycle is fully reconciled: every Build 273–279 criterion is classified from current evidence, stale historical findings are removed from the active queue, and any next-batch candidates are unnumbered and evidence-backed pending explicit owner authorization.",
      evidence:
        summary.criteriaClosed +
        " closed, " +
        summary.criteriaBlocked +
        " blocked and " +
        summary.criteriaOpen +
        " open criterion/criteria; " +
        summary.historicalRemoved +
        " historical finding(s) removed from the active queue; " +
        summary.renewalCandidates +
        " unnumbered renewal candidate(s)."
    },
    boundaries: {
      syntheticEvidenceCreated: false,
      staleHistoricalItemsRequeued: false,
      externalAuthorizationInferred: false,
      automaticPermissionChanges: false,
      automaticNumberedNextBatch: false
    }
  };
}
