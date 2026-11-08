import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CROSS_APP_SEARCH_RESPONSE_SCHEMA,
  CROSS_APP_SEARCH_VERSION,
  CrossAppSearchError,
  crossAppSearchCapabilityDescriptor,
  executeAuthorizedFederatedSearch,
  type CrossAppSearchSourceAdapter
} from "../lib/cross-app-search-linked-records";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const context = {
  hostApplicationId: "rosevear.comms-hub",
  hostEnvironment: "test" as const,
  subjectId: "owner-ree",
  tenantId: "rosevear-main",
  workspaceId: "operations",
  auditCorrelationId: "audit-build316-001"
};

function adapter(
  sourceApplicationId: string,
  records: Parameters<CrossAppSearchSourceAdapter["search"]> extends never
    ? never
    : Awaited<ReturnType<CrossAppSearchSourceAdapter["search"]>>
): CrossAppSearchSourceAdapter {
  return {
    sourceApplicationId,
    sourceOrigin: "https://" + sourceApplicationId + ".example.test",
    mappedApplication: true,
    authorization: {
      capability: "cross-app-search.read",
      granted: true,
      evidenceId: "grant-" + sourceApplicationId,
      subjectId: context.subjectId,
      tenantId: context.tenantId,
      workspaceId: context.workspaceId
    },
    search: async () => records
  };
}

async function main() {
  assert.equal(CROSS_APP_SEARCH_VERSION, "1.0.0");
  assert.equal(
    CROSS_APP_SEARCH_RESPONSE_SCHEMA,
    "rosevear.ai-data-platform.cross-app-search-response.v1"
  );

  const sources: CrossAppSearchSourceAdapter[] = [
    adapter("icamp", [
      {
        sourceRecordId: "customer-42",
        sourceRecordVersion: "v2",
        recordKind: "customer",
        title: "Alex Camper",
        summary: "Authorized customer reference",
        updatedAt: "2026-11-07T20:00:00.000Z",
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        sourcePath: "/customers/customer-42",
        contractId: "rosevear.shared.customer.v1",
        canonicalLinks: [
          { kind: "customer", canonicalId: "customer:alex-42" },
          { kind: "contact", canonicalId: "contact:alex-primary" }
        ]
      },
      {
        sourceRecordId: "booking-77",
        recordKind: "booking",
        title: "Alex Camper — Site 27",
        summary: "Authorized booking reference",
        updatedAt: "2026-11-07T21:00:00.000Z",
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        sourcePath: "/bookings/booking-77",
        contractId: "rosevear.shared.booking.v1",
        canonicalLinks: [
          { kind: "customer", canonicalId: "customer:alex-42" },
          { kind: "booking", canonicalId: "booking:77" }
        ]
      }
    ]),
    adapter("rosiedazzlers", [
      {
        sourceRecordId: "job-90",
        recordKind: "job",
        title: "Alex vehicle detail",
        summary: "Authorized job reference",
        updatedAt: "2026-11-07T19:30:00.000Z",
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        sourcePath: "/jobs/job-90?view=summary",
        contractId: "rosevear.shared.job.v1",
        canonicalLinks: [
          { kind: "customer", canonicalId: "customer:alex-42" },
          { kind: "job", canonicalId: "job:90" }
        ]
      }
    ])
  ];

  const response = await executeAuthorizedFederatedSearch(
    {
      query: "Alex",
      context,
      filters: {
        recordKinds: ["customer", "booking", "job"]
      },
      limit: 20
    },
    sources
  );

  assert.equal(response.results.length, 3);
  assert.equal(response.security.readOnly, true);
  assert.equal(response.security.sourceRecordsMutated, false);
  assert.equal(response.security.sourceWritesRequested, false);
  assert.equal(response.security.deepLinksGrantAuthorization, false);
  assert.equal(response.security.searchActivatesConnection, false);
  assert.equal(response.security.ql266Resumed, false);
  assert.ok(
    response.results.every(
      (result) =>
        result.provenance.authorizationEvidenceId.startsWith("grant-") &&
        result.sourceDeepLink.startsWith("https://")
    )
  );
  assert.ok(
    response.graph.edges.some(
      (edge) =>
        edge.canonicalKind === "customer" &&
        edge.canonicalId === "customer:alex-42"
    )
  );

  const filtered = await executeAuthorizedFederatedSearch(
    {
      query: "Alex",
      context,
      filters: {
        sourceApplicationIds: ["icamp"],
        recordKinds: ["booking"]
      }
    },
    sources
  );
  assert.equal(filtered.results.length, 1);
  assert.equal(filtered.results[0].recordKind, "booking");
  assert.equal(filtered.sources.length, 1);

  await assert.rejects(
    () =>
      executeAuthorizedFederatedSearch(
        { query: "Alex", context },
        [
          {
            ...sources[0],
            authorization: {
              ...sources[0].authorization,
              granted: false
            }
          }
        ]
      ),
    (error: unknown) =>
      error instanceof CrossAppSearchError &&
      error.code === "source_not_authorized"
  );

  await assert.rejects(
    () =>
      executeAuthorizedFederatedSearch(
        { query: "Alex", context },
        [
          {
            ...sources[0],
            authorization: {
              ...sources[0].authorization,
              workspaceId: "another-workspace"
            }
          }
        ]
      ),
    (error: unknown) =>
      error instanceof CrossAppSearchError &&
      error.code === "source_scope_mismatch"
  );

  await assert.rejects(
    () =>
      executeAuthorizedFederatedSearch(
        { query: "Alex", context },
        [
          adapter("icamp", [
            {
              sourceRecordId: "customer-foreign",
              recordKind: "customer",
              title: "Foreign tenant",
              updatedAt: "2026-11-07T20:00:00.000Z",
              tenantId: "other-tenant",
              workspaceId: context.workspaceId,
              sourcePath: "/customers/customer-foreign",
              canonicalLinks: []
            }
          ])
        ]
      ),
    (error: unknown) =>
      error instanceof CrossAppSearchError &&
      error.code === "source_scope_mismatch"
  );

  await assert.rejects(
    () =>
      executeAuthorizedFederatedSearch(
        { query: "Alex", context },
        [
          adapter("icamp", [
            {
              sourceRecordId: "bad-link",
              recordKind: "customer",
              title: "Unsafe link",
              updatedAt: "2026-11-07T20:00:00.000Z",
              tenantId: context.tenantId,
              workspaceId: context.workspaceId,
              sourcePath: "//evil.example.test/escape",
              canonicalLinks: []
            }
          ])
        ]
      ),
    (error: unknown) =>
      error instanceof CrossAppSearchError &&
      error.code === "source_deep_link_invalid"
  );

  const descriptor = crossAppSearchCapabilityDescriptor();
  assert.equal(descriptor.readOnly, true);
  assert.equal(descriptor.sourceWritesRequested, false);
  assert.equal(descriptor.tenantWorkspaceIsolation, true);
  assert.equal(descriptor.searchActivatesConnection, false);

  const [lib, api, docs, review, roadmap, packageRaw] = await Promise.all([
    source("lib/cross-app-search-linked-records.ts"),
    source("app/api/module-cross-app-search/route.ts"),
    source("../../docs/BUILD_316_CROSS_APP_SEARCH_LINKED_RECORD_EXPLORER.md"),
    source("../../docs/integration/ql266-ai-data-platform-build316-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "authorizationRequiredPerSource: true",
    "mappingRequiredPerSource: true",
    "sourceRecordsMutated: false",
    "sourceWritesRequested: false",
    "deepLinksGrantAuthorization: false",
    "searchActivatesConnection: false",
    "source_scope_mismatch",
    "source_not_authorized"
  ]) {
    assert.ok(lib.includes(token), "Build 316 library missing " + token);
  }

  for (const token of [
    "liveFederatedSearchAcceptedByThisDiscoveryRoute: false",
    "serverSideAuthorizedAdaptersRequired: true",
    "sourceRecordWritesAvailable: false"
  ]) {
    assert.ok(api.includes(token), "Build 316 discovery route missing " + token);
  }

  for (const token of [
    "Build 316",
    "Authorized federated search",
    "Tenant-safe result isolation",
    "Linked-record graph",
    "Source provenance",
    "Safe deep links",
    "does not alter source records",
    "DISCONNECTED / HOLD",
    "Build 317"
  ]) {
    assert.ok(docs.includes(token), "Build 316 docs missing " + token);
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 316);
  assert.equal(reviewJson.capability.sourceRecordMutation, false);
  assert.equal(reviewJson.security.authorizationRequiredPerSource, true);
  assert.equal(reviewJson.connected, false);
  assert.equal(reviewJson.connectionState, "DISCONNECTED / HOLD");
  assert.equal(reviewJson.nextQueuedBuild, 317);

  assert.ok(
    roadmap.includes("Build 316 — Cross-App Search & Linked Record Explorer") &&
      roadmap.includes("Build 317 — Event Bus Host Bridge & Subscription Pack")
  );
  assert.ok(
    packageRaw.includes("verify-build-316-cross-app-search-linked-record-explorer.ts")
  );

  console.log(
    "Build 316 Cross-App Search & Linked Record Explorer verification passed; authorized federation is read-only, tenant/workspace scoped and QL-266 remains DISCONNECTED / HOLD."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
