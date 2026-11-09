import {
  composeModuleHealthIntelligence
} from "./module-health-intelligence";
import {
  listMasterApplicationInventoryForUser
} from "./master-application-inventory-database";

export async function listModuleHealthIntelligenceForUser(
  userId: string,
  now = new Date()
) {
  const inventory = await listMasterApplicationInventoryForUser(userId, now);
  return {
    ...composeModuleHealthIntelligence({
      inventory,
      now
    }),
    inventoryEvidence: {
      schema: inventory.schema,
      build: inventory.build,
      generatedAt: inventory.generatedAt,
      applications: inventory.summary.applications,
      modules: inventory.summary.modules
    }
  };
}
