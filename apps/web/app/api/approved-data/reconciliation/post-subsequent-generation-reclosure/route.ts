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
  comparePostSubsequentGenerationReclosureConsumerState,
  listPostSubsequentGenerationReclosureForUser,
  loadPostSubsequentGenerationReclosureContext,
  subsequentGenerationRecurrenceConfirmation,
  postSubsequentGenerationReclosureErrorFingerprint,
  recordPostSubsequentGenerationReclosureCheck,
  recurSubsequentGenerationReclosedException
} from "@/lib/post-subsequent-generation-reclosure-regression";

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
    error.includes("latest_check") ||
    error.includes("latest_reclosure") ||
    error.includes("closed_case") ||
    error.includes("already_recurred") ||
    error.includes("context_stale")
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
      "user-agent": "Rosevear-AIDataPlatform-PostSubsequentGenerationReclosure/1"
    },
    body: JSON.stringify(body)
  });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listPostSubsequentGenerationReclosureForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (body.action !== "verify-post-subsequent-generation-reclosure-state") {
    return Response.json(
      { error: "post_subsequent_generation_reclosure_action_invalid" },
      { status: 400 }
    );
  }

  const workspaceId = text(body.workspaceId);
  const subsequentGenerationReclosureId = text(body.subsequentGenerationReclosureId);
  if (!workspaceId || !subsequentGenerationReclosureId) {
    return Response.json(
      { error: "post_subsequent_generation_reclosure_required" },
      { status: 400 }
    );
  }

  let context: Awaited<ReturnType<typeof loadPostSubsequentGenerationReclosureContext>>;
  try {
    context = await loadPostSubsequentGenerationReclosureContext(userId, {
      workspaceId,
      subsequentGenerationReclosureId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "post_subsequent_generation_reclosure_context_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  const config = integrationConsumerConfiguration(context.delivery.target);
  const occurredAt = new Date().toISOString();

  async function recordError(code: string, httpStatus?: number | null) {
    await recordPostSubsequentGenerationReclosureCheck(userId!, {
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
      verificationFingerprint: postSubsequentGenerationReclosureErrorFingerprint({
        subsequentGenerationReclosureId: context.reclosure.subsequentGenerationReclosureId,
        subsequentGenerationPackageId: context.package.packageId,
        subsequentGenerationReplayKey: context.package.replayKey,
        subsequentGenerationPackageFingerprint: context.package.fingerprint,
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
    await recordError("post_subsequent_generation_reclosure_consumer_identity_changed");
    return Response.json(
      { error: "post_subsequent_generation_reclosure_consumer_identity_changed" },
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
      requestedPurpose: "post-subsequent-generation-reclosure-regression-monitoring",
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
    const comparison = comparePostSubsequentGenerationReclosureConsumerState(
      context.package,
      verification
    );

    const subsequentGenerationReclosureRegressionCheckId =
      await recordPostSubsequentGenerationReclosureCheck(userId, {
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
        subsequentGenerationReclosureRegressionCheckId,
        result: comparison.status,
        model: await listPostSubsequentGenerationReclosureForUser(userId)
      },
      { status: comparison.status === "rejected" ? 409 : 200 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "post_subsequent_generation_reclosure_transport_error";
    await recordError(code);
    return Response.json({ error: code }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (body.action !== "reopen-subsequent-generation-recurrent-exception") {
    return Response.json(
      { error: "post_subsequent_generation_recurrence_action_invalid" },
      { status: 400 }
    );
  }

  const workspaceId = text(body.workspaceId);
  const subsequentGenerationReclosureId = text(body.subsequentGenerationReclosureId);
  const subsequentGenerationReclosureRegressionCheckId =
    text(body.subsequentGenerationReclosureRegressionCheckId);
  if (
    !workspaceId ||
    !subsequentGenerationReclosureId ||
    !subsequentGenerationReclosureRegressionCheckId
  ) {
    return Response.json(
      { error: "post_subsequent_generation_recurrence_evidence_required" },
      { status: 400 }
    );
  }

  const model = await listPostSubsequentGenerationReclosureForUser(userId);
  const check = model.checks.find(
    (item) =>
      item.workspaceId === workspaceId &&
      item.subsequentGenerationReclosureId === subsequentGenerationReclosureId &&
      item.subsequentGenerationReclosureRegressionCheckId ===
        subsequentGenerationReclosureRegressionCheckId
  );
  if (!check) {
    return Response.json(
      { error: "post_subsequent_generation_recurrence_check_not_found" },
      { status: 404 }
    );
  }

  const expectedConfirmation = subsequentGenerationRecurrenceConfirmation(check.target);
  if (text(body.confirmation) !== expectedConfirmation) {
    return Response.json(
      {
        error: "post_subsequent_generation_recurrence_confirmation_invalid",
        expected: expectedConfirmation
      },
      { status: 400 }
    );
  }

  try {
    const subsequentGenerationRecurrenceId =
      await recurSubsequentGenerationReclosedException(userId, {
        workspaceId,
        subsequentGenerationReclosureId,
        subsequentGenerationReclosureRegressionCheckId,
        recurrenceReason: text(body.recurrenceReason)
      });
    return Response.json({
      subsequentGenerationRecurrenceId,
      model: await listPostSubsequentGenerationReclosureForUser(userId)
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "post_subsequent_generation_recurrence_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
