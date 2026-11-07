import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CAPABILITY_GRANT_SCHEMA,
  CAPABILITY_NEGOTIATION_SCHEMA,
  CAPABILITY_NEGOTIATION_VERSION,
  CapabilityNegotiator,
  createExactCapabilityGrantStore,
  createLeastPrivilegeHeadlessAuthorizer,
  createLiveModuleCapabilityRegistry,
  createStaticModuleCapabilityRegistry,
  type CapabilityGrantRecord,
  type CapabilityNegotiationAuditEvent,
  type CapabilityNegotiationContext,
  type ModuleCapabilityDescriptor
} from "../lib/capability-negotiation-permission-projection";
import { createModuleHostContext } from "../lib/module-host-adapter-pack";
import {
  MODULE_HEADLESS_CAPABILITIES,
  createModuleRuntimeIdentity
} from "../lib/universal-module-contract";

const root = path.resolve(process.cwd());
const fixedNow = "2026-11-07T12:00:00.000Z";

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const descriptors: ModuleCapabilityDescriptor[] = [
  {
    id: "fixture.records.read",
    classification: "read",
    mutating: false,
    consequential: false,
    description: "Read fixture records."
  },
  {
    id: "fixture.records.write",
    classification: "write",
    mutating: true,
    consequential: true,
    description: "Write fixture records."
  },
  {
    id: "fixture.jobs.action",
    classification: "action",
    mutating: true,
    consequential: true,
    description: "Execute a fixture job action."
  },
  {
    id: "fixture.unrequested.read",
    classification: "read",
    mutating: false,
    consequential: false,
    description: "Discoverable but unrequested fixture capability."
  }
];

const scope = {
  hostApplicationId: "rosevear.icamp",
  hostEnvironment: "test" as const,
  hostInstanceId: "host_build312_001",
  subjectId: "module_subject_312",
  platformTenantId: "platform_tenant_312",
  workspaceId: "workspace_build312_001"
};

const context: CapabilityNegotiationContext = {
  ...scope,
  auditCorrelationId: "audit_build312_001",
  requestedCapabilities: [
    "fixture.records.read",
    "fixture.records.write",
    "fixture.jobs.action",
    "fixture.unknown.read"
  ]
};

function grant(
  capability: string,
  overrides: Partial<CapabilityGrantRecord> = {}
): CapabilityGrantRecord {
  const descriptor = descriptors.find((item) => item.id === capability);
  return {
    schema: CAPABILITY_GRANT_SCHEMA,
    grantId:
      "grant_" + capability.replace(/[^A-Za-z0-9]+/g, "_") + "_312",
    ...scope,
    capability,
    classification: descriptor?.classification ?? "read",
    status: "approved",
    ownerDecisionBySubjectId: "owner_subject_312",
    ownerDecisionAt: "2026-11-07T11:00:00.000Z",
    issuedAt: "2026-11-07T11:00:00.000Z",
    expiresAt: "2026-11-08T12:00:00.000Z",
    reviewAt: "2026-11-08T11:00:00.000Z",
    ...overrides
  };
}

function fixtureNegotiator(
  grants: CapabilityGrantRecord[],
  auditSink?: { record(event: CapabilityNegotiationAuditEvent): void }
) {
  return new CapabilityNegotiator({
    registry: createStaticModuleCapabilityRegistry(descriptors),
    grantStore: createExactCapabilityGrantStore(grants),
    auditSink,
    now: () => fixedNow
  });
}

async function main() {
  assert.equal(
    CAPABILITY_NEGOTIATION_SCHEMA,
    "rosevear.ai-data-platform.capability-negotiation.v1"
  );
  assert.equal(CAPABILITY_NEGOTIATION_VERSION, "1.0.0");

  const live = await new CapabilityNegotiator({
    registry: createLiveModuleCapabilityRegistry(),
    grantStore: createExactCapabilityGrantStore([])
  }).discover();

  assert.deepEqual(
    live.map((descriptor) => descriptor.id),
    [...MODULE_HEADLESS_CAPABILITIES]
  );
  assert.ok(live.every((descriptor) => descriptor.classification === "read"));
  assert.ok(live.every((descriptor) => descriptor.mutating === false));

  const audits: CapabilityNegotiationAuditEvent[] = [];
  const negotiator = fixtureNegotiator(
    [
      grant("fixture.records.read"),
      grant("fixture.records.write"),
      grant("fixture.jobs.action"),
      grant("fixture.unrequested.read")
    ],
    {
      record(event) {
        audits.push(event);
      }
    }
  );

  const result = await negotiator.negotiate(context);
  assert.deepEqual(result.effectiveCapabilities.sort(), [
    "fixture.jobs.action",
    "fixture.records.read",
    "fixture.records.write"
  ]);
  assert.equal(result.leastPrivilegeApplied, true);
  assert.equal(result.discoveryGrantsAuthorization, false);
  assert.equal(result.unrequestedCapabilitiesGranted, false);

  const unrequested = result.projections.find(
    (projection) =>
      projection.capability === "fixture.unrequested.read"
  );
  assert.equal(unrequested?.state, "available_not_requested");
  assert.equal(unrequested?.callable, false);

  const unknown = result.projections.find(
    (projection) => projection.capability === "fixture.unknown.read"
  );
  assert.equal(unknown?.state, "denied");
  assert.equal(
    unknown?.state === "denied" ? unknown.reason : null,
    "not_discovered"
  );

  assert.equal(
    result.projections.find(
      (projection) => projection.capability === "fixture.records.read"
    )?.classification,
    "read"
  );
  assert.equal(
    result.projections.find(
      (projection) => projection.capability === "fixture.records.write"
    )?.classification,
    "write"
  );
  assert.equal(
    result.projections.find(
      (projection) => projection.capability === "fixture.jobs.action"
    )?.classification,
    "action"
  );

  assert.equal(audits.length, 1);
  assert.deepEqual(
    audits[0]?.effectiveCapabilities.sort(),
    result.effectiveCapabilities.sort()
  );

  const denialCases: Array<{
    name: string;
    grants: CapabilityGrantRecord[];
    requested: string;
    reason: string;
  }> = [
    {
      name: "missing",
      grants: [],
      requested: "fixture.records.read",
      reason: "grant_missing"
    },
    {
      name: "owner denied",
      grants: [grant("fixture.records.read", { status: "denied" })],
      requested: "fixture.records.read",
      reason: "owner_denied"
    },
    {
      name: "revoked",
      grants: [grant("fixture.records.read", { status: "revoked" })],
      requested: "fixture.records.read",
      reason: "grant_revoked"
    },
    {
      name: "expired",
      grants: [
        grant("fixture.records.read", {
          expiresAt: "2026-11-07T11:59:59.000Z"
        })
      ],
      requested: "fixture.records.read",
      reason: "grant_expired"
    },
    {
      name: "review due",
      grants: [
        grant("fixture.records.read", {
          reviewAt: "2026-11-07T12:00:00.000Z"
        })
      ],
      requested: "fixture.records.read",
      reason: "review_required"
    },
    {
      name: "not yet valid",
      grants: [
        grant("fixture.records.read", {
          ownerDecisionAt: "2026-11-07T12:30:00.000Z",
          issuedAt: "2026-11-07T12:30:00.000Z",
          reviewAt: "2026-11-08T12:30:00.000Z",
          expiresAt: "2026-11-09T12:30:00.000Z"
        })
      ],
      requested: "fixture.records.read",
      reason: "grant_not_yet_valid"
    },
    {
      name: "classification mismatch",
      grants: [
        grant("fixture.records.write", {
          classification: "read"
        })
      ],
      requested: "fixture.records.write",
      reason: "grant_classification_mismatch"
    },
    {
      name: "ambiguous",
      grants: [
        grant("fixture.records.read"),
        grant("fixture.records.read", { grantId: "grant_duplicate_312" })
      ],
      requested: "fixture.records.read",
      reason: "grant_ambiguous"
    }
  ];

  for (const denialCase of denialCases) {
    const denied = await fixtureNegotiator(denialCase.grants).negotiate({
      ...context,
      requestedCapabilities: [denialCase.requested]
    });
    const projection = denied.projections.find(
      (entry) => entry.capability === denialCase.requested
    );
    assert.equal(
      projection?.state,
      "denied",
      denialCase.name + " must be denied"
    );
    assert.equal(
      projection?.state === "denied" ? projection.reason : null,
      denialCase.reason,
      denialCase.name + " must have the expected reason"
    );
    assert.equal(projection?.callable, false);
    assert.ok(
      projection?.explanation.length,
      denialCase.name + " must explain the denial"
    );
  }

  const hostContext = createModuleHostContext({
    hostApplicationId: "rosevear.icamp",
    environment: "test",
    hostInstanceId: "host_sdk_build312",
    subjectId: "module_subject_sdk_312",
    tenantId: "tenant_sdk_312",
    workspaceId: "workspace_sdk_312",
    auditCorrelationId: "audit_sdk_build312",
    requestedCapabilities: ["manifest.read"]
  });
  const runtimeIdentity = createModuleRuntimeIdentity(hostContext, {
    moduleInstanceId: "module_build312_sdk",
    createdAt: fixedNow
  });

  const sdkGrant: CapabilityGrantRecord = {
    schema: CAPABILITY_GRANT_SCHEMA,
    grantId: "grant_sdk_manifest_312",
    hostApplicationId: "rosevear.icamp",
    hostEnvironment: "test",
    hostInstanceId: "host_sdk_build312",
    subjectId: "module_subject_sdk_312",
    platformTenantId: "tenant_sdk_312",
    workspaceId: "workspace_sdk_312",
    capability: "manifest.read",
    classification: "read",
    status: "approved",
    ownerDecisionBySubjectId: "owner_sdk_312",
    ownerDecisionAt: "2026-11-07T11:00:00.000Z",
    issuedAt: "2026-11-07T11:00:00.000Z",
    expiresAt: "2026-11-08T12:00:00.000Z",
    reviewAt: "2026-11-08T11:00:00.000Z"
  };

  const sdkNegotiator = new CapabilityNegotiator({
    registry: createLiveModuleCapabilityRegistry(),
    grantStore: createExactCapabilityGrantStore([sdkGrant]),
    now: () => fixedNow
  });
  const contextProvider = {
    getContext() {
      return hostContext;
    }
  };
  const authorizer = createLeastPrivilegeHeadlessAuthorizer({
    negotiator: sdkNegotiator,
    contextProvider
  });

  const allowed = await authorizer.authorize({
    schema: "rosevear.ai-data-platform.headless-module-authorization.v1",
    requestId: "request_build312_allow",
    auditCorrelationId: "audit_sdk_build312",
    runtimeIdentity,
    capability: "manifest.read",
    operation: "manifest.read"
  });
  assert.equal(allowed.allowed, true);

  const deniedNotRequested = await authorizer.authorize({
    schema: "rosevear.ai-data-platform.headless-module-authorization.v1",
    requestId: "request_build312_deny",
    auditCorrelationId: "audit_sdk_build312",
    runtimeIdentity,
    capability: "integration-health.read",
    operation: "integration-health.read"
  });
  assert.equal(deniedNotRequested.allowed, false);

  const wrongRuntime = {
    ...runtimeIdentity,
    workspaceId: "workspace_other_312"
  };
  const deniedWrongRuntime = await authorizer.authorize({
    schema: "rosevear.ai-data-platform.headless-module-authorization.v1",
    requestId: "request_build312_wrong_runtime",
    auditCorrelationId: "audit_sdk_build312",
    runtimeIdentity: wrongRuntime,
    capability: "manifest.read",
    operation: "manifest.read"
  });
  assert.equal(deniedWrongRuntime.allowed, false);

  const [
    engineSource,
    apiSource,
    manifestSource,
    docs,
    review,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/capability-negotiation-permission-projection.ts"),
    source("app/api/module-capabilities/route.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_312_CAPABILITY_NEGOTIATION_LEAST_PRIVILEGE.md"),
    source(
      "../../docs/integration/ql266-ai-data-platform-build312-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "available_not_requested",
    "owner_approved",
    "grant_expired",
    "review_required",
    "grant_ambiguous",
    "grant_classification_mismatch",
    "leastPrivilegeApplied: true",
    "discoveryGrantsAuthorization: false",
    "unrequestedCapabilitiesGranted: false",
    "createLeastPrivilegeHeadlessAuthorizer"
  ]) {
    assert.ok(engineSource.includes(token), "Build 312 engine missing " + token);
  }

  for (const token of [
    "ownerControlled: true",
    "exactHostUserTenantWorkspaceScope: true",
    "expiryRequired: true",
    "reviewDateRequired: true",
    "discoveryGrantsAuthorization: false",
    "hostRequestGrantsAuthorization: false",
    "ql266ResumedByCapabilityNegotiation: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 312 API missing " + token);
  }

  for (const token of [
    '"capability-negotiation-v1"',
    '"least-privilege-grants-v1"',
    '"owner-controlled-capability-grants-v1"',
    "capabilityDiscoveryGrantsAuthorization: false",
    "hostRequestedCapabilityGrantsAuthorization: false",
    "unrequestedCapabilitiesMayBeGranted: false",
    "capabilityGrantExpiryRequired: true",
    "capabilityGrantReviewRequired: true"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 312 manifest missing " + token
    );
  }

  for (const token of [
    "Build 312",
    "strict intersection",
    "read",
    "write",
    "action",
    "review date",
    "Build 313"
  ]) {
    assert.ok(docs.includes(token), "Build 312 docs missing " + token);
  }

  for (const token of [
    '"build": 312',
    '"connectionState": "DISCONNECTED / HOLD"',
    '"ql266Resumed": false',
    '"syntheticGrantLifecycleCertification": true',
    '"liveOwnerGrantRecordsVerified": false'
  ]) {
    assert.ok(review.includes(token), "Build 312 review missing " + token);
  }

  assert.ok(
    roadmap.includes(
      "Build 312 — Capability Negotiation, Permission Projection & Least-Privilege Grants"
    )
  );
  assert.ok(
    roadmap.includes(
      "Build 313 — Host Navigation, Deep Links & Command Palette Bridge"
    )
  );
  assert.ok(
    webPackage.includes(
      "verify-build-312-capability-negotiation-least-privilege.ts"
    )
  );

  console.log(
    "Build 312 verification passed: capability discovery remains non-authorizing, effective authority is the strict requested/discovered/exact-scope owner-granted intersection, read/write/action classification is enforced, expiry/review/revocation/ambiguity fail closed, denied capabilities are explained, and Build 307 authorization rechecks current least-privilege grants without resuming QL-266."
  );
}

void main();
