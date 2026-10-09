import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  appendIntegrationDeliveryEvent,
  loadIntegrationModulePayload
} from "@/lib/integration-delivery-database";
import {
  buildIntegrationPackageFromPersistedBatch,
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  integrationConsumerConfiguration,
  type IntegrationTarget,
  validateConsumerAcknowledgement,
  validateConsumerHandshake
} from "@/lib/integration-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function target(value: unknown): IntegrationTarget | null {
  return value === "rosie-dazzlers" || value === "devil-n-dove" ? value : null;
}

async function fetchConsumer(
  endpoint: string,
  token: string,
  body: Record<string, unknown>
) {
  return fetch(endpoint, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
      "user-agent": "Rosevear-AIDataPlatform-IntegrationDelivery/1"
    },
    body: JSON.stringify(body)
  });
}

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
  const selectedTarget = target(body.target);
  const action = body.action === "probe" || body.action === "deliver"
    ? body.action
    : null;
  const batchId = typeof body.batchId === "string" ? body.batchId : "";

  if (!workspaceId || !selectedTarget || !action) {
    return Response.json({ error: "invalid_delivery_request" }, { status: 400 });
  }

  const config = integrationConsumerConfiguration(selectedTarget);
  if (!config.configured || !config.endpoint) {
    return Response.json(
      {
        error: "consumer_not_configured",
        target: selectedTarget,
        requiredVariables: [config.urlName, config.tokenName]
      },
      { status: 503 }
    );
  }
  const token =
    selectedTarget === "rosie-dazzlers"
      ? (process.env.INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN ?? "").trim()
      : (process.env.INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN ?? "").trim();

  if (action === "probe") {
    try {
      const contract = INTEGRATION_CONTRACTS[selectedTarget];
      const response = await fetchConsumer(config.endpoint, token, {
        protocol: INTEGRATION_CONSUMER_PROTOCOL,
        kind: "handshake",
        target: selectedTarget,
        contractVersion: 1,
        schemaId: contract.schemaId
      });
      const responseBody = await response.json().catch(() => null);
      const handshake = validateConsumerHandshake(responseBody, selectedTarget);
      await appendIntegrationDeliveryEvent(current.user.id, {
        workspaceId,
        consumerId: config.endpointOrigin ?? selectedTarget,
        target: selectedTarget,
        transportMode: "live",
        eventType: "handshake-accepted",
        validationCode: "handshake-valid",
        httpStatus: response.status,
        details: {
          dryRunSupported: handshake.dryRunSupported,
          liveMutationEnabled: handshake.liveMutationEnabled
        }
      });
      return Response.json({
        ok: true,
        target: selectedTarget,
        endpointOrigin: config.endpointOrigin,
        handshake: {
          protocol: handshake.protocol,
          contractVersion: handshake.contractVersion,
          dryRunSupported: handshake.dryRunSupported,
          liveMutationEnabled: handshake.liveMutationEnabled
        }
      });
    } catch (error) {
      await appendIntegrationDeliveryEvent(current.user.id, {
        workspaceId,
        consumerId: config.endpointOrigin ?? selectedTarget,
        target: selectedTarget,
        transportMode: "live",
        eventType: "handshake-rejected",
        validationCode:
          error instanceof Error ? error.message.slice(0, 96) : "handshake-failed",
        details: {}
      }).catch(() => undefined);
      return Response.json(
        { error: error instanceof Error ? error.message : "handshake_failed" },
        { status: 502 }
      );
    }
  }

  if (!batchId) {
    return Response.json({ error: "batch_id_required" }, { status: 400 });
  }

  const payload = await loadIntegrationModulePayload(
    current.user.id,
    workspaceId
  );
  if (!payload) {
    return Response.json({ error: "business_integration_module_missing" }, { status: 404 });
  }

  let integrationPackage;
  try {
    integrationPackage = buildIntegrationPackageFromPersistedBatch(payload, {
      target: selectedTarget,
      batchId
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "package_build_failed" },
      { status: 409 }
    );
  }

  const consumerId = config.endpointOrigin ?? selectedTarget;
  await appendIntegrationDeliveryEvent(current.user.id, {
    workspaceId,
    consumerId,
    target: selectedTarget,
    transportMode: "live",
    eventType: "delivery-attempted",
    batchId: integrationPackage.batchId,
    packageId: integrationPackage.packageId,
    replayKey: integrationPackage.replayKey,
    fingerprint: integrationPackage.fingerprint,
    validationCode: "attempted",
    details: {
      operationCount: integrationPackage.operations.length,
      dryRun: true
    }
  });

  try {
    const response = await fetchConsumer(config.endpoint, token, {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "package",
      dryRun: true,
      package: integrationPackage
    });
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      integrationPackage
    );
    if (!acknowledgement.dryRun) {
      throw new Error("consumer_live_mutation_not_approved");
    }
    const accepted = acknowledgement.status === "accepted";
    await appendIntegrationDeliveryEvent(current.user.id, {
      workspaceId,
      consumerId,
      target: selectedTarget,
      transportMode: "live",
      eventType: accepted ? "delivery-accepted" : "delivery-rejected",
      batchId: integrationPackage.batchId,
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      fingerprint: integrationPackage.fingerprint,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        dryRun: acknowledgement.dryRun,
        operationCount: integrationPackage.operations.length
      }
    });
    return Response.json({
      ok: accepted,
      target: selectedTarget,
      endpointOrigin: config.endpointOrigin,
      acknowledgement
    }, { status: accepted ? 200 : 409 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "transport_error";
    await appendIntegrationDeliveryEvent(current.user.id, {
      workspaceId,
      consumerId,
      target: selectedTarget,
      transportMode: "live",
      eventType: "transport-error",
      batchId: integrationPackage.batchId,
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      fingerprint: integrationPackage.fingerprint,
      validationCode: code.slice(0, 96),
      details: { dryRun: true }
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }
}
