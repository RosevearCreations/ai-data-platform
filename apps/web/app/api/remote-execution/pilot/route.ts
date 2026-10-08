import { randomUUID } from "node:crypto";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  assertBrowserlessPilotRuntimeEnabled,
  BrowserlessControlledPilotProvider,
  BROWSERLESS_CONFIG_REF,
  isGlobalRemoteKillSwitchActive
} from "@/lib/browserless-provider";
import {
  completeWorkspaceRemoteExecutionJob,
  createWorkspaceRemoteExecutionJob,
  enqueueWorkspaceRemoteExecutionJob,
  heartbeatWorkspaceRemoteExecutionJob,
  leaseWorkspaceRemoteExecutionJob
} from "@/lib/remote-execution-database";
import {
  appendRemotePilotEvent,
  assertRemotePilotAuthorized,
  finishRemotePilotJob,
  isWorkspaceRemotePilotKilled,
  releaseRemotePilotSlot,
  reserveRemotePilotSlot
} from "@/lib/remote-pilot-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: Request) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  const sourceUrl =
    typeof body.sourceUrl === "string" ? body.sourceUrl : "";
  const policyId =
    typeof body.policyId === "string" ? body.policyId : "";
  const policyFingerprint =
    typeof body.policyFingerprint === "string" ? body.policyFingerprint : "";
  const policyRevision =
    typeof body.policyRevision === "number" && Number.isInteger(body.policyRevision)
      ? body.policyRevision
      : 0;
  const savedScraperId =
    typeof body.savedScraperId === "string" && body.savedScraperId.trim()
      ? body.savedScraperId.trim()
      : "build027-controlled-pilot";

  if (
    !workspaceId ||
    !sourceUrl ||
    !policyId ||
    !policyFingerprint ||
    policyRevision < 1
  ) {
    return Response.json({ error: "Invalid pilot request." }, { status: 400 });
  }

  try {
    assertBrowserlessPilotRuntimeEnabled();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Pilot runtime unavailable." },
      { status: 503 }
    );
  }

  const pin = { policyId, policyRevision, policyFingerprint };
  let authorization;
  try {
    authorization = await assertRemotePilotAuthorized(current.user.id, {
      workspaceId,
      sourceUrl,
      policyPin: pin
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Pilot authorization failed." },
      { status: 409 }
    );
  }

  const jobId = randomUUID();
  const workerId = "browserless-http-" + jobId.slice(0, 12);
  let reserved = false;
  let jobCreated = false;
  const controller = new AbortController();
  let poll: ReturnType<typeof setInterval> | null = null;

  try {
    await reserveRemotePilotSlot(current.user.id, { workspaceId, jobId });
    reserved = true;

    const job = await createWorkspaceRemoteExecutionJob(current.user.id, {
      workspaceId,
      jobId,
      savedScraperId,
      providerKey: "browserless",
      configRef: BROWSERLESS_CONFIG_REF,
      sourceUrl,
      sourcePolicyPin: pin,
      requestedBudget: {
        maxPages: 1,
        maxRecords: authorization.allowlist.maxRecords,
        maxRuntimeSeconds: authorization.allowlist.maxRuntimeSeconds,
        minimumDelayMs: authorization.policy.minimumDelayMs
      }
    });
    jobCreated = true;

    await enqueueWorkspaceRemoteExecutionJob(current.user.id, workspaceId, jobId);
    await leaseWorkspaceRemoteExecutionJob(current.user.id, {
      workspaceId,
      jobId,
      workerId,
      leaseSeconds: 90
    });
    await heartbeatWorkspaceRemoteExecutionJob(current.user.id, {
      workspaceId,
      jobId,
      workerId
    });

    await appendRemotePilotEvent(current.user.id, {
      workspaceId,
      jobId,
      eventType: "run-started",
      region: authorization.control.region,
      details: {
        sourceOrigin: job.sourceOrigin,
        policyId,
        policyRevision,
        policyFingerprint,
        maxPages: 1,
        maxRecords: authorization.allowlist.maxRecords,
        maxRuntimeSeconds: authorization.allowlist.maxRuntimeSeconds,
        maxProviderUnits: authorization.allowlist.maxUnitsPerRun,
        egress: "direct"
      }
    });

    poll = setInterval(() => {
      void (async () => {
        if (isGlobalRemoteKillSwitchActive()) {
          controller.abort();
          return;
        }
        if (
          await isWorkspaceRemotePilotKilled(
            current.user.id,
            workspaceId
          )
        ) {
          controller.abort();
        }
      })().catch(() => controller.abort());
    }, 1000);

    const provider = new BrowserlessControlledPilotProvider({
      token: process.env.BROWSERLESS_API_TOKEN ?? "",
      region: authorization.control.region
    });
    const result = await provider.execute(
      {
        jobId: job.jobId,
        workspaceId: job.workspaceId,
        savedScraperId: job.savedScraperId,
        providerKey: job.providerKey,
        configRef: job.configRef,
        sourceUrl: job.sourceUrl,
        sourceOrigin: job.sourceOrigin,
        policy: job.sourcePolicySnapshot,
        budget: job.budget,
        createdAt: job.createdAt.toISOString()
      },
      {
        maxProviderUnits: Math.min(
          authorization.control.maxUnitsPerRun,
          authorization.allowlist.maxUnitsPerRun
        ),
        signal: controller.signal
      }
    );

    if (
      isGlobalRemoteKillSwitchActive() ||
      (await isWorkspaceRemotePilotKilled(current.user.id, workspaceId))
    ) {
      throw new Error("remote_pilot_killed");
    }

    const completion = await completeWorkspaceRemoteExecutionJob(
      current.user.id,
      {
        workspaceId,
        jobId,
        workerId,
        idempotencyKey: "browserless:" + jobId + ":v1",
        payload: result as unknown as Record<string, unknown>
      }
    );

    await appendRemotePilotEvent(current.user.id, {
      workspaceId,
      jobId,
      eventType: "run-succeeded",
      region: authorization.control.region,
      unitsEstimated: result.provider.unitsEstimated,
      durationMs: result.provider.durationMs,
      responseCode: result.provider.responseCode,
      details: {
        finalUrl: result.page.finalUrl,
        contentBytes: result.page.contentBytes,
        contentSha256: result.page.contentSha256,
        title: result.page.title,
        resultFingerprint: completion.resultFingerprint
      }
    });

    return Response.json({
      jobId,
      status: completion.job.status,
      provider: result.provider,
      page: result.page,
      sourcePolicy: result.sourcePolicy,
      resultFingerprint: completion.resultFingerprint
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "remote_pilot_failed";
    if (jobCreated) {
      await finishRemotePilotJob(current.user.id, {
        workspaceId,
        jobId,
        status:
          message === "remote_pilot_killed" ||
          (error instanceof Error && error.name === "AbortError")
            ? "cancelled"
            : "failed",
        failureCode: message
      }).catch(() => undefined);
    }
    await appendRemotePilotEvent(current.user.id, {
      workspaceId,
      jobId,
      eventType: "run-failed",
      region: authorization.control.region,
      details: { failureCode: message }
    }).catch(() => undefined);

    return Response.json({ error: message, jobId }, { status: 502 });
  } finally {
    if (poll) clearInterval(poll);
    if (reserved) {
      await releaseRemotePilotSlot(current.user.id, {
        workspaceId,
        jobId
      }).catch(() => undefined);
    }
  }
}
