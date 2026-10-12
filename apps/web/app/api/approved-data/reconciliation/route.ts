import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  integrationConsumerConfiguration,
  validateConsumerStateVerification,
  validateStateVerificationConsumerHandshake
} from "@/lib/integration-delivery";
import {
  compareConsumerState,
  listPostDeliveryReconciliationForUser,
  loadAcceptedDeliveryReconciliationContext,
  reconciliationErrorFingerprint,
  recordLiveDeliveryReconciliation
} from "@/lib/post-delivery-reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function statusFor(error: string) {
  if (error.includes("manager_required")) return 403;
  if (error.includes("not_found")) return 404;
  if (
    error.includes("required") ||
    error.includes("identity_changed") ||
    error.includes("accepted_delivery")
  ) return 409;
  return 400;
}

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function consumerToken(target: "rosie-dazzlers" | "devil-n-dove") {
  return target === "rosie-dazzlers"
    ? (process.env.INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN ?? "").trim()
    : (process.env.INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN ?? "").trim();
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
      "user-agent": "Rosevear-AIDataPlatform-Reconciliation/1"
    },
    body: JSON.stringify(body)
  });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listPostDeliveryReconciliationForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (body.action !== "verify-state") {
    return Response.json(
      { error: "delivery_reconciliation_action_invalid" },
      { status: 400 }
    );
  }

  const workspaceId = text(body.workspaceId);
  const deliveryId = text(body.deliveryId);
  if (!workspaceId || !deliveryId) {
    return Response.json(
      { error: "delivery_reconciliation_delivery_required" },
      { status: 400 }
    );
  }

  let context;
  try {
    context = await loadAcceptedDeliveryReconciliationContext(userId, {
      workspaceId,
      deliveryId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "delivery_reconciliation_context_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  const config = integrationConsumerConfiguration(context.delivery.target);
  const occurredAt = new Date().toISOString();

  async function recordError(
    code: string,
    httpStatus?: number | null
  ) {
    await recordLiveDeliveryReconciliation(userId, {
      workspaceId,
      deliveryId,
      activationId: context.delivery.activationId,
      mappingId: context.delivery.mappingId,
      publicationId: context.delivery.publicationId,
      target: context.delivery.target,
      consumerId: context.delivery.consumerId,
      package: context.package,
      status: "transport-error",
      expectedRecordCount: context.package.operations.length,
      matchedCount: 0,
      mismatchedCount: 0,
      missingCount: 0,
      validationCode: code,
      httpStatus: httpStatus ?? null,
      consumerVerifiedAt: null,
      verificationFingerprint: reconciliationErrorFingerprint({
        packageId: context.package.packageId,
        replayKey: context.package.replayKey,
        packageFingerprint: context.package.fingerprint,
        status: "transport-error",
        validationCode: code,
        occurredAt
      }),
      recordResults: []
    }).catch(() => undefined);
  }

  if (!config.configured || !config.endpoint || !config.endpointOrigin) {
    await recordError("consumer_not_configured");
    return Response.json(
      {
        error: "consumer_not_configured",
        requiredVariables: [config.urlName, config.tokenName]
      },
      { status: 503 }
    );
  }

  if (config.endpointOrigin !== context.delivery.consumerId) {
    await recordError("delivery_reconciliation_consumer_identity_changed");
    return Response.json(
      { error: "delivery_reconciliation_consumer_identity_changed" },
      { status: 409 }
    );
  }

  const token = consumerToken(context.delivery.target);
  const contract = INTEGRATION_CONTRACTS[context.delivery.target];

  try {
    const handshakeResponse = await fetchConsumer(config.endpoint, token, {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "handshake",
      target: context.delivery.target,
      contractVersion: 1,
      schemaId: contract.schemaId,
      requestedMode: "state-verification",
      requiredCapability: "stateVerificationSupported"
    });
    const handshakeBody = await handshakeResponse.json().catch(() => null);
    validateStateVerificationConsumerHandshake(
      handshakeBody,
      context.delivery.target
    );

    const response = await fetchConsumer(config.endpoint, token, {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "verify-state",
      target: context.delivery.target,
      contractVersion: 1,
      schemaId: contract.schemaId,
      packageId: context.package.packageId,
      replayKey: context.package.replayKey,
      fingerprint: context.package.fingerprint,
      records: context.package.operations.map((operation) => ({
        integrationKey: operation.integrationKey,
        fields: Object.keys(operation.values).sort()
      }))
    });
    const responseBody = await response.json().catch(() => null);
    const verification = validateConsumerStateVerification(
      responseBody,
      context.package
    );
    const comparison = compareConsumerState(context.package, verification);

    const reconciliationId = await recordLiveDeliveryReconciliation(userId, {
      workspaceId,
      deliveryId,
      activationId: context.delivery.activationId,
      mappingId: context.delivery.mappingId,
      publicationId: context.delivery.publicationId,
      target: context.delivery.target,
      consumerId: context.delivery.consumerId,
      package: context.package,
      status: comparison.status,
      expectedRecordCount: comparison.expectedRecordCount,
      matchedCount: comparison.matchedCount,
      mismatchedCount: comparison.mismatchedCount,
      missingCount: comparison.missingCount,
      validationCode: verification.code,
      httpStatus: response.status,
      consumerVerifiedAt: verification.verifiedAt,
      verificationFingerprint: comparison.verificationFingerprint,
      recordResults: comparison.recordResults
    });

    return Response.json(
      {
        reconciliationId,
        result: comparison.status,
        counts: {
          expected: comparison.expectedRecordCount,
          matched: comparison.matchedCount,
          mismatched: comparison.mismatchedCount,
          missing: comparison.missingCount
        },
        model: await listPostDeliveryReconciliationForUser(userId)
      },
      { status: comparison.status === "rejected" ? 409 : 200 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "delivery_reconciliation_transport_error";
    await recordError(code);
    return Response.json({ error: code }, { status: 502 });
  }
}
