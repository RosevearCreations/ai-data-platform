import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import {
  createApprovedDatasetPublication,
  withdrawApprovedDatasetPublication
} from "../lib/approved-dataset-publishing";
import {
  createConsumerLiveActivation,
  finalizeIdempotentLiveDelivery,
  reserveIdempotentLiveDelivery
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
  type ConsumerStateVerificationResponse,
  type LiveConsumerHandshake
} from "../lib/integration-delivery";
import {
  compareConsumerState,
  listPostDeliveryReconciliationForUser,
  loadAcceptedDeliveryReconciliationContext,
  recordLiveDeliveryReconciliation
} from "../lib/post-delivery-reconciliation";
import {
  createPublicationDeliveryMapping,
  loadPublicationDeliveryPackage,
  recordPublicationDeliveryReceipt,
  retirePublicationDeliveryMapping
} from "../lib/publication-delivery-bridge";

async function existingUser(email: string) {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password: "build-002-ci-fixture-password-not-a-secret"
    }
  });
  if (!result.user?.id) throw new Error("Build 052 fixture user unavailable.");
  return result.user.id;
}

async function insertDataset(
  ownerId: string,
  workspaceId: string,
  datasetId: string
) {
  const now = new Date().toISOString();
  const payload = {
    recipeName: "Build 052 reconciliation",
    sourceUrl: "https://example.test/build-052",
    retrievedAt: now,
    rows: [
      {
        recordId: "reconcile-" + datasetId.slice(-8),
        competitorBusinessName: "Build 052 Detailer",
        offeringName: "Complete",
        priceMinimumCad: 219,
        sourceUrl: "https://example.test/build-052/live",
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
  if (!workspace) throw new Error("Build 052 owner workspace unavailable.");

  const datasetId = "build-052-" + randomUUID();
  await insertDataset(ownerId, workspace.id, datasetId);

  const reviewId = await createDataReviewBatch(ownerId, workspace.id, datasetId);
  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "Build 052 reconciliation fixture"
  });

  const publicationId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "Build 052 reconciliation fixture"
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
    details: { build: 52, fixture: true }
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

  const activationModel = await withUserDatabase(ownerId, async (client) => {
    const result = await client.query<{ activation_fingerprint: string }>(
      `select activation_fingerprint
       from app.workspace_consumer_live_activations
       where workspace_id=$1 and activation_id=$2`,
      [workspace.id, activationId]
    );
    return result.rows[0]?.activation_fingerprint;
  });
  if (!activationModel) throw new Error("Build 052 activation fingerprint unavailable.");

  const reservation = await reserveIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    activationFingerprint: activationModel,
    package: bridge.package
  });
  if (!reservation.shouldSend) {
    throw new Error("Build 052 live delivery fixture was not reserved.");
  }

  const accepted = await finalizeIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: reservation.delivery.deliveryId,
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

  await retirePublicationDeliveryMapping(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    retirementNote: "Build 052 verifies historical delivery after retirement."
  });
  await withdrawApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    publicationId,
    withdrawalNote: "Build 052 verifies historical delivery after withdrawal."
  });

  const context = await loadAcceptedDeliveryReconciliationContext(ownerId, {
    workspaceId: workspace.id,
    deliveryId: accepted.deliveryId
  });
  if (
    context.package.packageId !== bridge.package.packageId ||
    context.package.replayKey !== bridge.package.replayKey ||
    context.package.fingerprint !== bridge.package.fingerprint
  ) {
    throw new Error("Build 052 historical package reconstruction changed identity.");
  }

  const response: ConsumerStateVerificationResponse = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "verified",
    target: "rosie-dazzlers",
    packageId: context.package.packageId,
    replayKey: context.package.replayKey,
    fingerprint: context.package.fingerprint,
    verifiedAt: new Date().toISOString(),
    records: context.package.operations.map((operation) => ({
      integrationKey: operation.integrationKey,
      status: "found",
      values: { ...operation.values }
    }))
  };
  const comparison = compareConsumerState(context.package, response);
  if (
    comparison.status !== "matched" ||
    comparison.matchedCount !== context.package.operations.length
  ) {
    throw new Error("Build 052 matching consumer state did not reconcile.");
  }

  const reconciliationId = await recordLiveDeliveryReconciliation(ownerId, {
    workspaceId: workspace.id,
    deliveryId: accepted.deliveryId,
    activationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    package: context.package,
    status: comparison.status,
    expectedRecordCount: comparison.expectedRecordCount,
    matchedCount: comparison.matchedCount,
    mismatchedCount: comparison.mismatchedCount,
    missingCount: comparison.missingCount,
    validationCode: response.code,
    httpStatus: 200,
    consumerVerifiedAt: response.verifiedAt,
    verificationFingerprint: comparison.verificationFingerprint,
    recordResults: comparison.recordResults
  });

  const ownerModel = await listPostDeliveryReconciliationForUser(ownerId);
  const stored = ownerModel.reconciliations.find(
    (item) => item.reconciliationId === reconciliationId
  );
  if (
    !stored ||
    stored.status !== "matched" ||
    stored.packageFingerprint !== context.package.fingerprint ||
    stored.recordResults.length !== context.package.operations.length
  ) {
    throw new Error("Build 052 reconciliation evidence did not persist.");
  }

  const outsiderModel = await listPostDeliveryReconciliationForUser(outsiderId);
  if (
    outsiderModel.reconciliations.some(
      (item) => item.reconciliationId === reconciliationId
    )
  ) {
    throw new Error("Build 052 reconciliation leaked cross-account.");
  }

  let blocked = false;
  try {
    await loadAcceptedDeliveryReconciliationContext(outsiderId, {
      workspaceId: workspace.id,
      deliveryId: accepted.deliveryId
    });
  } catch {
    blocked = true;
  }
  if (!blocked) {
    throw new Error("Build 052 outsider historical delivery access was not blocked.");
  }

  let updateBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_live_delivery_reconciliations
         set status='drift'
         where workspace_id=$1 and reconciliation_id=$2`,
        [workspace.id, reconciliationId]
      );
    });
  } catch {
    updateBlocked = true;
  }
  if (!updateBlocked) {
    throw new Error("Build 052 runtime could mutate reconciliation evidence.");
  }

  let deleteBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `delete from app.workspace_live_delivery_reconciliations
         where workspace_id=$1 and reconciliation_id=$2`,
        [workspace.id, reconciliationId]
      );
    });
  } catch {
    deleteBlocked = true;
  }
  if (!deleteBlocked) {
    throw new Error("Build 052 runtime could delete reconciliation evidence.");
  }

  console.log(
    "Build 052 historical package reconstruction, matched reconciliation, append-only evidence and cross-account RLS passed."
  );
}

main().finally(() => closeDatabasePools());
