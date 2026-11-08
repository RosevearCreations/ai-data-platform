import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  compareHostCertifications,
  crossHostCertificationDescriptor,
  runUniversalHostCertification,
  type HostCertificationEvidenceInput
} from "../lib/cross-host-certification";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const expected = {
  currentModuleVersion: "1.0.0",
  hostContractVersion: 1,
  protocolVersion: 1,
  adapterKind: "nextjs" as const
};

const dimensions = [
  "authentication",
  "tenant",
  "capability",
  "event",
  "workflow",
  "data",
  "search",
  "recovery",
  "offline"
] as const;

function evidence(
  sourceKind: "synthetic-fixture" | "live-evidence",
  overrides: Partial<HostCertificationEvidenceInput> = {}
): HostCertificationEvidenceInput {
  const checks = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      {
        state: "pass",
        evidenceRefs:
          sourceKind === "live-evidence"
            ? ["live-" + dimension + "-001"]
            : [],
        detail:
          "Certification evidence for " +
          dimension +
          " matched the expected governed contract."
      }
    ])
  ) as HostCertificationEvidenceInput["checks"];

  return {
    sourceKind,
    observedModuleVersion: "1.0.0",
    hostContractVersion: 1,
    protocolVersion: 1,
    adapterKind: "nextjs",
    compatibilityEvidenceRefs:
      sourceKind === "live-evidence"
        ? ["live-compatibility-001"]
        : [],
    checks,
    telemetry:
      sourceKind === "live-evidence"
        ? {
            sampleCount: 100,
            latencyMsP95: 250,
            errorCount: 0,
            retryCount: 0
          }
        : {
            sampleCount: 0,
            latencyMsP95: null,
            errorCount: 0,
            retryCount: 0
          },
    observedAt: "2026-11-08T15:00:00.000Z",
    ...overrides
  };
}

async function main() {
  const fixture = runUniversalHostCertification({
    expected,
    evidence: evidence("synthetic-fixture")
  });

  assert.equal(fixture.summary.overallOutcome, "passed");
  assert.equal(fixture.summary.passed, 10);
  assert.equal(fixture.fixtureCertified, true);
  assert.equal(fixture.liveCertified, false);
  assert.equal(fixture.certificationClass, "fixture-certified");
  assert.equal(fixture.health, "unknown");
  assert.ok(
    fixture.assertions.every((item) => item.synthetic)
  );

  const live = runUniversalHostCertification({
    expected,
    evidence: evidence("live-evidence")
  });

  assert.equal(live.summary.overallOutcome, "passed");
  assert.equal(live.summary.passed, 10);
  assert.equal(live.liveCertified, true);
  assert.equal(live.fixtureCertified, false);
  assert.equal(live.certificationClass, "live-certified");
  assert.equal(live.health, "healthy");
  assert.ok(
    live.assertions.every(
      (item) =>
        item.synthetic === false &&
        item.evidenceRefs.length > 0
    )
  );

  const missingLiveRef = evidence("live-evidence");
  missingLiveRef.checks.authentication.evidenceRefs = [];
  const blocked = runUniversalHostCertification({
    expected,
    evidence: missingLiveRef
  });
  assert.equal(blocked.summary.overallOutcome, "blocked");
  assert.equal(blocked.liveCertified, false);
  assert.equal(blocked.health, "unknown");
  assert.ok(
    blocked.assertions.some(
      (item) =>
        item.dimension === "authentication" &&
        item.outcome === "blocked"
    )
  );

  const incompatible = runUniversalHostCertification({
    expected,
    evidence: evidence("live-evidence", {
      observedModuleVersion: "1.0.1"
    })
  });
  assert.equal(incompatible.summary.overallOutcome, "failed");
  assert.equal(incompatible.compatibility.state, "fail");
  assert.equal(incompatible.liveCertified, false);
  assert.equal(incompatible.health, "unhealthy");

  const degraded = runUniversalHostCertification({
    expected,
    evidence: evidence("live-evidence", {
      telemetry: {
        sampleCount: 100,
        latencyMsP95: 2501,
        errorCount: 1,
        retryCount: 2
      }
    })
  });
  assert.equal(degraded.summary.overallOutcome, "passed");
  assert.equal(degraded.health, "degraded");
  assert.equal(degraded.liveCertified, true);

  const failedEvidence = evidence("live-evidence");
  failedEvidence.checks.offline = {
    state: "fail",
    evidenceRefs: ["live-offline-failure-001"],
    detail:
      "Offline synchronization produced contradictory idempotency evidence."
  };
  const failed = runUniversalHostCertification({
    expected,
    evidence: failedEvidence
  });
  const regressions = compareHostCertifications(
    failed,
    live
  );
  assert.ok(
    regressions.some(
      (item) => item.dimension === "offline"
    )
  );
  assert.ok(
    regressions.some(
      (item) => item.dimension === "health"
    )
  );
  assert.ok(
    regressions.some(
      (item) => item.dimension === "live-certification"
    )
  );

  assert.throws(
    () =>
      runUniversalHostCertification({
        expected,
        evidence: evidence("live-evidence", {
          telemetry: {
            sampleCount: 0,
            latencyMsP95: 1,
            errorCount: 0,
            retryCount: 0
          }
        })
      }),
    /cross_host_telemetry_latency_requires_samples/
  );

  assert.equal(
    crossHostCertificationDescriptor.policy
      .syntheticFixtureMayLiveCertify,
    false
  );
  assert.equal(
    crossHostCertificationDescriptor.policy
      .livePassRequiresEvidenceReference,
    true
  );
  assert.equal(
    crossHostCertificationDescriptor.policy
      .certificationMutatesHost,
    false
  );

  const [
    coreSource,
    databaseSource,
    apiSource,
    pageSource,
    uiSource,
    navigationSource,
    toolsSource,
    manifestSource,
    embeddedPageSource,
    embeddedBridgeSource,
    migrationSource,
    docsSource,
    reviewSource,
    roadmapSource,
    packageRaw
  ] = await Promise.all([
    source("lib/cross-host-certification.ts"),
    source("lib/cross-host-certification-database.ts"),
    source("app/api/module-certification/route.ts"),
    source("app/module-certification/page.tsx"),
    source(
      "app/module-certification/CrossHostCertificationConsole.tsx"
    ),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("app/module-embed/[surface]/page.tsx"),
    source("app/module-embed/[surface]/EmbeddedModuleBridge.tsx"),
    source(
      "../../db/migrations/0112_cross_host_observability_certification.sql"
    ),
    source(
      "../../docs/BUILD_329_CROSS_HOST_OBSERVABILITY_CERTIFICATION.md"
    ),
    source(
      "../../docs/integration/ai-data-platform-build329-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "HOST_CERTIFICATION_DIMENSIONS",
    "runUniversalHostCertification",
    "compareHostCertifications",
    "synthetic-fixture",
    "live-evidence",
    "compatibility",
    "authentication",
    "tenant",
    "capability",
    "event",
    "workflow",
    "data",
    "search",
    "recovery",
    "offline",
    "latencyMsP95",
    "liveCertified",
    "fixtureCertified",
    "certificationMutatesHost: false"
  ]) {
    assert.ok(
      coreSource.includes(token),
      "Build 329 certification core missing " + token
    );
  }

  for (const token of [
    "certifyModuleHost",
    "listCrossHostCertificationForUser",
    "module_host_instances",
    "module_host_enrollments",
    "host_contract_version",
    "protocol_version",
    "adapter_kind",
    "module_host_observations",
    "module_host_certification_runs",
    "module_host_certification_assertions",
    "compareHostCertifications"
  ]) {
    assert.ok(
      databaseSource.includes(token),
      "Build 329 certification database missing " + token
    );
  }

  for (const token of [
    '"certify-host"',
    "authentication_required",
    "Cache-Control",
    "HostCertificationEvidenceInput"
  ]) {
    assert.ok(
      apiSource.includes(token),
      "Build 329 certification API missing " + token
    );
  }

  for (const token of [
    "Cross-Host Compatibility &amp; Certification Control Plane",
    "Synthetic fixtures never prove a live host.",
    "/api/module-certification",
    "/module-lifecycle"
  ]) {
    assert.ok(
      pageSource.includes(token),
      "Build 329 certification page missing " + token
    );
  }

  for (const token of [
    "Compatibility matrix",
    "Reusable host certification harness",
    "Synthetic fixture",
    "Genuine live evidence",
    "Latency / error / retry telemetry",
    "Regression history",
    "live PASS"
  ]) {
    assert.ok(
      uiSource.includes(token),
      "Build 329 certification UI missing " + token
    );
  }

  assert.ok(
    navigationSource.includes(
      'href: "/module-certification"'
    ) &&
      navigationSource.includes(
        'label: "Module Certification"'
      )
  );
  assert.ok(
    toolsSource.includes(
      'href: "/module-certification"'
    ) &&
      toolsSource.includes(
        'label: "Module certification"'
      )
  );

  for (const token of [
    'id: "module-certification"',
    '"cross-host-observability-v1"',
    '"host-module-compatibility-matrix-v1"',
    '"universal-host-certification-suite-v1"',
    '"live-fixture-evidence-separation-v1"',
    '"host-regression-history-v1"',
    "syntheticFixtureProvesLiveHost: false",
    "certificationActivatesConnection: false",
    "certificationGrantsCapabilities: false"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 329 universal manifest missing " + token
    );
  }

  for (const token of [
    'import ModuleCertificationPage from "@/app/module-certification/page";',
    'case "module-certification"',
    "content = <ModuleCertificationPage />"
  ]) {
    assert.ok(
      embeddedPageSource.includes(token),
      "Build 329 embedded page missing " + token
    );
  }

  assert.ok(
    embeddedBridgeSource.includes('| "module-certification"'),
    "Build 329 embedded bridge must accept module-certification."
  );

  for (const token of [
    "module_host_observations",
    "module_host_certification_runs",
    "module_host_certification_assertions",
    "synthetic-fixture",
    "live-evidence",
    "live_certified",
    "fixture_certified",
    "regression_snapshot",
    "enable row level security",
    "revoke update, delete"
  ]) {
    assert.ok(
      migrationSource.includes(token),
      "Build 329 migration missing " + token
    );
  }

  for (const token of [
    "host/module compatibility matrix",
    "synthetic fixtures",
    "live-certified",
    "p95 latency",
    "regression history",
    "0112_cross_host_observability_certification.sql",
    "Build 330"
  ]) {
    assert.ok(
      docsSource.toLowerCase().includes(
        token.toLowerCase()
      ),
      "Build 329 docs missing " + token
    );
  }

  const review = JSON.parse(reviewSource);
  assert.equal(review.build, 329);
  assert.equal(
    review.capabilities.hostModuleCompatibilityMatrix,
    true
  );
  assert.equal(
    review.capabilities.reusableCertificationHarness,
    true
  );
  assert.equal(
    review.security.syntheticFixtureMayLiveCertify,
    false
  );
  assert.equal(
    review.security.certificationMutatesHost,
    false
  );
  assert.equal(review.nextQueuedBuild, 330);

  assert.ok(
    roadmapSource.includes(
      "Build 329 — Cross-Host Observability, Compatibility Matrix & Universal Certification Suite"
    )
  );
  assert.ok(
    roadmapSource.includes(
      "No host is marked live-certified from synthetic fixtures alone."
    )
  );
  assert.ok(
    roadmapSource.includes(
      "Build 330 — Autonomous Operations V2, Production Learning VII & Next Roadmap Renewal"
    )
  );

  const pkg = JSON.parse(packageRaw);
  const build = String(pkg.scripts.build);
  const build296 =
    "verify-build-296-shared-media-asset-exchange.ts";
  const build328 =
    "verify-build-328-module-lifecycle.ts";
  const build329 =
    "verify-build-329-cross-host-certification.ts";
  const build295 =
    "verify-build-295-shared-catalogue-exchange.ts";
  const build292a =
    "verify-build-292a-ci-verification-consolidation.ts";
  const migrations = "run-production-migrations.ts";

  assert.ok(build.startsWith("tsx scripts/" + build296));
  assert.ok(build.indexOf(build329) > build.indexOf(build328));
  assert.ok(build.indexOf(build329) < build.indexOf(build295));
  assert.ok(build.indexOf(build329) < build.indexOf(build292a));
  assert.ok(build.indexOf(build329) < build.indexOf(migrations));
  assert.ok(build.endsWith("next build"));
  assert.ok(
    String(pkg.scripts["ci:spine"]).includes(build329)
  );
  assert.ok(
    String(pkg.scripts["verify:build329"]).includes(build329)
  );

  console.log(
    "Build 329 Cross-Host Observability, Compatibility Matrix & Universal Certification Suite verification passed."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
