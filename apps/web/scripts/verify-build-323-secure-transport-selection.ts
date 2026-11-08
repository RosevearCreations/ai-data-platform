import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createSecureTransportManifest,
  createTransportHealthEvidence,
  registerTrustedLocalRelay,
  secureTransportDescriptor,
  selectSecureTransport
} from "../lib/secure-transport-selection";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function health(
  manifest: ReturnType<typeof createSecureTransportManifest>,
  status: "healthy" | "degraded" | "unhealthy" = "healthy",
  checkedAt = "2026-11-08T04:50:00.000Z"
) {
  return createTransportHealthEvidence({
    manifest,
    probeId: "probe-build323-" + manifest.transportId,
    status,
    checkedAt,
    latencyMs: 25
  });
}

async function main() {
  const direct = createSecureTransportManifest({
    transportId: "direct.primary",
    displayName: "Primary direct HTTPS",
    kind: "direct-https",
    environment: "production",
    destinationOrigin: "https://module.example.com",
    originAllowlist: ["https://module.example.com"],
    priority: 10,
    securityLevel: "standard",
    health: {
      method: "GET",
      path: "/health",
      expectedStatuses: [200],
      timeoutMs: 3000
    }
  });
  assert.equal(direct.kind, "direct-https");
  assert.equal(direct.destinationOrigin, "https://module.example.com");
  assert.equal(direct.security.wildcardOriginsAllowed, false);

  const relay = registerTrustedLocalRelay({
    transportId: "relay.local",
    displayName: "Trusted local relay",
    environment: "production",
    relayOrigin: "https://relay.local.example",
    relayId: "relay-build323-local",
    trustReference: "trust-ref-build323-local",
    priority: 20,
    securityLevel: "hardened"
  });
  assert.equal(relay.kind, "trusted-local-relay");
  assert.equal(relay.localRelay?.rawTrustMaterialIncluded, false);
  assert.equal(relay.securityStrength > direct.securityStrength, true);

  const cloud = createSecureTransportManifest({
    transportId: "relay.cloud",
    displayName: "Approved cloud relay",
    kind: "approved-cloud-relay",
    environment: "production",
    destinationOrigin: "https://relay.example.com",
    originAllowlist: [
      "https://relay.example.com",
      "https://module.example.com"
    ],
    priority: 30,
    securityLevel: "hardened",
    health: {
      method: "HEAD",
      path: "/health",
      expectedStatuses: [200, 204],
      timeoutMs: 4000
    }
  });
  assert.equal(cloud.kind, "approved-cloud-relay");

  const localDevelopment = registerTrustedLocalRelay({
    transportId: "relay.loopback",
    displayName: "Loopback relay",
    environment: "development",
    relayOrigin: "http://127.0.0.1:8765",
    relayId: "relay-loopback-build323",
    trustReference: "trust-ref-loopback-build323"
  });
  assert.equal(
    localDevelopment.destinationOrigin,
    "http://127.0.0.1:8765"
  );

  assert.throws(
    () =>
      createSecureTransportManifest({
        transportId: "bad.direct",
        displayName: "Bad direct",
        kind: "direct-https",
        environment: "development",
        destinationOrigin: "http://localhost:3000",
        originAllowlist: ["http://localhost:3000"],
        health: {
          method: "GET",
          path: "/health",
          expectedStatuses: [200],
          timeoutMs: 1000
        }
      }),
    /transport_https_required/
  );

  assert.throws(
    () =>
      registerTrustedLocalRelay({
        transportId: "bad.production.loopback",
        displayName: "Bad production loopback",
        environment: "production",
        relayOrigin: "http://127.0.0.1:8765",
        relayId: "relay-prod-build323",
        trustReference: "trust-ref-prod-build323"
      }),
    /transport_local_relay_origin_invalid/
  );

  assert.throws(
    () =>
      createSecureTransportManifest({
        transportId: "bad.wildcard",
        displayName: "Bad wildcard",
        kind: "direct-https",
        environment: "production",
        destinationOrigin: "https://module.example.com",
        originAllowlist: ["*"],
        health: {
          method: "GET",
          path: "/health",
          expectedStatuses: [200],
          timeoutMs: 1000
        }
      })
  );

  const selectedDirect = selectSecureTransport({
    transports: [direct, relay, cloud],
    healthEvidence: [
      health(direct),
      health(relay),
      health(cloud)
    ],
    environment: "production",
    auditCorrelationId: "audit-build323-primary",
    requestedTransportId: direct.transportId,
    now: "2026-11-08T04:51:00.000Z"
  });
  assert.equal(selectedDirect.state, "selected");
  assert.equal(selectedDirect.transport?.transportId, direct.transportId);
  assert.equal(
    selectedDirect.audit.reasonCode,
    "requested-transport-selected"
  );
  assert.equal(
    selectedDirect.audit.networkRequestPerformedBySelector,
    false
  );
  assert.equal(
    selectedDirect.audit.authorizationGrantedBySelection,
    false
  );

  const failover = selectSecureTransport({
    transports: [direct, relay, cloud],
    healthEvidence: [
      health(direct, "unhealthy"),
      health(relay),
      health(cloud)
    ],
    environment: "production",
    auditCorrelationId: "audit-build323-failover",
    requestedTransportId: direct.transportId,
    allowFailover: true,
    now: "2026-11-08T04:51:00.000Z"
  });
  assert.equal(failover.state, "selected");
  assert.equal(failover.transport?.transportId, relay.transportId);
  assert.equal(
    failover.audit.reasonCode,
    "failover-transport-selected"
  );
  assert.equal(
    failover.audit.failoverFromTransportId,
    direct.transportId
  );
  assert.equal(failover.audit.silentDowngradePerformed, false);

  const hardenedRequested = createSecureTransportManifest({
    ...{
      transportId: "direct.hardened",
      displayName: "Hardened direct",
      kind: "direct-https" as const,
      environment: "production" as const,
      destinationOrigin: "https://hardened.example.com",
      originAllowlist: ["https://hardened.example.com"],
      priority: 1,
      securityLevel: "hardened" as const,
      health: {
        method: "GET" as const,
        path: "/health",
        expectedStatuses: [200],
        timeoutMs: 3000
      }
    }
  });
  const weaker = createSecureTransportManifest({
    transportId: "direct.standard-backup",
    displayName: "Standard backup",
    kind: "direct-https",
    environment: "production",
    destinationOrigin: "https://backup.example.com",
    originAllowlist: ["https://backup.example.com"],
    priority: 2,
    securityLevel: "standard",
    health: {
      method: "GET",
      path: "/health",
      expectedStatuses: [200],
      timeoutMs: 3000
    }
  });
  const downgradeDenied = selectSecureTransport({
    transports: [hardenedRequested, weaker],
    healthEvidence: [
      health(hardenedRequested, "unhealthy"),
      health(weaker)
    ],
    environment: "production",
    auditCorrelationId: "audit-build323-downgrade",
    requestedTransportId: hardenedRequested.transportId,
    allowFailover: true,
    now: "2026-11-08T04:51:00.000Z"
  });
  assert.equal(downgradeDenied.state, "held");
  assert.equal(
    downgradeDenied.audit.reasonCode,
    "security-downgrade-denied"
  );
  assert.equal(downgradeDenied.audit.silentDowngradePerformed, false);

  const stale = selectSecureTransport({
    transports: [direct],
    healthEvidence: [
      health(direct, "healthy", "2026-11-08T04:40:00.000Z")
    ],
    environment: "production",
    auditCorrelationId: "audit-build323-stale",
    requestedTransportId: direct.transportId,
    now: "2026-11-08T04:51:00.000Z"
  });
  assert.equal(stale.state, "held");
  assert.equal(
    stale.audit.reasonCode,
    "requested-transport-unavailable"
  );

  const descriptor = secureTransportDescriptor();
  assert.equal(descriptor.originAllowlist.wildcardAllowed, false);
  assert.equal(descriptor.failover.explicitOptInRequired, true);
  assert.equal(
    descriptor.failover.equalOrStrongerSecurityRequired,
    true
  );
  assert.equal(descriptor.security.rawCredentialsAccepted, false);
  assert.equal(
    descriptor.security.selectorPerformsNetworkRequest,
    false
  );

  const [
    moduleSource,
    discoveryApi,
    page,
    navigation,
    operatorTools,
    manifest,
    docs,
    review,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("lib/secure-transport-selection.ts"),
    source("app/api/module-transports/route.ts"),
    source("app/app-connections/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_323_SECURE_LOCAL_CLOUD_RELAY_TRANSPORT_SELECTION.md"),
    source("../../docs/integration/ai-data-platform-build323-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "direct-https",
    "trusted-local-relay",
    "approved-cloud-relay",
    "registerTrustedLocalRelay",
    "originAllowlist",
    "transport_local_relay_origin_invalid",
    "security-downgrade-denied",
    "networkRequestPerformedBySelector: false",
    "authorizationGrantedBySelection: false",
    "silentDowngradePerformed: false"
  ]) {
    assert.ok(
      moduleSource.includes(token),
      "Build 323 transport source missing " + token
    );
  }

  for (const token of [
    "runtimeRegistrationIsHostSupplied: true",
    "noTransportIsAutoRegistered: true",
    "noTransportIsAutoSelectedWithoutHealthEvidence: true",
    "connectionAuthorityRemainsIndependent: true"
  ]) {
    assert.ok(
      discoveryApi.includes(token),
      "Build 323 discovery API missing " + token
    );
  }

  assert.ok(page.includes("Build 323 secure transport selection"));
  assert.ok(page.includes("/api/module-transports"));
  assert.ok(
    navigation.includes("secure transport selection") &&
      operatorTools.includes("secure transport selection")
  );

  for (const token of [
    '"secure-transport-selection-v1"',
    '"trusted-local-relay-v1"',
    '"transport-health-evidence-v1"',
    '"no-silent-transport-downgrade-v1"',
    "transportSelectionActivatesConnection: false",
    "transportSelectionGrantsAuthorization: false",
    "transportSelectorReadsRawCredentials: false",
    "transportSilentSecurityDowngradeAllowed: false"
  ]) {
    assert.ok(
      manifest.includes(token),
      "Build 323 manifest missing " + token
    );
  }

  for (const token of [
    "Build 323",
    "Transport manifest",
    "Origin allowlist",
    "Trusted local relay registration",
    "Transport health",
    "Failover eligibility",
    "Audit evidence",
    "Build 324"
  ]) {
    assert.ok(
      docs.includes(token),
      "Build 323 docs missing " + token
    );
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 323);
  assert.equal(
    reviewJson.security.weakerSecurityFailoverAllowed,
    false
  );
  assert.equal(
    reviewJson.security.selectorPerformsNetworkRequest,
    false
  );
  assert.equal(reviewJson.nextQueuedBuild, 324);

  assert.ok(
    roadmap.includes(
      "Build 323 — Secure Local/Cloud Relay & Transport Selection"
    ) &&
      roadmap.includes(
        "Build 324 — Offline Queue, Reconnect & Idempotent Synchronization"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-323-secure-transport-selection.ts"
      ),
      "Build 323 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 323 Secure Local/Cloud Relay & Transport Selection verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
