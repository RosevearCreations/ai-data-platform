import {
  buildSharedApplicationIdentityMap,
  type SharedApplicationIdentity
} from "./application-identity-mapping";
import { buildAppConnectionRegistry } from "./app-connection-registry";
import { listRegisteredConnectorManifests } from "./connectors/registry";
import type {
  ConnectorSetupApplicationOption,
  ConnectorSetupConnectionOption,
  ConnectorSetupConnectionType,
  ConnectorSetupDraft,
  ConnectorSetupDraftReview,
  ConnectorSetupWizardModel
} from "./connector-setup-contract";

function connectionOptionsFor(
  identity: SharedApplicationIdentity,
  discoveredCapabilities: string[]
): ConnectorSetupConnectionOption[] {
  const repository: ConnectorSetupConnectionOption = {
    type: "repository-metadata",
    label: "Repository metadata",
    description:
      "Prepare a metadata-only connection using the registered repository identity. No credential or remote mutation is required.",
    available: true,
    blockingReason: null,
    requiredConfiguration: [
      {
        key: "application-identity",
        label: "Stable application identity",
        detail: identity.identityKey,
        source: "derived",
        secretValueAccepted: false
      },
      {
        key: "repository",
        label: "Repository",
        detail: identity.repository,
        source: "derived",
        secretValueAccepted: false
      }
    ],
    discoveredCapabilities: discoveredCapabilities.filter(
      (capability) => capability === "repository_metadata"
    ),
    safeTestPreparation: [
      "Confirm the registered repository still represents the selected application.",
      "Prepare a read-only metadata check; do not write to the repository.",
      "Record the resulting repository identity and commit evidence only when a later test is explicitly authorized."
    ],
    activationState: "DISCONNECTED"
  };

  const integrationAvailable = identity.gatewayBusinessId !== null;
  const integration: ConnectorSetupConnectionOption = {
    type: "integration-v1-discovery",
    label: "Integration v1 read-only discovery",
    description:
      "Prepare the existing read-only Integration v1 health/capability discovery path for a nonproduction environment.",
    available: integrationAvailable,
    blockingReason: integrationAvailable
      ? null
      : "No Integration v1 gateway business identity is registered for this application.",
    requiredConfiguration: [
      {
        key: "gateway-business",
        label: "Gateway business identity",
        detail: identity.gatewayBusinessId ?? "not registered",
        source: "derived",
        secretValueAccepted: false
      },
      {
        key: "tenant",
        label: "Logical tenant key",
        detail: identity.canonicalTenantKey,
        source: "derived",
        secretValueAccepted: false
      },
      {
        key: "credential-reference",
        label: "Credential reference",
        detail:
          "A named credential reference will be reviewed by Build 284; no secret value is accepted by this wizard.",
        source: "future-credential-reference",
        secretValueAccepted: false
      }
    ],
    discoveredCapabilities: discoveredCapabilities.filter(
      (capability) =>
        capability === "read_health" || capability === "read_capabilities"
    ),
    safeTestPreparation: [
      "Choose local or preview; production is intentionally ineligible for the current Integration v1 gateway.",
      "Confirm the gateway business identity and logical tenant routing metadata.",
      "Prepare health discovery before capability discovery; do not execute either request in Build 283.",
      "Do not paste HMAC keys, tokens or other secret values into the setup draft."
    ],
    activationState: "DISCONNECTED"
  };

  const workspaceAvailable = identity.workspace.state === "mapped";
  const connectorSdk: ConnectorSetupConnectionOption = {
    type: "connector-sdk-workspace",
    label: "Workspace Connector SDK",
    description:
      "Prepare a workspace-scoped Connector SDK manifest selection using an existing durable AI Data Platform workspace.",
    available: workspaceAvailable,
    blockingReason: workspaceAvailable
      ? null
      : "No durable AI Data Platform workspace is mapped for this application.",
    requiredConfiguration: [
      {
        key: "workspace",
        label: "Workspace binding",
        detail:
          identity.workspace.state === "mapped"
            ? identity.workspace.workspaceSlug + " · " + identity.workspace.workspaceId
            : "unmapped",
        source: "derived",
        secretValueAccepted: false
      },
      {
        key: "manifest",
        label: "Connector manifest",
        detail: "Select one registered Connector SDK manifest.",
        source: "operator-review",
        secretValueAccepted: false
      },
      {
        key: "secret-references",
        label: "Secret references",
        detail:
          "Only manifest-declared environment-variable names may be referenced later. Secret values are never accepted here.",
        source: "future-credential-reference",
        secretValueAccepted: false
      }
    ],
    discoveredCapabilities: [],
    safeTestPreparation: [
      "Confirm the existing workspace binding and operator authority.",
      "Review the connector manifest configuration fields and requested capabilities.",
      "Prepare a bounded non-export test plan; Build 283 does not install, enable or execute the connector.",
      "Keep secret values outside browser storage and source-controlled setup evidence."
    ],
    activationState: "DISCONNECTED"
  };

  return [repository, integration, connectorSdk];
}

export function buildConnectorSetupWizardModel(
  generatedAt = new Date().toISOString()
): ConnectorSetupWizardModel {
  const identities = buildSharedApplicationIdentityMap(generatedAt);
  const registry = buildAppConnectionRegistry(generatedAt);
  const manifests = listRegisteredConnectorManifests();

  const applications: ConnectorSetupApplicationOption[] =
    identities.applications.map((identity) => {
      const registryItem = registry.peerApplications.find(
        (item) => item.id === identity.applicationId
      );
      if (!registryItem) {
        throw new Error("connector_setup_registry_identity_mismatch");
      }

      return {
        applicationId: identity.applicationId,
        identityKey: identity.identityKey,
        displayName: identity.displayName,
        repository: identity.repository,
        canonicalTenantKey: identity.canonicalTenantKey,
        workspace: {
          state: identity.workspace.state,
          workspaceId: identity.workspace.workspaceId,
          workspaceSlug: identity.workspace.workspaceSlug
        },
        environments: identity.environments.map((environment) => ({
          environment: environment.canonical,
          integrationEnvironment: environment.integrationEnvironment,
          integrationV1Eligible: environment.integrationV1Eligible,
          consequentialWritesAllowed: false as const
        })),
        connectionOptions: connectionOptionsFor(
          identity,
          registryItem.discoveryCapabilities
        )
      };
    });

  const manifestOptions = manifests.map((manifest) => ({
    key: manifest.key,
    displayName: manifest.displayName,
    version: manifest.version,
    capabilities: [...manifest.capabilities],
    configFields: manifest.configSchema.map((field) => ({
      key: field.key,
      label: field.label,
      required: field.required,
      type: field.type,
      hasDefault: field.defaultValue !== undefined
    })),
    secretReferences: manifest.secrets.map((secret) => ({
      key: secret.key,
      label: secret.label,
      required: secret.required,
      environmentVariable: secret.environmentVariable
    }))
  }));

  const allOptions = applications.flatMap((application) =>
    application.connectionOptions.map((option) => ({
      application,
      option
    }))
  );
  const immediatelyPreparableOptions = allOptions.filter(({ option }) =>
    option.available
  ).length;

  return {
    schema: "ai-data-platform.connector-setup-wizard.v1",
    build: 283,
    generatedAt,
    applications,
    connectorManifests: manifestOptions,
    summary: {
      applications: applications.length,
      connectionOptions: allOptions.length,
      immediatelyPreparableOptions,
      blockedOptions: allOptions.length - immediatelyPreparableOptions,
      browserSavedDrafts: true,
      externalTestsExecuted: 0,
      liveConnectionsActivated: 0
    },
    policy: {
      setupIsPreparationOnly: true,
      savedStateBrowserLocalOnly: true,
      rawSecretsAccepted: false,
      credentialsIssued: false,
      externalTestsExecuted: false,
      liveConnectionImplied: false,
      automaticActivation: false,
      ql266Resumed: false
    }
  };
}

export function reviewConnectorSetupDraft(
  model: ConnectorSetupWizardModel,
  draft: ConnectorSetupDraft
): ConnectorSetupDraftReview {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const checklist: string[] = [];

  if (draft.schema !== "ai-data-platform.connector-setup-draft.v1") {
    blockingReasons.push("Unsupported setup draft schema.");
  }

  const application = model.applications.find(
    (item) => item.applicationId === draft.applicationId
  );
  if (!application) {
    blockingReasons.push("Select a registered peer application.");
    return {
      valid: false,
      readyForSafeTestPreparation: false,
      blockingReasons,
      warnings,
      checklist,
      activationState: "DISCONNECTED"
    };
  }

  const environment = application.environments.find(
    (item) => item.environment === draft.environment
  );
  if (!environment) {
    blockingReasons.push("Select a canonical application environment.");
  }

  const connection = application.connectionOptions.find(
    (item) => item.type === draft.connectionType
  );
  if (!connection) {
    blockingReasons.push("Select a supported connection type.");
  } else {
    if (!connection.available) {
      blockingReasons.push(
        connection.blockingReason ?? "This connection type is unavailable."
      );
    }
    checklist.push(...connection.safeTestPreparation);
  }

  if (
    connection?.type === "integration-v1-discovery" &&
    environment &&
    !environment.integrationV1Eligible
  ) {
    blockingReasons.push(
      "Production is not eligible for the current nonproduction-only Integration v1 gateway."
    );
  }

  if (connection?.type === "connector-sdk-workspace") {
    if (application.workspace.state !== "mapped") {
      blockingReasons.push(
        "A durable AI Data Platform workspace binding is required for Connector SDK preparation."
      );
    }
    const manifest = model.connectorManifests.find(
      (item) => item.key === draft.connectorKey
    );
    if (!manifest) {
      blockingReasons.push("Select a registered Connector SDK manifest.");
    } else {
      checklist.push(
        "Review manifest " +
          manifest.displayName +
          " v" +
          manifest.version +
          " and its " +
          manifest.capabilities.length +
          " declared capability/capabilities."
      );
      if (manifest.secretReferences.length) {
        warnings.push(
          "This manifest requires secret references. Save only environment-variable names later; never secret values."
        );
      }
    }
  } else if (draft.connectorKey !== null) {
    warnings.push(
      "Connector manifest selection is ignored unless Workspace Connector SDK is selected."
    );
  }

  if (environment?.environment === "production") {
    warnings.push(
      "Production setup remains preparation-only; Build 283 grants no production connection authority."
    );
  }
  warnings.push(
    "Saving this draft does not install, enable, test or activate a connection."
  );

  return {
    valid: blockingReasons.length === 0,
    readyForSafeTestPreparation: blockingReasons.length === 0,
    blockingReasons: [...new Set(blockingReasons)],
    warnings: [...new Set(warnings)],
    checklist: [...new Set(checklist)],
    activationState: "DISCONNECTED"
  };
}

export function connectionTypeLabel(type: ConnectorSetupConnectionType) {
  if (type === "repository-metadata") return "Repository metadata";
  if (type === "integration-v1-discovery") {
    return "Integration v1 read-only discovery";
  }
  return "Workspace Connector SDK";
}
