import type { CanonicalApplicationEnvironment } from "./application-identity-mapping";

export type ConnectionValidationState =
  | "pass"
  | "attention"
  | "fail"
  | "not-applicable";

export type AutomaticTestEligibility =
  | "eligible"
  | "blocked"
  | "manual-review";

export type ConnectionValidationCheck = {
  id: string;
  label: string;
  state: ConnectionValidationState;
  detail: string;
  recovery: string;
  blocksAutomaticTest: boolean;
};

export type ConnectionValidationItem = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  connectorKey: string;
  displayName: string;
  enabled: boolean;
  applicationId: string | null;
  environment: CanonicalApplicationEnvironment;
  testCapability: "import" | "enrichment" | "export" | null;
  automaticTestEligibility: AutomaticTestEligibility;
  checks: ConnectionValidationCheck[];
  overall: ConnectionValidationState;
};

export type ConnectionValidationModel = {
  schema: "ai-data-platform.connection-validation.v1";
  build: 285;
  generatedAt: string;
  environment: CanonicalApplicationEnvironment;
  items: ConnectionValidationItem[];
  summary: {
    connectors: number;
    eligible: number;
    blocked: number;
    manualReview: number;
    pass: number;
    attention: number;
    fail: number;
  };
  policy: {
    registeredConnectorsOnly: true;
    enabledInstallationsOnly: true;
    nonExportAutomaticTestsOnly: true;
    boundedDiagnosticPayloadOnly: true;
    arbitraryNetworkProbing: false;
    secretValuesReturned: false;
    secretValuesPersisted: false;
    vaultReferenceMetadataUsed: true;
    ownerAdminExecutionOnly: true;
    automaticConnectionActivation: false;
    ql266Resumed: false;
  };
};

export type AutomaticConnectionTestResult = {
  workspaceId: string;
  connectorKey: string;
  capability: "import" | "enrichment";
  status: "succeeded" | "failed";
  durationMs: number | null;
  errorCode: string | null;
};

export type AutomaticConnectionTestBatch = {
  schema: "ai-data-platform.automatic-connection-test-batch.v1";
  build: 285;
  startedAt: string;
  completedAt: string;
  attempted: number;
  succeeded: number;
  failed: number;
  skippedBySafetyCap: number;
  maxAutomaticTests: number;
  results: AutomaticConnectionTestResult[];
};
