import { randomUUID } from "node:crypto";

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
    throw new Error("Build 048 could not reuse the isolation fixture user.");
  }
  return result.user.id;
}

async function main() {
  const ownerId = await existingUser("build002-owner@example.test");
  const outsiderId = await existingUser("build002-restricted@example.test");
  const workspaces = await listWorkspacesForUser(ownerId);
  const workspace =
    workspaces.find((item) => item.slug === "rosiedazzlers") ?? workspaces[0];
  if (!workspace) throw new Error("Build 048 owner has no seeded workspace.");

  const datasetId = "build-048-" + randomUUID();
  const payload = {
    recipeName: "Build 048 CI dataset",
    sourceUrl: "https://example.test/build-048",
    retrievedAt: new Date().toISOString(),
    rows: [
      { name: "  First   row ", price: "$10" },
      { name: "First row", price: "$10" },
      { name: " Second row ", price: "$20" }
    ]
  };

  await withUserDatabase(ownerId, async (client) => {
    await client.query(
      `insert into app.workspace_reviewed_datasets (
        workspace_id,dataset_id,recipe_name,source_url,retrieved_at,
        client_updated_at,row_count,server_version,payload
      ) values ($1,$2,$3,$4,now(),now(),$5,1,$6::jsonb)`,
      [
        workspace.id,
        datasetId,
        payload.recipeName,
        payload.sourceUrl,
        payload.rows.length,
        JSON.stringify(payload)
      ]
    );
  });

  const reviewId = await createDataReviewBatch(
    ownerId,
    workspace.id,
    datasetId
  );
  const created = (await listDataReviewWorkbenchForUser(ownerId)).batches.find(
    (batch) => batch.reviewId === reviewId
  );
  if (!created || created.status !== "in-review") {
    throw new Error("Build 048 durable review batch creation failed.");
  }
  if (created.includedCount !== 2) {
    throw new Error("Build 048 duplicate default exclusion did not persist.");
  }

  await saveDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    rows: created.rows.map((row) => ({
      id: row.id,
      included: row.included,
      cleaned:
        row.id === created.rows[0].id
          ? { ...row.cleaned, price: "$10.00" }
          : row.cleaned
    })),
    reviewNote: "CI cleanup verification"
  });

  const outsider = await listDataReviewWorkbenchForUser(outsiderId);
  if (outsider.batches.some((batch) => batch.reviewId === reviewId)) {
    throw new Error("Build 048 RLS leaked a review batch cross-account.");
  }

  let outsiderCreateBlocked = false;
  try {
    await createDataReviewBatch(outsiderId, workspace.id, datasetId);
  } catch {
    outsiderCreateBlocked = true;
  }
  if (!outsiderCreateBlocked) {
    throw new Error("Build 048 outsider review creation was not blocked.");
  }

  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "CI approval verification"
  });

  const approved = (await listDataReviewWorkbenchForUser(ownerId)).batches.find(
    (batch) => batch.reviewId === reviewId
  );
  if (!approved || approved.status !== "approved" || !approved.approvedAt) {
    throw new Error("Build 048 approval persistence failed.");
  }
  if (approved.eventCount < 3) {
    throw new Error("Build 048 append-only review audit evidence is incomplete.");
  }

  let terminalMutationBlocked = false;
  try {
    await saveDataReviewBatch(ownerId, {
      workspaceId: workspace.id,
      reviewId,
      rows: approved.rows,
      reviewNote: "must fail"
    });
  } catch {
    terminalMutationBlocked = true;
  }
  if (!terminalMutationBlocked) {
    throw new Error("Build 048 approved batch accepted a later cleanup mutation.");
  }

  console.log(
    "Build 048 durable review persistence, RLS isolation, audit evidence and terminal approval passed."
  );
}

main().finally(() => closeDatabasePools());
