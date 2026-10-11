import { buildAdoptionReview } from "./adoption-database";
import { buildFirstEvidenceRunbook } from "./first-evidence";

export async function buildFirstEvidenceReviewForUser(userId: string) {
  const adoption = await buildAdoptionReview(userId);
  return buildFirstEvidenceRunbook(adoption.workspaces);
}
