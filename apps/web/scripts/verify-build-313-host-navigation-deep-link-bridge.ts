import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  HOST_NAVIGATION_LAUNCH_SCHEMA,
  HOST_NAVIGATION_REGISTRATION_SCHEMA,
  HOST_NAVIGATION_BRIDGE_VERSION,
  HostNavigationBridge,
  HostNavigationBridgeError,
  type HostNavigationBridgeAuditEvent
} from "../lib/host-navigation-deep-link-bridge";
import { MODULE_SURFACES } from "../lib/universal-module-contract";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function registrationInput() {
  return {
    hostApplicationId: "rosevear.icamp",
    hostEnvironment: "test" as const,
    hostInstanceId: "host_build313_001",
    hostOrigin: "https://icamp.example.test",
    moduleOrigin: "https://ai-data.example.test",
    auditCorrelationId: "audit_build313_001",
    fallbackSurfaceId: "data-library" as const,
    items: [
      {
        id: "data",
        label: "AI Data",
        surfaceId: "data-library" as const,
        placement: "primary" as const,
        commandId: "ai-data.open",
        commandKeywords: ["data", "library", "ai"],
        requiredCapabilities: ["data-contracts.read"]
      },
      {
        id: "health",
        label: "Integration Health",
        surfaceId: "integration-health" as const,
        placement: "secondary" as const,
        commandId: "ai-data.health",
        commandKeywords: ["health", "integration"],
        requiredCapabilities: ["integration-health.read"]
      }
    ]
  };
}

async function expectBridgeError(
  promiseFactory: () => unknown | Promise<unknown>,
  code: HostNavigationBridgeError["code"]
) {
  await assert.rejects(
    async () => promiseFactory(),
    (error: unknown) =>
      error instanceof HostNavigationBridgeError &&
      error.code === code
  );
}

async function main() {
  assert.equal(HOST_NAVIGATION_BRIDGE_VERSION, "1.0.0");
  assert.equal(
    HOST_NAVIGATION_REGISTRATION_SCHEMA,
    "rosevear.ai-data-platform.host-navigation-registration.v1"
  );
  assert.equal(
    HOST_NAVIGATION_LAUNCH_SCHEMA,
    "rosevear.ai-data-platform.host-navigation-launch.v1"
  );

  const audits: HostNavigationBridgeAuditEvent[] = [];
  const bridge = new HostNavigationBridge(registrationInput(), {
    auditSink: {
      record(event) {
        audits.push(event);
      }
    },
    now: () => "2026-11-07T12:30:00.000Z"
  });

  const descriptor = bridge.descriptor;
  assert.equal(descriptor.security.supportedSurfacesOnly, true);
  assert.equal(descriptor.security.navigationGrantsAuthorization, false);
  assert.equal(descriptor.security.deepLinksGrantAuthorization, false);
  assert.equal(descriptor.security.commandPaletteGrantsAuthorization, false);
  assert.equal(descriptor.security.rawSecretsAcceptedInLaunchContext, false);
  assert.equal(descriptor.security.absoluteReturnUrlsAccepted, false);

  const items = bridge.listNavigationItems();
  assert.equal(items.length, 2);
  assert.equal(items[0]?.route, "/data-library");
  assert.equal(items[0]?.navigationGrantsAuthorization, false);
  assert.deepEqual(items[0]?.requiredCapabilities, ["data-contracts.read"]);

  const commands = bridge.listCommandPaletteEntries();
  assert.deepEqual(
    commands.map((entry) => entry.commandId),
    ["ai-data.open", "ai-data.health"]
  );
  assert.ok(commands.every((entry) => entry.commandGrantsAuthorization === false));

  const first = await bridge.launch({
    navigationItemId: "data",
    returnPath: "/bookings/42?tab=details#summary",
    context: {
      record: "booking_42",
      readonly: true,
      page: 2,
      optional: null
    }
  });

  assert.equal(first.resolvedSurfaceId, "data-library");
  assert.equal(first.resolvedRoute, "/data-library");
  assert.equal(first.navigationItemId, "data");
  assert.equal(first.fallback.used, false);
  assert.equal(first.fallback.reason, "none");
  assert.equal(first.security.launchGrantsAuthorization, false);
  assert.equal(first.security.returnOriginBoundToHost, true);
  assert.equal(first.security.contextualParametersAreNonAuthorizing, true);
  assert.equal(first.security.rawSecretsAccepted, false);
  assert.equal(
    first.safeReturnToHost,
    "https://icamp.example.test/bookings/42?tab=details#summary"
  );

  const firstUrl = new URL(first.moduleDeepLink);
  assert.equal(firstUrl.origin, "https://ai-data.example.test");
  assert.equal(firstUrl.pathname, "/data-library");
  assert.equal(firstUrl.searchParams.get("hostApplicationId"), "rosevear.icamp");
  assert.equal(firstUrl.searchParams.get("hostEnvironment"), "test");
  assert.equal(firstUrl.searchParams.get("hostInstanceId"), "host_build313_001");
  assert.equal(
    firstUrl.searchParams.get("auditCorrelationId"),
    "audit_build313_001"
  );
  assert.equal(
    firstUrl.searchParams.get("returnPath"),
    "/bookings/42?tab=details#summary"
  );
  assert.equal(firstUrl.searchParams.get("ctx.record"), "booking_42");
  assert.equal(firstUrl.searchParams.get("ctx.readonly"), "true");
  assert.equal(firstUrl.searchParams.get("ctx.page"), "2");
  assert.equal(firstUrl.searchParams.get("ctx.optional"), "null");

  assert.equal(first.breadcrumb.length, 2);
  assert.equal(first.breadcrumb[0]?.label, "AI Data Platform");
  assert.equal(first.breadcrumb[1]?.label, "AI Data");
  assert.equal(first.breadcrumb[1]?.current, true);
  assert.equal(first.backStack.length, 1);
  assert.equal(first.backStack[0]?.navigationItemId, "data");

  const second = await bridge.launch({
    route: "/integration-health",
    returnPath: "/operations"
  });
  assert.equal(second.resolvedSurfaceId, "integration-health");
  assert.equal(second.navigationItemId, "health");
  assert.equal(second.backStack.length, 2);
  assert.equal(second.backStack[1]?.navigationItemId, "health");

  const popped = bridge.popBackStack();
  assert.equal(popped?.navigationItemId, "health");
  assert.equal(bridge.getBackStack().length, 1);

  await expectBridgeError(
    () =>
      bridge.launch({
        route: "/legacy-ai-dashboard"
      }),
    "unsupported_route"
  );

  const fallback = await bridge.launch({
    route: "/legacy-ai-dashboard",
    allowFallback: true,
    returnPath: "/legacy"
  });
  assert.equal(fallback.resolvedSurfaceId, "data-library");
  assert.equal(fallback.resolvedRoute, "/data-library");
  assert.equal(fallback.fallback.used, true);
  assert.equal(
    fallback.fallback.reason,
    "explicit_compatibility_fallback"
  );

  await expectBridgeError(
    () =>
      bridge.launch({
        surfaceId: "unknown-surface"
      }),
    "unsupported_surface"
  );

  const noFallback = new HostNavigationBridge({
    ...registrationInput(),
    fallbackSurfaceId: undefined
  });
  await expectBridgeError(
    () =>
      noFallback.launch({
        surfaceId: "unknown-surface",
        allowFallback: true
      }),
    "fallback_unavailable"
  );

  for (const returnPath of [
    "https://evil.example/",
    "//evil.example/path",
    "/\\evil.example/path"
  ]) {
    await expectBridgeError(
      () =>
        bridge.launch({
          navigationItemId: "data",
          returnPath
        }),
      "return_path_invalid"
    );
  }

  await expectBridgeError(
    () =>
      bridge.launch({
        navigationItemId: "data",
        context: {
          token: "not-allowed"
        }
      }),
    "launch_context_invalid"
  );

  await expectBridgeError(
    () =>
      bridge.launch({
        navigationItemId: "data",
        context: {
          filter: "Bearer abc123"
        }
      }),
    "launch_context_invalid"
  );

  await expectBridgeError(
    () =>
      bridge.launch({
        navigationItemId: "data",
        surfaceId: "data-library"
      }),
    "navigation_item_invalid"
  );

  assert.throws(
    () =>
      new HostNavigationBridge({
        ...registrationInput(),
        items: [
          registrationInput().items[0],
          {
            ...registrationInput().items[1],
            commandId: "ai-data.open"
          }
        ]
      }),
    (error: unknown) =>
      error instanceof HostNavigationBridgeError &&
      error.code === "duplicate_command"
  );

  assert.throws(
    () =>
      new HostNavigationBridge({
        ...registrationInput(),
        items: [
          registrationInput().items[0],
          {
            ...registrationInput().items[1],
            id: "data"
          }
        ]
      }),
    (error: unknown) =>
      error instanceof HostNavigationBridgeError &&
      error.code === "duplicate_navigation_item"
  );

  assert.throws(
    () =>
      new HostNavigationBridge({
        ...registrationInput(),
        items: [
          {
            ...registrationInput().items[0],
            placement: "footer" as never
          }
        ]
      }),
    (error: unknown) =>
      error instanceof HostNavigationBridgeError &&
      error.code === "navigation_item_invalid"
  );

  assert.throws(
    () =>
      new HostNavigationBridge({
        ...registrationInput(),
        hostOrigin: "*"
      }),
    /wildcards are not allowed/
  );

  assert.equal(audits.length, 3);
  assert.equal(audits[0]?.resolvedSurfaceId, "data-library");
  assert.equal(audits[0]?.fallbackUsed, false);
  assert.deepEqual(audits[0]?.contextKeys, [
    "optional",
    "page",
    "readonly",
    "record"
  ]);
  assert.equal(audits[2]?.fallbackUsed, true);

  assert.ok(
    MODULE_SURFACES.every((surface) =>
      ["/data-library", "/app-connections", "/integration-health",
       "/integration-certification", "/production-learning"].includes(
        surface.route
      )
    )
  );

  const [
    bridgeSource,
    apiSource,
    manifestSource,
    docs,
    review,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/host-navigation-deep-link-bridge.ts"),
    source("app/api/module-navigation/route.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_313_HOST_NAVIGATION_DEEP_LINK_BRIDGE.md"),
    source(
      "../../docs/integration/ql266-ai-data-platform-build313-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "listCommandPaletteEntries",
    "getBackStack",
    "popBackStack",
    "explicit_compatibility_fallback",
    "normalizeReturnPath",
    "normalizeLaunchContext",
    "rawSecretsAcceptedInLaunchContext: false",
    "absoluteReturnUrlsAccepted: false",
    "launchGrantsAuthorization: false"
  ]) {
    assert.ok(bridgeSource.includes(token), "Build 313 bridge missing " + token);
  }

  for (const token of [
    "hostRegistrationSupported: true",
    "deepLinksSupported: true",
    "breadcrumbsSupported: true",
    "boundedBackStackSupported: true",
    "commandPaletteSupported: true",
    "contextualLaunchParametersSupported: true",
    "fallbackRequiresExplicitLaunchOptIn: true",
    "navigationRegistrationGrantsAuthorization: false",
    "ql266ResumedByNavigationBridge: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 313 API missing " + token);
  }

  for (const token of [
    '"host-navigation-bridge-v1"',
    '"governed-module-deep-links-v1"',
    '"command-palette-bridge-v1"',
    "navigationRegistrationGrantsPlatformAuthority: false",
    "deepLinkGrantsPlatformAuthority: false",
    "commandPaletteGrantsPlatformAuthority: false",
    "absoluteHostReturnUrlsAccepted: false",
    "rawSecretsAcceptedInNavigationContext: false",
    "navigationFallbackRequiresExplicitOptIn: true"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 313 manifest missing " + token
    );
  }

  for (const token of [
    "Build 313",
    "Breadcrumbs",
    "back stack",
    "Command palette",
    "Safe return-to-host",
    "Fallback is not automatic",
    "Build 314"
  ]) {
    assert.ok(docs.includes(token), "Build 313 docs missing " + token);
  }

  for (const token of [
    '"build": 313',
    '"connectionState": "DISCONNECTED / HOLD"',
    '"ql266Resumed": false',
    '"syntheticNavigationCertification": true',
    '"liveHostNavigationRegistrationVerified": false'
  ]) {
    assert.ok(review.includes(token), "Build 313 review missing " + token);
  }

  assert.ok(
    roadmap.includes(
      "Build 313 — Host Navigation, Deep Links & Command Palette Bridge"
    )
  );
  assert.ok(
    roadmap.includes(
      "Build 314 — Theme, Design Token, Accessibility & Locale Bridge"
    )
  );
  assert.ok(
    webPackage.includes(
      "verify-build-313-host-navigation-deep-link-bridge.ts"
    )
  );

  console.log(
    "Build 313 verification passed: host navigation and command-palette entries resolve only to supported module surfaces, governed deep links keep contextual parameters non-authorizing and secret-free, host return navigation is origin-bound, breadcrumbs/back-stack are bounded, compatibility fallback requires explicit opt-in, and QL-266 remains disconnected/held."
  );
}

void main();
