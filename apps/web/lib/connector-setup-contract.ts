export type ConnectorSetupConnectionType =
  | "repository-metadata"
  | "integration-v1-discovery"
  | "connector-sdk-workspace";

export type ConnectorSetupRequirement = {
  key: string;
  label: string;
  detail: string;
  source: "derived" | "operator-review" | "future-credential-reference";
  secretValueAccepted: false;
};

export type ConnectorSetupConnectionOption = {
  type: ConnectorSetupConnectionType;
  label: string;
  description: string;
  available: boolean;
  blockingReason: string | null;
  requiredConfiguration: ConnectorSetupRequirement[];
  discoveredCapabilities: string[];
  safeTestPreparation: string[];
  activationState: "DISCONNECTED";
};

export type ConnectorSetupEnvironmentOption = {
  environment: "local" | "preview" | "production";
  integrationEnvironment: "nonproduction" | null;
  integrationV1Eligible: boolean;
  consequentialWritesAllowed: false;
};

export type ConnectorSetupManifestOption = {
  key: string;
  displayName: string;
  version: string;
  capabilities: string[];
  configFields: Array<{
    key: string;
    label: string;
    required: boolean;
    type: "string" | "number" | "boolean";
    hasDefault: boolean;
  }>;
  secretReferences: Array<{
    key: string;
    label: string;
    required: boolean;
    environmentVariable: string;
  }>;
};

export type ConnectorSetupApplicationOption = {
  applicationId: string;
  identityKey: string;
  displayName: string;
  repository: string;
  canonicalTenantKey: string;
  workspace: {
    state: "mapped" | "unmapped";
    workspaceId: string | null;
    workspaceSlug: string | null;
  };
  environments: ConnectorSetupEnvironmentOption[];
  connectionOptions: ConnectorSetupConnectionOption[];
};

export type ConnectorSetupWizardModel = {
  schema: "ai-data-platform.connector-setup-wizard.v1";
  build: 283;
  generatedAt: string;
  applications: ConnectorSetupApplicationOption[];
  connectorManifests: ConnectorSetupManifestOption[];
  summary: {
    applications: number;
    connectionOptions: number;
    immediatelyPreparableOptions: number;
    blockedOptions: number;
    browserSavedDrafts: true;
    externalTestsExecuted: 0;
    liveConnectionsActivated: 0;
  };
  policy: {
    setupIsPreparationOnly: true;
    savedStateBrowserLocalOnly: true;
    rawSecretsAccepted: false;
    credentialsIssued: false;
    externalTestsExecuted: false;
    liveConnectionImplied: false;
    automaticActivation: false;
    ql266Resumed: false;
  };
};

export type ConnectorSetupDraft = {
  schema: "ai-data-platform.connector-setup-draft.v1";
  applicationId: string;
  environment: "local" | "preview" | "production";
  connectionType: ConnectorSetupConnectionType;
  connectorKey: string | null;
};

export type ConnectorSetupDraftReview = {
  valid: boolean;
  readyForSafeTestPreparation: boolean;
  blockingReasons: string[];
  warnings: string[];
  checklist: string[];
  activationState: "DISCONNECTED";
};
