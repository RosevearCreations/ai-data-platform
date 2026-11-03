import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildAppConnectionRegistry } from "../lib/app-connection-registry";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 281 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const registry = buildAppConnectionRegistry("2026-11-03T12:30:00.000Z");

  ensure(
    registry.schema === "ai-data-platform.app-connection-registry.v1",
    "registry schema"
  );
  ensure(registry.build === 281, "build number");
  ensure(registry.summary.applications === 6, "six peer applications");
  ensure(registry.summary.gatewayReadOnlyReady === 5, "five gateway-discoverable peers");
  ensure(registry.summary.catalogOnly === 1, "one catalog-only peer");
  ensure(registry.summary.disconnected === 6, "all peer connections remain disconnected");
  ensure(
    registry.summary.mutatingCapabilitiesDiscovered === 0,
    "no mutating capability discovered"
  );
  ensure(registry.policy.authoritativeRegistry === true, "authoritative registry");
  ensure(registry.policy.discoveryIsReadOnly === true, "read-only discovery");
  ensure(registry.policy.liveConnectionImplied === false, "no live connection inference");
  ensure(registry.policy.ql266Resumed === false, "QL-266 not resumed");
  ensure(registry.policy.automaticActivation === false, "no automatic activation");

  const expected = new Map([
    ["devilndove", "RosevearCreations/devilndove-site"],
    ["rosiedazzlers", "RosevearCreations/rosiedazzlers"],
    ["yard-workers", "RosevearCreations/yw"],
    ["icamp", "RosevearCreations/iCamp"],
    ["rosevear-comms-hub", "RosevearCreations/rosevear-comms-hub"],
    ["rosevear-ai-hub", "RosevearCreations/rosevear-ai-hub"]
  ]);

  for (const app of registry.peerApplications) {
    ensure(expected.get(app.id) === app.repository, "repository identity for " + app.id);
    ensure(app.connectionState === "DISCONNECTED", "connection state for " + app.id);
    ensure(app.ownerAuthorization === "NOT_GIVEN", "authorization state for " + app.id);
    ensure(app.automaticActivationAllowed === false, "automatic activation for " + app.id);
    ensure(app.mutatingCapabilityDiscovered === false, "mutating capability for " + app.id);
    ensure(
      app.discoveryCapabilities.includes("repository_metadata"),
      "repository discovery for " + app.id
    );
  }

  const comms = registry.peerApplications.find(
    (app) => app.id === "rosevear-comms-hub"
  );
  ensure(comms?.discoveryState === "catalog-only", "Comms Hub catalog-only boundary");
  ensure(
    !comms?.discoveryCapabilities.includes("read_health") &&
      !comms?.discoveryCapabilities.includes("read_capabilities"),
    "Comms Hub does not inherit undeclared gateway capabilities"
  );

  for (const app of registry.peerApplications.filter(
    (item) => item.id !== "rosevear-comms-hub"
  )) {
    ensure(
      app.discoveryState === "gateway-read-only-ready",
      "gateway discovery state for " + app.id
    );
    ensure(
      app.discoveryCapabilities.includes("read_health") &&
        app.discoveryCapabilities.includes("read_capabilities"),
      "safe gateway discovery capabilities for " + app.id
    );
  }

  const [model, page, api, nav, pkg, doc, statusRaw, queue, ql246] =
    await Promise.all([
      source("lib/app-connection-registry.ts"),
      source("app/app-connections/page.tsx"),
      source("app/api/app-connections/route.ts"),
      source("lib/application-navigation.ts"),
      source("package.json"),
      source("../../docs/BUILD_281_UNIFIED_APP_CONNECTION_REGISTRY_CAPABILITY_DISCOVERY.md"),
      source("../../docs/integration/ql266-ai-data-platform-build281-review.json"),
      source("../../docs/NEXT_BUILDS_281_305.md"),
      source("scripts/ql246-source-proof.mjs")
    ]);

  ensure(
    model.includes("INTEGRATION_V1_BUSINESS_CAPABILITIES") &&
      model.includes("automaticActivationAllowed: false"),
    "reuse existing Integration v1 contract"
  );
  ensure(
    page.includes("Unified App Connection Registry &amp; Capability Discovery") &&
      page.includes("All six peer apps remain DISCONNECTED"),
    "Build 281 page"
  );
  ensure(
    api.includes("buildAppConnectionRegistry") &&
      api.includes('status: 401') &&
      api.includes('"cache-control": "no-store"'),
    "authenticated registry API"
  );
  ensure(
    nav.includes('href: "/app-connections"') &&
      nav.includes('label: "App Connection Registry"'),
    "navigation"
  );
  ensure(
    pkg.includes("verify-build-281-unified-app-connection-registry.ts"),
    "verifier registered"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 281, "status build");
  ensure(status.app_connection_registry.peer_application_count === 6, "status peer count");
  ensure(
    status.app_connection_registry.mutating_capabilities_enabled === false &&
      status.app_connection_registry.automatic_activation === false,
    "status safety"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 282, "next build");

  ensure(
    doc.includes("Rosevear Comms Hub") &&
      doc.includes("does not rewrite the older QL-246 six-application proof set"),
    "Build 281 documentation distinction"
  );
  ensure(
    queue.includes("Build 281 — Unified App Connection Registry & Capability Discovery") &&
      queue.includes("Build 282 — Shared Application Identity, Environment & Tenant Mapping") &&
      queue.includes("Build 305 — Autonomous Operations V1, Owner Controls & Production Learning VI"),
    "authorized connectivity batch"
  );
  ensure(
    ql246.includes("'ai-data-platform', 'devilndove', 'rosiedazzlers', 'yw', 'icamp', 'rosevear-ai-hub'"),
    "historical QL-246 set preserved"
  );

  console.log(
    "Build 281 unified app connection registry and capability discovery verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
