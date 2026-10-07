import { auth } from "../lib/auth";
import {
  appendWorkspaceIntelligenceAudit,
  applyWorkspaceSyncMutation,
  closeDatabasePools,
  createExtensionSession,
  listWorkspaceIntelligence,
  listWorkspaceSyncRecords,
  listWorkspacesForUser,
  resolveExtensionSession,
  revokeExtensionSession,
  upsertWorkspaceIntelligenceModule,
  withUserDatabase
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

  const syncWorkspaceId = ownerWorkspaces[0].id;
  const scraperPayload = {
    version: 1,
    id: "build020-scraper",
    workspaceId: syncWorkspaceId,
    kind: "scraper",
    name: "Build 020 sync scraper",
    sourceUrl: "https://example.test/products",
    sourceOrigin: "https://example.test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
    recipe: {
      version: 1,
      name: "Build 020 sync scraper",
      sourceUrl: "https://example.test/products",
      recordSelector: ".product",
      fields: []
    },
    revisions: [],
    lastCheck: null
  };

  const createdSync = await applyWorkspaceSyncMutation(
    ownerId,
    syncWorkspaceId,
    {
      resource: "saved-scraper",
      action: "upsert",
      recordId: scraperPayload.id,
      expectedServerVersion: null,
      clientUpdatedAt: scraperPayload.updatedAt,
      payload: scraperPayload,
      kind: "scraper",
      name: scraperPayload.name,
      sourceUrl: scraperPayload.sourceUrl,
      sourceOrigin: scraperPayload.sourceOrigin
    }
  );

  if (
    createdSync.status !== "applied" ||
    createdSync.record?.serverVersion !== 1
  ) {
    throw new Error("Build 020 failed to create a versioned saved scraper.");
  }

  const conflictSync = await applyWorkspaceSyncMutation(
    ownerId,
    syncWorkspaceId,
    {
      resource: "saved-scraper",
      action: "upsert",
      recordId: scraperPayload.id,
      expectedServerVersion: 99,
      clientUpdatedAt: new Date().toISOString(),
      payload: { ...scraperPayload, name: "Conflicting local edit" },
      kind: "scraper",
      name: "Conflicting local edit",
      sourceUrl: scraperPayload.sourceUrl,
      sourceOrigin: scraperPayload.sourceOrigin
    }
  );

  if (
    conflictSync.status !== "conflict" ||
    conflictSync.record?.serverVersion !== 1
  ) {
    throw new Error("Build 020 optimistic concurrency conflict was not detected.");
  }

  const updatedAt = new Date().toISOString();
  const updatedSync = await applyWorkspaceSyncMutation(
    ownerId,
    syncWorkspaceId,
    {
      resource: "saved-scraper",
      action: "upsert",
      recordId: scraperPayload.id,
      expectedServerVersion: 1,
      clientUpdatedAt: updatedAt,
      payload: {
        ...scraperPayload,
        name: "Build 020 updated scraper",
        updatedAt
      },
      kind: "scraper",
      name: "Build 020 updated scraper",
      sourceUrl: scraperPayload.sourceUrl,
      sourceOrigin: scraperPayload.sourceOrigin
    }
  );

  if (
    updatedSync.status !== "applied" ||
    updatedSync.record?.serverVersion !== 2
  ) {
    throw new Error("Build 020 versioned saved-scraper update failed.");
  }

  const datasetUpdatedAt = new Date().toISOString();
  const datasetPayload = {
    version: 1,
    id: "build020-review",
    workspaceId: syncWorkspaceId,
    recipeName: "Build 020 review",
    sourceUrl: "https://example.test/products",
    createdAt: datasetUpdatedAt,
    updatedAt: datasetUpdatedAt,
    retrievedAt: datasetUpdatedAt,
    columns: [],
    rows: [
      {
        id: "row-0",
        sourceIndex: 0,
        included: true,
        values: { name: "Example" },
        warnings: [],
        editedKeys: []
      }
    ],
    stats: {
      totalRows: 1,
      includedRows: 1,
      excludedRows: 0,
      visibleColumns: 0,
      droppedColumns: 0,
      editedCells: 0,
      warningRows: 0
    }
  };

  const datasetSync = await applyWorkspaceSyncMutation(
    ownerId,
    syncWorkspaceId,
    {
      resource: "reviewed-dataset",
      action: "upsert",
      recordId: datasetPayload.id,
      expectedServerVersion: null,
      clientUpdatedAt: datasetUpdatedAt,
      payload: datasetPayload,
      recipeName: datasetPayload.recipeName,
      sourceUrl: datasetPayload.sourceUrl,
      retrievedAt: datasetPayload.retrievedAt,
      rowCount: datasetPayload.rows.length
    }
  );

  if (
    datasetSync.status !== "applied" ||
    datasetSync.record?.serverVersion !== 1
  ) {
    throw new Error("Build 020 reviewed-dataset persistence failed.");
  }

  const syncedRecords = await listWorkspaceSyncRecords(
    ownerId,
    syncWorkspaceId
  );
  if (
    !syncedRecords.some(
      (record) =>
        record.resource === "saved-scraper" &&
        record.recordId === scraperPayload.id
    ) ||
    !syncedRecords.some(
      (record) =>
        record.resource === "reviewed-dataset" &&
        record.recordId === datasetPayload.id
    )
  ) {
    throw new Error("Build 020 cross-device retrieval query missed persisted records.");
  }

  let restrictedDenied = false;
  try {
    await listWorkspaceSyncRecords(restrictedId, syncWorkspaceId);
  } catch (error) {
    restrictedDenied =
      error instanceof Error &&
      error.message === "workspace_access_denied";
  }

  if (!restrictedDenied) {
    throw new Error(
      "Build 020 RLS isolation failed: restricted user reached workspace sync records."
    );
  }

  const deletedSync = await applyWorkspaceSyncMutation(
    ownerId,
    syncWorkspaceId,
    {
      resource: "saved-scraper",
      action: "delete",
      recordId: scraperPayload.id,
      expectedServerVersion: 2,
      clientUpdatedAt: new Date().toISOString(),
      payload: null,
      kind: "scraper",
      name: "",
      sourceUrl: "",
      sourceOrigin: ""
    }
  );

  if (
    deletedSync.status !== "applied" ||
    !deletedSync.record?.deleted ||
    deletedSync.record.serverVersion !== 3
  ) {
    throw new Error("Build 020 tombstone synchronization failed.");
  }

  const intelligenceUpdatedAt = new Date().toISOString();
  const createdIntelligence = await upsertWorkspaceIntelligenceModule(
    ownerId,
    syncWorkspaceId,
    {
      moduleKey: "history",
      expectedServerVersion: null,
      clientUpdatedAt: intelligenceUpdatedAt,
      summary: { series: 1, pendingReview: 1 },
      payload: {
        version: 1,
        series: [
          {
            version: 1,
            id: "build021-history",
            workspaceId: syncWorkspaceId,
            seriesKey: "build021::history",
            recipeName: "Build 021",
            sourceUrl: "https://example.test/history",
            sourceScope: "https://example.test/history",
            identityKey: "id",
            createdAt: intelligenceUpdatedAt,
            updatedAt: intelligenceUpdatedAt,
            latestVersion: 1,
            snapshots: [],
            changes: [],
            lastSummary: {
              version: 1,
              capturedAt: intelligenceUpdatedAt,
              records: 0,
              added: 0,
              removed: 0,
              changed: 0,
              unchanged: 0,
              pendingQueue: 0
            }
          }
        ]
      }
    }
  );

  if (
    createdIntelligence.status !== "applied" ||
    createdIntelligence.record.serverVersion !== 1
  ) {
    throw new Error("Build 021 intelligence module creation failed.");
  }

  const intelligenceConflict = await upsertWorkspaceIntelligenceModule(
    ownerId,
    syncWorkspaceId,
    {
      moduleKey: "history",
      expectedServerVersion: 99,
      clientUpdatedAt: new Date().toISOString(),
      summary: { series: 2 },
      payload: { version: 1, series: [] }
    }
  );

  if (
    intelligenceConflict.status !== "conflict" ||
    intelligenceConflict.record.serverVersion !== 1
  ) {
    throw new Error("Build 021 intelligence concurrency conflict was not detected.");
  }

  const updatedIntelligence = await upsertWorkspaceIntelligenceModule(
    ownerId,
    syncWorkspaceId,
    {
      moduleKey: "history",
      expectedServerVersion: 1,
      clientUpdatedAt: new Date().toISOString(),
      summary: { series: 1, pendingReview: 0 },
      payload: { version: 1, series: [] }
    }
  );

  if (
    updatedIntelligence.status !== "applied" ||
    updatedIntelligence.record.serverVersion !== 2
  ) {
    throw new Error("Build 021 intelligence module versioning failed.");
  }

  const auditEntry = {
    auditId: "build021-audit",
    batchId: "build021-batch",
    target: "rosie-dazzlers" as const,
    action: "approved" as const,
    occurredAt: new Date().toISOString(),
    fingerprint: "build021-fingerprint",
    details: "Build 021 append-only audit acceptance.",
    payload: { version: 1, evidence: "approved" }
  };

  const insertedAudit = await appendWorkspaceIntelligenceAudit(
    ownerId,
    syncWorkspaceId,
    [auditEntry]
  );
  const duplicateAudit = await appendWorkspaceIntelligenceAudit(
    ownerId,
    syncWorkspaceId,
    [auditEntry]
  );

  if (insertedAudit !== 1 || duplicateAudit !== 0) {
    throw new Error("Build 021 append-only audit idempotency failed.");
  }

  const intelligenceState = await listWorkspaceIntelligence(
    ownerId,
    syncWorkspaceId
  );
  if (
    !intelligenceState.modules.some(
      (item) => item.moduleKey === "history" && item.serverVersion === 2
    ) ||
    !intelligenceState.audit.some(
      (item) => item.auditId === auditEntry.auditId
    )
  ) {
    throw new Error("Build 021 durable intelligence retrieval failed.");
  }

  let intelligenceDenied = false;
  try {
    await listWorkspaceIntelligence(restrictedId, syncWorkspaceId);
  } catch (error) {
    intelligenceDenied =
      error instanceof Error &&
      error.message === "workspace_access_denied";
  }
  if (!intelligenceDenied) {
    throw new Error(
      "Build 021 RLS isolation failed: restricted user reached intelligence state."
    );
  }

  let auditImmutable = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        "update app.workspace_intelligence_audit set details = 'changed' where workspace_id = $1",
        [syncWorkspaceId]
      );
    });
  } catch {
    auditImmutable = true;
  }
  if (!auditImmutable) {
    throw new Error("Build 021 audit table unexpectedly allowed runtime updates.");
  }

  console.log(
    "Build 002/019/020/021 database isolation, workspace sync and intelligence continuity acceptance passed."
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
