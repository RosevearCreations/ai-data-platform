import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import { createApprovedDatasetPublication } from "../lib/approved-dataset-publishing";
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
  loadAcceptedDeliveryReconciliationContext,
  recordLiveDeliveryReconciliation
} from "../lib/post-delivery-reconciliation";
import {
  createCorrectiveDeliveryPlan,
  createReconciliationExceptionCase,
  listReconciliationExceptionTriageForUser,
  reviewCorrectiveDeliveryPlan
} from "../lib/reconciliation-exception-triage";
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
  if (!result.user?.id) throw new Error("Build 053 fixture user unavailable.");
  return result.user.id;
}

async function insertDataset(
  ownerId: string,
  workspaceId: string,
  datasetId: string
) {
  const now = new Date().toISOString();
  const payload = {
    recipeName: "Build 053 triage planning",
    sourceUrl: "https://example.test/build-053",
    retrievedAt: now,
    rows: [
      {
        recordId: "triage-" + datasetId.slice(-8),
        competitorBusinessName: "Build 053 Detailer",
        offeringName: "Complete",
        priceMinimumCad: 239,
        sourceUrl: "https://example.test/build-053/live",
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
  if (!workspace) throw new Error("Build 053 owner workspace unavailable.");

  const datasetId = "build-053-" + randomUUID();
  await insertDataset(ownerId, workspace.id, datasetId);

  const reviewId = await createDataReviewBatch(ownerId, workspace.id, datasetId);
  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "Build 053 triage fixture"
  });

  const publicationId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "Build 053 triage fixture"
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
    details: { build: 53, fixture: true }
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

  const activationFingerprint = await withUserDatabase(ownerId, async (client) => {
    const result = await client.query<{ activation_fingerprint: string }>(
      `select activation_fingerprint
       from app.workspace_consumer_live_activations
       where workspace_id=$1 and activation_id=$2`,
      [workspace.id, activationId]
    );
    return result.rows[0]?.activation_fingerprint;
  });
  if (!activationFingerprint) throw new Error("Build 053 activation unavailable.");

  const reservation = await reserveIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    activationFingerprint,
    package: bridge.package
  });
  if (!reservation.shouldSend) throw new Error("Build 053 delivery fixture not reserved.");

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

  const context = await loadAcceptedDeliveryReconciliationContext(ownerId, {
    workspaceId: workspace.id,
    deliveryId: accepted.deliveryId
  });

  const operation = context.package.operations[0];
  if (!operation) throw new Error("Build 053 package operation missing.");
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
    records: [
      {
        integrationKey: operation.integrationKey,
        status: "found",
        values: {
          ...operation.values,
          priceMinimumCad: 999
        }
      }
    ]
  };
  const comparison = compareConsumerState(context.package, response);
  if (comparison.status !== "drift" || comparison.mismatchedCount !== 1) {
    throw new Error("Build 053 fixture did not produce reconciliation drift.");
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

  const caseId = await createReconciliationExceptionCase(ownerId, {
    workspaceId: workspace.id,
    reconciliationId,
    classification: "consumer-drift",
    severity: "medium",
    resolutionIntent: "plan-correction",
    summary: "Build 053 fixture drift requires an explicit corrective plan."
  });
  const duplicateCaseId = await createReconciliationExceptionCase(ownerId, {
    workspaceId: workspace.id,
    reconciliationId,
    classification: "consumer-drift",
    severity: "medium",
    resolutionIntent: "plan-correction",
    summary: "Duplicate request must return the canonical case."
  });
  if (duplicateCaseId !== caseId) {
    throw new Error("Build 053 did not canonicalize one case per reconciliation.");
  }

  const planId = await createCorrectiveDeliveryPlan(ownerId, {
    workspaceId: workspace.id,
    caseId,
    rationale: "Restore only the governed price field proven to have drifted."
  });
  const duplicatePlanId = await createCorrectiveDeliveryPlan(ownerId, {
    workspaceId: workspace.id,
    caseId,
    rationale: "Restore only the governed price field proven to have drifted."
  });
  if (duplicatePlanId !== planId) {
    throw new Error("Build 053 did not canonicalize identical corrective plans.");
  }

  let ownerModel = await listReconciliationExceptionTriageForUser(ownerId);
  const plan = ownerModel.plans.find((item) => item.planId === planId);
  const triageCase = ownerModel.cases.find((item) => item.caseId === caseId);
  if (
    !plan ||
    !triageCase ||
    triageCase.status !== "planned" ||
    plan.status !== "proposed" ||
    plan.correctionScope.length !== 1 ||
    plan.correctionScope[0]?.governedFields.join(",") !== "priceMinimumCad" ||
    plan.correctionScope[0]?.desiredValues.priceMinimumCad !== 239
  ) {
    throw new Error("Build 053 frozen corrective scope is incomplete.");
  }

  const outsiderModel = await listReconciliationExceptionTriageForUser(outsiderId);
  if (
    outsiderModel.cases.some((item) => item.caseId === caseId) ||
    outsiderModel.plans.some((item) => item.planId === planId)
  ) {
    throw new Error("Build 053 triage evidence leaked cross-account.");
  }

  let immutablePlanBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_corrective_delivery_plans
         set correction_scope='[]'::jsonb
         where workspace_id=$1 and plan_id=$2`,
        [workspace.id, planId]
      );
    });
  } catch {
    immutablePlanBlocked = true;
  }
  if (!immutablePlanBlocked) {
    throw new Error("Build 053 runtime could mutate frozen corrective scope.");
  }

  let immutableCaseEvidenceBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_reconciliation_exception_cases
         set reconciliation_fingerprint='tampered'
         where workspace_id=$1 and case_id=$2`,
        [workspace.id, caseId]
      );
    });
  } catch {
    immutableCaseEvidenceBlocked = true;
  }
  if (!immutableCaseEvidenceBlocked) {
    throw new Error("Build 053 runtime could mutate pinned reconciliation evidence.");
  }

  await reviewCorrectiveDeliveryPlan(ownerId, {
    workspaceId: workspace.id,
    planId,
    decision: "approved",
    reviewNote: "Approved as planning evidence only; no execution authorization."
  });

  ownerModel = await listReconciliationExceptionTriageForUser(ownerId);
  const approvedPlan = ownerModel.plans.find((item) => item.planId === planId);
  const approvedCase = ownerModel.cases.find((item) => item.caseId === caseId);
  if (
    approvedPlan?.status !== "approved" ||
    approvedCase?.status !== "approved" ||
    approvedPlan.reviewNote.indexOf("no execution") < 0
  ) {
    throw new Error("Build 053 plan approval evidence did not persist.");
  }

  let secondReviewBlocked = false;
  try {
    await reviewCorrectiveDeliveryPlan(ownerId, {
      workspaceId: workspace.id,
      planId,
      decision: "rejected",
      reviewNote: "A terminal plan cannot be reviewed twice."
    });
  } catch {
    secondReviewBlocked = true;
  }
  if (!secondReviewBlocked) {
    throw new Error("Build 053 allowed a terminal plan review to be overwritten.");
  }

  console.log(
    "Build 053 drift triage, canonical case/plan creation, frozen corrective scope, RLS and planning-only approval passed."
  );
}

main().finally(() => closeDatabasePools());
