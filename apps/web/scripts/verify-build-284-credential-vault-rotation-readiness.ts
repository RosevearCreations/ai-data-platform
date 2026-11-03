import { readFile } from "node:fs/promises";
import path from "node:path";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 284 verification failed: " + message);
}
async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const [
    migration,
    lib,
    api,
    page,
    client,
    nav,
    tools,
    setupPage,
    diagnosticsPage,
    pkg,
    doc,
    statusRaw,
    queue
  ] = await Promise.all([
    source("../../db/migrations/0089_connection_credential_vault_rotation_readiness.sql"),
    source("lib/credential-vault-database.ts"),
    source("app/api/credential-vault/route.ts"),
    source("app/credential-vault/page.tsx"),
    source("app/credential-vault/CredentialVaultManager.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("app/connector-setup/page.tsx"),
    source("app/connector-diagnostics/page.tsx"),
    source("package.json"),
    source("../../docs/BUILD_284_CONNECTION_CREDENTIAL_VAULT_ROTATION_READINESS.md"),
    source("../../docs/integration/ql266-ai-data-platform-build284-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  for (const token of [
    "workspace_credential_references",
    "workspace_credential_reference_events",
    "credential_reference_insert",
    "credential_reference_update",
    "credential_reference_event_insert",
    "replacement_state",
    "rotation_due_at",
    "last_rotated_at"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }
  ensure(
    migration.includes("grant select, insert, update on app.workspace_credential_references") &&
      migration.includes("grant select, insert on app.workspace_credential_reference_events"),
    "least-privilege table grants"
  );
  ensure(
    !migration.includes("grant delete") &&
      !migration.includes("secret_value") &&
      !migration.includes("credential_value"),
    "no delete grant or secret-value column"
  );
  ensure(
    migration.includes("wm.role in ('owner','admin')"),
    "owner/admin mutation RLS"
  );

  for (const token of [
    "validateCredentialReferenceLocator",
    "credentialReferenceRiskState",
    "createCredentialReference",
    "scheduleCredentialRotation",
    "markCredentialReplacementPrepared",
    "recordCredentialRotationCompleted",
    "revokeCredentialReference",
    "credential_replacement_not_prepared",
    "appendEvent"
  ]) {
    ensure(lib.includes(token), "vault library " + token);
  }
  ensure(
    lib.includes("ENVIRONMENT_VARIABLE_PATTERN") &&
      lib.includes("EXTERNAL_VAULT_PATTERN") &&
      lib.includes("PROVIDER_MANAGED_PATTERN"),
    "structured non-secret locator validation"
  );
  ensure(
    !lib.includes("process.env[") &&
      !lib.includes("secretValue:") &&
      !lib.includes("credentialValue:") &&
      !lib.includes("secret_value") &&
      !lib.includes("credential_value"),
    "vault library never reads or models secret-value fields"
  );
  ensure(
    lib.includes("secretValuesStored: false as const") &&
      lib.includes("automaticRotation: false as const") &&
      lib.includes("ql266Resumed: false as const"),
    "vault safety policy"
  );

  ensure(
    api.includes("createCredentialReference") &&
      api.includes("scheduleCredentialRotation") &&
      api.includes("markCredentialReplacementPrepared") &&
      api.includes("recordCredentialRotationCompleted") &&
      api.includes("revokeCredentialReference"),
    "credential vault API actions"
  );
  ensure(
    api.includes('status: 401') &&
      api.includes('"cache-control": "no-store"') &&
      api.includes('"workspace_admin_required"'),
    "API auth/no-store/authorization handling"
  );

  ensure(
    page.includes("Connection Credential Vault &amp; Rotation Readiness") &&
      page.includes("Reference metadata only — never secret material.") &&
      page.includes("/api/credential-vault"),
    "Build 284 page safety boundary"
  );
  ensure(
    client.includes("Register reference metadata") &&
      client.includes("Mark replacement prepared") &&
      client.includes("Record rotation completed") &&
      client.includes("Revoke reference"),
    "operator rotation controls"
  );
  ensure(
    client.includes("Never") &&
      !client.includes('type="password"'),
    "no password input and explicit warning"
  );
  ensure(
    client.includes("password, token, HMAC key, API secret or credential value"),
    "explicit secret-value warning"
  );

  ensure(
    nav.includes('href: "/credential-vault"') &&
      nav.includes("owner-controlled replacement evidence"),
    "credential vault navigation"
  );
  ensure(
    tools.includes('"/credential-vault"') &&
      tools.includes("reference-only credential metadata"),
    "module operator coverage"
  );
  ensure(
    setupPage.includes('href="/credential-vault"') &&
      diagnosticsPage.includes('href="/credential-vault"'),
    "Build 283 and diagnostics entry points"
  );
  ensure(
    pkg.includes("verify-build-284-credential-vault-rotation-readiness.ts"),
    "Build 284 verifier registered"
  );

  ensure(
    doc.includes("does not rotate a secret automatically") &&
      doc.includes("Build 285 — Automatic Connection Testing & Configuration Validation"),
    "Build 284 documentation and next build"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 284, "status build");
  ensure(
    status.credential_reference_vault.secret_values_stored === false &&
      status.credential_reference_vault.secret_values_read === false &&
      status.credential_reference_vault.automatic_rotation === false,
    "status no-secret/no-auto-rotation boundary"
  );
  ensure(
    status.rotation_workflow.completion_requires_prepared_state === true &&
      status.rotation_workflow.automatic_date_fabrication === false,
    "controlled replacement workflow"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 285, "next build 285");
  ensure(
    queue.includes("Build 284 — Connection Credential Vault & Rotation Readiness") &&
      queue.includes("Build 285 — Automatic Connection Testing & Configuration Validation"),
    "official queue continuity"
  );

  console.log(
    "Build 284 Connection Credential Vault & Rotation Readiness verification passed."
  );
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
