import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  TENANT_WORKSPACE_MAPPING_SCHEMA,
  TENANT_WORKSPACE_RESOLUTION_SCHEMA,
  TENANT_WORKSPACE_RESOLUTION_VERSION,
  TenantWorkspaceContextResolver,
  TenantWorkspaceResolutionError,
  bindResolvedTenantWorkspaceToHostContext,
  createExactTenantWorkspaceMappingStore,
  createTenantIsolationFixtureRlsVerifier,
  type HostTenantContext,
  type TenantWorkspaceAuditEvent,
  type TenantWorkspaceMapping
} from "../lib/tenant-workspace-context-resolution";
import type { AuthenticatedHostSessionContext } from "../lib/host-session-context-bridge";
import { createModuleHostContext } from "../lib/module-host-adapter-pack";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const session: AuthenticatedHostSessionContext = {
  schema: "rosevear.ai-data-platform.authenticated-host-session.v1",
  bridgeVersion: "1.0.0",
  issuer: "rosevear.icamp.auth",
  keyId: "key_build311_001",
  hostApplicationId: "rosevear.icamp",
  hostEnvironment: "test",
  hostInstanceId: "host_build311_001",
  hostSubjectId: "host_subject_311",
  moduleSubjectId: "module_subject_311",
  sessionId: "session_build311_001",
  assertionId: "assertion_build311_001",
  issuedAt: "2026-11-07T04:00:00.000Z",
  expiresAt: "2026-11-07T05:00:00.000Z",
  auditCorrelationId: "audit_build311_001",
  signatureValidated: true,
  subjectMapped: true,
  authorizationGranted: false
};

const tenantContext: HostTenantContext = {
  hostApplicationId: "rosevear.icamp",
  hostEnvironment: "test",
  hostInstanceId: "host_build311_001",
  hostTenantId: "camp_rosevear",
  hostOrganizationId: "org_rosevear",
  hostBusinessId: "business_camp",
  auditCorrelationId: "audit_build311_001"
};

function mapping(
  overrides: Partial<TenantWorkspaceMapping> = {}
): TenantWorkspaceMapping {
  return {
    schema: TENANT_WORKSPACE_MAPPING_SCHEMA,
    mappingId: "mapping_build311_001",
    hostApplicationId: "rosevear.icamp",
    hostEnvironment: "test",
    hostTenantId: "camp_rosevear",
    hostOrganizationId: "org_rosevear",
    hostBusinessId: "business_camp",
    platformTenantId: "platform_tenant_rosevear",
    workspaceId: "workspace_camp_rosevear",
    status: "active",
    updatedAt: "2026-11-07T04:00:00.000Z",
    ...overrides
  };
}

async function main() {
  assert.equal(
    TENANT_WORKSPACE_RESOLUTION_SCHEMA,
    "rosevear.ai-data-platform.tenant-workspace-resolution.v1"
  );
  assert.equal(TENANT_WORKSPACE_RESOLUTION_VERSION, "1.0.0");

  const audits: TenantWorkspaceAuditEvent[] = [];
  const resolver = new TenantWorkspaceContextResolver({
    mappingStore: createExactTenantWorkspaceMappingStore([mapping()]),
    rlsVerifier: createTenantIsolationFixtureRlsVerifier({
      evidenceId: "rls_build311_001",
      rows: [
        {
          rowId: "row_selected",
          platformTenantId: "platform_tenant_rosevear",
          workspaceId: "workspace_camp_rosevear"
        },
        {
          rowId: "row_other_workspace",
          platformTenantId: "platform_tenant_rosevear",
          workspaceId: "workspace_other"
        },
        {
          rowId: "row_other_tenant",
          platformTenantId: "platform_tenant_other",
          workspaceId: "workspace_other_tenant"
        }
      ]
    }),
    auditSink: {
      record(event) {
        audits.push(event);
      }
    },
    now: () => "2026-11-07T04:05:00.000Z"
  });

  const resolved = await resolver.resolve({
    authenticatedSession: session,
    tenantContext
  });

  assert.equal(resolved.platformTenantId, "platform_tenant_rosevear");
  assert.equal(resolved.workspaceId, "workspace_camp_rosevear");
  assert.equal(resolved.mappingStatus, "active");
  assert.equal(resolved.implicitFallbackUsed, false);
  assert.equal(resolved.authorizationGranted, false);
  assert.equal(resolved.rlsEvidenceId, "rls_build311_001");
  assert.equal(audits.at(-1)?.status, "resolved");

  const hostContext = createModuleHostContext({
    hostApplicationId: "rosevear.icamp",
    environment: "test",
    hostInstanceId: "host_build311_001",
    subjectId: "module_subject_311",
    tenantId: "placeholder_tenant",
    workspaceId: "placeholder_workspace",
    auditCorrelationId: "audit_build311_001",
    requestedCapabilities: ["manifest.read"]
  });

  const bound = bindResolvedTenantWorkspaceToHostContext(
    hostContext,
    resolved
  );
  assert.deepEqual(bound.tenancy, {
    tenantId: "platform_tenant_rosevear",
    workspaceId: "workspace_camp_rosevear"
  });

  const missing = new TenantWorkspaceContextResolver({
    mappingStore: createExactTenantWorkspaceMappingStore([]),
    rlsVerifier: createTenantIsolationFixtureRlsVerifier({
      evidenceId: "rls_unused_001",
      rows: []
    })
  });
  await assert.rejects(
    () => missing.resolve({ authenticatedSession: session, tenantContext }),
    (error: unknown) =>
      error instanceof TenantWorkspaceResolutionError &&
      error.code === "mapping_missing"
  );

  const ambiguous = new TenantWorkspaceContextResolver({
    mappingStore: createExactTenantWorkspaceMappingStore([
      mapping(),
      mapping({
        mappingId: "mapping_build311_002",
        workspaceId: "workspace_conflict"
      })
    ]),
    rlsVerifier: createTenantIsolationFixtureRlsVerifier({
      evidenceId: "rls_unused_002",
      rows: []
    })
  });
  await assert.rejects(
    () => ambiguous.resolve({ authenticatedSession: session, tenantContext }),
    (error: unknown) =>
      error instanceof TenantWorkspaceResolutionError &&
      error.code === "mapping_ambiguous"
  );

  for (const [status, code] of [
    ["disabled", "mapping_disabled"],
    ["deleted", "mapping_deleted"]
  ] as const) {
    const stateResolver = new TenantWorkspaceContextResolver({
      mappingStore: createExactTenantWorkspaceMappingStore([
        mapping({ status })
      ]),
      rlsVerifier: createTenantIsolationFixtureRlsVerifier({
        evidenceId: "rls_unused_003",
        rows: []
      })
    });
    await assert.rejects(
      () =>
        stateResolver.resolve({
          authenticatedSession: session,
          tenantContext
        }),
      (error: unknown) =>
        error instanceof TenantWorkspaceResolutionError &&
        error.code === code
    );
  }

  const envMismatch = new TenantWorkspaceContextResolver({
    mappingStore: createExactTenantWorkspaceMappingStore([
      mapping({ hostEnvironment: "production" })
    ]),
    rlsVerifier: createTenantIsolationFixtureRlsVerifier({
      evidenceId: "rls_unused_004",
      rows: []
    })
  });
  await assert.rejects(
    () => envMismatch.resolve({ authenticatedSession: session, tenantContext }),
    (error: unknown) =>
      error instanceof TenantWorkspaceResolutionError &&
      error.code === "mapping_missing"
  );

  const hostMismatch = new TenantWorkspaceContextResolver({
    mappingStore: createExactTenantWorkspaceMappingStore([mapping()]),
    rlsVerifier: createTenantIsolationFixtureRlsVerifier({
      evidenceId: "rls_unused_005",
      rows: []
    })
  });
  await assert.rejects(
    () =>
      hostMismatch.resolve({
        authenticatedSession: session,
        tenantContext: {
          ...tenantContext,
          hostInstanceId: "host_build311_other"
        }
      }),
    (error: unknown) =>
      error instanceof TenantWorkspaceResolutionError &&
      error.code === "host_identity_mismatch"
  );

  const rlsFailure = new TenantWorkspaceContextResolver({
    mappingStore: createExactTenantWorkspaceMappingStore([mapping()]),
    rlsVerifier: {
      verify() {
        return {
          verified: false,
          ownWorkspaceReadable: true,
          foreignWorkspaceDenied: false,
          crossTenantDenied: true,
          evidenceId: "rls_build311_failed"
        };
      }
    }
  });
  await assert.rejects(
    () => rlsFailure.resolve({ authenticatedSession: session, tenantContext }),
    (error: unknown) =>
      error instanceof TenantWorkspaceResolutionError &&
      error.code === "rls_verification_failed"
  );

  const exactOrgBusiness = createExactTenantWorkspaceMappingStore([
    mapping(),
    mapping({
      mappingId: "mapping_build311_org_other",
      hostOrganizationId: "org_other",
      workspaceId: "workspace_wrong_org"
    }),
    mapping({
      mappingId: "mapping_build311_business_other",
      hostBusinessId: "business_other",
      workspaceId: "workspace_wrong_business"
    })
  ]);
  const exactMatches = await exactOrgBusiness.listExactMappings(tenantContext);
  assert.equal(exactMatches.length, 1);
  assert.equal(exactMatches[0]?.workspaceId, "workspace_camp_rosevear");

  const fixture = createTenantIsolationFixtureRlsVerifier({
    evidenceId: "rls_fixture_build311",
    rows: [
      {
        rowId: "own",
        platformTenantId: "tenant_a",
        workspaceId: "workspace_a"
      },
      {
        rowId: "same_tenant_other_workspace",
        platformTenantId: "tenant_a",
        workspaceId: "workspace_b"
      },
      {
        rowId: "other_tenant",
        platformTenantId: "tenant_b",
        workspaceId: "workspace_c"
      }
    ]
  });
  const fixtureResult = await fixture.verify({
    platformTenantId: "tenant_a",
    workspaceId: "workspace_a",
    hostApplicationId: "rosevear.icamp",
    hostEnvironment: "test",
    auditCorrelationId: "audit_fixture_build311"
  });
  assert.equal(fixtureResult.verified, true);
  assert.equal(fixtureResult.ownWorkspaceReadable, true);
  assert.equal(fixtureResult.foreignWorkspaceDenied, true);
  assert.equal(fixtureResult.crossTenantDenied, true);

  const [
    resolverSource,
    apiSource,
    manifestSource,
    docs,
    review,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/tenant-workspace-context-resolution.ts"),
    source("app/api/module-tenant-context/route.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_311_TENANT_WORKSPACE_CONTEXT_RESOLUTION.md"),
    source(
      "../../docs/integration/ql266-ai-data-platform-build311-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "mapping_ambiguous",
    "mapping_disabled",
    "mapping_deleted",
    "rls_verification_failed",
    "implicitFallbackUsed: false",
    "authorizationGranted: false"
  ]) {
    assert.ok(
      resolverSource.includes(token),
      "Build 311 resolver missing " + token
    );
  }

  for (const token of [
    "exactMappingRequired: true",
    "implicitFallbackAllowed: false",
    "ambiguityBlocked: true",
    "verificationRequired: true",
    "crossTenantFallbackAllowed: false",
    "ql266ResumedByTenantResolution: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 311 API missing " + token);
  }

  for (const token of [
    '"tenant-workspace-resolution-v1"',
    '"explicit-tenant-mapping-v1"',
    '"rls-isolation-verification-v1"',
    "exactTenantWorkspaceMappingRequired: true",
    "implicitCrossTenantFallbackAllowed: false",
    "tenantResolutionGrantsPlatformAuthority: false"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 311 manifest missing " + token
    );
  }

  for (const token of [
    "Build 311",
    "No default tenant",
    "RLS verification",
    "Synthetic fixture success is not live database or peer certification",
    "Build 312"
  ]) {
    assert.ok(docs.includes(token), "Build 311 docs missing " + token);
  }

  for (const token of [
    '"build": 311',
    '"connectionState": "DISCONNECTED / HOLD"',
    '"ql266Resumed": false',
    '"syntheticIsolationCertification": true',
    '"liveDatabaseRlsProbeVerified": false'
  ]) {
    assert.ok(review.includes(token), "Build 311 review missing " + token);
  }

  assert.ok(
    roadmap.includes(
      "Build 311 — Tenant, Workspace & Organization Context Resolution"
    )
  );
  assert.ok(
    roadmap.includes(
      "Build 312 — Capability Negotiation, Permission Projection & Least-Privilege Grants"
    )
  );
  assert.ok(
    webPackage.includes(
      "verify-build-311-tenant-workspace-context-resolution.ts"
    )
  );

  console.log(
    "Build 311 verification passed: authenticated host tenant/org/business context resolves only through an exact environment-aware active mapping, ambiguity/disabled/deleted/missing states fail closed, tenant isolation requires RLS evidence for own/same-tenant-foreign/cross-tenant boundaries, and resolution grants no module authorization or QL-266 connection state."
  );
}

void main();
