import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  OfflineSynchronizationQueue,
  createMemoryOfflineQueueStorage,
  offlineSynchronizationDescriptor
} from "../lib/offline-sync-queue";
import {
  createSecureTransportManifest,
  createTransportHealthEvidence,
  selectSecureTransport
} from "../lib/secure-transport-selection";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function transportSelection() {
  const manifest = createSecureTransportManifest({
    transportId: "direct.build324",
    displayName: "Build 324 direct",
    kind: "direct-https",
    environment: "production",
    destinationOrigin: "https://module.example.com",
    originAllowlist: ["https://module.example.com"],
    priority: 10,
    securityLevel: "standard",
    health: {
      method: "GET",
      path: "/health",
      expectedStatuses: [200],
      timeoutMs: 3000
    }
  });
  const health = createTransportHealthEvidence({
    manifest,
    probeId: "probe-build324-direct",
    status: "healthy",
    checkedAt: "2026-11-08T05:05:00.000Z",
    latencyMs: 20
  });
  return selectSecureTransport({
    transports: [manifest],
    healthEvidence: [health],
    environment: "production",
    auditCorrelationId: "audit-build324-transport",
    requestedTransportId: manifest.transportId,
    now: "2026-11-08T05:06:00.000Z"
  });
}

async function queue(input?: {
  encryptedAtRest?: boolean;
  online?: boolean;
}) {
  const storage = createMemoryOfflineQueueStorage({
    encryptedAtRest: input?.encryptedAtRest
  });
  const queue = new OfflineSynchronizationQueue({
    storage,
    hostApplicationId: "rosevear.icamp",
    hostInstanceId: "host-build324-primary",
    environment: "production",
    workspaceId: "workspace-build324",
    tenantId: "tenant-build324",
    initialOnline: input?.online ?? false
  });
  await queue.initialize("2026-11-08T05:00:00.000Z");
  return { queue, storage };
}

async function main() {
  const { queue: offline, storage } = await queue({
    encryptedAtRest: true,
    online: false
  });

  const first = await offline.enqueue({
    destinationApplicationId: "rosevear.comms-hub",
    logicalOperationId: "booking-build324-001",
    operation: "booking.sync",
    payloadReference: "payload-ref-build324-001",
    payloadSha256: "a".repeat(64),
    ttlMs: 60 * 60 * 1000,
    now: "2026-11-08T05:01:00.000Z"
  });
  assert.equal(first.duplicateSuppressed, false);
  assert.equal(first.item.state, "queued-offline");
  assert.equal(first.item.rawPayloadStored, false);
  assert.equal(
    first.item.successfulRemoteExecutionClaimedWithoutReceipt,
    false
  );

  const duplicate = await offline.enqueue({
    destinationApplicationId: "rosevear.comms-hub",
    logicalOperationId: "booking-build324-001",
    operation: "booking.sync",
    payloadReference: "payload-ref-build324-001",
    payloadSha256: "a".repeat(64),
    ttlMs: 60 * 60 * 1000,
    now: "2026-11-08T05:02:00.000Z"
  });
  assert.equal(duplicate.duplicateSuppressed, true);
  assert.equal(
    duplicate.item.idempotencyKeySha256,
    first.item.idempotencyKeySha256
  );

  assert.equal(
    storage.inspect().lastSaveOptions?.requireEncryptionAtRest,
    true
  );
  assert.equal(
    storage.inspect().lastSaveOptions?.rawPayloadPermitted,
    false
  );

  const offlinePlan = await offline.prepareNextSynchronization({
    transportSelection: transportSelection(),
    now: "2026-11-08T05:03:00.000Z"
  });
  assert.equal(offlinePlan.state, "held");
  if (offlinePlan.state === "held") {
    assert.equal(offlinePlan.reason, "offline");
  }

  const reconnect = await offline.observeConnectivity({
    online: true,
    observedAt: "2026-11-08T05:04:00.000Z"
  });
  assert.equal(reconnect.transition, "reconnected");
  assert.equal(offline.snapshot.items[0]?.state, "ready");

  const plan = await offline.prepareNextSynchronization({
    transportSelection: transportSelection(),
    now: "2026-11-08T05:06:00.000Z"
  });
  assert.equal(plan.state, "ready");
  if (plan.state !== "ready") throw new Error("expected ready plan");
  assert.equal(
    plan.handoff.idempotencyKeySha256,
    first.item.idempotencyKeySha256
  );
  assert.equal(plan.handoff.authorizationRequired, true);
  assert.equal(plan.handoff.networkRequestPerformedByQueue, false);
  assert.equal(plan.handoff.remoteSuccessAssumed, false);

  const started = await offline.markAttemptStarted({
    itemId: first.item.itemId,
    transportId: plan.handoff.transportId,
    authorizationEvidenceId: "grant-build324-owner-001",
    idempotencyKeySha256: first.item.idempotencyKeySha256,
    startedAt: "2026-11-08T05:07:00.000Z"
  });
  assert.equal(started.state, "syncing");
  assert.equal(started.attemptCount, 1);

  const ambiguous = await offline.recordSynchronizationOutcome({
    itemId: first.item.itemId,
    outcome: {
      kind: "remote-outcome-unknown",
      reasonCode: "connection-reset-after-send"
    },
    recordedAt: "2026-11-08T05:07:10.000Z"
  });
  assert.equal(ambiguous.state, "review-required");
  assert.match(
    ambiguous.reviewReason ?? "",
    /^ambiguous-remote-outcome:/
  );

  const reviewed = await offline.releaseManualReview({
    itemId: first.item.itemId,
    decision: "retry-same-idempotency-key",
    reviewedAt: "2026-11-08T05:08:00.000Z"
  });
  assert.equal(reviewed.state, "ready");
  assert.equal(
    reviewed.idempotencyKeySha256,
    first.item.idempotencyKeySha256
  );

  const secondPlan = await offline.prepareNextSynchronization({
    transportSelection: transportSelection(),
    now: "2026-11-08T05:09:00.000Z"
  });
  assert.equal(secondPlan.state, "ready");
  if (secondPlan.state !== "ready") throw new Error("expected second ready plan");
  assert.equal(
    secondPlan.handoff.idempotencyKeySha256,
    first.item.idempotencyKeySha256
  );
  assert.equal(secondPlan.handoff.attemptOrdinal, 2);

  await offline.markAttemptStarted({
    itemId: first.item.itemId,
    transportId: secondPlan.handoff.transportId,
    authorizationEvidenceId: "grant-build324-owner-002",
    idempotencyKeySha256: first.item.idempotencyKeySha256,
    startedAt: "2026-11-08T05:09:10.000Z"
  });
  const confirmed = await offline.recordSynchronizationOutcome({
    itemId: first.item.itemId,
    outcome: {
      kind: "acknowledged-success",
      remoteReceiptId: "receipt-build324-remote-001",
      idempotencyKeyEcho: first.item.idempotencyKeySha256
    },
    recordedAt: "2026-11-08T05:09:20.000Z"
  });
  assert.equal(confirmed.state, "confirmed");
  assert.equal(
    confirmed.remoteReceiptId,
    "receipt-build324-remote-001"
  );

  const { queue: conflictQueue } = await queue({
    online: true
  });
  const conflictItem = await conflictQueue.enqueue({
    destinationApplicationId: "rosevear.icamp",
    logicalOperationId: "booking-build324-conflict",
    operation: "booking.update",
    payloadReference: "payload-ref-build324-conflict",
    payloadSha256: "b".repeat(64),
    preconditionVersionSha256: "c".repeat(64),
    now: "2026-11-08T05:10:00.000Z"
  });
  const missingPrecondition =
    await conflictQueue.prepareNextSynchronization({
      transportSelection: transportSelection(),
      now: "2026-11-08T05:11:00.000Z"
    });
  assert.equal(missingPrecondition.state, "held");
  if (missingPrecondition.state === "held") {
    assert.equal(
      missingPrecondition.reason,
      "precondition-evidence-required"
    );
  }

  await conflictQueue.prepareNextSynchronization({
    transportSelection: transportSelection(),
    remoteVersionByItemId: {
      [conflictItem.item.itemId]: "d".repeat(64)
    },
    now: "2026-11-08T05:12:00.000Z"
  });
  assert.equal(
    conflictQueue.snapshot.items[0]?.state,
    "conflict"
  );

  const { queue: staleQueue } = await queue({
    online: false
  });
  const staleItem = await staleQueue.enqueue({
    destinationApplicationId: "rosevear.icamp",
    logicalOperationId: "booking-build324-stale",
    operation: "booking.sync",
    payloadReference: "payload-ref-build324-stale",
    payloadSha256: "e".repeat(64),
    ttlMs: 60_000,
    now: "2026-11-08T05:00:00.000Z"
  });
  await staleQueue.observeConnectivity({
    online: true,
    observedAt: "2026-11-08T05:02:00.000Z"
  });
  assert.equal(
    staleQueue.snapshot.items.find(
      (item) => item.itemId === staleItem.item.itemId
    )?.state,
    "expired"
  );

  const interruptedStorage = createMemoryOfflineQueueStorage();
  const interrupted = new OfflineSynchronizationQueue({
    storage: interruptedStorage,
    hostApplicationId: "rosevear.icamp",
    hostInstanceId: "host-build324-interrupted",
    environment: "production",
    workspaceId: "workspace-build324",
    tenantId: "tenant-build324",
    initialOnline: true
  });
  await interrupted.initialize("2026-11-08T05:00:00.000Z");
  const interruptedItem = await interrupted.enqueue({
    destinationApplicationId: "rosevear.comms-hub",
    logicalOperationId: "booking-build324-interrupted",
    operation: "booking.sync",
    payloadReference: "payload-ref-build324-interrupted",
    payloadSha256: "f".repeat(64),
    now: "2026-11-08T05:01:00.000Z"
  });
  const interruptedPlan =
    await interrupted.prepareNextSynchronization({
      transportSelection: transportSelection(),
      now: "2026-11-08T05:02:00.000Z"
    });
  if (interruptedPlan.state !== "ready") {
    throw new Error("expected interrupted ready plan");
  }
  await interrupted.markAttemptStarted({
    itemId: interruptedItem.item.itemId,
    transportId: interruptedPlan.handoff.transportId,
    authorizationEvidenceId: "grant-build324-interrupted",
    idempotencyKeySha256:
      interruptedItem.item.idempotencyKeySha256,
    startedAt: "2026-11-08T05:03:00.000Z"
  });

  const restored = new OfflineSynchronizationQueue({
    storage: interruptedStorage,
    hostApplicationId: "rosevear.icamp",
    hostInstanceId: "host-build324-interrupted",
    environment: "production",
    workspaceId: "workspace-build324",
    tenantId: "tenant-build324",
    initialOnline: true
  });
  await restored.initialize("2026-11-08T05:04:00.000Z");
  assert.equal(
    restored.snapshot.items[0]?.state,
    "review-required"
  );
  assert.equal(
    restored.snapshot.items[0]?.reviewReason,
    "interrupted-attempt-outcome-unknown"
  );

  const metrics = offline.metrics("2026-11-08T05:10:00.000Z");
  assert.equal(metrics.confirmed, 1);
  assert.equal(metrics.rawPayloadStored, false);
  assert.equal(metrics.ambiguousOutcomeAutoRetried, false);
  assert.equal(metrics.storageEncryption, "host-encrypted");

  const descriptor = offlineSynchronizationDescriptor();
  assert.equal(descriptor.boundedQueue.maximumItems, 200);
  assert.equal(
    descriptor.localMetadata.encryptedAtRestRequestedWhenSupported,
    true
  );
  assert.equal(
    descriptor.security.offlineModeClaimsRemoteSuccess,
    false
  );
  assert.equal(
    descriptor.security.ambiguousOutcomeAutoRetries,
    false
  );
  assert.equal(
    descriptor.security.idempotencyKeyChangesOnRetry,
    false
  );

  const [
    moduleSource,
    discoveryApi,
    page,
    navigation,
    operatorTools,
    manifest,
    docs,
    review,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("lib/offline-sync-queue.ts"),
    source("app/api/module-offline-sync/route.ts"),
    source("app/app-connections/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_324_OFFLINE_QUEUE_RECONNECT_IDEMPOTENT_SYNC.md"),
    source("../../docs/integration/ai-data-platform-build324-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "OFFLINE_QUEUE_MAX_ITEMS = 200",
    "OfflineReconnectDetector",
    "idempotencyKeySha256",
    "precondition-evidence-required",
    "remote-version-conflict",
    "ambiguous-remote-outcome",
    "interrupted-attempt-outcome-unknown",
    "requireEncryptionAtRest",
    "rawPayloadPermitted: false",
    "remoteReceiptId",
    "idempotencyKeyEcho",
    "successfulRemoteExecutionClaimedWithoutReceipt: false"
  ]) {
    assert.ok(
      moduleSource.includes(token),
      "Build 324 module source missing " + token
    );
  }

  for (const token of [
    "queueIsHostLocal: true",
    "encryptedAtRestRequestedWhenSupported: true",
    "reconnectOnlyMarksWorkReady: true",
    "remoteReceiptRequiredForConfirmedSuccess: true",
    "ambiguousRemoteOutcomeRequiresManualReview: true"
  ]) {
    assert.ok(
      discoveryApi.includes(token),
      "Build 324 discovery API missing " + token
    );
  }

  assert.ok(page.includes("Build 324 offline synchronization"));
  assert.ok(page.includes("/api/module-offline-sync"));
  assert.ok(
    navigation.includes("offline synchronization") &&
      operatorTools.includes("offline synchronization")
  );

  for (const token of [
    '"offline-sync-queue-v1"',
    '"reconnect-detection-v1"',
    '"idempotent-offline-sync-v1"',
    '"offline-conflict-review-v1"',
    "offlineQueueStoresRawPayload: false",
    "offlineQueueClaimsRemoteSuccess: false",
    "offlineReconnectExecutesWork: false",
    "offlineAmbiguousOutcomeAutoRetries: false",
    "offlineRetryChangesIdempotencyKey: false"
  ]) {
    assert.ok(
      manifest.includes(token),
      "Build 324 manifest missing " + token
    );
  }

  for (const token of [
    "Build 324",
    "Bounded offline queue",
    "Encrypted-at-rest local metadata",
    "Reconnect detection",
    "Idempotency keys",
    "Conflict detection",
    "Ambiguous outcomes",
    "Queue health metrics",
    "Build 325"
  ]) {
    assert.ok(
      docs.includes(token),
      "Build 324 docs missing " + token
    );
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 324);
  assert.equal(
    reviewJson.security.offlineModeClaimsRemoteSuccess,
    false
  );
  assert.equal(
    reviewJson.security.ambiguousOutcomeAutoRetry,
    false
  );
  assert.equal(reviewJson.nextQueuedBuild, 325);

  assert.ok(
    roadmap.includes(
      "Build 324 — Offline Queue, Reconnect & Idempotent Synchronization"
    ) &&
      roadmap.includes(
        "Build 325 — Autonomous Module Supervisor V1"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-324-offline-sync.ts"
      ),
      "Build 324 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 324 Offline Queue, Reconnect & Idempotent Synchronization verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
