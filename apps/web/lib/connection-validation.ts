import {
  normalizeConnectorConfig,
  validateConnectorSecretReferences,
  type ConnectorCapability
} from "@rosevear/ai-data-connector-sdk";

import {
  buildSharedApplicationIdentityMap,
  type CanonicalApplicationEnvironment
} from "./application-identity-mapping";
import {
  executeWorkspaceConnector,
  listConnectorOverviewForUser
} from "./connector-database";
import {
  listCredentialVaultForUser,
  type CredentialReferenceRiskState
} from "./credential-vault-database";
import type {
  AutomaticConnectionTestBatch,
  ConnectionValidationCheck,
  ConnectionValidationItem,
  ConnectionValidationModel,
  ConnectionValidationState
} from "./connection-validation-contract";

const MAX_AUTOMATIC_TESTS = 12;

function runtimeEnvironment(): CanonicalApplicationEnvironment {
  const value = process.env.VERCEL_ENV;
  if (value === "production") return "production";
  if (value === "preview") return "preview";
  return "local";
}

function rank(value: ConnectionValidationState) {
  return value === "fail" ? 3 : value === "attention" ? 2 : value === "pass" ? 1 : 0;
}

function overall(checks: ConnectionValidationCheck[]): ConnectionValidationState {
  return checks.reduce<ConnectionValidationState>(
    (current, check) => rank(check.state) > rank(current) ? check.state : current,
    "not-applicable"
  );
}

function privateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function unsafeHostname(hostname: string) {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    value === "localhost" ||
    value.endsWith(".localhost") ||
    value.endsWith(".local") ||
    value === "::1" ||
    value.startsWith("fe80:") ||
    value === "metadata.google.internal" ||
    privateIpv4(value)
  );
}

export function validateAutomaticDestination(
  key: string,
  value: string
): ConnectionValidationCheck {
  const isWebhook = /(webhook|callback|return)/i.test(key);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return {
        id: "destination:" + key,
        label: isWebhook ? "Webhook destination" : "Endpoint destination",
        state: "fail",
        detail: key + " must use HTTPS for automatic connection testing.",
        recovery: "Replace the destination with a provider HTTPS endpoint before running automatic tests.",
        blocksAutomaticTest: true
      };
    }
    if (unsafeHostname(url.hostname)) {
      return {
        id: "destination:" + key,
        label: isWebhook ? "Webhook destination" : "Endpoint destination",
        state: "fail",
        detail: key + " points to a local, link-local or private destination that automatic testing will not use.",
        recovery: "Use a registered public provider endpoint or keep this connector in manual review.",
        blocksAutomaticTest: true
      };
    }
    if (url.username || url.password) {
      return {
        id: "destination:" + key,
        label: isWebhook ? "Webhook destination" : "Endpoint destination",
        state: "fail",
        detail: key + " contains inline URL credentials.",
        recovery: "Remove inline credentials and use manifest-declared secret references instead.",
        blocksAutomaticTest: true
      };
    }
    return {
      id: "destination:" + key,
      label: isWebhook ? "Webhook destination" : "Endpoint destination",
      state: "pass",
      detail: key + " is an HTTPS destination and passes non-secret destination policy checks.",
      recovery: "No destination correction is required.",
      blocksAutomaticTest: false
    };
  } catch {
    return {
      id: "destination:" + key,
      label: isWebhook ? "Webhook destination" : "Endpoint destination",
      state: "fail",
      detail: key + " is not a valid absolute URL.",
      recovery: "Enter a complete HTTPS URL before running automatic tests.",
      blocksAutomaticTest: true
    };
  }
}

function destinationChecks(config: Record<string, unknown>) {
  const checks = Object.entries(config)
    .filter(([key, value]) =>
      typeof value === "string" &&
      /(url|uri|endpoint|webhook|callback|return)/i.test(key)
    )
    .map(([key, value]) => validateAutomaticDestination(key, String(value)));
  if (checks.length) return checks;
  return [{
    id: "destinations",
    label: "Endpoint and webhook destinations",
    state: "not-applicable" as const,
    detail: "This connector has no URL, endpoint, webhook or callback configuration fields.",
    recovery: "No destination validation is required.",
    blocksAutomaticTest: false
  }];
}

function environmentVariableFromReference(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reference = value as Record<string, unknown>;
  if (reference.kind !== "environment") return null;
  return typeof reference.environmentVariable === "string"
    ? reference.environmentVariable
    : null;
}

function vaultRiskBlocksAutomaticTest(risk: CredentialReferenceRiskState) {
  return risk === "expired" || risk === "revoked" || risk === "rotation-due" || risk === "replacement-prepared";
}

export async function buildAutomaticConnectionValidation(
  userId: string,
  generatedAt = new Date().toISOString()
): Promise<ConnectionValidationModel> {
  const environment = runtimeEnvironment();
  const [overview, vault] = await Promise.all([
    listConnectorOverviewForUser(userId),
    listCredentialVaultForUser(userId)
  ]);
  const identities = buildSharedApplicationIdentityMap(generatedAt);
  const applicationByWorkspace = new Map(
    identities.applications
      .filter((application) => application.workspace.state === "mapped")
      .map((application) => [
        application.workspace.workspaceId,
        application.applicationId
      ])
  );
  const manifestByKey = new Map(overview.manifests.map((manifest) => [manifest.key, manifest]));
  const items: ConnectionValidationItem[] = [];

  for (const workspaceEntry of overview.workspaces) {
    for (const installation of workspaceEntry.installations) {
      const checks: ConnectionValidationCheck[] = [];
      const manifest = manifestByKey.get(installation.connectorKey);
      const canManage =
        workspaceEntry.workspace.role === "owner" ||
        workspaceEntry.workspace.role === "admin";
      const applicationId =
        applicationByWorkspace.get(workspaceEntry.workspace.id) ?? null;

      if (!manifest) {
        checks.push({
          id: "registration",
          label: "Connector registration",
          state: "fail",
          detail: "The installed connector is not present in the registered connector catalog.",
          recovery: "Restore the registered connector definition or remove the stale installation.",
          blocksAutomaticTest: true
        });
        items.push({
          workspaceId: workspaceEntry.workspace.id,
          workspaceName: workspaceEntry.workspace.name,
          role: workspaceEntry.workspace.role,
          connectorKey: installation.connectorKey,
          displayName: installation.connectorKey,
          enabled: installation.enabled,
          applicationId,
          environment,
          testCapability: null,
          automaticTestEligibility: "blocked",
          checks,
          overall: "fail"
        });
        continue;
      }

      const versionMatches =
        installation.manifestVersion === manifest.manifestVersion &&
        installation.connectorVersion === manifest.version;
      checks.push({
        id: "version",
        label: "Registered version",
        state: versionMatches ? "pass" : "fail",
        detail: versionMatches
          ? "Installed connector and registered manifest versions match."
          : "Installed connector and registered manifest versions differ.",
        recovery: versionMatches
          ? "No version recovery is required."
          : "Re-save the connector against the current registered manifest before testing.",
        blocksAutomaticTest: !versionMatches
      });

      try {
        normalizeConnectorConfig(manifest, installation.config);
        checks.push({
          id: "configuration",
          label: "Configuration schema",
          state: "pass",
          detail: "Required connector configuration is structurally valid.",
          recovery: "No configuration correction is required.",
          blocksAutomaticTest: false
        });
      } catch (error) {
        checks.push({
          id: "configuration",
          label: "Configuration schema",
          state: "fail",
          detail: error instanceof Error ? error.message : "Connector configuration is invalid.",
          recovery: "Correct required fields and allowed values before automatic testing.",
          blocksAutomaticTest: true
        });
      }

      checks.push(...destinationChecks(installation.config));

      const unsupportedGrants = installation.grantedCapabilities.filter(
        (capability) => !manifest.capabilities.includes(capability as ConnectorCapability)
      );
      checks.push({
        id: "permissions",
        label: "Capability permissions",
        state: unsupportedGrants.length ? "fail" : "pass",
        detail: unsupportedGrants.length
          ? "Unsupported grant(s): " + unsupportedGrants.join(", ") + "."
          : "Granted capabilities are supported by the registered manifest.",
        recovery: unsupportedGrants.length
          ? "Remove unsupported grants and keep only least-privilege capabilities."
          : "No capability correction is required.",
        blocksAutomaticTest: unsupportedGrants.length > 0
      });

      try {
        validateConnectorSecretReferences(manifest, installation.secretRefs);
        checks.push({
          id: "secret-reference-structure",
          label: "Authentication reference structure",
          state: "pass",
          detail: "Manifest-declared secret references are structurally valid; no secret value is returned.",
          recovery: "No secret-reference correction is required.",
          blocksAutomaticTest: false
        });
      } catch (error) {
        checks.push({
          id: "secret-reference-structure",
          label: "Authentication reference structure",
          state: "fail",
          detail: error instanceof Error ? error.message : "Secret references are invalid.",
          recovery: "Store only manifest-approved environment-variable references; never paste credential values into configuration.",
          blocksAutomaticTest: true
        });
      }

      const declaredSecrets = manifest.secrets ?? [];
      if (!declaredSecrets.length) {
        checks.push({
          id: "vault-readiness",
          label: "Credential vault readiness",
          state: "not-applicable",
          detail: "This connector declares no credentials.",
          recovery: "No credential-vault reference is required.",
          blocksAutomaticTest: false
        });
      } else if (!applicationId) {
        checks.push({
          id: "vault-readiness",
          label: "Credential vault readiness",
          state: "attention",
          detail: "The workspace has no evidence-backed peer-application mapping, so Build 284 vault scope cannot be reconciled automatically.",
          recovery: "Map this workspace to a registered peer application before automatic credential-reference validation.",
          blocksAutomaticTest: true
        });
      } else {
        const missing: string[] = [];
        const unhealthy: string[] = [];
        for (const declaration of declaredSecrets) {
          const storedReference = installation.secretRefs[declaration.key];
          const environmentVariable = environmentVariableFromReference(storedReference);
          if (!environmentVariable) {
            missing.push(declaration.environmentVariable);
            continue;
          }
          const reference = vault.references.find((item) =>
            item.workspaceId === workspaceEntry.workspace.id &&
            item.applicationId === applicationId &&
            item.environment === environment &&
            item.referenceKind === "environment-variable" &&
            item.referenceLocator === environmentVariable &&
            item.lifecycleStatus === "active"
          );
          if (!reference) {
            missing.push(environmentVariable);
            continue;
          }
          if (vaultRiskBlocksAutomaticTest(reference.riskState)) {
            unhealthy.push(environmentVariable + " (" + reference.riskState + ")");
          }
        }
        const blocks = missing.length > 0 || unhealthy.length > 0;
        checks.push({
          id: "vault-readiness",
          label: "Credential vault readiness",
          state: blocks ? "fail" : "pass",
          detail: blocks
            ? [
                missing.length ? "Missing active vault reference(s): " + missing.join(", ") + "." : "",
                unhealthy.length ? "Rotation/expiry blocker(s): " + unhealthy.join(", ") + "." : ""
              ].filter(Boolean).join(" ")
            : "All declared environment-variable references have active Build 284 vault metadata for this workspace, application and environment.",
          recovery: blocks
            ? "Register or rotate the matching reference metadata in Credential Vault before automatic testing."
            : "No credential-reference recovery is required.",
          blocksAutomaticTest: blocks
        });
      }

      checks.push({
        id: "enabled",
        label: "Connector enabled state",
        state: installation.enabled ? "pass" : "attention",
        detail: installation.enabled
          ? "Connector execution is enabled."
          : "Connector execution is disabled.",
        recovery: installation.enabled
          ? "No enablement action is required."
          : "An owner/admin must explicitly enable the connector before any automatic test can execute.",
        blocksAutomaticTest: !installation.enabled
      });

      checks.push({
        id: "operator-role",
        label: "Operator authorization",
        state: canManage ? "pass" : "attention",
        detail: canManage
          ? "Current workspace role can run bounded connector tests."
          : "Current workspace role is read-only for connector execution.",
        recovery: canManage
          ? "No role correction is required."
          : "Ask a workspace owner or admin to run automatic tests.",
        blocksAutomaticTest: !canManage
      });

      const testCapability = (
        installation.grantedCapabilities.find(
          (capability) =>
            capability !== "export" &&
            manifest.capabilities.includes(capability as ConnectorCapability)
        ) ?? null
      ) as "import" | "enrichment" | null;
      const exportOnly =
        !testCapability &&
        installation.grantedCapabilities.includes("export");

      checks.push({
        id: "automatic-test-capability",
        label: "Automatic test capability",
        state: testCapability ? "pass" : exportOnly ? "attention" : "fail",
        detail: testCapability
          ? "Automatic bounded testing will use the granted " + testCapability + " capability."
          : exportOnly
            ? "Only export is granted; automatic export execution is prohibited."
            : "No supported non-export capability is granted for automatic testing.",
        recovery: testCapability
          ? "No capability change is required."
          : exportOnly
            ? "Keep this connector in manual provider-safe review."
            : "Grant a supported least-privilege import or enrichment capability if appropriate.",
        blocksAutomaticTest: !testCapability
      });

      const blocking = checks.some((check) => check.blocksAutomaticTest);
      const eligibility = exportOnly
        ? "manual-review"
        : blocking
          ? "blocked"
          : "eligible";

      items.push({
        workspaceId: workspaceEntry.workspace.id,
        workspaceName: workspaceEntry.workspace.name,
        role: workspaceEntry.workspace.role,
        connectorKey: installation.connectorKey,
        displayName: manifest.displayName,
        enabled: installation.enabled,
        applicationId,
        environment,
        testCapability: testCapability as "import" | "enrichment" | null,
        automaticTestEligibility: eligibility,
        checks,
        overall: overall(checks)
      });
    }
  }

  return {
    schema: "ai-data-platform.connection-validation.v1",
    build: 285,
    generatedAt,
    environment,
    items,
    summary: {
      connectors: items.length,
      eligible: items.filter((item) => item.automaticTestEligibility === "eligible").length,
      blocked: items.filter((item) => item.automaticTestEligibility === "blocked").length,
      manualReview: items.filter((item) => item.automaticTestEligibility === "manual-review").length,
      pass: items.filter((item) => item.overall === "pass").length,
      attention: items.filter((item) => item.overall === "attention").length,
      fail: items.filter((item) => item.overall === "fail").length
    },
    policy: {
      registeredConnectorsOnly: true,
      enabledInstallationsOnly: true,
      nonExportAutomaticTestsOnly: true,
      boundedDiagnosticPayloadOnly: true,
      arbitraryNetworkProbing: false,
      secretValuesReturned: false,
      secretValuesPersisted: false,
      vaultReferenceMetadataUsed: true,
      ownerAdminExecutionOnly: true,
      automaticConnectionActivation: false,
      ql266Resumed: false
    }
  };
}

export async function runAutomaticConnectionTests(
  userId: string
): Promise<AutomaticConnectionTestBatch> {
  const startedAt = new Date();
  const model = await buildAutomaticConnectionValidation(userId, startedAt.toISOString());
  const eligible = model.items.filter(
    (item) =>
      item.automaticTestEligibility === "eligible" &&
      (item.testCapability === "import" || item.testCapability === "enrichment")
  );
  const selected = eligible.slice(0, MAX_AUTOMATIC_TESTS);
  const results: AutomaticConnectionTestBatch["results"] = [];

  for (const item of selected) {
    const capability = item.testCapability;
    if (capability !== "import" && capability !== "enrichment") continue;
    const testStarted = Date.now();
    try {
      const result = await executeWorkspaceConnector(userId, {
        workspaceId: item.workspaceId,
        connectorKey: item.connectorKey,
        capability,
        payload: {
          diagnostic: true,
          records: [],
          build: 285,
          mode: "automatic-bounded-test"
        }
      });
      results.push({
        workspaceId: item.workspaceId,
        connectorKey: item.connectorKey,
        capability,
        status: "succeeded",
        durationMs: result.durationMs,
        errorCode: null
      });
    } catch (error) {
      results.push({
        workspaceId: item.workspaceId,
        connectorKey: item.connectorKey,
        capability,
        status: "failed",
        durationMs: Math.max(0, Date.now() - testStarted),
        errorCode: (error instanceof Error ? error.message : "connector_test_failed").slice(0, 160)
      });
    }
  }

  return {
    schema: "ai-data-platform.automatic-connection-test-batch.v1",
    build: 285,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    attempted: results.length,
    succeeded: results.filter((item) => item.status === "succeeded").length,
    failed: results.filter((item) => item.status === "failed").length,
    skippedBySafetyCap: Math.max(0, eligible.length - selected.length),
    maxAutomaticTests: MAX_AUTOMATIC_TESTS,
    results
  };
}
