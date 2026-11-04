import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateAutomaticDestination } from "../lib/connection-validation";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 285 verification failed: " + message);
}
async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const [
    contract,
    lib,
    api,
    page,
    client,
    nav,
    tools,
    setupPage,
    vaultPage,
    diagnosticsPage,
    pkg,
    doc,
    statusRaw,
    queue
  ] = await Promise.all([
    source("lib/connection-validation-contract.ts"),
    source("lib/connection-validation.ts"),
    source("app/api/connection-validation/route.ts"),
    source("app/connection-validation/page.tsx"),
    source("app/connection-validation/AutomaticConnectionValidation.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("app/connector-setup/page.tsx"),
    source("app/credential-vault/page.tsx"),
    source("app/connector-diagnostics/page.tsx"),
    source("package.json"),
    source("../../docs/BUILD_285_AUTOMATIC_CONNECTION_TESTING_CONFIGURATION_VALIDATION.md"),
    source("../../docs/integration/ql266-ai-data-platform-build285-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  ensure(
    contract.includes("ConnectionValidationModel") &&
      contract.includes("AutomaticConnectionTestBatch") &&
      contract.includes('"ai-data-platform.connection-validation.v1"') &&
      contract.includes("arbitraryNetworkProbing: false"),
    "Build 285 contract and safety policy"
  );

  for (const token of [
    "buildAutomaticConnectionValidation",
    "runAutomaticConnectionTests",
    "validateAutomaticDestination",
    "listCredentialVaultForUser",
    "executeWorkspaceConnector",
    "MAX_AUTOMATIC_TESTS = 12",
    'capability !== "export"',
    'mode: "automatic-bounded-test"',
    "replacement-prepared",
    "rotation-due"
  ]) {
    ensure(lib.includes(token), "validation engine token " + token);
  }
  ensure(
    !lib.includes("fetch(") &&
      !lib.includes("axios") &&
      !lib.includes("http.request") &&
      !lib.includes("https.request"),
    "no arbitrary network probing"
  );
  ensure(
    !lib.includes("secretValue:") &&
      !lib.includes("credentialValue:") &&
      !lib.includes("secret_value") &&
      !lib.includes("credential_value"),
    "no secret-value model fields"
  );

  const publicHttps = validateAutomaticDestination(
    "apiUrl",
    "https://api.example.com/v1/health"
  );
  const insecure = validateAutomaticDestination(
    "webhookUrl",
    "http://example.com/hook"
  );
  const localhost = validateAutomaticDestination(
    "endpoint",
    "https://127.0.0.1/internal"
  );
  const inlineCredential = validateAutomaticDestination(
    "callbackUrl",
    "https://user:pass@example.com/callback"
  );
  ensure(
    publicHttps.state === "pass" && publicHttps.blocksAutomaticTest === false,
    "public HTTPS destination passes"
  );
  ensure(
    insecure.state === "fail" && insecure.blocksAutomaticTest === true,
    "HTTP destination blocks"
  );
  ensure(
    localhost.state === "fail" && localhost.blocksAutomaticTest === true,
    "private/loopback destination blocks"
  );
  ensure(
    inlineCredential.state === "fail" &&
      inlineCredential.blocksAutomaticTest === true,
    "inline URL credentials block"
  );

  ensure(
    api.includes("buildAutomaticConnectionValidation") &&
      api.includes("runAutomaticConnectionTests") &&
      api.includes('status: 401') &&
      api.includes('"cache-control": "no-store"'),
    "authenticated no-store validation API"
  );
  ensure(
    page.includes("Automatic Connection Testing &amp; Configuration Validation") &&
      page.includes("Automatic does not mean unrestricted.") &&
      page.includes("Arbitrary URL probing"),
    "Build 285 operator page"
  );
  ensure(
    client.includes("Run automatic safe tests") &&
      client.includes("Maximum 12 connector executions per batch") &&
      client.includes("Export-only connectors stay"),
    "automatic test operator controls"
  );
  ensure(
    nav.includes('href: "/connection-validation"') &&
      nav.includes("bounded non-export test eligibility"),
    "Build 285 navigation"
  );
  ensure(
    tools.includes('"/connection-validation"') &&
      tools.includes("bounded safe non-export tests"),
    "Build 285 operator tools"
  );
  ensure(
    setupPage.includes('href="/connection-validation"') &&
      vaultPage.includes('href="/connection-validation"') &&
      diagnosticsPage.includes('href="/connection-validation"'),
    "Build 283/284/264 cross-links"
  );
  ensure(
    pkg.includes("verify-build-285-automatic-connection-testing-validation.ts"),
    "Build 285 verifier registered"
  );
  ensure(
    doc.includes("does **not** issue generic HEAD/GET requests") &&
      doc.includes("Build 286 — Cross-App Data Contract Registry") &&
      doc.includes("UNDER_REVIEW"),
    "Build 285 documentation and next build"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 285, "status build");
  ensure(
    status.automatic_connection_validation.registered_connectors_only === true &&
      status.automatic_connection_validation.non_export_automatic_tests_only === true &&
      status.automatic_connection_validation.max_automatic_tests_per_batch === 12 &&
      status.automatic_connection_validation.arbitrary_network_probing === false,
    "bounded automatic test status"
  );
  ensure(
    status.automatic_connection_validation.credential_values_returned === false &&
      status.automatic_connection_validation.credential_values_persisted === false &&
      status.authorization.connector_auto_enabled === false &&
      status.authorization.export_auto_executed === false,
    "no secret exposure, auto enablement or export"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 286, "next build 286");
  ensure(
    queue.includes("Build 285 — Automatic Connection Testing & Configuration Validation") &&
      queue.includes("Build 286 — Cross-App Data Contract Registry"),
    "official queue continuity"
  );

  console.log(
    "Build 285 Automatic Connection Testing & Configuration Validation verification passed."
  );
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
