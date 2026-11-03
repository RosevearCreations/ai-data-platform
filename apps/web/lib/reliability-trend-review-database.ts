import { buildProductionLearningReview } from "./production-learning-database";
import { buildReliabilityTrendReview } from "./reliability-trend-review";
import { buildSystemReliabilityDashboard } from "./system-reliability";

export async function buildReliabilityTrendReviewForUser(userId: string) {
  const [learning, reliability] = await Promise.all([
    buildProductionLearningReview(userId),
    buildSystemReliabilityDashboard(userId)
  ]);

  return buildReliabilityTrendReview({
    evidence: learning.evidence,
    reliability
  });
}
