import { randomUUID } from "node:crypto";

import {
  createApprovedDatasetExport,
  createApprovedDatasetPublication,
  listApprovedDatasetPublishingForUser,
  withdrawApprovedDatasetPublication
} from "../lib/approved-dataset-publishing";
import { auth } from "../lib/auth";
import {
  closeDatabasePools,
  listWorkspacesForUser,
  withUserDatabase
} from "../lib/database";
import {
  createDataReviewBatch,
  decideDataReviewBatch,
  listDataReviewWorkbenchForUser,
  saveDataReviewBatch
} from "../lib/data-review-workbench";

async function existingUser(email: string) {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password: "build-002-ci-fixture-password-not-a-secret"
    }
  });
  if (!result.user?.id) {
    throw new Error("Build 049 could not reuse the isolation fixture user.");
  }
  return result.user.id;
}

async function insertDataset(
  ownerId: string,
  workspaceId: string,
  datasetId: string,
  name: string
) {
  const payload = {
    recipeName: name,
    sourceUrl: "https://example.test/build-049",
    retrievedAt: new Date().toISOString(),
    rows: [
      { name: " Alpha ", price: "$10", meta: { source: "fixture" } },
      { name: "Beta", price: "$12", meta: { source: "fixture" } }
    ]
  };

  await withUserDatabase(ownerId, async (client) => {
    await client.query(
      `insert into app.workspace_reviewed_datasets (
        workspace_id,dataset_id,recipe_name,source_url,retrieved_at,
        client_updated_at,row_count,server_version,payload
      ) values ($1,$2,$3,$4,now(),now(),$5,1,$6::jsonb)`,
      [
        workspaceId,
        datasetId,
        payload.recipeName,
        payload.sourceUrl,
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
  if (!workspace) throw new Error("Build 049 owner has no seeded workspace.");

  const unapprovedDatasetId = "build-049-unapproved-" + randomUUID();
  await insertDataset(ownerId, workspace.id, unapprovedDatasetId, "Build 049 unapproved");
  const unapprovedReviewId = await createDataReviewBatch(
    ownerId,
    workspace.id,
    unapprovedDatasetId
  );

  let unapprovedBlocked = false;
  try {
    await createApprovedDatasetPublication(ownerId, {
      workspaceId: workspace.id,
      reviewId: unapprovedReviewId
    });
  } catch {
    unapprovedBlocked = true;
  }
  if (!unapprovedBlocked) {
    throw new Error("Build 049 published an in-review batch.");
  }

  const datasetId = "build-049-approved-" + randomUUID();
  await insertDataset(ownerId, workspace.id, datasetId, "Build 049 approved");
  const reviewId = await createDataReviewBatch(ownerId, workspace.id, datasetId);

  const review = (await listDataReviewWorkbenchForUser(ownerId)).batches.find(
    (batch) => batch.reviewId === reviewId
  );
  if (!review) throw new Error("Build 049 review fixture was not created.");

  await saveDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    rows: review.rows.map((row, index) => ({
      id: row.id,
      included: index === 0,
      cleaned:
        index === 0
          ? { ...row.cleaned, name: "Approved Alpha", price: "$10.00" }
          : row.cleaned
    })),
    reviewNote: "Build 049 approval source"
  });
  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "Build 049 approval source"
  });

  const publicationId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "CI publication handoff"
  });

  const ownerModel = await listApprovedDatasetPublishingForUser(ownerId);
  const publication = ownerModel.publications.find(
    (item) => item.publicationId === publicationId
  );
  if (!publication || publication.status !== "published") {
    throw new Error("Build 049 durable publication creation failed.");
  }
  if (publication.rowCount !== 1) {
    throw new Error("Build 049 publication did not freeze included rows only.");
  }
  if (publication.publishedRows[0]?.name !== "Approved Alpha") {
    throw new Error("Build 049 publication did not freeze the approved cleaned row.");
  }
  if (!publication.publicationFingerprint.startsWith("pub1-")) {
    throw new Error("Build 049 publication fingerprint was not persisted.");
  }

  const duplicateId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "must remain canonical"
  });
  if (duplicateId !== publicationId) {
    throw new Error("Build 049 created multiple publications for one approved review.");
  }

  const outsiderModel = await listApprovedDatasetPublishingForUser(outsiderId);
  if (outsiderModel.publications.some((item) => item.publicationId === publicationId)) {
    throw new Error("Build 049 RLS leaked a publication cross-account.");
  }

  let outsiderExportBlocked = false;
  try {
    await createApprovedDatasetExport(outsiderId, {
      workspaceId: workspace.id,
      publicationId,
      format: "json"
    });
  } catch {
    outsiderExportBlocked = true;
  }
  if (!outsiderExportBlocked) {
    throw new Error("Build 049 outsider export was not blocked.");
  }

  const jsonExport = await createApprovedDatasetExport(ownerId, {
    workspaceId: workspace.id,
    publicationId,
    format: "json"
  });
  if (!jsonExport.body.includes('"schema": "ai-data-platform.approved-dataset-publication.v1"')) {
    throw new Error("Build 049 JSON export is missing the handoff schema.");
  }
  if (!jsonExport.body.includes('"Approved Alpha"')) {
    throw new Error("Build 049 JSON export is missing the approved snapshot row.");
  }

  const csvExport = await createApprovedDatasetExport(ownerId, {
    workspaceId: workspace.id,
    publicationId,
    format: "csv"
  });
  if (!csvExport.body.includes('"Approved Alpha"')) {
    throw new Error("Build 049 CSV export is missing the approved snapshot row.");
  }

  const afterExports = await listApprovedDatasetPublishingForUser(ownerId);
  const exported = afterExports.publications.find(
    (item) => item.publicationId === publicationId
  );
  if (!exported || exported.eventCount < 3) {
    throw new Error("Build 049 publication/export audit evidence is incomplete.");
  }

  await withdrawApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    publicationId,
    withdrawalNote: "CI withdrawal verification"
  });

  const withdrawn = (await listApprovedDatasetPublishingForUser(ownerId)).publications.find(
    (item) => item.publicationId === publicationId
  );
  if (!withdrawn || withdrawn.status !== "withdrawn" || !withdrawn.withdrawnAt) {
    throw new Error("Build 049 withdrawal evidence did not persist.");
  }

  let withdrawnExportBlocked = false;
  try {
    await createApprovedDatasetExport(ownerId, {
      workspaceId: workspace.id,
      publicationId,
      format: "json"
    });
  } catch {
    withdrawnExportBlocked = true;
  }
  if (!withdrawnExportBlocked) {
    throw new Error("Build 049 exported a withdrawn publication.");
  }

  console.log(
    "Build 049 approved-only publication, immutable snapshot, exports, RLS isolation, audit and withdrawal passed."
  );
}

main().finally(() => closeDatabasePools());
