import assert from "node:assert/strict";
import test from "node:test";

import {
  CONNECTOR_SDK_VERSION,
  ConnectorSdkError,
  createConnectorHttpClient,
  defineConnector,
  normalizeConnectorConfig,
  validateConnectorManifest,
  validateConnectorSecretReferences
} from "../dist/index.js";

const legacyManifest = {
  manifestVersion: 1,
  sdkVersion: 1,
  key: "example.legacy",
  version: "1.0.0",
  displayName: "Legacy connector",
  description: "Legacy compatibility fixture.",
  capabilities: ["import"],
  configSchema: [],
  secrets: [],
  limits: { maxExecutionMs: 2000, maxInputBytes: 20000, maxOutputBytes: 20000 }
};

const httpManifest = {
  manifestVersion: 2,
  sdkVersion: 2,
  key: "example.http-v2",
  version: "2.0.0",
  displayName: "HTTP v2 connector",
  description: "SDK v2 HTTP acceptance fixture.",
  capabilities: ["import", "enrichment"],
  configSchema: [{
    key: "base-url",
    label: "Base URL",
    description: "Provider base URL.",
    type: "string",
    required: true
  }],
  secrets: [{
    key: "api-token",
    label: "API token",
    description: "Bearer token.",
    required: true,
    environmentVariable: "EXAMPLE_CONNECTOR_API_TOKEN"
  }],
  limits: { maxExecutionMs: 10000, maxInputBytes: 20000, maxOutputBytes: 50000 },
  transport: {
    kind: "http",
    baseUrlConfigKey: "base-url",
    authentication: { mode: "bearer", secretKey: "api-token" },
    request: {
      allowedOrigins: ["https://api.example.test"],
      allowedMethods: ["GET", "POST", "HEAD"],
      defaultTimeoutMs: 2000,
      retry: {
        maxAttempts: 3,
        baseDelayMs: 0,
        maxDelayMs: 0,
        retryStatuses: [429, 503],
        jitter: false
      },
      userAgent: "rosevear-sdk-test/2"
    },
    pagination: {
      mode: "cursor",
      itemsPath: "data.items",
      cursorParameter: "cursor",
      nextCursorPath: "meta.next",
      pageSizeParameter: "limit",
      pageSize: 2,
      maxPages: 4
    },
    health: {
      path: "/health",
      method: "HEAD",
      expectedStatuses: [200, 204],
      timeoutMs: 1000
    }
  }
};

test("SDK reports generation 2 and keeps legacy manifests explicitly valid", () => {
  assert.equal(CONNECTOR_SDK_VERSION, 2);
  assert.deepEqual(validateConnectorManifest(legacyManifest), {
    valid: true,
    errors: []
  });
  assert.deepEqual(validateConnectorManifest(httpManifest), {
    valid: true,
    errors: []
  });
});

test("v2 manifest validation fails closed on unsafe origin and undeclared auth secret", () => {
  const invalid = structuredClone(httpManifest);
  invalid.transport.request.allowedOrigins = ["http://localhost:3000"];
  invalid.transport.authentication.secretKey = "other-secret";
  const result = validateConnectorManifest(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /HTTPS origins/i);
  assert.match(result.errors.join(" "), /declared secret/i);
});

test("configuration and exact environment secret references remain bounded", () => {
  assert.deepEqual(
    normalizeConnectorConfig(httpManifest, { "base-url": "https://api.example.test" }),
    { "base-url": "https://api.example.test" }
  );
  assert.throws(
    () => normalizeConnectorConfig(httpManifest, {
      "base-url": "https://api.example.test",
      token: "raw-secret"
    }),
    /unknown_field/
  );
  assert.deepEqual(
    validateConnectorSecretReferences(httpManifest, {
      "api-token": {
        kind: "environment",
        environmentVariable: "EXAMPLE_CONNECTOR_API_TOKEN"
      }
    }),
    {
      "api-token": {
        kind: "environment",
        environmentVariable: "EXAMPLE_CONNECTOR_API_TOKEN"
      }
    }
  );
  assert.throws(
    () => validateConnectorSecretReferences(httpManifest, {
      "api-token": { value: "do-not-store-me" }
    }),
    /reference_invalid/
  );
});

test("HTTP client injects auth, retries bounded 503, and emits sanitized audit evidence", async () => {
  let calls = 0;
  const events = [];
  const seenAuth = [];
  const client = createConnectorHttpClient({
    manifest: httpManifest,
    config: { "base-url": "https://api.example.test" },
    secret: async () => "super-secret-token",
    audit: { record: (event) => events.push(event) },
    fetchImpl: async (_url, init) => {
      calls += 1;
      seenAuth.push(new Headers(init.headers).get("authorization"));
      if (calls === 1) {
        return new Response(JSON.stringify({ error: "busy" }), {
          status: 503,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "req-2" }
      });
    },
    sleep: async () => {},
    correlationIdFactory: () => "corr-test"
  });

  const response = await client.request({ path: "/records" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { ok: true });
  assert.equal(response.attempts, 2);
  assert.deepEqual(seenAuth, [
    "Bearer super-secret-token",
    "Bearer super-secret-token"
  ]);
  assert.equal(client.evidence().requests, 2);
  assert.equal(client.evidence().retries, 1);
  assert.equal(client.evidence().succeededRequests, 1);
  assert.equal(JSON.stringify(events).includes("super-secret-token"), false);
  assert.equal(events.some((event) => event.type === "request-retrying"), true);
});

test("POST is not retried unless an idempotency key is supplied", async () => {
  let calls = 0;
  const client = createConnectorHttpClient({
    manifest: httpManifest,
    config: { "base-url": "https://api.example.test" },
    secret: async () => "token",
    fetchImpl: async () => {
      calls += 1;
      return new Response("busy", { status: 503 });
    },
    sleep: async () => {}
  });

  await assert.rejects(
    () => client.request({ path: "/write", method: "POST", body: { x: 1 } }),
    (error) => error instanceof ConnectorSdkError && error.status === 503
  );
  assert.equal(calls, 1);
});

test("cursor pagination follows declared fields and stops on empty cursor", async () => {
  const requested = [];
  const client = createConnectorHttpClient({
    manifest: httpManifest,
    config: { "base-url": "https://api.example.test" },
    secret: async () => "token",
    fetchImpl: async (url) => {
      requested.push(String(url));
      const parsed = new URL(String(url));
      const cursor = parsed.searchParams.get("cursor");
      const body = cursor
        ? { data: { items: [3] }, meta: { next: null } }
        : { data: { items: [1, 2] }, meta: { next: "next-1" } };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const result = await client.paginate({ path: "/records" });
  assert.deepEqual(result.items, [1, 2, 3]);
  assert.equal(result.pages, 2);
  assert.equal(result.truncated, false);
  assert.equal(requested[0].includes("limit=2"), true);
  assert.equal(requested[1].includes("cursor=next-1"), true);
  assert.equal(client.evidence().pages, 2);
});

test("health checks use the manifest path and expected status set", async () => {
  let method = null;
  let path = null;
  const client = createConnectorHttpClient({
    manifest: httpManifest,
    config: { "base-url": "https://api.example.test" },
    secret: async () => "token",
    fetchImpl: async (url, init) => {
      method = init.method;
      path = new URL(String(url)).pathname;
      return new Response(null, { status: 204 });
    }
  });

  const health = await client.health();
  assert.equal(health.healthy, true);
  assert.equal(health.status, 204);
  assert.equal(method, "HEAD");
  assert.equal(path, "/health");
  assert.equal(client.evidence().healthChecks, 1);
});

test("destinations outside the exact manifest origin fail before fetch", async () => {
  let fetched = false;
  const client = createConnectorHttpClient({
    manifest: httpManifest,
    config: { "base-url": "https://api.example.test" },
    secret: async () => "token",
    fetchImpl: async () => {
      fetched = true;
      return new Response(null, { status: 200 });
    }
  });

  await assert.rejects(
    () => client.request({ path: "https://other.example.test/records" }),
    /outside the manifest allowlist/
  );
  assert.equal(fetched, false);
});

test("defineConnector accepts the reviewed v2 manifest contract", () => {
  const definition = defineConnector(httpManifest, async ({ input }) => ({
    output: input,
    summary: { ok: true }
  }));
  assert.equal(definition.manifest.sdkVersion, 2);
});
