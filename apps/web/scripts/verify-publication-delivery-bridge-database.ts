import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import {
  createApprovedDatasetPublication
} from "../lib/approved-dataset-publishing";
import {
  createDataReviewBatch,
  decideDataReviewBatch,
  listDataReviewWorkbenchForUser
} from "../lib/data-review-workbench";
import {
  closeDatabasePools,
  listWorkspacesForUser,
  withUserDatabase
} from "../lib/database";
import {
  createPublicationDeliveryMapping,
  listPublicationDeliveryBridgeForUser,
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
  if (!result.user?.id) throw new Error("Build 050 fixture user unavailable.");
  return result.user.id;
}

async function insertDataset(
  ownerId: string,
  workspaceId: string,
  datasetId: string
) {
  const payload = {
    recipeName: "Build 050 publication bridge",
    sourceUrl: "https://example.test/build-050",
    retrievedAt: "2026-10-12T12:00:00.000Z",
    rows: [
      {
        recordId: "alpha-" + datasetId.slice(-8),
        competitorBusinessName: "Alpha Detail",
        offeringName: "Complete",
        priceMinimumCad: 199,
        sourceUrl: "https://example.test/build-050/alpha",
        retrievedAt: "2026-10-12T12:00:00.000Z"
      },
      {
        recordId: "beta-" + datasetId.slice(-8),
        competitorBusinessName: "Beta Detail",
        offeringName: "Interior",
        priceMinimumCad: 175,
        sourceUrl: "https://example.test/build-050/beta",
        retrievedAt: "2026-10-12T12:05:00.000Z"
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
  if (!workspace) throw new Error("Build 050 owner workspace unavailable.");

  const datasetId = "build-050-" + randomUUID();
  await insertDataset(ownerId, workspace.id, datasetId);

  const reviewId = await createDataReviewBatch(
    ownerId,
    workspace.id,
    datasetId
  );
  const review = (await listDataReviewWorkbenchForUser(ownerId)).batches.find(
    (item) => item.reviewId === reviewId
  );
  if (!review || review.rows.length !== 2) {
    throw new Error("Build 050 review fixture unavailable.");
  }

  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "Build 050 delivery bridge fixture"
  });

  const publicationId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "Build 050 fixture publication"
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

  const ownerModel = await listPublicationDeliveryBridgeForUser(ownerId);
  const mapping = ownerModel.mappings.find((item) => item.mappingId === mappingId);
  if (!mapping || !mapping.readiness.ready) {
    throw new Error(
      "Build 050 mapping did not become package-ready: " +
        JSON.stringify(mapping?.readiness.blockers ?? [])
    );
  }

  const duplicateMappingId = await createPublicationDeliveryMapping(ownerId, {
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
  if (duplicateMappingId !== mappingId) {
    throw new Error("Build 050 identical mapping was not canonicalized.");
  }

  const outsiderModel = await listPublicationDeliveryBridgeForUser(outsiderId);
  if (outsiderModel.mappings.some((item) => item.mappingId === mappingId)) {
    throw new Error("Build 050 mapping leaked cross-account.");
  }

  let blocked = false;
  try {
    await loadPublicationDeliveryPackage(outsiderId, {
      workspaceId: workspace.id,
      mappingId
    });
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("Build 050 outsider package load was not blocked.");

  const bridge = await loadPublicationDeliveryPackage(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    now: new Date("2026-10-12T14:00:00.000Z")
  });
  if (
    bridge.package.operations.length !== 2 ||
    !bridge.package.batchId.includes(publicationId) ||
    !bridge.package.batchId.includes(mapping.mappingFingerprint.slice(0, 24))
  ) {
    throw new Error("Build 050 package did not preserve publication/mapping identity.");
  }

  await recordPublicationDeliveryReceipt(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    publicationId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    target: "rosie-dazzlers",
    transportMode: "conformance",
    consumerId: "build-050-ci-consumer",
    package: bridge.package,
    receiptStatus: "accepted",
    validationCode: "valid",
    dryRun: true,
    consumerReceivedAt: "2026-10-12T14:00:10.000Z",
    details: { fixture: true }
  });

  const afterReceipt = await listPublicationDeliveryBridgeForUser(ownerId);
  const receipt = afterReceipt.receipts.find(
    (item) =>
      item.mappingId === mappingId &&
      item.consumerId === "build-050-ci-consumer"
  );
  if (
    !receipt ||
    receipt.publicationFingerprint !== bridge.publication.publicationFingerprint ||
    receipt.mappingFingerprint !== bridge.mapping.mappingFingerprint ||
    receipt.packageFingerprint !== bridge.package.fingerprint
  ) {
    throw new Error("Build 050 receipt chain did not preserve all fingerprints.");
  }

  let immutableBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_publication_delivery_mappings
         set field_map='{}'::jsonb
         where workspace_id=$1 and mapping_id=$2`,
        [workspace.id, mappingId]
      );
    });
  } catch {
    immutableBlocked = true;
  }
  if (!immutableBlocked) {
    throw new Error("Build 050 runtime could mutate immutable mapping fields.");
  }

  await retirePublicationDeliveryMapping(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    retirementNote: "Build 050 CI retirement"
  });

  blocked = false;
  try {
    await loadPublicationDeliveryPackage(ownerId, {
      workspaceId: workspace.id,
      mappingId
    });
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("Build 050 retired mapping still generated packages.");

  const finalModel = await listPublicationDeliveryBridgeForUser(ownerId);
  const retired = finalModel.mappings.find((item) => item.mappingId === mappingId);
  if (!retired || retired.status !== "retired" || !retired.retiredAt) {
    throw new Error("Build 050 mapping retirement evidence did not persist.");
  }

  console.log(
    "Build 050 mapping persistence, canonical identity, RLS isolation, immutable grants, package bridge, receipt chain and retirement passed."
  );
}

main().finally(() => closeDatabasePools());
