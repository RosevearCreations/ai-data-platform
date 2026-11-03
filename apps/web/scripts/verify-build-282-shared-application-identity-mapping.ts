import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildSharedApplicationIdentityMap,
  resolveCanonicalEnvironment,
  resolveSharedApplicationIdentity
} from "../lib/application-identity-mapping";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 282 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const mapping = buildSharedApplicationIdentityMap(
    "2026-11-03T13:30:00.000Z"
  );

  ensure(
    mapping.schema === "ai-data-platform.shared-application-identity-map.v1",
    "mapping schema"
  );
  ensure(mapping.build === 282, "build number");
  ensure(mapping.summary.applications === 6, "six peer applications");
  ensure(mapping.summary.mappedWorkspaces === 2, "two evidence-backed workspaces");
  ensure(mapping.summary.unmappedWorkspaces === 4, "four intentionally unmapped workspaces");
  ensure(
    mapping.summary.productionIntegrationV1Eligible === 0,
    "production Integration v1 remains ineligible"
  );
  ensure(
    mapping.summary.automaticTenantProvisioning === 0,
    "no automatic tenant provisioning"
  );

  const identityKeys = mapping.applications.map((app) => app.identityKey);
  const tenantKeys = mapping.applications.map((app) => app.canonicalTenantKey);
  ensure(new Set(identityKeys).size === 6, "unique stable identity keys");
  ensure(new Set(tenantKeys).size === 6, "unique stable logical tenant keys");

  ensure(
    resolveSharedApplicationIdentity("Devil_N_Dove")?.applicationId === "devilndove",
    "Devil n Dove alias resolution"
  );
  ensure(
    resolveSharedApplicationIdentity("YW")?.applicationId === "yard-workers",
    "Yard Workers alias resolution"
  );
  ensure(
    resolveSharedApplicationIdentity("COMMS-HUB")?.applicationId ===
      "rosevear-comms-hub",
    "Comms Hub alias resolution"
  );
  ensure(resolveSharedApplicationIdentity("unknown-app") === null, "unknown app fails closed");

  ensure(resolveCanonicalEnvironment("dev")?.canonical === "local", "dev environment");
  ensure(
    resolveCanonicalEnvironment("nonproduction")?.canonical === "preview",
    "nonproduction environment"
  );
  ensure(
    resolveCanonicalEnvironment("prod")?.canonical === "production",
    "production environment"
  );
  ensure(
    resolveCanonicalEnvironment("production")?.integrationEnvironment === null,
    "production has no Integration v1 environment"
  );
  ensure(resolveCanonicalEnvironment("unknown") === null, "unknown environment fails closed");

  const rosie = mapping.applications.find((app) => app.applicationId === "rosiedazzlers");
  const dnd = mapping.applications.find((app) => app.applicationId === "devilndove");
  ensure(
    rosie?.workspace.state === "mapped" &&
      rosie.workspace.workspaceSlug === "rosiedazzlers" &&
      rosie.workspace.workspaceId === "00000000-0000-4000-8000-000000000001",
    "Rosie workspace binding"
  );
  ensure(
    dnd?.workspace.state === "mapped" &&
      dnd.workspace.workspaceSlug === "devilndove" &&
      dnd.workspace.workspaceId === "00000000-0000-4000-8000-000000000002",
    "Devil n Dove workspace binding"
  );

  for (const app of mapping.applications.filter(
    (item) => !["rosiedazzlers", "devilndove"].includes(item.applicationId)
  )) {
    ensure(app.workspace.state === "unmapped", "unmapped workspace for " + app.applicationId);
    ensure(app.integrationTenantId === null, "no inferred transport tenant for " + app.applicationId);
  }

  ensure(mapping.policy.automaticWorkspaceCreation === false, "no workspace auto-create");
  ensure(mapping.policy.automaticTenantProvisioning === false, "no tenant auto-provision");
  ensure(mapping.policy.liveAuthorizationImplied === false, "no live authorization");
  ensure(mapping.policy.ql266Resumed === false, "QL-266 not resumed");

  const [model, page, api, nav, pkg, doc, statusRaw, queue, workspaceFoundation] =
    await Promise.all([
      source("lib/application-identity-mapping.ts"),
      source("app/app-connections/page.tsx"),
      source("app/api/app-connections/mappings/route.ts"),
      source("lib/application-navigation.ts"),
      source("package.json"),
      source("../../docs/BUILD_282_SHARED_APPLICATION_IDENTITY_ENVIRONMENT_TENANT_MAPPING.md"),
      source("../../docs/integration/ql266-ai-data-platform-build282-review.json"),
      source("../../docs/NEXT_BUILDS_281_305.md"),
      source("../../db/migrations/0001_workspace_foundation.sql")
    ]);

  ensure(
    model.includes("buildAppConnectionRegistry") &&
      model.includes("automaticWorkspaceCreation: false") &&
      model.includes("integrationTenantId: null"),
    "Build 281 registry reuse and safe tenant boundary"
  );
  ensure(
    page.includes("Build 282") &&
      page.includes("Shared Application Identity, Environment &amp; Tenant Mapping") &&
      page.includes("Mapping JSON"),
    "Build 282 app connections screen"
  );
  ensure(
    api.includes("buildSharedApplicationIdentityMap") &&
      api.includes("status: 401") &&
      api.includes('"cache-control": "no-store"'),
    "authenticated mapping API"
  );
  ensure(
    nav.includes("identity, environment and tenant/workspace mappings"),
    "navigation description"
  );
  ensure(
    pkg.includes("verify-build-282-shared-application-identity-mapping.ts"),
    "verifier registered"
  );
  ensure(
    workspaceFoundation.includes("'rosiedazzlers'") &&
      workspaceFoundation.includes("'devilndove'") &&
      !workspaceFoundation.includes("'yard-workers'") &&
      !workspaceFoundation.includes("'rosevear-comms-hub'"),
    "workspace bindings reflect durable foundation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 282, "status build");
  ensure(status.shared_identity_mapping.mapped_workspace_count === 2, "status mapped count");
  ensure(status.shared_identity_mapping.unmapped_workspace_count === 4, "status unmapped count");
  ensure(
    status.shared_identity_mapping.production_integration_v1_eligible_count === 0,
    "status production gateway boundary"
  );
  ensure(
    status.shared_identity_mapping.automatic_workspace_creation === false &&
      status.shared_identity_mapping.automatic_tenant_provisioning === false,
    "status no automatic provisioning"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 283, "next build");

  ensure(
    doc.includes("does **not** invent workspace rows") &&
      doc.includes("production deliberately has no Integration v1 transport mapping"),
    "Build 282 documentation safety"
  );
  ensure(
    queue.includes("Build 282 — Shared Application Identity, Environment & Tenant Mapping") &&
      queue.includes("Build 283 — Connector Setup Wizard & Guided Connection Assistant"),
    "official queue continuity"
  );

  console.log(
    "Build 282 shared application identity, environment and tenant/workspace mapping verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
