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
  comparePostClosureConsumerState,
  listPostClosureRegressionForUser,
  loadPostClosureRegressionContext,
  postClosureRegressionErrorFingerprint,
  postClosureReopenConfirmation,
  recordPostClosureRegressionCheck,
  reopenRegressedException
} from "@/lib/post-closure-regression";

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
    error.includes("latest_regression") ||
    error.includes("closed_case") ||
    error.includes("context_stale")
  ) {
    return 409;
  }
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
      "user-agent": "Rosevear-AIDataPlatform-PostClosureRegression/1"
    },
    body: JSON.stringify(body)
  });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listPostClosureRegressionForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (body.action !== "check-closed-state") {
    return Response.json(
      { error: "post_closure_regression_action_invalid" },
      { status: 400 }
    );
  }

  const workspaceId = text(body.workspaceId);
  const closureId = text(body.closureId);
  if (!workspaceId || !closureId) {
    return Response.json(
      { error: "post_closure_regression_closure_required" },
      { status: 400 }
    );
  }

  let context: Awaited<ReturnType<typeof loadPostClosureRegressionContext>>;
  try {
    context = await loadPostClosureRegressionContext(userId, {
      workspaceId,
      closureId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "post_closure_regression_context_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  const config = integrationConsumerConfiguration(context.delivery.target);
  const occurredAt = new Date().toISOString();

  async function recordError(code: string, httpStatus?: number | null) {
    await recordPostClosureRegressionCheck(userId, {
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
      verificationFingerprint: postClosureRegressionErrorFingerprint({
        closureId: context.closure.closureId,
        correctivePackageId: context.package.packageId,
        correctiveReplayKey: context.package.replayKey,
        correctivePackageFingerprint: context.package.fingerprint,
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
    await recordError("post_closure_regression_consumer_identity_changed");
    return Response.json(
      { error: "post_closure_regression_consumer_identity_changed" },
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
      requestedPurpose: "post-closure-regression-monitoring",
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
    const comparison = comparePostClosureConsumerState(
      context.package,
      verification
    );

    const regressionCheckId = await recordPostClosureRegressionCheck(userId, {
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
        regressionCheckId,
        result: comparison.status,
        counts: {
          expected: comparison.expectedRecordCount,
          matched: comparison.matchedCount,
          mismatched: comparison.mismatchedCount,
          missing: comparison.missingCount
        },
        model: await listPostClosureRegressionForUser(userId)
      },
      { status: comparison.status === "rejected" ? 409 : 200 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "post_closure_regression_transport_failed";
    await recordError(code);
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (body.action !== "reopen-regressed-exception") {
    return Response.json(
      { error: "post_closure_reopen_action_invalid" },
      { status: 400 }
    );
  }

  const workspaceId = text(body.workspaceId);
  const closureId = text(body.closureId);
  const regressionCheckId = text(body.regressionCheckId);
  const reopenReason = text(body.reopenReason);
  if (!workspaceId || !closureId || !regressionCheckId || !reopenReason) {
    return Response.json(
      { error: "post_closure_reopen_evidence_required" },
      { status: 400 }
    );
  }

  const model = await listPostClosureRegressionForUser(userId);
  const regression = model.checks.find(
    (item) =>
      item.workspaceId === workspaceId &&
      item.closureId === closureId &&
      item.regressionCheckId === regressionCheckId
  );
  if (!regression) {
    return Response.json(
      { error: "post_closure_reopen_regression_not_found" },
      { status: 404 }
    );
  }
  if (text(body.confirmation) !== postClosureReopenConfirmation(regression.target)) {
    return Response.json(
      { error: "post_closure_reopen_confirmation_required" },
      { status: 409 }
    );
  }

  try {
    const reopenId = await reopenRegressedException(userId, {
      workspaceId,
      closureId,
      regressionCheckId,
      reopenReason
    });
    return Response.json({
      reopenId,
      model: await listPostClosureRegressionForUser(userId)
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "post_closure_reopen_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
