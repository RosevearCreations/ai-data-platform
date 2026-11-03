import { buildAdoptionReview } from "./adoption-database";
import { buildLeastPrivilegeAdoptionReview } from "./least-privilege-adoption-review";
import { buildSecurityAccessReview } from "./security-access-review";

export async function buildLeastPrivilegeAdoptionReviewForUser(userId: string) {
  const [adoption, security] = await Promise.all([
    buildAdoptionReview(userId),
    buildSecurityAccessReview(userId)
  ]);

  return buildLeastPrivilegeAdoptionReview({ adoption, security });
}
