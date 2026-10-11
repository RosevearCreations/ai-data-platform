import { auth } from "../lib/auth";
import { closeDatabasePools, listWorkspacesForUser } from "../lib/database";
import {
  archiveCollectionProject,
  createCollectionProject,
  createCollectionProjectSource,
  listCollectionProjectsForUser,
  retireCollectionProjectSource,
  updateCollectionProject
} from "../lib/collection-project-database";

async function existingUser(email: string) {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password: "build-002-ci-fixture-password-not-a-secret"
    }
  });
  if (!result.user?.id) throw new Error("Build 045 could not reuse the isolation fixture user.");
  return result.user.id;
}

async function main() {
  const ownerId = await existingUser("build002-owner@example.test");
  const outsiderId = await existingUser("build002-restricted@example.test");
  const workspaces = await listWorkspacesForUser(ownerId);
  const workspace = workspaces.find((item) => item.slug === "rosiedazzlers") ?? workspaces[0];
  if (!workspace) throw new Error("Build 045 owner has no seeded workspace.");

  const project = await createCollectionProject(ownerId, workspace.id, {
    name: "Build 045 CI project",
    purpose: "Verify durable collection project isolation.",
    status: "planning",
    cadence: "manual CI",
    ownerLabel: "CI",
    notes: ""
  });

  const source = await createCollectionProjectSource(
    ownerId,
    workspace.id,
    project.projectId,
    {
      displayName: "Example source",
      sourceUrl: "https://example.test/products",
      collectionMethod: "public-webpage",
      sourcePolicyId: "",
      savedScraperId: "",
      cadence: "manual",
      status: "planned",
      notes: ""
    }
  );

  const ownerProjects = await listCollectionProjectsForUser(ownerId);
  const created = ownerProjects.find((item) => item.projectId === project.projectId);
  if (!created || created.sources[0]?.sourceId !== source.sourceId) {
    throw new Error("Build 045 project/source persistence failed.");
  }
  if (created.readiness !== "blocked") {
    throw new Error("Build 045 missing Source Policy did not fail closed.");
  }

  const outsiderProjects = await listCollectionProjectsForUser(outsiderId);
  if (outsiderProjects.some((item) => item.projectId === project.projectId)) {
    throw new Error("Build 045 RLS leaked a collection project cross-account.");
  }

  let outsiderMutationBlocked = false;
  try {
    await updateCollectionProject(outsiderId, workspace.id, project.projectId, {
      name: "Unauthorized edit",
      purpose: "",
      status: "active",
      cadence: "",
      ownerLabel: "",
      notes: ""
    });
  } catch {
    outsiderMutationBlocked = true;
  }
  if (!outsiderMutationBlocked) {
    throw new Error("Build 045 outsider project mutation was not blocked.");
  }

  await retireCollectionProjectSource(
    ownerId,
    workspace.id,
    project.projectId,
    source.sourceId
  );
  await archiveCollectionProject(ownerId, workspace.id, project.projectId);
  const archived = (await listCollectionProjectsForUser(ownerId)).find(
    (item) => item.projectId === project.projectId
  );
  if (archived?.status !== "archived" || archived.sources[0]?.status !== "retired") {
    throw new Error("Build 045 non-destructive archive/retire lifecycle failed.");
  }

  console.log("Build 045 collection project persistence, fail-closed readiness and RLS isolation passed.");
}

main().finally(() => closeDatabasePools());
