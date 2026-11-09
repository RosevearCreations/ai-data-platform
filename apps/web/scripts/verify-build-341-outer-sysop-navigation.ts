import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildMasterSysopLaunchUrl,
  buildMasterSysopShellModel,
  buildNonAuthorizingHandoffContext
} from "../lib/master-sysop-core";

const root = resolve(process.cwd());
const source = (path: string) =>
  readFileSync(resolve(root, path), "utf8");

const sourceEvidence = [
  {
    sourceId: "yw" as const,
    effectiveStatus: "CONNECTED",
    freshness: "FRESH" as const,
    approvedOrigin: "https://yw.example.invalid",
    rolesAllowed: ["owner", "admin"]
  },
  {
    sourceId: "icamp" as const,
    effectiveStatus: "AUTHORIZATION_HELD",
    freshness: "FRESH" as const,
    approvedOrigin: "https://icamp.example.invalid",
    rolesAllowed: ["owner"]
  },
  {
    sourceId: "rosiedazzlers" as const,
    effectiveStatus: "CONFIGURED",
    freshness: "FRESH" as const,
    approvedOrigin: "https://rosie.example.invalid/path",
    rolesAllowed: ["owner", "admin"]
  },
  {
    sourceId: "devilndove" as const,
    effectiveStatus: "TEST_VERIFIED",
    freshness: "FRESH" as const,
    approvedOrigin: "https://dnd.example.invalid",
    rolesAllowed: ["owner", "admin", "member"]
  },
  {
    sourceId: "ai-data-platform" as const,
    effectiveStatus: "CONNECTED",
    freshness: "FRESH" as const,
    approvedOrigin: "https://data.example.invalid",
    rolesAllowed: ["owner"]
  },
  {
    sourceId: "rosevear-ai-hub" as const,
    effectiveStatus: "STALE",
    freshness: "STALE" as const,
    approvedOrigin: "https://hub.example.invalid",
    rolesAllowed: ["owner"]
  }
];

const tenantOwnerWithoutSysop = buildMasterSysopShellModel({
  principal: {
    userId: "user-tenant-owner",
    name: "Tenant Owner",
    email: "tenant@example.invalid",
    role: null,
    revokedAt: null
  },
  claimEligible: false,
  workspaces: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      slug: "devilndove",
      name: "Devil n Dove",
      type: "business",
      role: "owner"
    }
  ],
  sourceEvidence,
  members: [],
  generatedAt: "2026-11-09T14:00:00.000Z"
});

assert.equal(
  tenantOwnerWithoutSysop.principal.activeSysop,
  false
);
assert.equal(
  tenantOwnerWithoutSysop.policy.tenantAdminDoesNotImplySysop,
  true
);
assert.ok(
  tenantOwnerWithoutSysop.destinations.every(
    (item) => item.state === "SYSOP_REQUIRED"
  )
);

const sysop = buildMasterSysopShellModel({
  principal: {
    userId: "user-jack",
    name: "Jack",
    email: "jack@example.invalid",
    role: "operator",
    revokedAt: null
  },
  claimEligible: false,
  workspaces: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      slug: "devilndove",
      name: "Devil n Dove",
      type: "business",
      role: "member"
    }
  ],
  sourceEvidence,
  members: [
    {
      userId: "user-jack",
      name: "Jack",
      email: "jack@example.invalid",
      role: "operator",
      grantedAt: "2026-11-09T12:00:00.000Z",
      revokedAt: null,
      active: true
    }
  ],
  generatedAt: "2026-11-09T14:00:00.000Z"
});

assert.equal(sysop.destinations.length, 7);
assert.equal(sysop.policy.separateAuthenticatedSessions, true);
assert.equal(sysop.policy.navigationGrantsDestinationAuthority, false);
assert.equal(sysop.policy.workspaceRoleMayNotBeElevated, true);
assert.equal(sysop.policy.handoffCarriesUserId, false);
assert.equal(sysop.policy.handoffCarriesEmail, false);

const aiData = sysop.destinations.find(
  (item) => item.key === "ai-data-platform"
);
assert.ok(aiData);
assert.equal(aiData.state, "INTERNAL_READY");
assert.equal(aiData.handoffAllowed, true);

const yw = sysop.destinations.find((item) => item.key === "yw");
assert.ok(yw);
assert.equal(yw.state, "READY_REAUTH_REQUIRED");
assert.equal(
  yw.tenantContext.state,
  "destination-selects-child-tenant"
);
assert.equal(yw.tenantContext.workspaceId, null);
assert.equal(yw.destinationAuthorizationGranted, false);

const icamp = sysop.destinations.find(
  (item) => item.key === "icamp"
);
assert.ok(icamp);
assert.equal(icamp.state, "SOURCE_HELD");
assert.equal(icamp.handoffAllowed, false);

const rosie = sysop.destinations.find(
  (item) => item.key === "rosiedazzlers"
);
assert.ok(rosie);
assert.equal(rosie.state, "TENANT_DENIED");
assert.equal(rosie.tenantContext.state, "denied");
assert.equal(rosie.handoffAllowed, false);

const dnd = sysop.destinations.find(
  (item) => item.key === "devilndove"
);
assert.ok(dnd);
assert.equal(dnd.state, "READY_REAUTH_REQUIRED");
assert.equal(dnd.tenantContext.state, "mapped");
assert.equal(dnd.tenantContext.workspaceRole, "member");
assert.equal(dnd.tenantRoleElevated, false);
assert.equal(dnd.destinationAuthenticationRequired, true);
assert.equal(dnd.destinationAuthorizationGranted, false);
assert.equal(dnd.origin, "https://dnd.example.invalid");

const aiHub = sysop.destinations.find(
  (item) => item.key === "rosevear-ai-hub"
);
assert.ok(aiHub);
assert.equal(aiHub.state, "SOURCE_NOT_READY");

const comms = sysop.destinations.find(
  (item) => item.key === "rosevear-comms-hub"
);
assert.ok(comms);
assert.equal(comms.state, "ORIGIN_UNMEASURED");
assert.equal(
  sysop.policy.commsHubRemainsComplementaryPlane,
  true
);

const handoff = buildNonAuthorizingHandoffContext({
  handoffId: "00000000-0000-4000-8000-000000000341",
  destinationKey: "devilndove",
  workspace: {
    slug: "devilndove",
    role: "member"
  },
  issuedAt: "2026-11-09T14:00:00.000Z",
  expiresAt: "2026-11-09T14:10:00.000Z"
});
assert.equal(handoff.context.authority, "none");
assert.equal(handoff.context.actorIdentityTransferred, false);
assert.equal(
  handoff.context.destinationReauthenticationRequired,
  true
);
assert.equal(
  handoff.context.destinationAuthorizationRequired,
  true
);
assert.equal(handoff.context.tenantRoleElevationAllowed, false);
assert.equal(handoff.context.workspace?.roleHint, "member");
assert.match(handoff.contextHash, /^[a-f0-9]{64}$/);

const decoded = Buffer.from(
  handoff.encoded,
  "base64url"
).toString("utf8");
assert.ok(!decoded.includes("user-jack"));
assert.ok(!decoded.includes("jack@example.invalid"));
assert.ok(!decoded.includes("password"));
assert.ok(!decoded.includes("cookie"));

const launch = new URL(
  buildMasterSysopLaunchUrl(
    "https://dnd.example.invalid/some/path",
    handoff.encoded
  )
);
assert.equal(launch.origin, "https://dnd.example.invalid");
assert.equal(launch.pathname, "/");
assert.equal(
  launch.searchParams.get("rosevear_context"),
  handoff.encoded
);
assert.throws(
  () =>
    buildMasterSysopLaunchUrl(
      "http://unsafe.example.invalid",
      handoff.encoded
    ),
  /master_sysop_destination_origin_invalid/
);

const migration = source(
  "../../db/migrations/0121_master_sysop_navigation_context.sql"
);
for (const token of [
  "master_sysop_members",
  "master_sysop_handoff_audit",
  "current_master_sysop_role",
  "master_sysop_claim_eligible",
  "master_sysop_source_navigation_evidence",
  "security definer",
  "master_sysop_last_owner_required",
  "enable row level security",
  "grant update(role,revoked_at,note)",
  "revoke delete",
  "revoke update,delete on app.master_sysop_handoff_audit"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(
  !migration.includes(
    "grant update, delete on app.master_sysop_handoff_audit"
  )
);

const database = source("lib/master-sysop-database.ts");
for (const token of [
  "listMasterSysopShellForUser",
  "claimMasterSysopOwner",
  "grantMasterSysopByEmail",
  "revokeMasterSysop",
  "prepareMasterSysopHandoff",
  "master_sysop_owner_required",
  "master_sysop_target_user_not_found",
  "app.master_sysop_source_navigation_evidence()"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("fetch("));
assert.ok(!database.includes("password"));

const api = source("app/api/master-sysop/route.ts");
for (const token of [
  'action === "claim"',
  'action === "grant"',
  'action === "revoke"',
  'action === "prepare-handoff"',
  "authentication_required",
  "api.master-sysop.get",
  "api.master-sysop.post"
]) {
  assert.ok(api.includes(token), "API token " + token);
}

const page = source("app/master-sysop/page.tsx");
const controls = source(
  "app/master-sysop/MasterSysopControls.tsx"
);
for (const token of [
  "Sysop Navigation, Context Handoff &amp; Tenant Isolation",
  "Navigation is not authorization.",
  "Separate authenticated session required",
  "RLS-visible tenant/workspace context"
]) {
  assert.ok(page.includes(token), "page token " + token);
}
for (const token of [
  "Prepare handoff",
  "Enroll existing account",
  "destination authorization granted",
  "It carries no",
  "Master Sysop role"
]) {
  assert.ok(controls.includes(token), "controls token " + token);
}

const css = source("app/globals.css");
assert.ok(css.includes(".sysopDestinationGrid"));
assert.ok(css.includes("@media (max-width: 1100px)"));
assert.ok(css.includes("@media (max-width: 700px)"));

const shell = source("app/application-shell.tsx");
const navigation = source("lib/application-navigation.ts");
assert.ok(shell.includes('href="/master-sysop"'));
assert.ok(
  navigation.includes('href: "/master-sysop"')
);

const bootstrap = source("lib/database.ts");
assert.ok(
  bootstrap.includes(
    "First-owner bootstrap: initial Master Sysop authority."
  )
);

const dbSpine = source(
  "scripts/verify-ci-integration-spine-database.ts"
);
assert.ok(
  dbSpine.includes('"master_sysop_members"')
);
assert.ok(
  (dbSpine.match(/"master_sysop_handoff_audit"/g) ?? [])
    .length >= 2
);
assert.ok(
  dbSpine.includes(
    '"0121_master_sysop_navigation_context.sql"'
  )
);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build341-review.json")
);
assert.equal(review.build, 341);
assert.equal(review.authority.tenantAdminImpliesSysop, false);
assert.equal(review.authority.separateAuthenticatedSessions, true);
assert.equal(review.handoff.userIdTransferred, false);
assert.equal(review.handoff.emailTransferred, false);
assert.equal(review.handoff.authSessionTransferred, false);
assert.equal(
  review.handoff.destinationAuthorizationGranted,
  false
);
assert.equal(
  review.tenantIsolation.yardWorkersChildTenantGuessed,
  false
);
assert.equal(review.nextQueuedBuild, 342);

const docs = source(
  "../../docs/BUILD_341_OUTER_SYSOP_NAVIGATION_CONTEXT_TENANT_ISOLATION.md"
);
assert.ok(
  docs.includes(
    "Build 342 — Comms Hub Complementary Plane Integration & Incident/Follow-Up Read Models"
  )
);
assert.ok(
  docs.includes(
    "Navigation never grants destination authority."
  )
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 340 — Master Shell Command Center V1: Applications, IT, Management & Statistics** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 341 — Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 342 — Comms Hub Complementary Plane Integration & Incident/Follow-Up Read Models"
  )
);

const previousVerifier = source(
  "scripts/verify-build-340-master-shell-command-center.ts"
);
assert.ok(
  previousVerifier.includes(
    "Build 340 — Master Shell Command Center V1: Applications, IT, Management & Statistics** — Production"
  )
);

const response = source(
  "../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md"
);
const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(
  response.includes(
    "Build 341 contribution — Stage B outer Sysop identity and navigation"
  )
);
assert.ok(
  architecture.includes(
    "Build 341 — Outer Sysop identity, context handoff and tenant isolation"
  )
);
assert.ok(
  security.includes(
    "Build 341 Outer Sysop security boundary"
  )
);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-341-outer-sysop-navigation.ts";
assert.equal(pkg.scripts["verify:build341"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-340-master-shell-command-center.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-341-outer-sysop-navigation.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-341-outer-sysop-navigation.ts"
  ) < String(pkg.scripts.build).indexOf(
    "run-production-migrations.ts"
  )
);

console.log(
  "Build 341 Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation verification passed."
);
