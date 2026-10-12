import { auth } from "../lib/auth";
import { closeDatabasePools } from "../lib/database";
import {
  listVisualRecipesForUser,
  saveVisualRecipe
} from "../lib/recipe-builder-database";

async function existingUser(email: string) {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password: "build-002-ci-fixture-password-not-a-secret"
    }
  });
  if (!result.user?.id) throw new Error("Build 046 could not reuse the isolation fixture user.");
  return result.user.id;
}

async function main() {
  const ownerId = await existingUser("build002-owner@example.test");
  const outsiderId = await existingUser("build002-restricted@example.test");
  const ownerLibrary = await listVisualRecipesForUser(ownerId);
  const workspace = ownerLibrary.workspaces.find((item) => item.slug === "rosiedazzlers")
    ?? ownerLibrary.workspaces[0];
  if (!workspace) throw new Error("Build 046 owner has no seeded workspace.");

  const first = await saveVisualRecipe(ownerId, {
    workspaceId: workspace.id,
    kind: "template",
    recipe: {
      version: 1,
      name: "Build 046 CI recipe",
      sourceUrl: "",
      recordSelector: ".product",
      fields: [
        {
          id: "name",
          key: "name",
          label: "Name",
          selector: "h2",
          source: "text",
          attribute: "",
          required: true,
          transforms: ["trim", "collapse-whitespace"]
        }
      ]
    }
  });
  if (first.status !== "saved" || !first.recordId || first.revision !== 1) {
    throw new Error("Build 046 initial synchronized recipe save failed.");
  }

  const ownerAfterCreate = await listVisualRecipesForUser(ownerId);
  const created = ownerAfterCreate.recipes.find((item) => item.recordId === first.recordId);
  if (!created || created.recipe.fields[0]?.key !== "name") {
    throw new Error("Build 046 synchronized recipe was not readable by its workspace owner.");
  }

  const outsiderLibrary = await listVisualRecipesForUser(outsiderId);
  if (outsiderLibrary.recipes.some((item) => item.recordId === first.recordId)) {
    throw new Error("Build 046 recipe leaked across workspace RLS.");
  }

  let outsiderBlocked = false;
  try {
    await saveVisualRecipe(outsiderId, {
      workspaceId: workspace.id,
      kind: "template",
      recipe: created.recipe
    });
  } catch {
    outsiderBlocked = true;
  }
  if (!outsiderBlocked) {
    throw new Error("Build 046 outsider write to another workspace was not blocked.");
  }

  const second = await saveVisualRecipe(ownerId, {
    workspaceId: workspace.id,
    recordId: first.recordId,
    expectedServerVersion: first.serverVersion,
    kind: "template",
    recipe: {
      ...created.recipe,
      name: "Build 046 CI recipe revised",
      fields: [
        ...created.recipe.fields,
        {
          id: "price",
          key: "price",
          label: "Price",
          selector: ".price",
          source: "text",
          attribute: "",
          required: false,
          transforms: ["trim", "currency"]
        }
      ]
    }
  });
  if (second.status !== "saved" || second.revision !== 2) {
    throw new Error("Build 046 recipe revision save failed.");
  }

  const stale = await saveVisualRecipe(ownerId, {
    workspaceId: workspace.id,
    recordId: first.recordId,
    expectedServerVersion: first.serverVersion,
    kind: "template",
    recipe: created.recipe
  });
  if (stale.status !== "conflict") {
    throw new Error("Build 046 stale recipe revision did not conflict.");
  }

  console.log("Build 046 synchronized recipe revisions, conflict handling and RLS isolation passed.");
}

main().finally(() => closeDatabasePools());
