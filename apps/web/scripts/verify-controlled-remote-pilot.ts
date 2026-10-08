import {
  BrowserlessControlledPilotProvider,
  browserlessBaseUrl,
  browserlessPilotReadiness,
  isGlobalRemoteKillSwitchActive
} from "../lib/browserless-provider";
import { createRemoteExecutionJobSpec } from "../lib/remote-execution";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const workspaceId = "27000000-0000-4000-8000-000000000001";
const policy = {
  version: 1 as const,
  workspaceId,
  policyId: "build027-policy",
  revision: 4,
  fingerprint: "sp1-build027",
  origin: "https://example.com",
  displayName: "Example Domain",
  purpose: "Controlled provider pilot verification.",
  collectionMethod: "public-webpage" as const,
  publicOrAuthorized: true as const,
  termsReviewed: true as const,
  termsUrl: "https://example.com/terms",
  robotsDecision: "allowed" as const,
  robotsUrl: "https://example.com/robots.txt",
  noAccessControlBypass: true as const,
  dataSensitivity: "public-facts" as const,
  minimumDelayMs: 1500,
  maxPagesPerRun: 5,
  maxRecordsPerRun: 100,
  reviewExpiresAt: "2027-01-01T00:00:00.000Z",
  copiedAt: "2026-10-08T00:00:00.000Z"
};

const job = createRemoteExecutionJobSpec({
  jobId: "27000000-0000-4000-8000-000000000002",
  workspaceId,
  savedScraperId: "build027-pilot",
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
  createdAt: "2026-10-08T00:00:00.000Z"
});

async function run() {
  assert(
    browserlessBaseUrl("us-east") ===
      "https://chrome-us-east.browserless.io",
    "US East Browserless endpoint changed unexpectedly."
  );
  assert(
    isGlobalRemoteKillSwitchActive({}),
    "Global kill switch must default active."
  );

  const readiness = browserlessPilotReadiness({
    REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED: "true",
    REMOTE_EXECUTION_KILL_SWITCH: "false",
    BROWSERLESS_API_TOKEN: "ci-secret"
  });
  assert(readiness.readyForLivePilot, "Valid runtime readiness was not recognized.");
  assert(!readiness.proxyEnabled, "Proxy must remain disabled.");
  assert(!readiness.captchaSolvingEnabled, "CAPTCHA solving must remain disabled.");

  let requestedUrl = "";
  let requestedBody: Record<string, unknown> = {};
  let clockIndex = 0;
  const clock = [0, 12_000];
  const fakeFetch: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return new Response(
      "<!doctype html><html><head><title>Example Domain</title></head><body>ok</body></html>",
      {
        status: 200,
        headers: {
          "x-response-code": "200",
          "x-response-url": "https://example.com/"
        }
      }
    );
  };
  const provider = new BrowserlessControlledPilotProvider({
    token: "ci-secret",
    region: "us-east",
    fetchImpl: fakeFetch,
    nowMs: () => clock[Math.min(clockIndex++, clock.length - 1)]
  });
  const result = await provider.execute(job, { maxProviderUnits: 2 });

  const endpoint = new URL(requestedUrl);
  assert(endpoint.hostname === "chrome-us-east.browserless.io", "Wrong region endpoint.");
  assert(endpoint.pathname === "/content", "Pilot must use /content only.");
  assert(endpoint.searchParams.get("token") === "ci-secret", "Provider token missing.");
  assert(endpoint.searchParams.get("allowedDomains") === "example.com", "Domain restriction missing.");
  assert(!endpoint.searchParams.has("proxy"), "Proxy unexpectedly enabled.");
  assert(!endpoint.searchParams.has("stealth"), "Stealth unexpectedly enabled.");
  assert(!endpoint.searchParams.has("externalProxyServer"), "External proxy unexpectedly enabled.");
  assert(requestedBody.url === "https://example.com/", "Source URL changed.");
  assert(
    JSON.stringify(requestedBody).includes("image") &&
      JSON.stringify(requestedBody).includes("media"),
    "Resource limits were not included."
  );
  assert(result.provider.unitsEstimated === 1, "Unit estimate should be one 30-second unit.");
  assert(result.page.title === "Example Domain", "Rendered title was not captured.");
  assert(
    !JSON.stringify(result).includes("ci-secret") &&
      !JSON.stringify(result).includes("<html"),
    "Secret or raw HTML leaked into persisted result shape."
  );

  let redirectBlocked = false;
  const redirectProvider = new BrowserlessControlledPilotProvider({
    token: "ci-secret",
    region: "us-east",
    fetchImpl: async () =>
      new Response("<html><title>Redirect</title></html>", {
        status: 200,
        headers: {
          "x-response-code": "200",
          "x-response-url": "https://other.example/"
        }
      }),
    nowMs: (() => {
      const values = [0, 1000];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })()
  });
  try {
    await redirectProvider.execute(job, { maxProviderUnits: 2 });
  } catch (error) {
    redirectBlocked =
      error instanceof Error &&
      error.message === "remote_pilot_cross_origin_redirect_blocked";
  }
  assert(redirectBlocked, "Cross-origin redirect was not blocked.");

  let unitBudgetBlocked = false;
  const slowProvider = new BrowserlessControlledPilotProvider({
    token: "ci-secret",
    region: "us-east",
    fetchImpl: async () =>
      new Response("<html></html>", {
        status: 200,
        headers: { "x-response-url": "https://example.com/" }
      }),
    nowMs: (() => {
      const values = [0, 31_000];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })()
  });
  try {
    await slowProvider.execute(job, { maxProviderUnits: 1 });
  } catch (error) {
    unitBudgetBlocked =
      error instanceof Error &&
      error.message === "remote_pilot_unit_budget_exceeded";
  }
  assert(unitBudgetBlocked, "Provider unit budget overrun was not blocked.");

  console.log(
    "Build 027 Browserless adapter, direct egress, region/domain restriction, kill switch, unit budget and redaction verification passed."
  );
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
