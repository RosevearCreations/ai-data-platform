import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildConnectorSetupWizardModel,
  reviewConnectorSetupDraft
} from "../lib/connector-setup-wizard";
import type { ConnectorSetupDraft } from "../lib/connector-setup-contract";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 283 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

function draft(
  applicationId: string,
  environment: ConnectorSetupDraft["environment"],
  connectionType: ConnectorSetupDraft["connectionType"],
  connectorKey: string | null = null
): ConnectorSetupDraft {
  return {
    schema: "ai-data-platform.connector-setup-draft.v1",
    applicationId,
    environment,
    connectionType,
    connectorKey
  };
}

async function main() {
  const model = buildConnectorSetupWizardModel(
    "2026-11-03T13:45:00.000Z"
  );

  ensure(
    model.schema === "ai-data-platform.connector-setup-wizard.v1",
    "wizard schema"
  );
  ensure(model.build === 283, "build number");
  ensure(model.summary.applications === 6, "six peer applications");
  ensure(model.summary.connectionOptions === 18, "three paths per application");
  ensure(
    model.summary.immediatelyPreparableOptions === 13,
    "thirteen base connection paths preparable"
  );
  ensure(model.summary.blockedOptions === 5, "five base paths blocked");
  ensure(model.summary.browserSavedDrafts === true, "browser-local draft support");
  ensure(model.summary.externalTestsExecuted === 0, "no external tests executed");
  ensure(model.summary.liveConnectionsActivated === 0, "no live activation");

  for (const application of model.applications) {
    ensure(application.connectionOptions.length === 3, "three paths for " + application.applicationId);
    ensure(
      application.connectionOptions.every(
        (option) => option.activationState === "DISCONNECTED"
      ),
      "all paths remain disconnected for " + application.applicationId
    );
    ensure(
      application.connectionOptions
        .flatMap((option) => option.requiredConfiguration)
        .every((requirement) => requirement.secretValueAccepted === false),
      "no secret values accepted for " + application.applicationId
    );
  }

  const dndPreview = reviewConnectorSetupDraft(
    model,
    draft("devilndove", "preview", "integration-v1-discovery")
  );
  ensure(dndPreview.valid, "Devil n Dove preview Integration v1 preparation");
  ensure(
    dndPreview.readyForSafeTestPreparation,
    "preview Integration v1 safe-test preparation ready"
  );

  const dndProduction = reviewConnectorSetupDraft(
    model,
    draft("devilndove", "production", "integration-v1-discovery")
  );
  ensure(!dndProduction.valid, "production Integration v1 fails closed");
  ensure(
    dndProduction.blockingReasons.some((reason) =>
      reason.includes("nonproduction-only")
    ),
    "production Integration v1 blocker is explicit"
  );

  const rosieConnector = reviewConnectorSetupDraft(
    model,
    draft(
      "rosiedazzlers",
      "preview",
      "connector-sdk-workspace",
      "example.no-secret-normalizer"
    )
  );
  ensure(rosieConnector.valid, "Rosie mapped workspace Connector SDK preparation");

  const yardConnector = reviewConnectorSetupDraft(
    model,
    draft(
      "yard-workers",
      "preview",
      "connector-sdk-workspace",
      "example.no-secret-normalizer"
    )
  );
  ensure(!yardConnector.valid, "Yard Workers unmapped workspace fails closed");

  const commsIntegration = reviewConnectorSetupDraft(
    model,
    draft("rosevear-comms-hub", "preview", "integration-v1-discovery")
  );
  ensure(!commsIntegration.valid, "Comms Hub Integration v1 without gateway identity fails closed");

  const productionRepository = reviewConnectorSetupDraft(
    model,
    draft("icamp", "production", "repository-metadata")
  );
  ensure(productionRepository.valid, "production repository metadata can be prepared");
  ensure(
    productionRepository.warnings.some((warning) =>
      warning.includes("preparation-only")
    ),
    "production warning preserves authorization boundary"
  );

  const [
    contractSource,
    modelSource,
    page,
    client,
    api,
    nav,
    moduleTools,
    connectorsPage,
    appConnectionsPage,
    pkg,
    doc,
    statusRaw,
    queue
  ] = await Promise.all([
    source("lib/connector-setup-contract.ts"),
    source("lib/connector-setup-wizard.ts"),
    source("app/connector-setup/page.tsx"),
    source("app/connector-setup/ConnectorSetupWizard.tsx"),
    source("app/api/app-connections/setup/route.ts"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("app/connectors/page.tsx"),
    source("app/app-connections/page.tsx"),
    source("package.json"),
    source("../../docs/BUILD_283_CONNECTOR_SETUP_WIZARD_GUIDED_CONNECTION_ASSISTANT.md"),
    source("../../docs/integration/ql266-ai-data-platform-build283-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  ensure(
    modelSource.includes("buildSharedApplicationIdentityMap") &&
      modelSource.includes("buildAppConnectionRegistry") &&
      modelSource.includes("listRegisteredConnectorManifests"),
    "Build 281/282 and Connector SDK registry reuse"
  );
  ensure(
    contractSource.includes('secretValueAccepted: false') &&
      !contractSource.includes("password:") &&
      !contractSource.includes("apiKey:") &&
      !contractSource.includes("token:"),
    "browser contract accepts no secret values"
  );
  ensure(
    page.includes("Connector Setup Wizard &amp; Guided Connection Assistant") &&
      page.includes("Preparation is not authorization") &&
      page.includes("/api/app-connections/setup"),
    "authenticated Build 283 page"
  );
  ensure(
    client.includes("ai-data-platform.connector-setup-draft.v1") &&
      client.includes("window.localStorage.setItem") &&
      client.includes("window.localStorage.removeItem") &&
      client.includes("never stores passwords, API keys, tokens") &&
      !client.includes('type="password"'),
    "browser-local non-secret saved setup state"
  );
  ensure(
    api.includes("buildConnectorSetupWizardModel") &&
      api.includes("status: 401") &&
      api.includes('"cache-control": "no-store"'),
    "authenticated setup model API"
  );
  ensure(
    nav.includes('href: "/connector-setup"') &&
      nav.includes("guided environment, tenant/workspace and safe-test readiness checks"),
    "setup wizard navigation"
  );
  ensure(
    moduleTools.includes('"/connector-setup"') &&
      moduleTools.includes("Prepare a non-secret connection draft"),
    "integration module operator coverage"
  );
  ensure(
    connectorsPage.includes('href="/connector-setup"') &&
      appConnectionsPage.includes('href="/connector-setup"'),
    "entry points from connector manager and app registry"
  );
  ensure(
    pkg.includes("verify-build-283-connector-setup-wizard.ts"),
    "verifier registered"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 283, "status build");
  ensure(
    status.connector_setup_wizard.peer_application_count === 6 &&
      status.connector_setup_wizard.connection_path_count === 18,
    "status application/path counts"
  );
  ensure(
    status.connector_setup_wizard.raw_secret_values_accepted === false &&
      status.connector_setup_wizard.external_tests_executed === 0 &&
      status.connector_setup_wizard.live_connections_activated === 0,
    "status safe preparation boundary"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 284, "next build");

  ensure(
    doc.includes("it does not create credentials") &&
      doc.includes("Build 284 — Connection Credential Vault & Rotation Readiness"),
    "Build 283 documentation and next-build continuity"
  );
  ensure(
    queue.includes("Build 283 — Connector Setup Wizard & Guided Connection Assistant") &&
      queue.includes("Build 284 — Connection Credential Vault & Rotation Readiness"),
    "official queue continuity"
  );

  ensure(model.policy.setupIsPreparationOnly, "setup preparation-only policy");
  ensure(model.policy.savedStateBrowserLocalOnly, "browser-only saved state policy");
  ensure(model.policy.rawSecretsAccepted === false, "raw secrets rejected");
  ensure(model.policy.credentialsIssued === false, "no credentials issued");
  ensure(model.policy.externalTestsExecuted === false, "no external tests");
  ensure(model.policy.liveConnectionImplied === false, "no live connection implied");
  ensure(model.policy.automaticActivation === false, "no automatic activation");
  ensure(model.policy.ql266Resumed === false, "QL-266 not resumed");

  console.log(
    "Build 283 Connector Setup Wizard & Guided Connection Assistant verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
