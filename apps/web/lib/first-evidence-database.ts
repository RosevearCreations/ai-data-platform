import { buildAdoptionReview } from "./adoption-database";
import { buildFirstEvidenceRunbook } from "./first-evidence";
import { buildFirstEvidenceCompletion } from "./first-evidence-completion";
import { buildWorkflowOrchestrationModel } from "./workflow-orchestration";

export async function buildFirstEvidenceReviewForUser(userId: string) {
  const [adoption, orchestration] = await Promise.all([
    buildAdoptionReview(userId),
    buildWorkflowOrchestrationModel(userId)
  ]);
  const runbook = buildFirstEvidenceRunbook(adoption.workspaces);
  const completion = buildFirstEvidenceCompletion(
    runbook.workspaces,
    orchestration.runbooks
  );

  return {
    ...runbook,
    completion
  };
}
