import { auth } from "../lib/auth";
import {
  closeDatabasePools,
  listWorkspacesForUser
} from "../lib/database";

async function createUser(name: string, email: string) {
  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password: "Build002-Strong-Test-Password!"
    }
  });

  if (!result.user?.id) {
    throw new Error(`Failed to create integration-test user ${email}`);
  }

  return result.user.id;
}

async function main() {
  const ownerId = await createUser(
    "Build 002 Owner",
    "build002-owner@example.test"
  );

  const restrictedId = await createUser(
    "Build 002 Restricted",
    "build002-restricted@example.test"
  );

  const ownerWorkspaces = await listWorkspacesForUser(ownerId);
  const restrictedWorkspaces = await listWorkspacesForUser(restrictedId);

  const ownerSlugs = ownerWorkspaces.map((workspace) => workspace.slug).sort();

  if (ownerWorkspaces.length !== 3) {
    throw new Error(
      `Expected first user to own 3 workspaces, found ${ownerWorkspaces.length}`
    );
  }

  if (
    ownerSlugs.join(",") !==
    ["devilndove", "personal", "rosiedazzlers"].join(",")
  ) {
    throw new Error(`Unexpected owner workspace set: ${ownerSlugs.join(",")}`);
  }

  if (!ownerWorkspaces.every((workspace) => workspace.role === "owner")) {
    throw new Error("Expected first user to be owner of every initial workspace.");
  }

  if (restrictedWorkspaces.length !== 0) {
    throw new Error(
      "RLS isolation failed: second user could read workspaces without membership."
    );
  }

  console.log("Build 002 database isolation acceptance passed.");
}

async function run() {
  try {
    await main();
  } finally {
    await closeDatabasePools();
  }
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
