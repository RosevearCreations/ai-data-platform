import { createHash } from "node:crypto";

import type {
  RemoteExecutionJobSpec,
  RemoteExecutionProviderReadiness
} from "./remote-execution";

export type BrowserlessRegion =
  | "us-east"
  | "us-west"
  | "eu-uk"
  | "eu-ams";

export const BROWSERLESS_PROVIDER_KEY = "browserless";
export const BROWSERLESS_CONFIG_REF =
  "enc-config://remote-execution/browserless-primary";
export const REMOTE_EXECUTION_KILL_SWITCH =
  "REMOTE_EXECUTION_KILL_SWITCH";

const regionBaseUrls: Record<BrowserlessRegion, string> = {
  "us-east": "https://chrome-us-east.browserless.io",
  "us-west": "https://chrome-us-west.browserless.io",
  "eu-uk": "https://chrome-eu-uk.browserless.io",
  "eu-ams": "https://chrome-eu-ams.browserless.io"
};

type RuntimeEnv = Readonly<Record<string, string | undefined>>;

export interface BrowserlessPilotResult {
  pagesProcessed: 1;
  recordsCollected: 0;
  provider: {
    key: "browserless";
    region: BrowserlessRegion;
    egress: "direct";
    unitsEstimated: number;
    durationMs: number;
    responseCode: number;
  };
  page: {
    finalUrl: string;
    contentBytes: number;
    contentSha256: string;
    title: string | null;
  };
  sourcePolicy: {
    id: string;
    revision: number;
    fingerprint: string;
  };
}

export function browserlessBaseUrl(region: BrowserlessRegion) {
  return regionBaseUrls[region];
}

export function isGlobalRemoteKillSwitchActive(
  env: RuntimeEnv = process.env
) {
  return env[REMOTE_EXECUTION_KILL_SWITCH] !== "false";
}

export function browserlessPilotReadiness(
  env: RuntimeEnv = process.env
) {
  const executionEnabled =
    env.REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED === "true";
  const globalKillSwitchActive = isGlobalRemoteKillSwitchActive(env);
  const tokenConfigured = Boolean(env.BROWSERLESS_API_TOKEN?.trim());

  return {
    build: 27,
    selectedProvider: "browserless",
    executionEnabled,
    globalKillSwitchActive,
    tokenConfigured,
    readyForLivePilot:
      executionEnabled && !globalKillSwitchActive && tokenConfigured,
    egressMode: "direct",
    proxyEnabled: false,
    captchaSolvingEnabled: false,
    stealthEnabled: false,
    allowedRegions: Object.keys(regionBaseUrls) as BrowserlessRegion[],
    defaultRegion: "us-east" as BrowserlessRegion,
    pilotLimits: {
      concurrency: 1,
      pagesPerRun: 1,
      maxRuntimeSeconds: 60,
      maxProviderUnitsPerRun: 2
    }
  };
}

export function assertBrowserlessPilotRuntimeEnabled(
  env: RuntimeEnv = process.env
) {
  const readiness = browserlessPilotReadiness(env);
  if (!readiness.executionEnabled) {
    throw new Error("remote_provider_execution_disabled");
  }
  if (readiness.globalKillSwitchActive) {
    throw new Error("remote_global_kill_switch_active");
  }
  if (!readiness.tokenConfigured) {
    throw new Error("browserless_api_token_missing");
  }
  return readiness;
}

function titleFromHtml(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  const value = match[1].replace(/\s+/g, " ").trim();
  return value ? value.slice(0, 200) : null;
}

export class BrowserlessControlledPilotProvider {
  readonly key = BROWSERLESS_PROVIDER_KEY;
  readonly mode = "external" as const;
  private readonly token: string;
  private readonly region: BrowserlessRegion;
  private readonly fetchImpl: typeof fetch;
  private readonly nowMs: () => number;

  constructor(input: {
    token: string;
    region: BrowserlessRegion;
    fetchImpl?: typeof fetch;
    nowMs?: () => number;
  }) {
    this.token = input.token.trim();
    this.region = input.region;
    this.fetchImpl = input.fetchImpl ?? fetch;
    this.nowMs = input.nowMs ?? Date.now;

    if (!this.token) {
      throw new Error("browserless_api_token_missing");
    }
  }

  async readiness(): Promise<RemoteExecutionProviderReadiness> {
    return {
      providerKey: this.key,
      mode: this.mode,
      ready: true,
      details:
        "Browserless controlled pilot adapter is configured for direct /content REST execution."
    };
  }

  async dispatch(job: RemoteExecutionJobSpec) {
    return {
      accepted: job.providerKey === this.key,
      providerJobId: job.providerKey === this.key ? "browserless-" + job.jobId : null
    };
  }

  async cancel() {
    return { cancelled: true };
  }

  async execute(
    job: RemoteExecutionJobSpec,
    input: {
      maxProviderUnits: number;
      signal?: AbortSignal;
    }
  ): Promise<BrowserlessPilotResult> {
    if (job.providerKey !== this.key) {
      throw new Error("browserless_provider_job_mismatch");
    }
    if (job.policy.dataSensitivity !== "public-facts") {
      throw new Error("remote_pilot_non_public_source_blocked");
    }
    if (
      job.policy.collectionMethod !== "public-webpage" ||
      job.policy.robotsDecision !== "allowed"
    ) {
      throw new Error("remote_pilot_public_web_policy_required");
    }
    if (job.budget.maxPages !== 1) {
      throw new Error("remote_pilot_one_page_limit_required");
    }
    if (job.budget.maxRuntimeSeconds > 60) {
      throw new Error("remote_pilot_runtime_limit_exceeded");
    }
    if (
      !Number.isInteger(input.maxProviderUnits) ||
      input.maxProviderUnits < 1 ||
      input.maxProviderUnits > 2
    ) {
      throw new Error("remote_pilot_unit_budget_invalid");
    }

    const source = new URL(job.sourceUrl);
    if (source.protocol !== "https:") {
      throw new Error("remote_pilot_https_required");
    }
    if (source.origin !== job.sourceOrigin || source.origin !== job.policy.origin) {
      throw new Error("remote_pilot_origin_mismatch");
    }

    const endpoint = new URL("/content", browserlessBaseUrl(this.region));
    endpoint.searchParams.set("token", this.token);
    endpoint.searchParams.set(
      "timeout",
      String(job.budget.maxRuntimeSeconds * 1000)
    );
    endpoint.searchParams.append("allowedDomains", source.hostname);

    const startedAt = this.nowMs();
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: job.sourceUrl,
        gotoOptions: {
          waitUntil: "domcontentloaded",
          timeout: job.budget.maxRuntimeSeconds * 1000
        },
        rejectResourceTypes: ["image", "media", "font"],
        bestAttempt: false
      }),
      signal: input.signal
    });
    const durationMs = Math.max(0, this.nowMs() - startedAt);
    const unitsEstimated = Math.max(1, Math.ceil(durationMs / 30_000));

    if (unitsEstimated > input.maxProviderUnits) {
      throw new Error("remote_pilot_unit_budget_exceeded");
    }
    if (!response.ok) {
      throw new Error("browserless_provider_request_failed_" + response.status);
    }

    const html = await response.text();
    const contentBytes = Buffer.byteLength(html, "utf8");
    if (contentBytes > 1_000_000) {
      throw new Error("remote_pilot_content_too_large");
    }

    const finalUrl =
      response.headers.get("x-response-url")?.trim() || job.sourceUrl;
    const finalOrigin = new URL(finalUrl).origin;
    if (finalOrigin !== job.sourceOrigin) {
      throw new Error("remote_pilot_cross_origin_redirect_blocked");
    }

    const targetResponseCode = Number(
      response.headers.get("x-response-code") ?? "200"
    );

    return {
      pagesProcessed: 1,
      recordsCollected: 0,
      provider: {
        key: "browserless",
        region: this.region,
        egress: "direct",
        unitsEstimated,
        durationMs,
        responseCode: Number.isFinite(targetResponseCode)
          ? targetResponseCode
          : 200
      },
      page: {
        finalUrl,
        contentBytes,
        contentSha256: createHash("sha256").update(html).digest("hex"),
        title: titleFromHtml(html)
      },
      sourcePolicy: {
        id: job.policy.policyId,
        revision: job.policy.revision,
        fingerprint: job.policy.fingerprint
      }
    };
  }
}
