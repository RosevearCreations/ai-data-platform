import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  appendIntegrationDeliveryEvent,
  hasIntegrationConsumerReceipt,
  loadIntegrationModulePayload,
  recordIntegrationConsumerReceipt
} from "@/lib/integration-delivery-database";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  buildIntegrationPackageFromPersistedBatch,
  type IntegrationPackageV1,
  type IntegrationTarget,
  validateIntegrationPackage
} from "@/lib/integration-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONSUMER_ID = "platform-conformance-v1";

export async function POST(request: Request) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) return Response.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  const target: IntegrationTarget | null =
    body.target === "rosie-dazzlers" || body.target === "devil-n-dove"
      ? body.target
      : null;
  const batchId = typeof body.batchId === "string" ? body.batchId : "";
  let integrationPackage = body.package;

  if (!workspaceId || !target || (!integrationPackage && !batchId)) {
    return Response.json({ error: "invalid_conformance_request" }, { status: 400 });
  }

  if (!integrationPackage && batchId) {
    const payload = await loadIntegrationModulePayload(current.user.id, workspaceId);
    if (!payload) {
      return Response.json({ error: "business_integration_module_missing" }, { status: 404 });
    }
    try {
      integrationPackage = buildIntegrationPackageFromPersistedBatch(payload, {
        target,
        batchId
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "package_build_failed" },
        { status: 409 }
      );
    }
  }

  const preliminary = validateIntegrationPackage(integrationPackage, {
    expectedTarget: target
  });
  const duplicate =
    preliminary.valid &&
    (await hasIntegrationConsumerReceipt(current.user.id, {
      workspaceId,
      consumerId: CONSUMER_ID,
      target,
      packageId: preliminary.packageId
    }));
  const validation = validateIntegrationPackage(integrationPackage, {
    expectedTarget: target,
    seenPackageIds: duplicate ? new Set([preliminary.packageId]) : undefined
  });

  const identity = integrationPackage as Partial<IntegrationPackageV1>;
  if (!validation.valid) {
    await appendIntegrationDeliveryEvent(current.user.id, {
      workspaceId,
      consumerId: CONSUMER_ID,
      target,
      transportMode: "conformance",
      eventType: "delivery-rejected",
      batchId: typeof identity.batchId === "string" ? identity.batchId : null,
      packageId: validation.packageId || null,
      replayKey: validation.replayKey || null,
      fingerprint: validation.fingerprint || null,
      validationCode: validation.code,
      details: {
        errorCount: validation.errors.length,
        dryRun: true
      }
    });
    return Response.json(
      {
        protocol: INTEGRATION_CONSUMER_PROTOCOL,
        status: "rejected",
        code: validation.code,
        target,
        packageId: validation.packageId,
        replayKey: validation.replayKey,
        fingerprint: validation.fingerprint,
        receivedAt: new Date().toISOString(),
        dryRun: true
      },
      { status: validation.code === "duplicate" ? 409 : 422 }
    );
  }

  const acceptedPackage = integrationPackage as IntegrationPackageV1;
  const inserted = await recordIntegrationConsumerReceipt(current.user.id, {
    workspaceId,
    consumerId: CONSUMER_ID,
    package: acceptedPackage
  });
  if (!inserted) {
    await appendIntegrationDeliveryEvent(current.user.id, {
      workspaceId,
      consumerId: CONSUMER_ID,
      target,
      transportMode: "conformance",
      eventType: "delivery-rejected",
      batchId: acceptedPackage.batchId,
      packageId: acceptedPackage.packageId,
      replayKey: acceptedPackage.replayKey,
      fingerprint: acceptedPackage.fingerprint,
      validationCode: "duplicate",
      details: { dryRun: true }
    });
    return Response.json(
      {
        protocol: INTEGRATION_CONSUMER_PROTOCOL,
        status: "rejected",
        code: "duplicate",
        target,
        packageId: acceptedPackage.packageId,
        replayKey: acceptedPackage.replayKey,
        fingerprint: acceptedPackage.fingerprint,
        receivedAt: new Date().toISOString(),
        dryRun: true
      },
      { status: 409 }
    );
  }

  await appendIntegrationDeliveryEvent(current.user.id, {
    workspaceId,
    consumerId: CONSUMER_ID,
    target,
    transportMode: "conformance",
    eventType: "delivery-accepted",
    batchId: acceptedPackage.batchId,
    packageId: acceptedPackage.packageId,
    replayKey: acceptedPackage.replayKey,
    fingerprint: acceptedPackage.fingerprint,
    validationCode: "valid",
    details: {
      operationCount: acceptedPackage.operations.length,
      dryRun: true,
      liveMutationEnabled: false
    }
  });

  return Response.json({
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    status: "accepted",
    code: "valid",
    target,
    packageId: acceptedPackage.packageId,
    replayKey: acceptedPackage.replayKey,
    fingerprint: acceptedPackage.fingerprint,
    receivedAt: new Date().toISOString(),
    dryRun: true
  });
}
