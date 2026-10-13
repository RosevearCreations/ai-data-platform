import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import { createApprovedDatasetPublication } from "../lib/approved-dataset-publishing";
import {
  createConsumerLiveActivation,
  finalizeIdempotentLiveDelivery,
  reserveIdempotentLiveDelivery
} from "../lib/controlled-live-delivery";
import {
  createCorrectiveDeliveryActivation,
  finalizeIdempotentCorrectiveDelivery,
  getActiveCorrectiveDeliveryActivation,
  listCorrectiveDeliveryForUser,
  loadApprovedCorrectivePlanContext,
  reserveIdempotentCorrectiveDelivery,
  revokeCorrectiveDeliveryActivation
} from "../lib/corrective-delivery-execution";
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
  type ConsumerAcknowledgement,
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
  if (!result.user?.id) throw new Error("Build 054 fixture user unavailable.");
  return result.user.id;
}

async function insertDataset(
  ownerId: string,
  workspaceId: string,
  datasetId: string
) {
  const now = new Date().toISOString();
  const payload = {
    recipeName: "Build 054 corrective delivery",
    sourceUrl: "https://example.test/build-054",
    retrievedAt: now,
    rows: [
      {
        recordId: "corrective-" + datasetId.slice(-8),
        competitorBusinessName: "Build 054 Detailer",
        offeringName: "Complete",
        priceMinimumCad: 249,
        sourceUrl: "https://example.test/build-054/live",
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
  if (!workspace) throw new Error("Build 054 owner workspace unavailable.");

  const datasetId = "build-054-" + randomUUID();
  await insertDataset(ownerId, workspace.id, datasetId);

  const reviewId = await createDataReviewBatch(ownerId, workspace.id, datasetId);
  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "Build 054 corrective delivery fixture"
  });

  const publicationId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "Build 054 corrective delivery fixture"
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
    details: { build: 54, fixture: true }
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

  const sourceActivationId = await createConsumerLiveActivation(ownerId, {
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
  const sourceActivationFingerprint = await withUserDatabase(
    ownerId,
    async (client) => {
      const result = await client.query<{ activation_fingerprint: string }>(
        `select activation_fingerprint
         from app.workspace_consumer_live_activations
         where workspace_id=$1 and activation_id=$2`,
        [workspace.id, sourceActivationId]
      );
      return result.rows[0]?.activation_fingerprint;
    }
  );
  if (!sourceActivationFingerprint) {
    throw new Error("Build 054 source activation fingerprint unavailable.");
  }

  const sourceReservation = await reserveIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activationId: sourceActivationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    activationFingerprint: sourceActivationFingerprint,
    package: bridge.package
  });
  if (!sourceReservation.shouldSend) {
    throw new Error("Build 054 source live delivery fixture was not reserved.");
  }

  const sourceDelivery = await finalizeIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: sourceReservation.delivery.deliveryId,
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

  const sourceContext = await loadAcceptedDeliveryReconciliationContext(ownerId, {
    workspaceId: workspace.id,
    deliveryId: sourceDelivery.deliveryId
  });
  const sourceOperation = sourceContext.package.operations[0];
  if (!sourceOperation) {
    throw new Error("Build 054 source package operation unavailable.");
  }

  const driftResponse: ConsumerStateVerificationResponse = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "verified",
    target: "rosie-dazzlers",
    packageId: sourceContext.package.packageId,
    replayKey: sourceContext.package.replayKey,
    fingerprint: sourceContext.package.fingerprint,
    verifiedAt: new Date().toISOString(),
    records: [
      {
        integrationKey: sourceOperation.integrationKey,
        status: "found",
        values: {
          ...sourceOperation.values,
          priceMinimumCad: 999
        }
      }
    ]
  };
  const drift = compareConsumerState(sourceContext.package, driftResponse);
  if (drift.status !== "drift" || drift.mismatchedCount !== 1) {
    throw new Error("Build 054 fixture did not produce drift.");
  }

  const reconciliationId = await recordLiveDeliveryReconciliation(ownerId, {
    workspaceId: workspace.id,
    deliveryId: sourceDelivery.deliveryId,
    activationId: sourceActivationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    package: sourceContext.package,
    status: drift.status,
    expectedRecordCount: drift.expectedRecordCount,
    matchedCount: drift.matchedCount,
    mismatchedCount: drift.mismatchedCount,
    missingCount: drift.missingCount,
    validationCode: driftResponse.code,
    httpStatus: 200,
    consumerVerifiedAt: driftResponse.verifiedAt,
    verificationFingerprint: drift.verificationFingerprint,
    recordResults: drift.recordResults
  });

  const caseId = await createReconciliationExceptionCase(ownerId, {
    workspaceId: workspace.id,
    reconciliationId,
    classification: "consumer-drift",
    severity: "high",
    resolutionIntent: "plan-correction",
    summary: "Build 054 fixture requires controlled corrective execution."
  });
  const planId = await createCorrectiveDeliveryPlan(ownerId, {
    workspaceId: workspace.id,
    caseId,
    rationale: "Restore the governed price field proven to have drifted."
  });
  await reviewCorrectiveDeliveryPlan(ownerId, {
    workspaceId: workspace.id,
    planId,
    decision: "approved",
    reviewNote: "Approved for Build 054 controlled corrective execution."
  });

  const context = await loadApprovedCorrectivePlanContext(ownerId, {
    workspaceId: workspace.id,
    planId
  });
  if (
    context.correctivePackage.packageId === context.sourcePackage.packageId ||
    context.correctivePackage.replayKey === context.sourcePackage.replayKey ||
    context.correctivePackage.operations.length !== 1 ||
    context.correctivePackage.operations[0]?.values.priceMinimumCad !== 249 ||
    Object.keys(context.correctivePackage.operations[0]?.values ?? {}).join(",") !==
      "priceMinimumCad"
  ) {
    throw new Error("Build 054 corrective package identity or frozen scope is invalid.");
  }

  const dryRunAcknowledgement: ConsumerAcknowledgement = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    status: "accepted",
    code: "corrective-dry-run-accepted",
    target: "rosie-dazzlers",
    packageId: context.correctivePackage.packageId,
    replayKey: context.correctivePackage.replayKey,
    fingerprint: context.correctivePackage.fingerprint,
    receivedAt: new Date().toISOString(),
    dryRun: true
  };

  const correctiveActivationId = await createCorrectiveDeliveryActivation(
    ownerId,
    {
      workspaceId: workspace.id,
      context,
      consumerId,
      handshake,
      dryRunAcknowledgement,
      dryRunHttpStatus: 200
    }
  );
  const duplicateActivationId = await createCorrectiveDeliveryActivation(
    ownerId,
    {
      workspaceId: workspace.id,
      context,
      consumerId,
      handshake,
      dryRunAcknowledgement,
      dryRunHttpStatus: 200
    }
  );
  if (duplicateActivationId !== correctiveActivationId) {
    throw new Error("Build 054 identical corrective activation was not canonicalized.");
  }

  const activation = await getActiveCorrectiveDeliveryActivation(ownerId, {
    workspaceId: workspace.id,
    planId,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    activation.activationId !== correctiveActivationId ||
    activation.correctiveReplayKey !== context.correctivePackage.replayKey
  ) {
    throw new Error("Build 054 active corrective identity is incomplete.");
  }

  const outsiderModel = await listCorrectiveDeliveryForUser(outsiderId);
  if (
    outsiderModel.activations.some(
      (item) => item.activationId === correctiveActivationId
    )
  ) {
    throw new Error("Build 054 corrective activation leaked cross-account.");
  }

  const first = await reserveIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activation,
    plan: context.plan,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    !first.shouldSend ||
    first.reason !== "initial" ||
    first.delivery.attemptCount !== 1 ||
    first.delivery.idempotencyKey !== context.correctivePackage.replayKey
  ) {
    throw new Error("Build 054 first corrective delivery was not reserved exactly once.");
  }

  await finalizeIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: first.delivery.deliveryId,
    status: "transport-error",
    validationCode: "fixture-transport-error"
  });

  const retry = await reserveIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activation,
    plan: context.plan,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    !retry.shouldSend ||
    retry.reason !== "retry" ||
    retry.delivery.attemptCount !== 2 ||
    retry.delivery.idempotencyKey !== first.delivery.idempotencyKey
  ) {
    throw new Error("Build 054 retry did not reuse the corrective idempotency key.");
  }

  await finalizeIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: retry.delivery.deliveryId,
    status: "accepted",
    validationCode: "accepted",
    httpStatus: 200,
    consumerReceivedAt: new Date().toISOString(),
    acknowledgement: {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      status: "accepted",
      code: "accepted",
      target: "rosie-dazzlers",
      packageId: context.correctivePackage.packageId,
      replayKey: context.correctivePackage.replayKey,
      fingerprint: context.correctivePackage.fingerprint,
      dryRun: false
    }
  });

  const terminal = await reserveIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activation,
    plan: context.plan,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    terminal.shouldSend ||
    terminal.reason !== "accepted" ||
    terminal.delivery.attemptCount !== 2
  ) {
    throw new Error("Build 054 accepted corrective delivery was eligible for resend.");
  }

  let immutableActivationBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_corrective_delivery_activations
         set plan_fingerprint='tampered'
         where workspace_id=$1 and activation_id=$2`,
        [workspace.id, correctiveActivationId]
      );
    });
  } catch {
    immutableActivationBlocked = true;
  }
  if (!immutableActivationBlocked) {
    throw new Error("Build 054 runtime could mutate corrective activation identity.");
  }

  let immutableDeliveryBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_corrective_live_deliveries
         set idempotency_key='tampered'
         where workspace_id=$1 and delivery_id=$2`,
        [workspace.id, first.delivery.deliveryId]
      );
    });
  } catch {
    immutableDeliveryBlocked = true;
  }
  if (!immutableDeliveryBlocked) {
    throw new Error("Build 054 runtime could mutate corrective idempotency identity.");
  }

  const matchedResponse: ConsumerStateVerificationResponse = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "verified-after-correction",
    target: "rosie-dazzlers",
    packageId: sourceContext.package.packageId,
    replayKey: sourceContext.package.replayKey,
    fingerprint: sourceContext.package.fingerprint,
    verifiedAt: new Date().toISOString(),
    records: sourceContext.package.operations.map((operation) => ({
      integrationKey: operation.integrationKey,
      status: "found",
      values: { ...operation.values }
    }))
  };
  const matched = compareConsumerState(sourceContext.package, matchedResponse);
  if (matched.status !== "matched") {
    throw new Error("Build 054 post-correction fixture did not match.");
  }
  await recordLiveDeliveryReconciliation(ownerId, {
    workspaceId: workspace.id,
    deliveryId: sourceDelivery.deliveryId,
    activationId: sourceActivationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    package: sourceContext.package,
    status: matched.status,
    expectedRecordCount: matched.expectedRecordCount,
    matchedCount: matched.matchedCount,
    mismatchedCount: matched.mismatchedCount,
    missingCount: matched.missingCount,
    validationCode: matchedResponse.code,
    httpStatus: 200,
    consumerVerifiedAt: matchedResponse.verifiedAt,
    verificationFingerprint: matched.verificationFingerprint,
    recordResults: matched.recordResults
  });

  let supersededBlocked = false;
  try {
    await loadApprovedCorrectivePlanContext(ownerId, {
      workspaceId: workspace.id,
      planId
    });
  } catch (error) {
    supersededBlocked =
      error instanceof Error &&
      error.message === "corrective_delivery_reconciliation_superseded";
  }
  if (!supersededBlocked) {
    throw new Error("Build 054 did not block a plan superseded by newer reconciliation.");
  }

  await revokeCorrectiveDeliveryActivation(ownerId, {
    workspaceId: workspace.id,
    activationId: correctiveActivationId,
    note: "Build 054 CI revocation"
  });

  const finalModel = await listCorrectiveDeliveryForUser(ownerId);
  const storedDelivery = finalModel.deliveries.find(
    (item) => item.deliveryId === first.delivery.deliveryId
  );
  if (
    !storedDelivery ||
    storedDelivery.status !== "accepted" ||
    storedDelivery.attemptCount !== 2 ||
    storedDelivery.idempotencyKey !== context.correctivePackage.replayKey
  ) {
    throw new Error("Build 054 terminal corrective evidence is incomplete.");
  }

  const triage = await listReconciliationExceptionTriageForUser(ownerId);
  if (!triage.plans.some((item) => item.planId === planId && item.status === "approved")) {
    throw new Error("Build 054 unexpectedly rewrote Build 053 plan approval.");
  }

  console.log(
    "Build 054 approved-plan reconstruction, dry-run activation, RLS, immutable identity, same-key retry, terminal no-resend and reconciliation supersession passed."
  );
}

main().finally(() => closeDatabasePools());
