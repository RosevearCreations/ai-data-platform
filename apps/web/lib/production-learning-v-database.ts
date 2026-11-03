import { buildHardeningAudit } from "./hardening-audit";
import { buildOperatorAttentionCenter } from "./operator-attention";
import { buildProductionEvidenceBaseline } from "./production-evidence-baseline";
import { buildProductionLearningReview } from "./production-learning-database";
import { buildProductionLearningVReview } from "./production-learning-v";
import { buildReliabilityTrendReview } from "./reliability-trend-review";
import { buildSystemReliabilityDashboard } from "./system-reliability";

export async function buildProductionLearningVReviewForUser(userId: string) {
  const [review, reliability, attention] = await Promise.all([
    buildProductionLearningReview(userId),
    buildSystemReliabilityDashboard(userId),
    buildOperatorAttentionCenter(userId)
  ]);
  const hardening = buildHardeningAudit();

  const baseline = buildProductionEvidenceBaseline({
    findings: review.findings,
    renewalGaps: review.renewal.evidenceGaps,
    adoption: review.evidence.adoption,
    trend: review.evidence.trend,
    workspaces: review.evidence.workspaces,
    hardeningItems: hardening.items,
    reliabilitySignals: reliability.signals,
    reliabilityTotals: reliability.totals,
    attentionItems: attention.items,
    attentionCounts: attention.counts
  });

  const reliabilityTrend = buildReliabilityTrendReview({
    evidence: review.evidence,
    reliability
  });

  return buildProductionLearningVReview({
    baseline,
    reliabilityTrend,
    findings: review.findings
  });
}
