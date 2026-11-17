import { randomUUID } from "node:crypto";

import { withUserDatabase } from "./database";
import {
  BUILD_410_SERVER_MODULE_IDS,
  BUILD_410_THEME_PROFILE_IDS,
  type Build410ServerModuleId,
  type Build410ThemeProfileId
} from "./master-sensitive-data-dlp-server-shell";

function isModule(value: string): value is Build410ServerModuleId {
  return (BUILD_410_SERVER_MODULE_IDS as readonly string[]).includes(value);
}
function isTheme(value: string): value is Build410ThemeProfileId {
  return (BUILD_410_THEME_PROFILE_IDS as readonly string[]).includes(value);
}

export async function recordBuild413ThemeSelection(
  userId: string,
  input: { moduleId: string; profileId: string; backgroundSlot: string }
) {
  if (!isModule(input.moduleId)) throw new Error("build413_module_invalid");
  if (!isTheme(input.profileId)) throw new Error("build413_theme_invalid");
  const backgroundSlot = input.backgroundSlot.trim();
  if (backgroundSlot.length > 120 || /[\u0000-\u001f\u007f]/.test(backgroundSlot)) {
    throw new Error("build413_background_slot_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const role = await client.query<{ role: "owner" | "operator" | null }>(
      "select app.current_master_sysop_role() as role"
    );
    if (role.rows[0]?.role !== "owner") throw new Error("build413_owner_required");

    const selectionId = randomUUID();
    await client.query(
      `insert into app.master_build413_theme_selection_events (
        selection_id,module_id,profile_id,background_slot,owner_user_id,
        semantic_status_meaning_immutable,security_state_visible
      ) values ($1,$2,$3,$4,$5,true,true)`,
      [selectionId, input.moduleId, input.profileId, backgroundSlot, userId]
    );

    return {
      selectionId,
      moduleId: input.moduleId,
      profileId: input.profileId,
      backgroundSlot,
      semanticStatusMeaningImmutable: true,
      securityStateVisible: true
    };
  });
}
