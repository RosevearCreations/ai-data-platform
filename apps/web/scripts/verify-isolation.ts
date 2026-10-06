import { auth } from "../lib/auth";
import {
  closeDatabasePools,
  createExtensionSession,
  listWorkspacesForUser,
  resolveExtensionSession,
  revokeExtensionSession
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

  const extensionId = "a".repeat(32);
  const ownerTokenHash = "1".repeat(64);
  const restrictedTokenHash = "2".repeat(64);
  const expiredTokenHash = "3".repeat(64);

  await createExtensionSession({
    userId: ownerId,
    tokenHash: ownerTokenHash,
    extensionId,
    expiresAt: new Date(Date.now() + 60_000)
  });
  await createExtensionSession({
    userId: restrictedId,
    tokenHash: restrictedTokenHash,
    extensionId,
    expiresAt: new Date(Date.now() + 60_000)
  });
  await createExtensionSession({
    userId: ownerId,
    tokenHash: expiredTokenHash,
    extensionId,
    expiresAt: new Date(Date.now() - 60_000)
  });

  const ownerPrincipal = await resolveExtensionSession(ownerTokenHash);
  if (!ownerPrincipal || ownerPrincipal.userId !== ownerId) {
    throw new Error("Build 019 extension session did not resolve the owner.");
  }

  const ownerBridgeWorkspaces = await listWorkspacesForUser(ownerPrincipal.userId);
  if (ownerBridgeWorkspaces.length !== 3) {
    throw new Error("Build 019 owner bridge did not preserve workspace membership.");
  }

  const restrictedPrincipal = await resolveExtensionSession(restrictedTokenHash);
  if (!restrictedPrincipal) {
    throw new Error("Build 019 restricted extension session did not resolve.");
  }

  const restrictedBridgeWorkspaces = await listWorkspacesForUser(
    restrictedPrincipal.userId
  );
  if (restrictedBridgeWorkspaces.length !== 0) {
    throw new Error(
      "Build 019 bridge isolation failed: restricted user received an unauthorized workspace."
    );
  }

  if (await resolveExtensionSession(expiredTokenHash)) {
    throw new Error("Build 019 expired extension session remained valid.");
  }

  await revokeExtensionSession(ownerTokenHash);
  if (await resolveExtensionSession(ownerTokenHash)) {
    throw new Error("Build 019 revoked extension session remained valid.");
  }

  console.log(
    "Build 002/019 database isolation and extension-session acceptance passed."
  );
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
