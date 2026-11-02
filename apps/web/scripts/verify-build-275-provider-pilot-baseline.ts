import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  BrowserlessControlledPilotProvider,
  browserlessPilotFailureEvidence
} from "../lib/browserless-provider";
import { buildProviderPilotBaseline } from "../lib/provider-pilot-baseline";
import { createRemoteExecutionJobSpec } from "../lib/remote-execution";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 275 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

const workspaceId = "27500000-0000-4000-8000-000000000001";
const policy = {
  version: 1 as const,
  workspaceId,
  policyId: "build275-policy",
  revision: 1,
  fingerprint: "sp1-build275",
  origin: "https://example.com",
  displayName: "Example Domain",
  purpose: "Build 275 measured provider failure verification.",
  collectionMethod: "public-webpage" as const,
  publicOrAuthorized: true as const,
  termsReviewed: true as const,
  termsUrl: "https://example.com/terms",
  robotsDecision: "allowed" as const,
  robotsUrl: "https://example.com/robots.txt",
  noAccessControlBypass: true as const,
  dataSensitivity: "public-facts" as const,
  minimumDelayMs: 1500,
  maxPagesPerRun: 1,
  maxRecordsPerRun: 100,
  reviewExpiresAt: "2027-01-01T00:00:00.000Z",
  copiedAt: "2026-11-02T00:00:00.000Z"
};

const job = createRemoteExecutionJobSpec({
  jobId: "27500000-0000-4000-8000-000000000002",
  workspaceId,
  savedScraperId: "build275-pilot",
  providerKey: "browserless",
  configRef: "enc-config://remote-execution/browserless-primary",
  sourceUrl: "https://example.com/",
  policy,
  requestedBudget: {
    maxPages: 1,
    maxRecords: 50,
    maxRuntimeSeconds: 60,
    minimumDelayMs: 1500
  },
  createdAt: "2026-11-02T00:00:00.000Z"
});

async function main() {
  const measured = buildProviderPilotBaseline(
    {
      tokenConfigured: true,
      executionEnabled: true,
      globalKillSwitchActive: false,
      readyForLivePilot: true
    },
    [
      {
        workspace: {
          id: workspaceId,
          name: "Measured workspace",
          role: "owner"
        },
        control: { enabled: true, killSwitch: false },
        allowlist: [{ enabled: true }],
        approvedPublicSources: 1,
        report: {
          runs: 2,
          successes: 1,
          failures: 1,
          successRate: 0.5,
          providerUnits: 2,
          averageDurationMs: 1100
        },
        events: [
          {
            jobId: "failed-job",
            eventType: "run-failed",
            unitsEstimated: 1,
            durationMs: 1200,
            responseCode: 503,
            details: { failureCode: "browserless_provider_request_failed_503" },
            createdAt: new Date("2026-11-02T12:02:00.000Z")
          },
          {
            jobId: "success-job",
            eventType: "run-succeeded",
            unitsEstimated: 1,
            durationMs: 1000,
            responseCode: 200,
            details: {
              contentSha256: "abc123",
              finalUrl: "https://example.com/"
            },
            createdAt: new Date("2026-11-02T12:01:00.000Z")
          }
        ]
      }
    ],
    "2026-11-02T12:03:00.000Z"
  );

  ensure(measured.schema === "ai-data-platform.provider-pilot-baseline.v1", "schema");
  ensure(measured.build === 275, "build");
  ensure(measured.state === "measured", "measured state");
  ensure(measured.exitCriterion.met === true, "measured exit criterion");
  ensure(measured.totals.terminalRuns === 2 && measured.totals.providerUnits === 2, "run/unit totals");
  ensure(measured.totals.averageDurationMs === 1100, "average latency");
  ensure(measured.workspaces[0]?.latestTerminalEvidence?.responseCode === 503, "failure response status");
  ensure(
    measured.workspaces[0]?.latestTerminalEvidence?.failureReason === "browserless_provider_request_failed_503",
    "failure reason"
  );

  const blocked = buildProviderPilotBaseline(
    {
      tokenConfigured: false,
      executionEnabled: false,
      globalKillSwitchActive: true,
      readyForLivePilot: false
    },
    [
      {
        workspace: {
          id: "27500000-0000-4000-8000-000000000003",
          name: "Blocked workspace",
          role: "admin"
        },
        control: null,
        allowlist: [],
        approvedPublicSources: 0,
        report: {
          runs: 0,
          successes: 0,
          failures: 0,
          successRate: null,
          providerUnits: 0,
          averageDurationMs: null
        },
        events: []
      }
    ],
    "2026-11-02T12:04:00.000Z"
  );

  ensure(blocked.state === "blocked", "blocked state");
  ensure(blocked.exitCriterion.met === true, "explicit blocker exit criterion");
  ensure(blocked.totals.readyUnmeasuredWorkspaces === 0, "blocked is not ready-unmeasured");
  for (const code of [
    "provider-token-missing",
    "provider-execution-disabled",
    "global-kill-switch-active",
    "approved-public-source-missing",
    "workspace-control-missing",
    "enabled-allowlist-source-missing"
  ]) {
    ensure(blocked.workspaces[0]?.blockers.some((item) => item.code === code), "blocker " + code);
  }

  let measuredFailure: ReturnType<typeof browserlessPilotFailureEvidence> = null;
  const failureProvider = new BrowserlessControlledPilotProvider({
    token: "ci-secret",
    region: "us-east",
    fetchImpl: async () => new Response("provider unavailable", { status: 503 }),
    nowMs: (() => {
      const values = [0, 1500];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })()
  });
  try {
    await failureProvider.execute(job, { maxProviderUnits: 2 });
  } catch (error) {
    ensure(
      error instanceof Error &&
        error.message === "browserless_provider_request_failed_503",
      "provider error code"
    );
    measuredFailure = browserlessPilotFailureEvidence(error);
  }
  ensure(measuredFailure?.unitsEstimated === 1, "failed run provider units");
  ensure(measuredFailure?.durationMs === 1500, "failed run duration");
  ensure(measuredFailure?.responseCode === 503, "failed run response status");

  const [
    baseline,
    database,
    page,
    api,
    pilotRoute,
    provider,
    nav,
    pkg,
    doc,
    statusRaw,
    queue
  ] = await Promise.all([
    source("lib/provider-pilot-baseline.ts"),
    source("lib/provider-pilot-baseline-database.ts"),
    source("app/remote-execution/page.tsx"),
    source("app/api/remote-execution/baseline/route.ts"),
    source("app/api/remote-execution/pilot/route.ts"),
    source("lib/browserless-provider.ts"),
    source("lib/application-navigation.ts"),
    source("package.json"),
    source("../../docs/BUILD_275_PROVIDER_PILOT_BASELINE_COST_LATENCY_FAILURE_EVIDENCE.md"),
    source("../../docs/integration/ql266-ai-data-platform-build275-review.json"),
    source("../../docs/NEXT_BUILDS_273_280.md")
  ]);

  ensure(
    database.includes("listRemotePilotOverviewForUser") &&
      database.includes("listIntelligenceOverviewForUser") &&
      database.includes("browserlessPilotReadiness"),
    "existing provider/source-policy evidence reuse"
  );
  ensure(
    !baseline.includes("insert into") &&
      !baseline.includes("update app.") &&
      !baseline.includes("delete from"),
    "baseline model is read-only"
  );
  for (const token of [
    "terminalRuns",
    "providerUnits",
    "averageDurationMs",
    "responseCode",
    "contentSha256",
    "failureReason",
    "stopConditions"
  ]) {
    ensure(baseline.includes(token), "baseline evidence " + token);
  }
  ensure(page.includes("Build 275") && page.includes("Provider Pilot Baseline, Cost, Latency &amp; Failure Evidence"), "Build 275 page");
  ensure(page.includes("Build 275 exit criterion") && page.includes("Baseline JSON"), "baseline UI/API link");
  ensure(page.includes("blocked baseline is evidence") || page.includes("blocked baseline is evidence".replace("blocked", "Blocked")), "blocked evidence wording");
  ensure(api.includes("buildProviderPilotBaselineForUser") && api.includes('status: 401'), "authenticated baseline API");
  ensure(pilotRoute.includes("browserlessPilotFailureEvidence"), "pilot failure evidence extraction");
  ensure(pilotRoute.includes("durationMs: providerFailure?.durationMs") && pilotRoute.includes("responseCode: providerFailure?.responseCode"), "persist measured failure evidence");
  ensure(provider.includes("browserlessMeasuredError") && provider.includes("providerEvidence"), "measured provider errors");
  ensure(nav.includes('label: "Provider Pilot Baseline"'), "navigation");
  ensure(pkg.includes("verify-build-275-provider-pilot-baseline.ts"), "verifier registered");

  const status = JSON.parse(statusRaw);
  ensure(status.build === 275, "status build");
  ensure(status.provider_pilot_baseline.synthetic_provider_run === false, "no synthetic provider run");
  ensure(status.provider_pilot_baseline.automatic_kill_switch_change === false, "no kill-switch mutation");
  ensure(status.authorization.provider_execution_started_by_baseline === false, "baseline starts no provider run");
  ensure(status.authorization.rls_preserved === true && status.authorization.provider_gate_bypass === false, "authorization boundary");
  ensure(status.ql266_status === "UNDER_REVIEW" && status.connection_state === "DISCONNECTED", "QL-266 boundary");
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 276, "next build");

  ensure(doc.includes("A blocked baseline is a valid evidence result"), "blocked-baseline documentation");
  ensure(doc.includes("Build 276 — Consumer Acceptance, Replay & Delivery Receipt Reconciliation"), "next build documentation");
  ensure(queue.includes("Build 275 — Provider Pilot Baseline, Cost, Latency & Failure Evidence"), "queue Build 275");
  ensure(queue.includes("Build 276 — Consumer Acceptance, Replay & Delivery Receipt Reconciliation"), "queue Build 276");

  console.log("Build 275 provider pilot baseline, cost, latency and failure evidence verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
