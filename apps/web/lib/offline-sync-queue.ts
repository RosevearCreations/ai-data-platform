import { createHash } from "node:crypto";

import type {
  SecureTransportSelection
} from "./secure-transport-selection";
import type { HostEnvironment } from "./universal-module-contract";

export const OFFLINE_SYNC_QUEUE_VERSION = "1.0.0" as const;
export const OFFLINE_SYNC_QUEUE_SCHEMA =
  "rosevear.ai-data-platform.offline-sync-queue.v1" as const;
export const OFFLINE_SYNC_ITEM_SCHEMA =
  "rosevear.ai-data-platform.offline-sync-item.v1" as const;
export const OFFLINE_SYNC_HANDOFF_SCHEMA =
  "rosevear.ai-data-platform.offline-sync-handoff.v1" as const;
export const OFFLINE_SYNC_CONNECTIVITY_SCHEMA =
  "rosevear.ai-data-platform.connectivity-observation.v1" as const;
export const OFFLINE_SYNC_METRICS_SCHEMA =
  "rosevear.ai-data-platform.offline-sync-metrics.v1" as const;

export const OFFLINE_QUEUE_MAX_ITEMS = 200;
export const OFFLINE_QUEUE_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_QUEUE_MAX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const OFFLINE_QUEUE_MAX_ATTEMPTS = 5;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{5,159}$/;
const APPLICATION_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPERATION_PATTERN =
  /^[a-z][a-z0-9]*(?:[.:/_-][a-z0-9]+)*$/;

export type OfflineQueueItemState =
  | "queued-offline"
  | "ready"
  | "syncing"
  | "review-required"
  | "conflict"
  | "expired"
  | "confirmed";

export type OfflineStorageEncryption =
  | "host-encrypted"
  | "unsupported-reference-only";

export type OfflineSyncQueueItem = {
  schema: typeof OFFLINE_SYNC_ITEM_SCHEMA;
  version: typeof OFFLINE_SYNC_QUEUE_VERSION;
  itemId: string;
  environment: HostEnvironment;
  hostApplicationId: string;
  hostInstanceId: string;
  workspaceId: string;
  tenantId: string;
  destinationApplicationId: string;
  logicalOperationId: string;
  operation: string;
  payloadReference: string;
  payloadSha256: string;
  preconditionVersionSha256: string | null;
  idempotencyKeySha256: string;
  state: OfflineQueueItemState;
  createdAt: string;
  expiresAt: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastTransportId: string | null;
  authorizationEvidenceId: string | null;
  remoteReceiptId: string | null;
  reviewReason: string | null;
  storageEncryption: OfflineStorageEncryption;
  rawPayloadStored: false;
  successfulRemoteExecutionClaimedWithoutReceipt: false;
};

export type OfflineConnectivityObservation = {
  schema: typeof OFFLINE_SYNC_CONNECTIVITY_SCHEMA;
  version: typeof OFFLINE_SYNC_QUEUE_VERSION;
  online: boolean;
  observedAt: string;
  transition:
    | "initial-online"
    | "initial-offline"
    | "unchanged"
    | "went-offline"
    | "reconnected";
};

export type OfflineSyncQueueSnapshot = {
  schema: typeof OFFLINE_SYNC_QUEUE_SCHEMA;
  version: typeof OFFLINE_SYNC_QUEUE_VERSION;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: HostEnvironment;
  workspaceId: string;
  tenantId: string;
  online: boolean;
  connectivityObservedAt: string | null;
  reconnectCount: number;
  lastReconnectAt: string | null;
  items: OfflineSyncQueueItem[];
};

export type OfflineQueueStorageAdapter = {
  adapterId: string;
  capabilities: {
    persistence: "memory" | "local";
    encryptionAtRest: "supported" | "unsupported";
  };
  load(): Promise<OfflineSyncQueueSnapshot | null>;
  save(
    snapshot: OfflineSyncQueueSnapshot,
    options: {
      requireEncryptionAtRest: boolean;
      rawPayloadPermitted: false;
    }
  ): Promise<void>;
};

export type OfflineSyncHandoff = {
  schema: typeof OFFLINE_SYNC_HANDOFF_SCHEMA;
  version: typeof OFFLINE_SYNC_QUEUE_VERSION;
  itemId: string;
  destinationApplicationId: string;
  operation: string;
  payloadReference: string;
  payloadSha256: string;
  idempotencyKeySha256: string;
  transportId: string;
  transportSelectionIdSha256: string;
  attemptOrdinal: number;
  expiresAt: string;
  authorizationRequired: true;
  networkRequestPerformedByQueue: false;
  remoteSuccessAssumed: false;
};

export type OfflineQueueHealthMetrics = {
  schema: typeof OFFLINE_SYNC_METRICS_SCHEMA;
  version: typeof OFFLINE_SYNC_QUEUE_VERSION;
  total: number;
  queuedOffline: number;
  ready: number;
  syncing: number;
  reviewRequired: number;
  conflicts: number;
  expired: number;
  confirmed: number;
  pending: number;
  capacity: number;
  capacityUsedPercent: number;
  oldestPendingAgeMs: number | null;
  reconnectCount: number;
  lastReconnectAt: string | null;
  online: boolean;
  storageEncryption: OfflineStorageEncryption;
  rawPayloadStored: false;
  ambiguousOutcomeAutoRetried: false;
};

export type EnqueueOfflineWorkInput = {
  destinationApplicationId: string;
  logicalOperationId: string;
  operation: string;
  payloadReference: string;
  payloadSha256: string;
  preconditionVersionSha256?: string | null;
  ttlMs?: number;
  now?: string;
};

export type SynchronizationOutcome =
  | {
      kind: "acknowledged-success";
      remoteReceiptId: string;
      idempotencyKeyEcho: string;
    }
  | {
      kind: "remote-rejected";
      reasonCode: string;
    }
  | {
      kind: "transport-not-started";
      reasonCode: string;
    }
  | {
      kind: "remote-outcome-unknown";
      reasonCode: string;
    };

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function safeIso(value: string, code: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return new Date(parsed).toISOString();
}

function assertId(value: string, code: string) {
  if (!ID_PATTERN.test(value)) throw new Error(code);
}

function assertApplicationId(value: string, code: string) {
  if (
    !APPLICATION_ID_PATTERN.test(value) ||
    value.length > 120
  ) {
    throw new Error(code);
  }
}

function assertSha(value: string, code: string) {
  if (!SHA256_PATTERN.test(value)) throw new Error(code);
}

function cloneItem(item: OfflineSyncQueueItem): OfflineSyncQueueItem {
  return { ...item };
}

function cloneSnapshot(
  snapshot: OfflineSyncQueueSnapshot
): OfflineSyncQueueSnapshot {
  return {
    ...snapshot,
    items: snapshot.items.map(cloneItem)
  };
}

function storageEncryption(
  adapter: OfflineQueueStorageAdapter
): OfflineStorageEncryption {
  return adapter.capabilities.encryptionAtRest === "supported"
    ? "host-encrypted"
    : "unsupported-reference-only";
}

function idempotencyKey(input: {
  hostApplicationId: string;
  hostInstanceId: string;
  environment: HostEnvironment;
  workspaceId: string;
  tenantId: string;
  destinationApplicationId: string;
  logicalOperationId: string;
  operation: string;
  payloadSha256: string;
}) {
  return sha256([
    "rosevear-offline-sync-intent-v1",
    input.hostApplicationId,
    input.hostInstanceId,
    input.environment,
    input.workspaceId,
    input.tenantId,
    input.destinationApplicationId,
    input.logicalOperationId,
    input.operation,
    input.payloadSha256
  ]);
}

function itemIdFor(key: string) {
  return "oq_" + key.slice(0, 32);
}

function validSnapshotIdentity(
  snapshot: OfflineSyncQueueSnapshot,
  identity: {
    hostApplicationId: string;
    hostInstanceId: string;
    environment: HostEnvironment;
    workspaceId: string;
    tenantId: string;
  }
) {
  return (
    snapshot.schema === OFFLINE_SYNC_QUEUE_SCHEMA &&
    snapshot.version === OFFLINE_SYNC_QUEUE_VERSION &&
    snapshot.hostApplicationId === identity.hostApplicationId &&
    snapshot.hostInstanceId === identity.hostInstanceId &&
    snapshot.environment === identity.environment &&
    snapshot.workspaceId === identity.workspaceId &&
    snapshot.tenantId === identity.tenantId
  );
}

function validateSnapshotItem(item: OfflineSyncQueueItem) {
  if (
    item.schema !== OFFLINE_SYNC_ITEM_SCHEMA ||
    item.version !== OFFLINE_SYNC_QUEUE_VERSION
  ) {
    throw new Error("offline_queue_item_schema_invalid");
  }
  assertId(item.itemId, "offline_queue_item_id_invalid");
  assertApplicationId(
    item.destinationApplicationId,
    "offline_queue_destination_invalid"
  );
  assertId(
    item.logicalOperationId,
    "offline_queue_logical_operation_id_invalid"
  );
  if (
    !OPERATION_PATTERN.test(item.operation) ||
    item.operation.length > 120
  ) {
    throw new Error("offline_queue_operation_invalid");
  }
  assertId(
    item.payloadReference,
    "offline_queue_payload_reference_invalid"
  );
  assertSha(item.payloadSha256, "offline_queue_payload_hash_invalid");
  if (item.preconditionVersionSha256 !== null) {
    assertSha(
      item.preconditionVersionSha256,
      "offline_queue_precondition_hash_invalid"
    );
  }
  assertSha(
    item.idempotencyKeySha256,
    "offline_queue_idempotency_key_invalid"
  );
  if (
    ![
      "queued-offline",
      "ready",
      "syncing",
      "review-required",
      "conflict",
      "expired",
      "confirmed"
    ].includes(item.state)
  ) {
    throw new Error("offline_queue_item_state_invalid");
  }
  if (
    ![
      "host-encrypted",
      "unsupported-reference-only"
    ].includes(item.storageEncryption)
  ) {
    throw new Error("offline_queue_storage_encryption_invalid");
  }
  if (
    item.attemptCount < 0 ||
    item.attemptCount > OFFLINE_QUEUE_MAX_ATTEMPTS
  ) {
    throw new Error("offline_queue_attempt_count_invalid");
  }
  safeIso(item.createdAt, "offline_queue_created_at_invalid");
  safeIso(item.expiresAt, "offline_queue_expires_at_invalid");
  if (item.rawPayloadStored !== false) {
    throw new Error("offline_queue_raw_payload_forbidden");
  }
  if (
    item.successfulRemoteExecutionClaimedWithoutReceipt !== false
  ) {
    throw new Error("offline_queue_unverified_success_forbidden");
  }
}

export class OfflineReconnectDetector {
  private online: boolean | null = null;

  observe(
    online: boolean,
    observedAt: string
  ): OfflineConnectivityObservation {
    const timestamp = safeIso(
      observedAt,
      "offline_connectivity_timestamp_invalid"
    );
    const previous = this.online;
    this.online = online;

    const transition =
      previous === null
        ? online
          ? ("initial-online" as const)
          : ("initial-offline" as const)
        : previous === online
          ? ("unchanged" as const)
          : online
            ? ("reconnected" as const)
            : ("went-offline" as const);

    return Object.freeze({
      schema: OFFLINE_SYNC_CONNECTIVITY_SCHEMA,
      version: OFFLINE_SYNC_QUEUE_VERSION,
      online,
      observedAt: timestamp,
      transition
    });
  }

  seed(online: boolean) {
    this.online = online;
  }
}

export class OfflineSynchronizationQueue {
  private readonly storage: OfflineQueueStorageAdapter;
  private readonly detector = new OfflineReconnectDetector();
  private snapshotValue: OfflineSyncQueueSnapshot;
  private initialized = false;

  constructor(input: {
    storage: OfflineQueueStorageAdapter;
    hostApplicationId: string;
    hostInstanceId: string;
    environment: HostEnvironment;
    workspaceId: string;
    tenantId: string;
    initialOnline?: boolean;
  }) {
    assertApplicationId(
      input.hostApplicationId,
      "offline_queue_host_application_invalid"
    );
    assertId(
      input.hostInstanceId,
      "offline_queue_host_instance_invalid"
    );
    assertId(
      input.workspaceId,
      "offline_queue_workspace_invalid"
    );
    assertId(input.tenantId, "offline_queue_tenant_invalid");

    this.storage = input.storage;
    const initialOnline = input.initialOnline ?? false;
    this.snapshotValue = {
      schema: OFFLINE_SYNC_QUEUE_SCHEMA,
      version: OFFLINE_SYNC_QUEUE_VERSION,
      hostApplicationId: input.hostApplicationId,
      hostInstanceId: input.hostInstanceId,
      environment: input.environment,
      workspaceId: input.workspaceId,
      tenantId: input.tenantId,
      online: initialOnline,
      connectivityObservedAt: null,
      reconnectCount: 0,
      lastReconnectAt: null,
      items: []
    };
    this.detector.seed(initialOnline);
  }

  get snapshot() {
    return cloneSnapshot(this.snapshotValue);
  }

  async initialize(now = new Date().toISOString()) {
    if (this.initialized) return this.snapshot;
    const restored = await this.storage.load();
    if (restored) {
      if (
        !validSnapshotIdentity(restored, this.snapshotValue)
      ) {
        throw new Error("offline_queue_snapshot_identity_mismatch");
      }
      if (restored.items.length > OFFLINE_QUEUE_MAX_ITEMS) {
        throw new Error("offline_queue_capacity_invalid");
      }
      restored.items.forEach(validateSnapshotItem);

      this.snapshotValue = cloneSnapshot(restored);
      this.detector.seed(restored.online);

      let changed = false;
      const currentStorageEncryption =
        storageEncryption(this.storage);
      for (const item of this.snapshotValue.items) {
        if (
          item.hostApplicationId !==
            this.snapshotValue.hostApplicationId ||
          item.hostInstanceId !==
            this.snapshotValue.hostInstanceId ||
          item.environment !== this.snapshotValue.environment ||
          item.workspaceId !== this.snapshotValue.workspaceId ||
          item.tenantId !== this.snapshotValue.tenantId
        ) {
          throw new Error("offline_queue_item_scope_mismatch");
        }
        if (
          item.storageEncryption !== currentStorageEncryption
        ) {
          item.storageEncryption = currentStorageEncryption;
          changed = true;
        }
        if (item.state === "syncing") {
          item.state = "review-required";
          item.reviewReason =
            "interrupted-attempt-outcome-unknown";
          item.successfulRemoteExecutionClaimedWithoutReceipt =
            false;
          changed = true;
        }
      }
      changed = this.expireStaleItems(now) || changed;
      if (changed) await this.persist();
    }
    this.initialized = true;
    return this.snapshot;
  }

  async observeConnectivity(input: {
    online: boolean;
    observedAt?: string;
  }) {
    this.requireInitialized();
    const observation = this.detector.observe(
      input.online,
      input.observedAt ?? new Date().toISOString()
    );
    this.snapshotValue.online = observation.online;
    this.snapshotValue.connectivityObservedAt =
      observation.observedAt;

    if (observation.transition === "reconnected") {
      this.snapshotValue.reconnectCount += 1;
      this.snapshotValue.lastReconnectAt =
        observation.observedAt;
      for (const item of this.snapshotValue.items) {
        if (item.state === "queued-offline") {
          item.state = "ready";
        }
      }
    } else if (observation.transition === "went-offline") {
      for (const item of this.snapshotValue.items) {
        if (item.state === "ready") {
          item.state = "queued-offline";
        }
      }
    }

    this.expireStaleItems(observation.observedAt);
    await this.persist();
    return observation;
  }

  async enqueue(input: EnqueueOfflineWorkInput) {
    this.requireInitialized();
    assertApplicationId(
      input.destinationApplicationId,
      "offline_queue_destination_invalid"
    );
    assertId(
      input.logicalOperationId,
      "offline_queue_logical_operation_id_invalid"
    );
    if (
      !OPERATION_PATTERN.test(input.operation) ||
      input.operation.length > 120
    ) {
      throw new Error("offline_queue_operation_invalid");
    }
    assertId(
      input.payloadReference,
      "offline_queue_payload_reference_invalid"
    );
    assertSha(
      input.payloadSha256,
      "offline_queue_payload_hash_invalid"
    );
    const preconditionVersionSha256 =
      input.preconditionVersionSha256 ?? null;
    if (preconditionVersionSha256 !== null) {
      assertSha(
        preconditionVersionSha256,
        "offline_queue_precondition_hash_invalid"
      );
    }

    const now = safeIso(
      input.now ?? new Date().toISOString(),
      "offline_queue_enqueue_time_invalid"
    );
    const ttlMs = input.ttlMs ?? OFFLINE_QUEUE_DEFAULT_TTL_MS;
    if (
      !Number.isInteger(ttlMs) ||
      ttlMs < 60_000 ||
      ttlMs > OFFLINE_QUEUE_MAX_TTL_MS
    ) {
      throw new Error("offline_queue_ttl_invalid");
    }

    this.expireStaleItems(now);

    const key = idempotencyKey({
      hostApplicationId: this.snapshotValue.hostApplicationId,
      hostInstanceId: this.snapshotValue.hostInstanceId,
      environment: this.snapshotValue.environment,
      workspaceId: this.snapshotValue.workspaceId,
      tenantId: this.snapshotValue.tenantId,
      destinationApplicationId:
        input.destinationApplicationId,
      logicalOperationId: input.logicalOperationId,
      operation: input.operation,
      payloadSha256: input.payloadSha256
    });

    const existing = this.snapshotValue.items.find(
      (item) => item.idempotencyKeySha256 === key
    );
    if (existing) {
      return {
        item: cloneItem(existing),
        duplicateSuppressed: true as const
      };
    }

    if (
      this.snapshotValue.items.filter(
        (item) =>
          item.state !== "confirmed" &&
          item.state !== "expired"
      ).length >= OFFLINE_QUEUE_MAX_ITEMS
    ) {
      throw new Error("offline_queue_capacity_exceeded");
    }

    const expiresAt = new Date(
      Date.parse(now) + ttlMs
    ).toISOString();
    const item: OfflineSyncQueueItem = {
      schema: OFFLINE_SYNC_ITEM_SCHEMA,
      version: OFFLINE_SYNC_QUEUE_VERSION,
      itemId: itemIdFor(key),
      environment: this.snapshotValue.environment,
      hostApplicationId:
        this.snapshotValue.hostApplicationId,
      hostInstanceId: this.snapshotValue.hostInstanceId,
      workspaceId: this.snapshotValue.workspaceId,
      tenantId: this.snapshotValue.tenantId,
      destinationApplicationId:
        input.destinationApplicationId,
      logicalOperationId: input.logicalOperationId,
      operation: input.operation,
      payloadReference: input.payloadReference,
      payloadSha256: input.payloadSha256,
      preconditionVersionSha256,
      idempotencyKeySha256: key,
      state: this.snapshotValue.online
        ? "ready"
        : "queued-offline",
      createdAt: now,
      expiresAt,
      attemptCount: 0,
      lastAttemptAt: null,
      lastTransportId: null,
      authorizationEvidenceId: null,
      remoteReceiptId: null,
      reviewReason: null,
      storageEncryption: storageEncryption(this.storage),
      rawPayloadStored: false,
      successfulRemoteExecutionClaimedWithoutReceipt: false
    };

    this.snapshotValue.items.push(item);
    await this.persist();
    return {
      item: cloneItem(item),
      duplicateSuppressed: false as const
    };
  }

  async prepareNextSynchronization(input: {
    transportSelection: SecureTransportSelection;
    remoteVersionByItemId?: Readonly<Record<string, string | null>>;
    now?: string;
  }): Promise<
    | {
        state: "ready";
        handoff: OfflineSyncHandoff;
      }
    | {
        state: "held";
        reason:
          | "offline"
          | "transport-unavailable"
          | "no-pending-work"
          | "precondition-evidence-required"
          | "conflict-detected"
          | "manual-review-required";
        itemId: string | null;
      }
  > {
    this.requireInitialized();
    const now = safeIso(
      input.now ?? new Date().toISOString(),
      "offline_queue_sync_time_invalid"
    );
    this.expireStaleItems(now);

    if (!this.snapshotValue.online) {
      await this.persist();
      return {
        state: "held",
        reason: "offline",
        itemId: null
      };
    }

    if (
      input.transportSelection.state !== "selected" ||
      !input.transportSelection.transport
    ) {
      await this.persist();
      return {
        state: "held",
        reason: "transport-unavailable",
        itemId: null
      };
    }

    const candidates = this.snapshotValue.items
      .filter((item) => item.state === "ready")
      .sort(
        (left, right) =>
          Date.parse(left.createdAt) -
          Date.parse(right.createdAt)
      );

    const item = candidates[0];
    if (!item) {
      await this.persist();
      return {
        state: "held",
        reason: "no-pending-work",
        itemId: null
      };
    }

    if (item.preconditionVersionSha256) {
      const remoteVersion =
        input.remoteVersionByItemId?.[item.itemId];
      if (remoteVersion === undefined || remoteVersion === null) {
        await this.persist();
        return {
          state: "held",
          reason: "precondition-evidence-required",
          itemId: item.itemId
        };
      }
      assertSha(
        remoteVersion,
        "offline_queue_remote_version_invalid"
      );
      if (remoteVersion !== item.preconditionVersionSha256) {
        item.state = "conflict";
        item.reviewReason = "remote-version-conflict";
        await this.persist();
        return {
          state: "held",
          reason: "conflict-detected",
          itemId: item.itemId
        };
      }
    }

    if (item.attemptCount >= OFFLINE_QUEUE_MAX_ATTEMPTS) {
      item.state = "review-required";
      item.reviewReason = "attempt-limit-reached";
      await this.persist();
      return {
        state: "held",
        reason: "manual-review-required",
        itemId: item.itemId
      };
    }

    await this.persist();
    return {
      state: "ready",
      handoff: Object.freeze({
        schema: OFFLINE_SYNC_HANDOFF_SCHEMA,
        version: OFFLINE_SYNC_QUEUE_VERSION,
        itemId: item.itemId,
        destinationApplicationId:
          item.destinationApplicationId,
        operation: item.operation,
        payloadReference: item.payloadReference,
        payloadSha256: item.payloadSha256,
        idempotencyKeySha256:
          item.idempotencyKeySha256,
        transportId:
          input.transportSelection.transport.transportId,
        transportSelectionIdSha256:
          input.transportSelection.audit.selectionIdSha256,
        attemptOrdinal: item.attemptCount + 1,
        expiresAt: item.expiresAt,
        authorizationRequired: true as const,
        networkRequestPerformedByQueue: false as const,
        remoteSuccessAssumed: false as const
      })
    };
  }

  async markAttemptStarted(input: {
    itemId: string;
    transportId: string;
    authorizationEvidenceId: string;
    idempotencyKeySha256: string;
    startedAt?: string;
  }) {
    this.requireInitialized();
    const item = this.requireItem(input.itemId);
    if (item.state !== "ready") {
      throw new Error("offline_queue_item_not_ready");
    }
    if (!this.snapshotValue.online) {
      throw new Error("offline_queue_offline");
    }
    assertId(
      input.authorizationEvidenceId,
      "offline_queue_authorization_evidence_invalid"
    );
    assertId(
      input.transportId,
      "offline_queue_transport_id_invalid"
    );
    if (
      input.idempotencyKeySha256 !==
      item.idempotencyKeySha256
    ) {
      throw new Error("offline_queue_idempotency_mismatch");
    }
    if (item.attemptCount >= OFFLINE_QUEUE_MAX_ATTEMPTS) {
      throw new Error("offline_queue_attempt_limit_reached");
    }

    const startedAt = safeIso(
      input.startedAt ?? new Date().toISOString(),
      "offline_queue_attempt_time_invalid"
    );
    if (Date.parse(startedAt) >= Date.parse(item.expiresAt)) {
      item.state = "expired";
      item.reviewReason = "stale-item-expired";
      await this.persist();
      throw new Error("offline_queue_item_expired");
    }

    item.state = "syncing";
    item.attemptCount += 1;
    item.lastAttemptAt = startedAt;
    item.lastTransportId = input.transportId;
    item.authorizationEvidenceId =
      input.authorizationEvidenceId;
    item.reviewReason = null;
    await this.persist();
    return cloneItem(item);
  }

  async recordSynchronizationOutcome(input: {
    itemId: string;
    outcome: SynchronizationOutcome;
    recordedAt?: string;
  }) {
    this.requireInitialized();
    const item = this.requireItem(input.itemId);
    if (item.state !== "syncing") {
      throw new Error("offline_queue_item_not_syncing");
    }
    safeIso(
      input.recordedAt ?? new Date().toISOString(),
      "offline_queue_outcome_time_invalid"
    );

    switch (input.outcome.kind) {
      case "acknowledged-success":
        assertId(
          input.outcome.remoteReceiptId,
          "offline_queue_remote_receipt_invalid"
        );
        if (
          input.outcome.idempotencyKeyEcho !==
          item.idempotencyKeySha256
        ) {
          item.state = "review-required";
          item.reviewReason =
            "remote-receipt-idempotency-mismatch";
          item.remoteReceiptId = null;
        } else {
          item.state = "confirmed";
          item.remoteReceiptId =
            input.outcome.remoteReceiptId;
          item.reviewReason = null;
        }
        break;
      case "transport-not-started":
        item.state =
          item.attemptCount >= OFFLINE_QUEUE_MAX_ATTEMPTS
            ? "review-required"
            : this.snapshotValue.online
              ? "ready"
              : "queued-offline";
        item.reviewReason =
          item.state === "review-required"
            ? "attempt-limit-reached"
            : null;
        break;
      case "remote-rejected":
        item.state = "review-required";
        item.reviewReason =
          "remote-rejected:" +
          input.outcome.reasonCode.slice(0, 96);
        break;
      case "remote-outcome-unknown":
        item.state = "review-required";
        item.reviewReason =
          "ambiguous-remote-outcome:" +
          input.outcome.reasonCode.slice(0, 96);
        break;
      default:
        throw new Error("offline_queue_outcome_invalid");
    }

    item.successfulRemoteExecutionClaimedWithoutReceipt =
      false;
    await this.persist();
    return cloneItem(item);
  }

  async releaseManualReview(input: {
    itemId: string;
    decision:
      | "retry-same-idempotency-key"
      | "cancel"
      | "mark-confirmed-with-receipt";
    reviewedAt?: string;
    remoteReceiptId?: string;
    idempotencyKeyEcho?: string;
  }) {
    this.requireInitialized();
    const item = this.requireItem(input.itemId);
    if (
      item.state !== "review-required" &&
      item.state !== "conflict"
    ) {
      throw new Error("offline_queue_item_not_in_review");
    }
    safeIso(
      input.reviewedAt ?? new Date().toISOString(),
      "offline_queue_review_time_invalid"
    );

    if (input.decision === "retry-same-idempotency-key") {
      if (item.attemptCount >= OFFLINE_QUEUE_MAX_ATTEMPTS) {
        throw new Error("offline_queue_attempt_limit_reached");
      }
      item.state = this.snapshotValue.online
        ? "ready"
        : "queued-offline";
      item.reviewReason = null;
    } else if (input.decision === "cancel") {
      item.state = "expired";
      item.reviewReason = "owner-cancelled";
    } else {
      if (
        !input.remoteReceiptId ||
        !input.idempotencyKeyEcho
      ) {
        throw new Error(
          "offline_queue_confirmation_receipt_required"
        );
      }
      assertId(
        input.remoteReceiptId,
        "offline_queue_remote_receipt_invalid"
      );
      if (
        input.idempotencyKeyEcho !==
        item.idempotencyKeySha256
      ) {
        throw new Error(
          "offline_queue_confirmation_idempotency_mismatch"
        );
      }
      item.state = "confirmed";
      item.remoteReceiptId = input.remoteReceiptId;
      item.reviewReason = null;
    }

    item.successfulRemoteExecutionClaimedWithoutReceipt =
      false;
    await this.persist();
    return cloneItem(item);
  }

  metrics(now = new Date().toISOString()): OfflineQueueHealthMetrics {
    this.requireInitialized();
    const nowMs = Date.parse(
      safeIso(now, "offline_queue_metrics_time_invalid")
    );
    const count = (state: OfflineQueueItemState) =>
      this.snapshotValue.items.filter(
        (item) => item.state === state
      ).length;
    const pendingItems = this.snapshotValue.items.filter(
      (item) =>
        item.state !== "confirmed" &&
        item.state !== "expired"
    );
    const oldestPendingAgeMs = pendingItems.length
      ? Math.max(
          0,
          nowMs -
            Math.min(
              ...pendingItems.map((item) =>
                Date.parse(item.createdAt)
              )
            )
        )
      : null;

    return Object.freeze({
      schema: OFFLINE_SYNC_METRICS_SCHEMA,
      version: OFFLINE_SYNC_QUEUE_VERSION,
      total: this.snapshotValue.items.length,
      queuedOffline: count("queued-offline"),
      ready: count("ready"),
      syncing: count("syncing"),
      reviewRequired: count("review-required"),
      conflicts: count("conflict"),
      expired: count("expired"),
      confirmed: count("confirmed"),
      pending: pendingItems.length,
      capacity: OFFLINE_QUEUE_MAX_ITEMS,
      capacityUsedPercent: Math.round(
        (pendingItems.length / OFFLINE_QUEUE_MAX_ITEMS) *
          10000
      ) / 100,
      oldestPendingAgeMs,
      reconnectCount: this.snapshotValue.reconnectCount,
      lastReconnectAt: this.snapshotValue.lastReconnectAt,
      online: this.snapshotValue.online,
      storageEncryption: storageEncryption(this.storage),
      rawPayloadStored: false as const,
      ambiguousOutcomeAutoRetried: false as const
    });
  }

  private expireStaleItems(now: string) {
    const nowMs = Date.parse(
      safeIso(now, "offline_queue_expiry_time_invalid")
    );
    let changed = false;
    for (const item of this.snapshotValue.items) {
      if (
        item.state !== "confirmed" &&
        item.state !== "expired" &&
        Date.parse(item.expiresAt) <= nowMs
      ) {
        item.state = "expired";
        item.reviewReason = "stale-item-expired";
        changed = true;
      }
    }
    return changed;
  }

  private requireInitialized() {
    if (!this.initialized) {
      throw new Error("offline_queue_not_initialized");
    }
  }

  private requireItem(itemId: string) {
    assertId(itemId, "offline_queue_item_id_invalid");
    const item = this.snapshotValue.items.find(
      (candidate) => candidate.itemId === itemId
    );
    if (!item) throw new Error("offline_queue_item_not_found");
    return item;
  }

  private async persist() {
    const requireEncryptionAtRest =
      this.storage.capabilities.encryptionAtRest ===
      "supported";
    await this.storage.save(
      cloneSnapshot(this.snapshotValue),
      {
        requireEncryptionAtRest,
        rawPayloadPermitted: false
      }
    );
  }
}

export function createMemoryOfflineQueueStorage(input?: {
  encryptedAtRest?: boolean;
}) {
  let snapshot: OfflineSyncQueueSnapshot | null = null;
  let lastSaveOptions:
    | {
        requireEncryptionAtRest: boolean;
        rawPayloadPermitted: false;
      }
    | null = null;

  const adapter: OfflineQueueStorageAdapter & {
    inspect(): {
      snapshot: OfflineSyncQueueSnapshot | null;
      lastSaveOptions: typeof lastSaveOptions;
    };
  } = {
    adapterId: "rosevear.offline-queue.memory",
    capabilities: {
      persistence: "memory",
      encryptionAtRest:
        input?.encryptedAtRest === true
          ? "supported"
          : "unsupported"
    },
    async load() {
      return snapshot ? cloneSnapshot(snapshot) : null;
    },
    async save(value, options) {
      if (options.rawPayloadPermitted !== false) {
        throw new Error("offline_queue_raw_payload_forbidden");
      }
      snapshot = cloneSnapshot(value);
      lastSaveOptions = { ...options };
    },
    inspect() {
      return {
        snapshot: snapshot ? cloneSnapshot(snapshot) : null,
        lastSaveOptions
      };
    }
  };

  return adapter;
}

export function offlineSynchronizationDescriptor() {
  return Object.freeze({
    schema:
      "rosevear.ai-data-platform.offline-sync-module.v1",
    version: OFFLINE_SYNC_QUEUE_VERSION,
    boundedQueue: {
      maximumItems: OFFLINE_QUEUE_MAX_ITEMS,
      defaultTtlMs: OFFLINE_QUEUE_DEFAULT_TTL_MS,
      maximumTtlMs: OFFLINE_QUEUE_MAX_TTL_MS,
      maximumAttempts: OFFLINE_QUEUE_MAX_ATTEMPTS
    },
    localMetadata: {
      rawPayloadStored: false,
      payloadReferenceAndSha256Only: true,
      encryptedAtRestRequestedWhenSupported: true,
      unsupportedEncryptionFallback:
        "reference-only-metadata-with-explicit-unsupported-state"
    },
    reconnectDetection: true,
    deterministicIdempotencyKeys: true,
    staleItemExpiry: true,
    conflictDetection: true,
    ambiguousOutcomeRequiresManualReview: true,
    queueHealthMetrics: true,
    security: {
      offlineModeClaimsRemoteSuccess: false,
      ambiguousOutcomeAutoRetries: false,
      idempotencyKeyChangesOnRetry: false,
      synchronizationGrantsAuthorization: false,
      queuePerformsNetworkRequest: false
    }
  });
}
