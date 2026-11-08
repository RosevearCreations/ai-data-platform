import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildHostInstallDryRun,
  generateApprovedHostInstallPackage,
  hostInstallSha256,
  moduleHostInstallerDescriptor
} from "../lib/module-host-installer";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schema:
      "rosevear.ai-data-platform.host-install-manifest.v1",
    manifestVersion: 1,
    hostContractVersion: 1,
    protocolVersion: 1,
    hostApplication: {
      id: "rosevear.icamp",
      instanceId: "host-build327-primary",
      environment: "production",
      displayName: "iCamp"
    },
    tenancy: {
      hostTenantId: "camp-rosevear",
      platformTenantId: "platform-tenant-build327",
      workspaceId: "workspace-build327"
    },
    runtime: {
      framework: "nextjs"
    },
    defaultSurface: "data-library",
    requestedCapabilities: [
      "manifest.read",
      "integration-health.read"
    ],
    credentialRequirements: [],
    credentialBindings: [],
    transport: {
      transportId: "module.direct",
      displayName: "AI Data Platform direct HTTPS",
      kind: "direct-https",
      destinationOrigin: "https://ai-data.example.test",
      securityLevel: "standard",
      localRelay: null
    },
    ...overrides
  };
}

async function main() {
  const dryRun = buildHostInstallDryRun({
    manifest: manifest(),
    credentialEvidence: [],
    now: "2026-11-08T14:00:00.000Z"
  });

  assert.equal(dryRun.state, "pass");
  assert.equal(dryRun.ownerApprovalEligible, true);
  assert.equal(dryRun.adapter.kind, "nextjs");
  assert.deepEqual(dryRun.capabilityPreview.unsupported, []);
  assert.deepEqual(dryRun.capabilityPreview.granted, []);
  assert.equal(
    dryRun.transportPreparation.healthVerified,
    false
  );
  assert.equal(
    dryRun.transportPreparation.runtimeSelectionPerformed,
    false
  );
  assert.equal(
    dryRun.transportPreparation.networkRequestPerformed,
    false
  );
  assert.equal(dryRun.security.connectionActivated, false);
  assert.equal(dryRun.security.trustAuthorized, false);
  assert.equal(dryRun.security.capabilitiesGranted, false);
  assert.equal(dryRun.security.credentialsCreated, false);
  assert.equal(dryRun.security.hostFilesWritten, false);

  const unsupported = buildHostInstallDryRun({
    manifest: manifest({
      requestedCapabilities: [
        "manifest.read",
        "unsupported.future.capability"
      ]
    }),
    credentialEvidence: [],
    now: "2026-11-08T14:00:00.000Z"
  });
  assert.equal(unsupported.state, "held");
  assert.equal(unsupported.ownerApprovalEligible, false);
  assert.deepEqual(
    unsupported.capabilityPreview.unsupported,
    ["unsupported.future.capability"]
  );

  const incompatible = buildHostInstallDryRun({
    manifest: manifest({ hostContractVersion: 2 }),
    credentialEvidence: [],
    now: "2026-11-08T14:00:00.000Z"
  });
  assert.equal(incompatible.state, "held");
  assert.ok(
    incompatible.checks.some(
      (item) =>
        item.id === "compatibility" &&
        item.state === "held"
    )
  );

  assert.throws(
    () =>
      buildHostInstallDryRun({
        manifest: {
          ...manifest(),
          clientSecret: "forbidden"
        },
        credentialEvidence: [],
        now: "2026-11-08T14:00:00.000Z"
      }),
    /module_installer_raw_secret_field_forbidden/
  );

  const credentialManifest = manifest({
    credentialRequirements: [
      {
        requirementId: "host-auth-reference",
        label: "Host authentication reference",
        required: true,
        acceptedReferenceKinds: [
          "external-vault-reference"
        ]
      }
    ],
    credentialBindings: [
      {
        requirementId: "host-auth-reference",
        credentialRefId: "credential-build327-001"
      }
    ]
  });

  const missingCredential = buildHostInstallDryRun({
    manifest: credentialManifest,
    credentialEvidence: [],
    now: "2026-11-08T14:00:00.000Z"
  });
  assert.equal(missingCredential.state, "held");
  assert.deepEqual(
    missingCredential.credentialPreview.invalidBindings,
    ["host-auth-reference"]
  );

  const validCredential = buildHostInstallDryRun({
    manifest: credentialManifest,
    credentialEvidence: [
      {
        requirementId: "host-auth-reference",
        credentialRefId: "credential-build327-001",
        workspaceId: "workspace-build327",
        referenceKind: "external-vault-reference",
        lifecycleStatus: "active",
        expiresAt: "2026-11-09T14:00:00.000Z"
      }
    ],
    now: "2026-11-08T14:00:00.000Z"
  });
  assert.equal(validCredential.state, "pass");
  assert.equal(validCredential.credentialPreview.satisfied, 1);
  assert.equal(
    validCredential.credentialPreview.rawSecretValuesRead,
    false
  );

  const expiredCredential = buildHostInstallDryRun({
    manifest: credentialManifest,
    credentialEvidence: [
      {
        requirementId: "host-auth-reference",
        credentialRefId: "credential-build327-001",
        workspaceId: "workspace-build327",
        referenceKind: "external-vault-reference",
        lifecycleStatus: "active",
        expiresAt: "2026-11-08T13:59:59.000Z"
      }
    ],
    now: "2026-11-08T14:00:00.000Z"
  });
  assert.equal(expiredCredential.state, "held");

  assert.throws(
    () =>
      buildHostInstallDryRun({
        manifest: manifest({
          transport: {
            transportId: "module.local",
            displayName: "Local relay",
            kind: "trusted-local-relay",
            destinationOrigin: "http://localhost:8765",
            securityLevel: "hardened",
            localRelay: null
          }
        }),
        credentialEvidence: [],
        now: "2026-11-08T14:00:00.000Z"
      }),
    /transport_local_relay_registration_required/
  );

  assert.equal(
    hostInstallSha256({ b: 2, a: 1 }),
    hostInstallSha256({ a: 1, b: 2 })
  );

  const packageValue = generateApprovedHostInstallPackage({
    enrollmentId: "enrollment-build327-001",
    approvalEventId: "approval-build327-001",
    approvedAt: "2026-11-08T14:05:00.000Z",
    manifest: credentialManifest,
    dryRun: validCredential,
    dryRunSha256: hostInstallSha256(validCredential),
    generatedAt: "2026-11-08T14:06:00.000Z"
  });

  assert.equal(
    packageValue.security.generatedAfterOwnerApproval,
    true
  );
  assert.equal(packageValue.security.rawSecretsIncluded, false);
  assert.equal(
    packageValue.security.credentialLocatorsIncluded,
    false
  );
  assert.equal(packageValue.security.connectionActivated, false);
  assert.equal(packageValue.security.trustAuthorized, false);
  assert.equal(packageValue.security.capabilitiesGranted, false);
  assert.equal(
    packageValue.security.hostFilesWrittenByPlatform,
    false
  );
  assert.ok(
    packageValue.files.some(
      (file) => file.path === "ai-data-installation.json"
    )
  );
  assert.ok(
    packageValue.files.some(
      (file) => file.path === "OWNER-APPROVAL.md"
    )
  );
  const packageText = JSON.stringify(packageValue);
  assert.equal(packageText.includes("vault:"), false);
  assert.equal(packageText.includes("clientSecret"), false);

  assert.throws(
    () =>
      generateApprovedHostInstallPackage({
        enrollmentId: "enrollment-build327-held",
        approvalEventId: "approval-build327-held",
        approvedAt: "2026-11-08T14:05:00.000Z",
        manifest: manifest({
          requestedCapabilities: [
            "unsupported.future.capability"
          ]
        }),
        dryRun: unsupported,
        dryRunSha256: hostInstallSha256(unsupported)
      }),
    /module_installer_approved_package_dry_run_invalid/
  );

  const descriptor = moduleHostInstallerDescriptor();
  assert.equal(descriptor.discovery.networkScanPerformed, false);
  assert.equal(
    descriptor.discovery.filesystemScanPerformed,
    false
  );
  assert.equal(descriptor.discovery.rawSecretsAccepted, false);
  assert.equal(
    descriptor.security.ownerApprovalRequiredForPackage,
    true
  );
  assert.equal(
    descriptor.security.ownerApprovalActivatesConnection,
    false
  );
  assert.equal(
    descriptor.security.runtimeTransportHealthStillRequired,
    true
  );
  assert.equal(
    descriptor.security.autonomyPolicyCreatedAutomatically,
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
    migrationSource,
    docsSource,
    reviewSource,
    roadmapSource,
    packageRaw
  ] = await Promise.all([
    source("lib/module-host-installer.ts"),
    source("lib/module-host-installer-database.ts"),
    source("app/api/module-installer/route.ts"),
    source("app/module-installer/page.tsx"),
    source("app/module-installer/ModuleInstallerConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../db/migrations/0110_module_host_guided_enrollment.sql"),
    source("../../docs/BUILD_327_ZERO_TOUCH_MODULE_INSTALLER_GUIDED_HOST_ENROLLMENT.md"),
    source("../../docs/integration/ai-data-platform-build327-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "host-install-manifest.v1",
    "manifest-discovery",
    "adapter-selection",
    "tenant-workspace-mapping",
    "capability-preview",
    "credential-reference-validation",
    "transport-configuration-selection",
    "compatibility-validation",
    "install-dry-run",
    "owner-approval",
    "package-generation",
    "transportPreparationPerformsNetworkRequest: false",
    "runtimeTransportHealthStillRequired: true",
    "hostFilesWrittenAutomatically: false",
    "autonomyPolicyCreatedAutomatically: false"
  ]) {
    assert.ok(
      coreSource.includes(token),
      "Build 327 installer core missing " + token
    );
  }

  for (const token of [
    "prepareModuleHostEnrollment",
    "decideModuleHostEnrollment",
    "generateModuleHostEnrollmentPackage",
    "for update",
    "workspace_credential_references",
    "hostInstallSha256",
    "module_host_enrollment_events",
    "ownerApprovalRequiredForPackage: true"
  ]) {
    assert.ok(
      databaseSource.includes(token),
      "Build 327 installer database missing " + token
    );
  }

  for (const token of [
    '"prepare-enrollment"',
    '"owner-decision"',
    '"generate-package"',
    "authentication_required",
    "Cache-Control"
  ]) {
    assert.ok(
      apiSource.includes(token),
      "Build 327 installer API missing " + token
    );
  }

  for (const token of [
    "Module Installer &amp; Guided Host Enrollment",
    "Zero-touch means automated preparation, not automatic trust.",
    "/api/module-installer"
  ]) {
    assert.ok(
      pageSource.includes(token),
      "Build 327 installer page missing " + token
    );
  }

  for (const token of [
    "Host identity &amp; runtime",
    "Tenant/workspace mapping",
    "Capability preview",
    "Credential-reference requirement",
    "Transport configuration",
    "Discover, validate & run install dry run",
    "Approve preparation",
    "Generate integration package"
  ]) {
    assert.ok(
      uiSource.includes(token),
      "Build 327 installer UI missing " + token
    );
  }

  assert.ok(
    navigationSource.includes('href: "/module-installer"') &&
      navigationSource.includes('label: "Module Installer"')
  );
  assert.ok(
    toolsSource.includes('href: "/module-installer"') &&
      toolsSource.includes('label: "Module installer"')
  );

  for (const token of [
    '"zero-touch-module-installer-v1"',
    '"guided-host-enrollment-v1"',
    '"installer-dry-run-v1"',
    '"owner-approved-install-package-v1"',
    '"host-enrollment-evidence-v1"',
    "moduleInstallerFilesystemScanAutomatic: false",
    "moduleInstallerNetworkScanAutomatic: false",
    "moduleInstallerAcceptsRawSecrets: false",
    "moduleInstallerCapabilityPreviewGrantsAuthorization: false",
    "moduleInstallerOwnerApprovalActivatesConnection: false",
    "moduleInstallerOwnerApprovalAuthorizesTrust: false",
    "moduleInstallerPackageContainsCredentialLocators: false",
    "moduleInstallerTransportPreparationProvesHealth: false",
    "moduleInstallerWritesHostFilesAutomatically: false",
    "moduleInstallerCreatesAutonomyPolicyAutomatically: false",
    "moduleInstallerPackageProvesHostInstalled: false"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 327 universal manifest missing " + token
    );
  }

  for (const token of [
    "create table if not exists app.module_host_enrollments",
    "create table if not exists app.module_host_enrollment_events",
    "dry-run-held",
    "dry-run-passed",
    "owner-approved",
    "owner-rejected",
    "package-generated",
    "manifest_sha256",
    "dry_run_sha256",
    "package_sha256",
    "enable row level security",
    "wm.role in ('owner','admin')",
    "revoke update, delete"
  ]) {
    assert.ok(
      migrationSource.includes(token),
      "Build 327 migration missing " + token
    );
  }

  for (const token of [
    "Build 327",
    "Explicit host manifest",
    "Adapter selection",
    "Exact tenant/workspace mapping",
    "Capability preview",
    "Credential-reference requirements",
    "Transport configuration selection",
    "Compatibility validation",
    "Owner approval",
    "Generated host integration package",
    "Evidence integrity",
    "Build 328"
  ]) {
    assert.ok(
      docsSource.includes(token),
      "Build 327 docs missing " + token
    );
  }

  const review = JSON.parse(reviewSource);
  assert.equal(review.build, 327);
  assert.equal(
    review.security.ownerApprovalActivatesConnection,
    false
  );
  assert.equal(
    review.security.transportPreparationProvesHealth,
    false
  );
  assert.equal(review.nextQueuedBuild, 328);

  assert.ok(
    roadmapSource.includes(
      "Build 327 — Zero-Touch Module Installer & Guided Host Enrollment"
    ) &&
      roadmapSource.includes(
        "Build 328 — Module Versioning, Safe Upgrade, Rollback & Migration Orchestration"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-327-zero-touch-module-installer.ts"
      ),
      "Build 327 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 327 Zero-Touch Module Installer & Guided Host Enrollment verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
