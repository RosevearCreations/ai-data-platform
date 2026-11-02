import { buildRetentionCleanupReconciliation } from "./retention-cleanup-reconciliation";
import { buildRetentionGovernanceModel } from "./retention-governance";

export async function buildRetentionCleanupReconciliationForUser(
  userId: string
) {
  return buildRetentionCleanupReconciliation(
    await buildRetentionGovernanceModel(userId)
  );
}
