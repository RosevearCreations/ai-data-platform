import { auth } from "../lib/auth";
import {
  barcodeProvenance,
  matchBarcodeAgainstIntelligence,
  normalizeBarcode
} from "../lib/barcodes";
import {
  appendWorkspaceIntelligenceAudit,
  applyWorkspaceSyncMutation,
  createWorkspaceBarcodeCapture,
  closeDatabasePools,
  createExtensionSession,
  listWorkspaceBarcodeCaptures,
  listWorkspaceIntelligence,
  listWorkspaceSyncRecords,
  listWorkspacesForUser,
  resolveExtensionSession,
  reviewWorkspaceBarcodeCapture,
  revokeExtensionSession,
  upsertWorkspaceIntelligenceModule,
  withUserDatabase
} from "../lib/database";
import {
  completeWorkspaceRemoteExecutionJob,
  createWorkspaceRemoteExecutionJob,
  enqueueWorkspaceRemoteExecutionJob,
  expireWorkspaceRemoteExecutionJob,
  heartbeatWorkspaceRemoteExecutionJob,
  leaseWorkspaceRemoteExecutionJob,
  listWorkspaceRemoteExecutionJobs,
  requestWorkspaceRemoteExecutionCancellation
} from "../lib/remote-execution-database";
import {
  appendRemotePilotEvent,
  assertRemotePilotAuthorized,
  listWorkspaceRemotePilotState,
  releaseRemotePilotSlot,
  reserveRemotePilotSlot,
  setRemotePilotControl,
  upsertRemotePilotAllowlist
} from "../lib/remote-pilot-database";
import {
  configureWorkspaceConnector,
  executeWorkspaceConnector,
  listConnectorOverviewForUser,
  setWorkspaceConnectorEnabled
} from "../lib/connector-database";
import {
  archiveCustomWorkspaceProfile,
  archiveWorkspace,
  createCustomWorkspaceProfile,
  createWorkspaceFromProfile,
  listWorkspaceProfilesForUser,
  updateCustomWorkspaceProfile,
  updateWorkspaceMetadata
} from "../lib/workspace-profile-database";

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

  const initialProfiles = await listWorkspaceProfilesForUser(ownerId);
  const initialProfileKeys = new Set(initialProfiles.map((profile) => profile.profileKey));
  for (const key of ["rosie-detailing","maker-commerce","personal-media","generic-business","generic-personal"]) {
    if (!initialProfileKeys.has(key)) throw new Error("Build 028 missing built-in profile: " + key);
  }
  const profileBySlug = new Map(ownerWorkspaces.map((workspace) => [workspace.slug, workspace.profileKey]));
  if (
    profileBySlug.get("rosiedazzlers") !== "rosie-detailing" ||
    profileBySlug.get("devilndove") !== "maker-commerce" ||
    profileBySlug.get("personal") !== "personal-media"
  ) {
    throw new Error("Build 028 seeded workspace profile migration failed.");
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

  const policyUpdatedAt = new Date().toISOString();
  const sourcePolicy = await upsertWorkspaceIntelligenceModule(
    ownerId,
    syncWorkspaceId,
    {
      moduleKey: "source-policy",
      expectedServerVersion: null,
      clientUpdatedAt: policyUpdatedAt,
      summary: {
        sources: 1,
        approved: 1,
        blocked: 0,
        reviewRequired: 0,
        expired: 0
      },
      payload: {
        version: 1,
        id: "ai-data-platform-source-policy-registry",
        createdAt: policyUpdatedAt,
        updatedAt: policyUpdatedAt,
        entries: [
          {
            version: 1,
            id: "build025-source-policy",
            workspaceId: syncWorkspaceId,
            origin: "https://example.test",
            displayName: "Build 025 fixture",
            purpose: "Verify durable workspace-scoped source policy persistence.",
            collectionMethod: "public-webpage",
            publicOrAuthorized: true,
            termsReviewed: true,
            termsUrl: "https://example.test/terms",
            robotsDecision: "allowed",
            robotsUrl: "https://example.test/robots.txt",
            noAccessControlBypass: true,
            dataSensitivity: "public-facts",
            minimumDelayMs: 1500,
            maxPagesPerRun: 10,
            maxRecordsPerRun: 500,
            reviewExpiresAt: "2027-01-01T00:00:00.000Z",
            status: "approved",
            notes: "CI fixture.",
            revision: 1,
            fingerprint: "sp1-build025",
            createdAt: policyUpdatedAt,
            updatedAt: policyUpdatedAt
          }
        ]
      }
    }
  );

  if (
    sourcePolicy.status !== "applied" ||
    sourcePolicy.record.moduleKey !== "source-policy"
  ) {
    throw new Error("Build 025 source-policy module persistence failed.");
  }

  const intelligenceState = await listWorkspaceIntelligence(
    ownerId,
    syncWorkspaceId
  );
  if (
    !intelligenceState.modules.some(
      (item) => item.moduleKey === "history" && item.serverVersion === 2
    ) ||
    !intelligenceState.modules.some(
      (item) => item.moduleKey === "source-policy" && item.serverVersion === 1
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


  const priorRemoteExecutionFlag =
    process.env.REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED;
  const remoteJobId = "26000000-0000-4000-8000-000000000001";
  const remoteTimeoutJobId = "26000000-0000-4000-8000-000000000002";
  const remoteCancelledJobId = "26000000-0000-4000-8000-000000000003";

  const remotePrepared = await createWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteJobId,
    savedScraperId: "build026-scraper",
    providerKey: "mock",
    sourceUrl: "https://example.test/catalog",
    sourcePolicyPin: {
      policyId: "build025-source-policy",
      policyRevision: 1,
      policyFingerprint: "sp1-build025"
    },
    requestedBudget: {
      maxPages: 3,
      maxRecords: 25,
      maxRuntimeSeconds: 60,
      minimumDelayMs: 1000
    }
  });
  if (
    remotePrepared.status !== "prepared" ||
    remotePrepared.sourcePolicyFingerprint !== "sp1-build025" ||
    remotePrepared.budget.minimumDelayMs !== 1500
  ) {
    throw new Error("Build 026 remote preparation/policy copy failed.");
  }

  delete process.env.REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED;
  let remoteDisabled = false;
  try {
    await enqueueWorkspaceRemoteExecutionJob(ownerId, syncWorkspaceId, remoteJobId);
  } catch (error) {
    remoteDisabled = error instanceof Error &&
      error.message === "remote_provider_execution_disabled";
  }
  if (!remoteDisabled) {
    throw new Error("Build 026 provider execution was not disabled by default.");
  }

  process.env.REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED = "true";
  await enqueueWorkspaceRemoteExecutionJob(ownerId, syncWorkspaceId, remoteJobId);
  const leasedRemote = await leaseWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteJobId,
    workerId: "mock-ci",
    leaseSeconds: 60
  });
  if (leasedRemote.status !== "leased" || leasedRemote.attemptCount !== 1) {
    throw new Error("Build 026 lease acquisition failed.");
  }
  const runningRemote = await heartbeatWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteJobId,
    workerId: "mock-ci"
  });
  if (runningRemote.status !== "running" || !runningRemote.heartbeatAt) {
    throw new Error("Build 026 heartbeat transition failed.");
  }

  const resultPayload = {
    pagesProcessed: 1,
    recordsCollected: 0,
    records: [],
    warnings: ["Database lifecycle acceptance result."]
  };
  const completedRemote = await completeWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteJobId,
    workerId: "mock-ci",
    idempotencyKey: "build026-result-1",
    payload: resultPayload
  });
  const duplicateRemote = await completeWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteJobId,
    workerId: "mock-ci",
    idempotencyKey: "build026-result-1",
    payload: resultPayload
  });
  if (
    completedRemote.job.status !== "succeeded" ||
    completedRemote.duplicate ||
    !duplicateRemote.duplicate
  ) {
    throw new Error("Build 026 idempotent result ingestion failed.");
  }

  await createWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteCancelledJobId,
    savedScraperId: "build026-cancel",
    providerKey: "mock",
    sourceUrl: "https://example.test/cancel",
    sourcePolicyPin: {
      policyId: "build025-source-policy",
      policyRevision: 1,
      policyFingerprint: "sp1-build025"
    }
  });
  const cancelledRemote = await requestWorkspaceRemoteExecutionCancellation(
    ownerId,
    syncWorkspaceId,
    remoteCancelledJobId
  );
  if (cancelledRemote.status !== "cancelled") {
    throw new Error("Build 026 cancellation failed.");
  }

  await createWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteTimeoutJobId,
    savedScraperId: "build026-timeout",
    providerKey: "mock",
    sourceUrl: "https://example.test/timeout",
    sourcePolicyPin: {
      policyId: "build025-source-policy",
      policyRevision: 1,
      policyFingerprint: "sp1-build025"
    },
    requestedBudget: { maxRuntimeSeconds: 30 }
  });
  await enqueueWorkspaceRemoteExecutionJob(
    ownerId,
    syncWorkspaceId,
    remoteTimeoutJobId
  );
  await leaseWorkspaceRemoteExecutionJob(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: remoteTimeoutJobId,
    workerId: "mock-timeout",
    leaseSeconds: 30
  });
  await withUserDatabase(ownerId, async (client) => {
    await client.query(
      "update app.remote_execution_jobs set lease_expires_at = now() - interval '1 second' where workspace_id = $1 and job_id = $2",
      [syncWorkspaceId, remoteTimeoutJobId]
    );
  });
  const timedOutRemote = await expireWorkspaceRemoteExecutionJob(
    ownerId,
    syncWorkspaceId,
    remoteTimeoutJobId
  );
  if (timedOutRemote.status !== "timed-out") {
    throw new Error("Build 026 timeout transition failed.");
  }

  const remoteJobs = await listWorkspaceRemoteExecutionJobs(
    ownerId,
    syncWorkspaceId
  );
  if (!remoteJobs.some((job) =>
    job.jobId === remoteJobId && job.status === "succeeded"
  )) {
    throw new Error("Build 026 durable remote job retrieval failed.");
  }

  let remoteIsolationDenied = false;
  try {
    await listWorkspaceRemoteExecutionJobs(restrictedId, syncWorkspaceId);
  } catch (error) {
    remoteIsolationDenied = error instanceof Error &&
      error.message === "workspace_access_denied";
  }
  if (!remoteIsolationDenied) {
    throw new Error("Build 026 remote job RLS isolation failed.");
  }

  let remoteResultsImmutable = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        "update app.remote_execution_results set result_fingerprint = 'changed' where workspace_id = $1",
        [syncWorkspaceId]
      );
    });
  } catch {
    remoteResultsImmutable = true;
  }
  if (!remoteResultsImmutable) {
    throw new Error("Build 026 remote results allowed runtime updates.");
  }

  if (priorRemoteExecutionFlag === undefined) {
    delete process.env.REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED;
  } else {
    process.env.REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED =
      priorRemoteExecutionFlag;
  }


  const pilotControl = await setRemotePilotControl(ownerId, {
    workspaceId: syncWorkspaceId,
    enabled: true,
    killSwitch: false,
    region: "us-east",
    maxUnitsPerRun: 2
  });
  if (
    !pilotControl.enabled ||
    pilotControl.killSwitch ||
    pilotControl.maxConcurrency !== 1
  ) {
    throw new Error("Build 027 workspace pilot control failed.");
  }

  const pilotAllowlist = await upsertRemotePilotAllowlist(ownerId, {
    workspaceId: syncWorkspaceId,
    sourceUrl: "https://example.test/",
    policyPin: {
      policyId: "build025-source-policy",
      policyRevision: 1,
      policyFingerprint: "sp1-build025"
    },
    maxRecords: 50,
    maxRuntimeSeconds: 60,
    maxUnitsPerRun: 2
  });
  if (
    pilotAllowlist.sourceOrigin !== "https://example.test" ||
    pilotAllowlist.maxPages !== 1 ||
    pilotAllowlist.maxUnitsPerRun !== 2
  ) {
    throw new Error("Build 027 remote source allowlist failed.");
  }

  const pilotAuthorization = await assertRemotePilotAuthorized(ownerId, {
    workspaceId: syncWorkspaceId,
    sourceUrl: "https://example.test/catalog",
    policyPin: {
      policyId: "build025-source-policy",
      policyRevision: 1,
      policyFingerprint: "sp1-build025"
    }
  });
  if (
    pilotAuthorization.policy.dataSensitivity !== "public-facts" ||
    pilotAuthorization.policy.robotsDecision !== "allowed"
  ) {
    throw new Error("Build 027 exact policy authorization failed.");
  }

  const pilotSlotJob = "27000000-0000-4000-8000-000000000001";
  await reserveRemotePilotSlot(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: pilotSlotJob
  });
  let concurrencyBlocked = false;
  try {
    await reserveRemotePilotSlot(ownerId, {
      workspaceId: syncWorkspaceId,
      jobId: "27000000-0000-4000-8000-000000000002"
    });
  } catch (error) {
    concurrencyBlocked =
      error instanceof Error &&
      error.message === "remote_pilot_concurrency_limit_reached";
  }
  if (!concurrencyBlocked) {
    throw new Error("Build 027 concurrency cap did not fail closed.");
  }
  await releaseRemotePilotSlot(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: pilotSlotJob
  });

  await appendRemotePilotEvent(ownerId, {
    workspaceId: syncWorkspaceId,
    jobId: pilotSlotJob,
    eventType: "run-succeeded",
    region: "us-east",
    unitsEstimated: 1,
    durationMs: 900,
    responseCode: 200,
    details: { acceptance: "build027" }
  });
  const pilotState = await listWorkspaceRemotePilotState(
    ownerId,
    syncWorkspaceId
  );
  if (
    pilotState.report.runs !== 1 ||
    pilotState.report.successes !== 1 ||
    pilotState.report.providerUnits !== 1
  ) {
    throw new Error("Build 027 cost/reliability evidence failed.");
  }

  let pilotIsolationDenied = false;
  try {
    await listWorkspaceRemotePilotState(restrictedId, syncWorkspaceId);
  } catch (error) {
    pilotIsolationDenied =
      error instanceof Error &&
      error.message === "workspace_access_denied";
  }
  if (!pilotIsolationDenied) {
    throw new Error("Build 027 remote pilot RLS isolation failed.");
  }

  let pilotAdminDenied = false;
  try {
    await setRemotePilotControl(restrictedId, {
      workspaceId: syncWorkspaceId,
      enabled: false,
      killSwitch: true,
      region: "us-east"
    });
  } catch (error) {
    pilotAdminDenied =
      error instanceof Error &&
      (error.message === "workspace_access_denied" ||
        error.message === "workspace_admin_required");
  }
  if (!pilotAdminDenied) {
    throw new Error("Build 027 non-admin control mutation was not blocked.");
  }

  let pilotEventsImmutable = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        "update app.remote_execution_provider_events set event_type = 'run-failed' where workspace_id = $1",
        [syncWorkspaceId]
      );
    });
  } catch {
    pilotEventsImmutable = true;
  }
  if (!pilotEventsImmutable) {
    throw new Error("Build 027 provider audit unexpectedly allowed runtime updates.");
  }

  await setRemotePilotControl(ownerId, {
    workspaceId: syncWorkspaceId,
    enabled: false,
    killSwitch: true,
    region: "us-east"
  });
  let workspaceKillBlocked = false;
  try {
    await assertRemotePilotAuthorized(ownerId, {
      workspaceId: syncWorkspaceId,
      sourceUrl: "https://example.test/",
      policyPin: {
        policyId: "build025-source-policy",
        policyRevision: 1,
        policyFingerprint: "sp1-build025"
      }
    });
  } catch (error) {
    workspaceKillBlocked =
      error instanceof Error &&
      error.message === "remote_workspace_kill_switch_active";
  }
  if (!workspaceKillBlocked) {
    throw new Error("Build 027 workspace kill switch did not fail closed.");
  }


  const personalWorkspace = ownerWorkspaces.find(
    (workspace) => workspace.slug === "personal"
  );
  if (!personalWorkspace) {
    throw new Error("Build 024 Personal workspace fixture is missing.");
  }

  const movieUpdatedAt = new Date().toISOString();
  const movieModule = await upsertWorkspaceIntelligenceModule(
    ownerId,
    personalWorkspace.id,
    {
      moduleKey: "movie-metadata",
      expectedServerVersion: null,
      clientUpdatedAt: movieUpdatedAt,
      summary: { collection: 1, pending: 0, approved: 0 },
      payload: {
        version: 1,
        id: "personal-movie-metadata-module",
        createdAt: movieUpdatedAt,
        updatedAt: movieUpdatedAt,
        collection: [
          {
            version: 1,
            id: "movie-build024",
            title: "Build 024 Fixture Movie",
            year: 2026,
            upc: "036000291452",
            externalIds: {
              imdb: "",
              tmdb: "",
              omdb: "",
              other: ""
            },
            ownership: {
              format: "Blu-ray",
              shelfLocation: "A1",
              condition: "Owned",
              notes: "Must not be overwritten by barcode intake."
            },
            metadata: {
              canonicalTitle: "",
              releaseYear: null,
              genres: [],
              runtimeMinutes: null,
              posterUrl: "",
              overview: "",
              provider: null,
              providerRecordId: "",
              sourceUrl: "",
              retrievedAt: null
            },
            createdAt: movieUpdatedAt,
            updatedAt: movieUpdatedAt
          }
        ],
        matchQueue: []
      }
    }
  );

  if (movieModule.status !== "applied") {
    throw new Error("Build 024 movie intelligence fixture could not be created.");
  }

  const normalizedBarcode = normalizeBarcode("036000291452", "upc_a");
  const captureInput = {
    workspaceId: personalWorkspace.id,
    captureId: "24000000-0000-4000-8000-000000000001",
    target: "personal-movie" as const,
    rawCode: normalizedBarcode.rawDigits,
    normalizedCode: normalizedBarcode.normalizedCode,
    barcodeFormat: normalizedBarcode.format,
    captureMethod: "manual" as const,
    capturedAt: new Date().toISOString(),
    provenance: barcodeProvenance({
      workspaceId: personalWorkspace.id,
      target: "personal-movie",
      rawCode: normalizedBarcode.rawDigits,
      formatHint: "upc_a",
      captureMethod: "manual",
      capturedAt: new Date().toISOString(),
      offlineQueuedAt: null
    }),
    matchSuggestion: (payload: Record<string, unknown> | null) =>
      matchBarcodeAgainstIntelligence({
        target: "personal-movie" as const,
        normalizedCode: normalizedBarcode.normalizedCode,
        intelligencePayload: payload
      })
  };

  const capture = await createWorkspaceBarcodeCapture(ownerId, captureInput);
  if (
    capture.matchStatus !== "exact" ||
    capture.matchPayload.recordId !== "movie-build024" ||
    capture.reviewStatus !== "pending"
  ) {
    throw new Error("Build 024 exact movie barcode matching failed.");
  }

  const approvedCapture = await reviewWorkspaceBarcodeCapture(ownerId, {
    workspaceId: personalWorkspace.id,
    captureId: capture.captureId,
    reviewStatus: "approved"
  });
  if (approvedCapture.reviewStatus !== "approved") {
    throw new Error("Build 024 barcode review approval failed.");
  }

  const duplicateCapture = await createWorkspaceBarcodeCapture(ownerId, {
    ...captureInput,
    captureId: "24000000-0000-4000-8000-000000000002"
  });
  if (duplicateCapture.matchStatus !== "duplicate") {
    throw new Error("Build 024 duplicate barcode detection failed.");
  }

  let duplicateApprovalBlocked = false;
  try {
    await reviewWorkspaceBarcodeCapture(ownerId, {
      workspaceId: personalWorkspace.id,
      captureId: duplicateCapture.captureId,
      reviewStatus: "approved"
    });
  } catch (error) {
    duplicateApprovalBlocked =
      error instanceof Error &&
      error.message === "duplicate_barcode_cannot_be_approved";
  }
  if (!duplicateApprovalBlocked) {
    throw new Error("Build 024 duplicate approval was not blocked.");
  }

  const barcodeCaptures = await listWorkspaceBarcodeCaptures(
    ownerId,
    personalWorkspace.id
  );
  if (
    !barcodeCaptures.some((item) => item.captureId === capture.captureId) ||
    !barcodeCaptures.some(
      (item) => item.captureId === duplicateCapture.captureId
    )
  ) {
    throw new Error("Build 024 durable barcode retrieval failed.");
  }

  let barcodeIsolationDenied = false;
  try {
    await listWorkspaceBarcodeCaptures(restrictedId, personalWorkspace.id);
  } catch (error) {
    barcodeIsolationDenied =
      error instanceof Error &&
      error.message === "workspace_access_denied";
  }
  if (!barcodeIsolationDenied) {
    throw new Error(
      "Build 024 RLS isolation failed: restricted user reached barcode captures."
    );
  }

  let targetMismatchDenied = false;
  try {
    await createWorkspaceBarcodeCapture(ownerId, {
      ...captureInput,
      captureId: "24000000-0000-4000-8000-000000000003",
      target: "devil-supplier"
    });
  } catch (error) {
    targetMismatchDenied =
      error instanceof Error &&
      error.message === "barcode_target_workspace_mismatch";
  }
  if (!targetMismatchDenied) {
    throw new Error("Build 024 target/workspace mismatch was not blocked.");
  }

  const customProfile = await createCustomWorkspaceProfile(ownerId, {
    name: "Build 028 Outdoor Research",
    description: "Custom profile acceptance fixture.",
    workspaceType: "business",
    normalizationFields: ["product name","sku","source url"],
    reviewDimensions: ["identity","pricing","source evidence"],
    capabilities: {
      history:true,sourcePolicy:true,scheduledJobs:false,
      remoteExecution:false,barcodeIntake:false,businessIntegrations:false
    }
  });
  if (customProfile.isBuiltin || customProfile.capabilities.remoteExecution) {
    throw new Error("Build 028 custom profile safe defaults/config failed.");
  }

  const updatedProfile = await updateCustomWorkspaceProfile(
    ownerId,
    customProfile.profileKey,
    {
      name:"Build 028 Outdoor Equipment",
      description:"Updated custom profile acceptance fixture.",
      workspaceType:"business",
      normalizationFields:["product name","sku","price","source url"],
      reviewDimensions:["identity","pricing","source evidence"],
      capabilities:{
        history:true,sourcePolicy:true,scheduledJobs:true,
        remoteExecution:false,barcodeIntake:false,businessIntegrations:false
      }
    }
  );
  if (!updatedProfile.capabilities.scheduledJobs) {
    throw new Error("Build 028 custom profile edit failed.");
  }

  const customWorkspace = await createWorkspaceFromProfile(ownerId, {
    name:"Build 028 Outdoor Workspace",
    purpose:"Verify a new workspace can use a custom profile.",
    profileKey:customProfile.profileKey
  });
  if (
    customWorkspace.profileKey !== customProfile.profileKey ||
    customWorkspace.role !== "owner"
  ) {
    throw new Error("Build 028 profiled workspace creation failed.");
  }

  await updateWorkspaceMetadata(ownerId,{
    workspaceId:customWorkspace.id,
    name:"Build 028 Outdoor Workspace Updated",
    purpose:"Updated workspace purpose."
  });
  const ownerAfterCreate=await listWorkspacesForUser(ownerId);
  const updatedWorkspace=ownerAfterCreate.find((workspace)=>workspace.id===customWorkspace.id);
  if (
    !updatedWorkspace ||
    updatedWorkspace.name !== "Build 028 Outdoor Workspace Updated" ||
    updatedWorkspace.purpose !== "Updated workspace purpose."
  ) {
    throw new Error("Build 028 workspace edit failed.");
  }

  const restrictedProfiles=await listWorkspaceProfilesForUser(restrictedId);
  if (restrictedProfiles.some((profile)=>profile.profileKey===customProfile.profileKey)) {
    throw new Error("Build 028 custom profile leaked across accounts.");
  }
  if ((await listWorkspacesForUser(restrictedId)).some((workspace)=>workspace.id===customWorkspace.id)) {
    throw new Error("Build 028 custom workspace leaked across accounts.");
  }

  let restrictedProfileCreateDenied=false;
  try {
    await createCustomWorkspaceProfile(restrictedId,{
      name:"Unauthorized Profile",workspaceType:"business"
    });
  } catch(error) {
    restrictedProfileCreateDenied=
      error instanceof Error && error.message==="workspace_profile_manager_required";
  }
  if(!restrictedProfileCreateDenied) {
    throw new Error("Build 028 profile manager authorization failed.");
  }

  let restrictedWorkspaceEditDenied=false;
  try {
    await updateWorkspaceMetadata(restrictedId,{
      workspaceId:customWorkspace.id,name:"Unauthorized edit",purpose:""
    });
  } catch(error) {
    restrictedWorkspaceEditDenied=
      error instanceof Error && error.message==="workspace_admin_required";
  }
  if(!restrictedWorkspaceEditDenied) {
    throw new Error("Build 028 workspace admin authorization failed.");
  }

  await archiveWorkspace(ownerId,customWorkspace.id);
  if ((await listWorkspacesForUser(ownerId)).some((workspace)=>workspace.id===customWorkspace.id)) {
    throw new Error("Build 028 workspace archive failed.");
  }

  await archiveCustomWorkspaceProfile(ownerId,customProfile.profileKey);
  const archivedProfiles=await listWorkspaceProfilesForUser(ownerId,{includeArchived:true});
  if (!archivedProfiles.some((profile)=>profile.profileKey===customProfile.profileKey && profile.archivedAt)) {
    throw new Error("Build 028 profile archive evidence failed.");
  }

  const connectorKey = "example.no-secret-normalizer";
  const configuredConnector = await configureWorkspaceConnector(ownerId, {
    workspaceId: syncWorkspaceId,
    connectorKey,
    config: { trim: true, case: "upper" },
    grantedCapabilities: ["import"],
    secretRefs: {}
  });
  if (configuredConnector.enabled || configuredConnector.grantedCapabilities.join(",") !== "import") {
    throw new Error("Build 029 connector configuration/grant persistence failed.");
  }

  let restrictedConfigureDenied = false;
  try {
    await configureWorkspaceConnector(restrictedId, {
      workspaceId: syncWorkspaceId,
      connectorKey,
      config: { trim: true, case: "upper" },
      grantedCapabilities: ["import"],
      secretRefs: {}
    });
  } catch (error) {
    restrictedConfigureDenied =
      error instanceof Error && error.message === "workspace_admin_required";
  }
  if (!restrictedConfigureDenied) {
    throw new Error("Build 029 connector workspace-admin boundary failed.");
  }

  await setWorkspaceConnectorEnabled(ownerId, {
    workspaceId: syncWorkspaceId,
    connectorKey,
    enabled: true
  });

  const connectorResult = await executeWorkspaceConnector(ownerId, {
    workspaceId: syncWorkspaceId,
    connectorKey,
    capability: "import",
    payload: { records: [{ name: "  build   029  ", kind: " test " }] }
  });
  const outputObject = connectorResult.output as {
    records?: Array<Record<string, unknown>>;
  };
  if (outputObject.records?.[0]?.name !== "BUILD 029") {
    throw new Error("Build 029 example connector execution returned unexpected output.");
  }

  let ungrantedBlocked = false;
  try {
    await executeWorkspaceConnector(ownerId, {
      workspaceId: syncWorkspaceId,
      connectorKey,
      capability: "enrichment",
      payload: { records: [] }
    });
  } catch (error) {
    ungrantedBlocked =
      error instanceof Error && error.message === "connector_capability_not_granted";
  }
  if (!ungrantedBlocked) {
    throw new Error("Build 029 connector exceeded its workspace capability grant.");
  }

  const restrictedConnectorOverview = await listConnectorOverviewForUser(restrictedId);
  if (restrictedConnectorOverview.workspaces.length !== 0) {
    throw new Error("Build 029 connector state leaked to a non-member account.");
  }

  const connectorOverview = await listConnectorOverviewForUser(ownerId);
  const connectorWorkspace = connectorOverview.workspaces.find(
    (entry) => entry.workspace.id === syncWorkspaceId
  );
  if (
    !connectorWorkspace?.audit.some(
      (entry) => entry.connectorKey === connectorKey && entry.status === "succeeded"
    ) ||
    !connectorWorkspace.audit.some(
      (entry) =>
        entry.connectorKey === connectorKey &&
        entry.status === "blocked" &&
        entry.errorCode === "connector_capability_not_granted"
    )
  ) {
    throw new Error("Build 029 connector append-only execution evidence is incomplete.");
  }

  let connectorAuditImmutable = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        "update app.workspace_connector_audit set error_code='tampered' where workspace_id=$1",
        [syncWorkspaceId]
      );
    });
  } catch {
    connectorAuditImmutable = true;
  }
  if (!connectorAuditImmutable) {
    throw new Error("Build 029 connector audit unexpectedly allowed runtime updates.");
  }

  await setWorkspaceConnectorEnabled(ownerId, {
    workspaceId: syncWorkspaceId,
    connectorKey,
    enabled: false
  });
  let disabledBlocked = false;
  try {
    await executeWorkspaceConnector(ownerId, {
      workspaceId: syncWorkspaceId,
      connectorKey,
      capability: "import",
      payload: { records: [] }
    });
  } catch (error) {
    disabledBlocked =
      error instanceof Error && error.message === "connector_disabled";
  }
  if (!disabledBlocked) {
    throw new Error("Build 029 disabled connector still executed.");
  }

  console.log(
    "Build 002/019/020/021/024/025/026/027/028/029 database isolation, source-policy persistence, barcode review, remote execution lifecycle, controlled pilot guardrails, configurable workspace profiles, connector SDK grants/audit and workspace-target acceptance passed."
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
