import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  COMMS_QL392_BASELINE,
  composeCommsComplementaryPlane,
  hashCommsAuthorizedProjection,
  validateCommsAuthorizedProjection,
  type CommsAuthorizedProjection
} from "../lib/comms-complementary-plane";

const root = resolve(process.cwd());
const source = (path: string) =>
  readFileSync(resolve(root, path), "utf8");

const projection: CommsAuthorizedProjection = {
  schema: "rosevear.comms.master-shell-read-model.v1",
  sourceId: "rosevear-comms-hub",
  sourceRevision: "fa65f23d17b21c1764f6ba416a3433ff466f3882",
  projectionMode: "AUTHORIZED_READ_MODEL",
  observedAt: "2026-11-09T14:00:00.000Z",
  expiresAt: "2026-11-09T14:20:00.000Z",
  evidenceURI:
    "urn:rosevear:evidence:comms-build342-authorized-projection",
  independentlyVerified: true,
  groups: [
    {
      correlationId: "correlation-build342-shared",
      sourceIds: ["yw", "icamp"],
      latestOccurredAt: "2026-11-09T14:02:00.000Z",
      timelineCount: 2,
      freshness: "STALE",
      priority: "VERIFY_EVIDENCE",
      guidance:
        "Evidence is stale; request a source-scoped verified readback."
    },
    {
      correlationId: "correlation-build342-conflict",
      sourceIds: ["devilndove"],
      latestOccurredAt: "2026-11-09T14:04:00.000Z",
      timelineCount: 1,
      freshness: "CONFLICT",
      priority: "REVIEW_NOW",
      guidance:
        "Conflicting evidence requires human review in Comms Hub."
    },
    {
      correlationId: "correlation-build342-current",
      sourceIds: ["rosiedazzlers"],
      latestOccurredAt: "2026-11-09T14:06:00.000Z",
      timelineCount: 1,
      freshness: "CURRENT",
      priority: "MONITOR_ONLY",
      guidance:
        "Current read-only evidence requires no Comms action."
    }
  ],
  impact: [
    {
      sourceId: "yw",
      correlatedGroups: 1,
      timelineEntries: 1,
      attentionGroups: 1,
      highestPriority: "VERIFY_EVIDENCE"
    },
    {
      sourceId: "icamp",
      correlatedGroups: 1,
      timelineEntries: 1,
      attentionGroups: 1,
      highestPriority: "VERIFY_EVIDENCE"
    },
    {
      sourceId: "rosiedazzlers",
      correlatedGroups: 1,
      timelineEntries: 1,
      attentionGroups: 0,
      highestPriority: "MONITOR_ONLY"
    },
    {
      sourceId: "devilndove",
      correlatedGroups: 1,
      timelineEntries: 1,
      attentionGroups: 1,
      highestPriority: "REVIEW_NOW"
    },
    {
      sourceId: "ai-data-platform",
      correlatedGroups: 0,
      timelineEntries: 0,
      attentionGroups: 0,
      highestPriority: "NONE"
    },
    {
      sourceId: "rosevear-ai-hub",
      correlatedGroups: 0,
      timelineEntries: 0,
      attentionGroups: 0,
      highestPriority: "NONE"
    }
  ],
  heldUnverified: 1
};

assert.equal(
  COMMS_QL392_BASELINE.sourceRevision,
  "fa65f23d17b21c1764f6ba416a3433ff466f3882"
);
assert.equal(COMMS_QL392_BASELINE.release, "QL-392");
assert.equal(COMMS_QL392_BASELINE.sourceMode, "INERT_PREVIEW");

const previewOnly = composeCommsComplementaryPlane({
  now: new Date("2026-11-09T14:05:00.000Z")
});
assert.equal(previewOnly.projectionState, "PREVIEW_ONLY");
assert.equal(previewOnly.authorizedProjectionAvailable, false);
assert.equal(previewOnly.realIncidentCountKnown, false);
assert.equal(previewOnly.realFollowUpCountKnown, false);
assert.equal(previewOnly.incidents.length, 0);
assert.equal(previewOnly.followUpSuggestions.length, 0);
assert.equal(previewOnly.plane.applicationCountContribution, 0);
assert.equal(previewOnly.plane.sourceCountContribution, 0);
assert.equal(
  previewOnly.policy.previewExamplesCountAsRealIncidents,
  false
);
assert.equal(
  previewOnly.policy.missingProjectionMeansZeroIncidents,
  false
);
assert.equal(
  previewOnly.policy.missingProjectionMeansZeroFollowUps,
  false
);

const validated = validateCommsAuthorizedProjection(projection);
assert.equal(validated.sourceId, "rosevear-comms-hub");
assert.equal(validated.groups.length, 3);
assert.equal(validated.impact.length, 6);

const hashA = hashCommsAuthorizedProjection(projection);
const hashB = hashCommsAuthorizedProjection({
  ...projection,
  impact: projection.impact.map((item) => ({ ...item })),
  groups: projection.groups.map((item) => ({ ...item }))
});
assert.match(hashA, /^[a-f0-9]{64}$/);
assert.equal(hashA, hashB);

const fresh = composeCommsComplementaryPlane({
  projection,
  now: new Date("2026-11-09T14:10:00.000Z")
});
assert.equal(fresh.projectionState, "AUTHORIZED_READ_ONLY");
assert.equal(fresh.authorizedProjectionAvailable, true);
assert.equal(fresh.projectionFresh, true);
assert.equal(fresh.realIncidentCountKnown, true);
assert.equal(fresh.realFollowUpCountKnown, true);
assert.equal(fresh.summary.displayedCorrelationGroups, 3);
assert.equal(fresh.summary.displayedFollowUpSuggestions, 3);
assert.equal(fresh.summary.attentionGroups, 2);
assert.equal(fresh.summary.reviewNow, 1);
assert.equal(fresh.summary.verifyEvidence, 1);
assert.equal(fresh.summary.monitorOnly, 1);
assert.ok(
  fresh.followUpSuggestions.every(
    (item) =>
      item.state === "SUGGESTION_ONLY" &&
      item.taskCreated === false &&
      item.notificationSent === false &&
      item.acknowledgementRecorded === false &&
      item.routeChanged === false
  )
);
assert.equal(fresh.policy.messageAuthorityRemainsCommsHub, true);
assert.equal(fresh.policy.incidentAuthorityRemainsCommsHub, true);
assert.equal(fresh.policy.followUpTaskAuthorityRemainsCommsHub, true);
assert.equal(fresh.policy.tenantMembershipChanged, false);
assert.equal(fresh.policy.sourceConnectionStateChanged, false);

const stale = composeCommsComplementaryPlane({
  projection,
  now: new Date("2026-11-09T14:21:00.000Z")
});
assert.equal(stale.projectionState, "STALE");
assert.equal(stale.authorizedProjectionAvailable, true);
assert.equal(stale.projectionFresh, false);
assert.equal(stale.realIncidentCountKnown, false);
assert.equal(stale.realFollowUpCountKnown, false);
assert.equal(stale.incidents.length, 3);

assert.throws(
  () =>
    validateCommsAuthorizedProjection({
      ...projection,
      sourceId: "ai-data-platform"
    }),
  /comms_projection_authority_invalid/
);

assert.throws(
  () =>
    validateCommsAuthorizedProjection({
      ...projection,
      independentlyVerified: false
    }),
  /comms_projection_authority_invalid/
);

assert.throws(
  () =>
    validateCommsAuthorizedProjection({
      ...projection,
      impact: projection.impact.slice(0, 5)
    }),
  /comms_projection_impact_invalid/
);

assert.throws(
  () =>
    validateCommsAuthorizedProjection({
      ...projection,
      groups: [
        {
          ...projection.groups[0],
          sourceIds: ["unknown-source"]
        }
      ]
    }),
  /comms_projection_groups_invalid/
);

assert.throws(
  () =>
    validateCommsAuthorizedProjection({
      ...projection,
      impact: projection.impact.map((item) =>
        item.sourceId === "yw"
          ? { ...item, correlatedGroups: 0 }
          : item
      )
    }),
  /comms_projection_impact_mismatch/
);

const core = source("lib/comms-complementary-plane.ts");
for (const token of [
  "COMMS_COMPLEMENTARY_PLANE_BUILD = 342",
  "fa65f23d17b21c1764f6ba416a3433ff466f3882",
  "QL-392",
  "INERT_PREVIEW",
  "AUTHORIZED_READ_MODEL",
  "PREVIEW_ONLY",
  "AUTHORIZED_READ_ONLY",
  "SUGGESTION_ONLY",
  "missingProjectionMeansZeroIncidents: false",
  "missingProjectionMeansZeroFollowUps: false",
  "messageAuthorityRemainsCommsHub: true",
  "applicationCountContribution: 0",
  "sourceCountContribution: 0"
]) {
  assert.ok(core.includes(token), "core token " + token);
}
assert.ok(!core.includes("fetch("));

const database = source("lib/comms-complementary-plane-database.ts");
for (const token of [
  "comms_plane_projection_evidence",
  "hashCommsAuthorizedProjection",
  "comms_projection_hash_mismatch",
  "HOLD_INVALID",
  "recordedProjectionState"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("insert into"));
assert.ok(!database.includes("update app."));
assert.ok(!database.includes("delete from"));

const migration = source(
  "../../db/migrations/0122_comms_complementary_plane_projection.sql"
);
for (const token of [
  "comms_plane_projection_evidence",
  "rosevear-comms-hub",
  "AUTHORIZED_READ_MODEL",
  "independent-source-verification",
  "enable row level security",
  "force row level security",
  "app.current_master_sysop_role()",
  "grant select on app.comms_plane_projection_evidence",
  "revoke insert,update,delete on app.comms_plane_projection_evidence"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}

const api = source("app/api/comms-complementary-plane/route.ts");
assert.ok(api.includes("export async function GET()"));
assert.ok(!api.includes("export async function POST"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("api.comms-complementary-plane.get"));

const page = source("app/comms-complementary-plane/page.tsx");
for (const token of [
  "Comms Hub Complementary Plane",
  "Complementary plane, not a seventh application.",
  "This does not mean there are zero incidents.",
  "SUGGESTION_ONLY",
  "Authority remains in Comms Hub."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const commandCenter = source("lib/master-shell-command-center.ts");
for (const token of [
  "listCommsComplementaryPlaneForUser",
  'area: "Applications" | "IT" | "Management" | "Comms"',
  'id: "comms:projection"',
  'id: "comms:attention"',
  "commsHubIsComplementaryPlane: true",
  "commsHubApplicationCountContribution: 0",
  "commsHubSourceCountContribution: 0"
]) {
  assert.ok(commandCenter.includes(token), "command center token " + token);
}

const commandPage = source("app/master-shell-command-center/page.tsx");
assert.ok(commandPage.includes('href="/comms-complementary-plane"'));
assert.ok(commandPage.includes('id="comms"'));
assert.ok(
  commandPage.includes("application-count contribution")
);

const navigation = source("lib/application-navigation.ts");
const shell = source("app/application-shell.tsx");
assert.ok(
  navigation.includes('href: "/comms-complementary-plane"')
);
assert.ok(shell.includes('href="/comms-complementary-plane"'));

const dbSpine = source(
  "scripts/verify-ci-integration-spine-database.ts"
);
assert.ok(
  (dbSpine.match(/"comms_plane_projection_evidence"/g) ?? [])
    .length >= 2
);
assert.ok(
  dbSpine.includes(
    '"0122_comms_complementary_plane_projection.sql"'
  )
);
assert.ok(
  dbSpine.includes(
    "Comms complementary-plane projection evidence must be runtime read-only"
  )
);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build342-review.json")
);
assert.equal(review.build, 342);
assert.equal(review.sourceBaseline.release, "QL-392");
assert.equal(review.sourceBaseline.sourceMode, "INERT_PREVIEW");
assert.equal(review.relationship.applicationCountContribution, 0);
assert.equal(review.relationship.sourceCountContribution, 0);
assert.equal(review.projection.runtimeWriteAllowed, false);
assert.equal(review.projection.canonicalHashVerified, true);
assert.equal(
  review.projection.missingProjectionMeansZeroIncidents,
  false
);
assert.deepEqual(review.persistence.runtimePrivileges, ["SELECT"]);
assert.deepEqual(review.surfaces.apiMethods, ["GET"]);
assert.equal(review.nextQueuedBuild, 343);

const docs = source(
  "../../docs/BUILD_342_COMMS_COMPLEMENTARY_PLANE_READ_MODELS.md"
);
assert.ok(
  docs.includes(
    "Build 343 — Cross-Application Interaction Trace, Dependency Graph & Failure Propagation"
  )
);
assert.ok(
  docs.includes(
    "QL-392 is production software, but its current incident examples are explicitly synthetic"
  )
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 341 — Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 342 — Comms Hub Complementary Plane Integration & Incident/Follow-Up Read Models** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 343 — Cross-Application Interaction Trace, Dependency Graph & Failure Propagation"
  )
);

const previousVerifier = source(
  "scripts/verify-build-341-outer-sysop-navigation.ts"
);
assert.ok(
  previousVerifier.includes(
    "Build 341 — Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation** — Production"
  )
);

const response = source(
  "../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md"
);
const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(
  response.includes(
    "Build 342 contribution — Stage D Comms complementary plane"
  )
);
assert.ok(
  architecture.includes(
    "Build 342 — Comms complementary-plane read architecture"
  )
);
assert.ok(
  security.includes(
    "Build 342 Comms complementary-plane security boundary"
  )
);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-342-comms-complementary-plane.ts";
assert.equal(pkg.scripts["verify:build342"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-341-outer-sysop-navigation.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-342-comms-complementary-plane.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-342-comms-complementary-plane.ts"
  ) < String(pkg.scripts.build).indexOf(
    "run-production-migrations.ts"
  )
);

console.log(
  "Build 342 Comms Hub Complementary Plane Integration & Incident/Follow-Up Read Models verification passed."
);
