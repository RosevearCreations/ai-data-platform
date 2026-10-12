import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import {
  createApprovedDatasetPublication
} from "../lib/approved-dataset-publishing";
import {
  createConsumerLiveActivation,
  finalizeIdempotentLiveDelivery,
  getActiveConsumerLiveActivation,
  listControlledLiveDeliveryForUser,
  reserveIdempotentLiveDelivery,
  revokeConsumerLiveActivation
} from "../lib/controlled-live-delivery";
import {
  closeDatabasePools,
  listWorkspacesForUser,
  withUserDatabase
} from "../lib/database";
import {
  createDataReviewBatch,
  decideDataReviewBatch
} from "../lib/data-review-workbench";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  type LiveConsumerHandshake
} from "../lib/integration-delivery";
import {
  createPublicationDeliveryMapping,
  loadPublicationDeliveryPackage,
  recordPublicationDeliveryReceipt
} from "../lib/publication-delivery-bridge";

async function existingUser(email: string) {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password: "build-002-ci-fixture-password-not-a-secret"
    }
  });
  if (!result.user?.id) throw new Error("Build 051 fixture user unavailable.");
  return result.user.id;
}

async function insertDataset(
  ownerId: string,
  workspaceId: string,
  datasetId: string
) {
  const now = new Date().toISOString();
  const payload = {
    recipeName: "Build 051 controlled live delivery",
    sourceUrl: "https://example.test/build-051",
    retrievedAt: now,
    rows: [
      {
        recordId: "live-" + datasetId.slice(-8),
        competitorBusinessName: "Build 051 Detailer",
        offeringName: "Complete",
        priceMinimumCad: 209,
        sourceUrl: "https://example.test/build-051/live",
        retrievedAt: now
      }
    ]
  };

  await withUserDatabase(ownerId, async (client) => {
    await client.query(
      `insert into app.workspace_reviewed_datasets (
        workspace_id,dataset_id,recipe_name,source_url,retrieved_at,
        client_updated_at,row_count,server_version,payload
      ) values ($1,$2,$3,$4,$5::timestamptz,now(),$6,1,$7::jsonb)`,
      [
        workspaceId,
        datasetId,
        payload.recipeName,
        payload.sourceUrl,
        payload.retrievedAt,
        payload.rows.length,
        JSON.stringify(payload)
      ]
    );
  });
}

async function main() {
  const ownerId = await existingUser("build002-owner@example.test");
  const outsiderId = await existingUser("build002-restricted@example.test");
  const workspaces = await listWorkspacesForUser(ownerId);
  const workspace =
    workspaces.find((item) => item.slug === "rosiedazzlers") ?? workspaces[0];
  if (!workspace) throw new Error("Build 051 owner workspace unavailable.");

  const datasetId = "build-051-" + randomUUID();
  await insertDataset(ownerId, workspace.id, datasetId);

  const reviewId = await createDataReviewBatch(ownerId, workspace.id, datasetId);
  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "Build 051 live-delivery fixture"
  });

  const publicationId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "Build 051 live-delivery fixture"
  });

  const mappingId = await createPublicationDeliveryMapping(ownerId, {
    workspaceId: workspace.id,
    publicationId,
    target: "rosie-dazzlers",
    integrationKeyField: "recordId",
    operationAction: "create",
    evidenceUrlField: "sourceUrl",
    evidenceTimestampField: "retrievedAt",
    fieldMap: {
      competitorBusinessName: "competitorBusinessName",
      offeringName: "offeringName",
      priceMinimumCad: "priceMinimumCad",
      sourceUrl: "sourceUrl",
      retrievedAt: "retrievedAt"
    }
  });

  const bridge = await loadPublicationDeliveryPackage(ownerId, {
    workspaceId: workspace.id,
    mappingId
  });
  const consumerId = "https://consumer.example.test";

  await recordPublicationDeliveryReceipt(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    publicationId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    target: "rosie-dazzlers",
    transportMode: "live",
    consumerId,
    package: bridge.package,
    receiptStatus: "accepted",
    validationCode: "dry-run-valid",
    dryRun: true,
    consumerReceivedAt: new Date().toISOString(),
    details: { build: 51, fixture: true }
  });

  const handshake: LiveConsumerHandshake = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    target: "rosie-dazzlers",
    contractVersion: 1,
    schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
    authentication: "bearer",
    dryRunSupported: true,
    liveMutationEnabled: true,
    idempotency: {
      keySource: "replayKey",
      duplicateBehavior: "return-original-ack"
    }
  };

  const activationId = await createConsumerLiveActivation(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    package: bridge.package,
    handshake
  });

  const duplicateActivationId = await createConsumerLiveActivation(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    package: bridge.package,
    handshake
  });
  if (duplicateActivationId !== activationId) {
    throw new Error("Build 051 identical active activation was not canonicalized.");
  }

  const activation = await getActiveConsumerLiveActivation(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    consumerId,
    package: bridge.package
  });
  if (
    activation.activationId !== activationId ||
    activation.packageFingerprint !== bridge.package.fingerprint
  ) {
    throw new Error("Build 051 activation did not pin the package identity.");
  }

  const outsider = await listControlledLiveDeliveryForUser(outsiderId);
  if (outsider.activations.some((item) => item.activationId === activationId)) {
    throw new Error("Build 051 activation leaked cross-account.");
  }

  let blocked = false;
  try {
    await getActiveConsumerLiveActivation(outsiderId, {
      workspaceId: workspace.id,
      mappingId,
      consumerId,
      package: bridge.package
    });
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("Build 051 outsider activation access was not blocked.");

  const first = await reserveIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    activationFingerprint: activation.activationFingerprint,
    package: bridge.package
  });
  if (!first.shouldSend || first.delivery.attemptCount !== 1) {
    throw new Error("Build 051 first live delivery was not reserved exactly once.");
  }
  if (first.delivery.idempotencyKey !== bridge.package.replayKey) {
    throw new Error("Build 051 idempotency key is not the package replay key.");
  }

  await finalizeIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: first.delivery.deliveryId,
    status: "transport-error",
    validationCode: "fixture-transport-error"
  });

  const retry = await reserveIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    activationFingerprint: activation.activationFingerprint,
    package: bridge.package
  });
  if (
    !retry.shouldSend ||
    retry.reason !== "retry" ||
    retry.delivery.attemptCount !== 2 ||
    retry.delivery.idempotencyKey !== first.delivery.idempotencyKey
  ) {
    throw new Error("Build 051 transport retry did not reuse the canonical idempotency key.");
  }

  await finalizeIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: retry.delivery.deliveryId,
    status: "accepted",
    validationCode: "accepted",
    httpStatus: 200,
    consumerReceivedAt: new Date().toISOString(),
    acknowledgement: {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      status: "accepted",
      dryRun: false
    }
  });

  const terminal = await reserveIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    activationFingerprint: activation.activationFingerprint,
    package: bridge.package
  });
  if (
    terminal.shouldSend ||
    terminal.reason !== "accepted" ||
    terminal.delivery.attemptCount !== 2
  ) {
    throw new Error("Build 051 accepted live delivery was eligible for resend.");
  }

  let immutableActivationBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_consumer_live_activations
         set activation_fingerprint='tampered'
         where workspace_id=$1 and activation_id=$2`,
        [workspace.id, activationId]
      );
    });
  } catch {
    immutableActivationBlocked = true;
  }
  if (!immutableActivationBlocked) {
    throw new Error("Build 051 runtime could mutate activation identity.");
  }

  let immutableDeliveryBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_publication_live_deliveries
         set idempotency_key='tampered'
         where workspace_id=$1 and delivery_id=$2`,
        [workspace.id, first.delivery.deliveryId]
      );
    });
  } catch {
    immutableDeliveryBlocked = true;
  }
  if (!immutableDeliveryBlocked) {
    throw new Error("Build 051 runtime could mutate the live idempotency key.");
  }

  await revokeConsumerLiveActivation(ownerId, {
    workspaceId: workspace.id,
    activationId,
    note: "Build 051 CI revocation"
  });

  blocked = false;
  try {
    await getActiveConsumerLiveActivation(ownerId, {
      workspaceId: workspace.id,
      mappingId,
      consumerId,
      package: bridge.package
    });
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("Build 051 revoked activation remained usable.");

  const finalModel = await listControlledLiveDeliveryForUser(ownerId);
  const delivery = finalModel.deliveries.find(
    (item) => item.deliveryId === first.delivery.deliveryId
  );
  if (
    !delivery ||
    delivery.status !== "accepted" ||
    delivery.attemptCount !== 2 ||
    delivery.activationFingerprint !== activation.activationFingerprint
  ) {
    throw new Error("Build 051 final live-delivery evidence is incomplete.");
  }

  console.log(
    "Build 051 activation, recent dry-run gate, RLS, immutable identity, idempotent retry, accepted-terminal behavior and revocation passed."
  );
}

main().finally(() => closeDatabasePools());
