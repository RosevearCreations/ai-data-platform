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
  closeVerifiedSuccessiveGenerationReconciliationException,
  compareSuccessiveGenerationCorrectiveConsumerState,
  listSuccessiveGenerationCorrectiveClosureForUser,
  loadAcceptedSuccessiveGenerationCorrectiveReconciliationContext,
  successiveGenerationReclosureConfirmation,
  successiveGenerationReconciliationErrorFingerprint,
  recordSuccessiveGenerationCorrectiveDeliveryReconciliation
} from "@/lib/successive-generation-corrective-delivery-reconciliation";

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
    error.includes("identity") ||
    error.includes("latest_verification") ||
    error.includes("latest_recurrence") ||
    error.includes("verified_match") ||
    error.includes("open_approved")
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
      "user-agent": "Rosevear-AIDataPlatform-SuccessiveGenerationReconciliation/1"
    },
    body: JSON.stringify(body)
  });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listSuccessiveGenerationCorrectiveClosureForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (body.action !== "verify-successive-generation-state") {
    return Response.json(
      { error: "successive_generation_reconciliation_action_invalid" },
      { status: 400 }
    );
  }

  const workspaceId = text(body.workspaceId);
  const successiveGenerationDeliveryId = text(body.successiveGenerationDeliveryId);
  if (!workspaceId || !successiveGenerationDeliveryId) {
    return Response.json(
      { error: "successive_generation_reconciliation_delivery_required" },
      { status: 400 }
    );
  }

  let context: Awaited<
    ReturnType<typeof loadAcceptedSuccessiveGenerationCorrectiveReconciliationContext>
  >;
  try {
    context = await loadAcceptedSuccessiveGenerationCorrectiveReconciliationContext(
      userId,
      { workspaceId, successiveGenerationDeliveryId }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successive_generation_reconciliation_context_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  const config = integrationConsumerConfiguration(context.delivery.target);
  const occurredAt = new Date().toISOString();

  async function recordError(code: string, httpStatus?: number | null) {
    await recordSuccessiveGenerationCorrectiveDeliveryReconciliation(userId!, {
      workspaceId,
      context,
      status: "transport-error",
      expectedRecordCount: context.package.operations.length,
      matchedCount: 0,
      mismatchedCount: 0,
      missingCount: 0,
      validationCode: code,
      httpStatus: httpStatus ?? null,
      consumerVerifiedAt: null,
      verificationFingerprint: successiveGenerationReconciliationErrorFingerprint({
        successiveGenerationPackageId: context.package.packageId,
        successiveGenerationReplayKey: context.package.replayKey,
        successiveGenerationPackageFingerprint: context.package.fingerprint,
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
    await recordError("successive_generation_reconciliation_consumer_identity_changed");
    return Response.json(
      { error: "successive_generation_reconciliation_consumer_identity_changed" },
      { status: 409 }
    );
  }

  const target = context.delivery.target;
  const token = consumerToken(target);
  const contract = INTEGRATION_CONTRACTS[target];

  try {
    const handshakeResponse = await fetchConsumer(config.endpoint, token, {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "handshake",
      target,
      contractVersion: 1,
      schemaId: contract.schemaId,
      requestedMode: "state-verification",
      requestedPurpose: "successive-generation-corrective-delivery-reconciliation",
      requiredCapability: "stateVerificationSupported"
    });
    const handshakeBody = await handshakeResponse.json().catch(() => null);
    validateStateVerificationConsumerHandshake(handshakeBody, target);

    const response = await fetchConsumer(config.endpoint, token, {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "verify-state",
      target,
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
    const comparison = compareSuccessiveGenerationCorrectiveConsumerState(
      context.package,
      verification
    );

    const successiveGenerationReconciliationId =
      await recordSuccessiveGenerationCorrectiveDeliveryReconciliation(userId, {
        workspaceId,
        context,
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
        successiveGenerationReconciliationId,
        result: comparison.status,
        counts: {
          expected: comparison.expectedRecordCount,
          matched: comparison.matchedCount,
          mismatched: comparison.mismatchedCount,
          missing: comparison.missingCount
        },
        model: await listSuccessiveGenerationCorrectiveClosureForUser(userId)
      },
      { status: comparison.status === "rejected" ? 409 : 200 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successive_generation_reconciliation_transport_error";
    await recordError(code);
    return Response.json({ error: code }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (body.action !== "reclose-successive-generation-exception") {
    return Response.json(
      { error: "successive_generation_reclosure_action_invalid" },
      { status: 400 }
    );
  }

  const workspaceId = text(body.workspaceId);
  const caseId = text(body.caseId);
  const successiveGenerationDeliveryId = text(body.successiveGenerationDeliveryId);
  const successiveGenerationReconciliationId = text(body.successiveGenerationReconciliationId);
  if (
    !workspaceId ||
    !caseId ||
    !successiveGenerationDeliveryId ||
    !successiveGenerationReconciliationId
  ) {
    return Response.json(
      { error: "successive_generation_reclosure_evidence_required" },
      { status: 400 }
    );
  }

  const model = await listSuccessiveGenerationCorrectiveClosureForUser(userId);
  const reconciliation = model.reconciliations.find(
    (item) =>
      item.workspaceId === workspaceId &&
      item.caseId === caseId &&
      item.successiveGenerationDeliveryId === successiveGenerationDeliveryId &&
      item.successiveGenerationReconciliationId === successiveGenerationReconciliationId
  );
  if (!reconciliation) {
    return Response.json(
      { error: "successive_generation_reclosure_verification_not_found" },
      { status: 404 }
    );
  }

  const expectedConfirmation = successiveGenerationReclosureConfirmation(
    reconciliation.target
  );
  if (text(body.confirmation) !== expectedConfirmation) {
    return Response.json(
      {
        error: "successive_generation_reclosure_confirmation_invalid",
        expected: expectedConfirmation
      },
      { status: 400 }
    );
  }

  try {
    const successiveGenerationReclosureId =
      await closeVerifiedSuccessiveGenerationReconciliationException(userId, {
        workspaceId,
        caseId,
        successiveGenerationDeliveryId,
        successiveGenerationReconciliationId,
        reclosureNote: text(body.reclosureNote)
      });
    return Response.json({
      successiveGenerationReclosureId,
      model: await listSuccessiveGenerationCorrectiveClosureForUser(userId)
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successive_generation_reclosure_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
