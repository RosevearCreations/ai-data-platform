import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  composeCrossApplicationInteractionTrace
} from "../lib/cross-application-interaction-trace";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const events = [
  {
    sourceId: "yw" as const,
    masterEventId: "evt_aaaaaaaaaaaa",
    eventType: "source.health.reported",
    sourceRevision: "a".repeat(40),
    sourceSequence: 1,
    sequenceState: "first" as const,
    correlationId: "corr_sharedflow001",
    causationId: null,
    evidenceURI: "urn:rosevear:evidence:yw-event",
    verificationState: "independently-verified",
    freshness: "fresh" as const,
    occurredAt: "2026-11-09T15:00:00.000Z",
    publishedAt: "2026-11-09T15:00:01.000Z",
    receivedAt: "2026-11-09T15:00:02.000Z"
  },
  {
    sourceId: "icamp" as const,
    masterEventId: "evt_bbbbbbbbbbbb",
    eventType: "module.readiness.changed",
    sourceRevision: "b".repeat(40),
    sourceSequence: 2,
    sequenceState: "out-of-order" as const,
    correlationId: "corr_sharedflow001",
    causationId: "cause_aaaaaaaaaaaa",
    evidenceURI: "urn:rosevear:evidence:icamp-event",
    verificationState: "independently-verified",
    freshness: "fresh" as const,
    occurredAt: "2026-11-09T15:01:00.000Z",
    publishedAt: "2026-11-09T15:01:01.000Z",
    receivedAt: "2026-11-09T15:01:02.000Z"
  },
  {
    sourceId: "rosiedazzlers" as const,
    masterEventId: "evt_cccccccccccc",
    eventType: "release.promoted",
    sourceRevision: "c".repeat(40),
    sourceSequence: 3,
    sequenceState: "in-order" as const,
    correlationId: "corr_singleflow01",
    causationId: null,
    evidenceURI: "urn:rosevear:evidence:rosie-event",
    verificationState: "independently-verified",
    freshness: "fresh" as const,
    occurredAt: "2026-11-09T15:02:00.000Z",
    publishedAt: "2026-11-09T15:02:01.000Z",
    receivedAt: "2026-11-09T15:02:02.000Z"
  }
];

const model = composeCrossApplicationInteractionTrace({
  ingestions: events,
  generatedAt: new Date("2026-11-09T15:10:00.000Z")
});
assert.equal(model.build, 343);
assert.equal(model.sourceCount, 6);
assert.equal(model.summary.ingestedEventsConsidered, 3);
assert.equal(model.summary.correlationGroups, 2);
assert.equal(model.summary.crossApplicationGroups, 1);
assert.equal(model.summary.dependencyEdges, 1);
assert.equal(model.summary.adverseCrossApplicationGroups, 1);
assert.deepEqual(model.dependencyEdges[0], {
  fromSourceId: "yw",
  toSourceId: "icamp",
  correlationId: "corr_sharedflow001",
  relationship: "CORRELATED_FLOW",
  direction: "UNDIRECTED",
  evidenceEventIds: ["evt_aaaaaaaaaaaa", "evt_bbbbbbbbbbbb"]
});
assert.equal(
  model.failurePropagation[0]?.candidateUpstreamSourceId,
  "icamp"
);
assert.equal(model.failurePropagation[0]?.inferenceOnly, true);
assert.equal(model.policy.correlationProvesCausation, false);
assert.equal(model.policy.inferredFailureOriginIsSourceTruth, false);
assert.equal(model.policy.missingTraceMeansNoInteraction, false);
assert.equal(model.policy.peerWritePerformed, false);

const core = source("lib/cross-application-interaction-trace.ts");
for (const token of [
  "CROSS_APPLICATION_INTERACTION_TRACE_BUILD = 343",
  "CORRELATED_FLOW",
  "UNDIRECTED",
  "OBSERVED_ADVERSE_EVIDENCE",
  "correlationProvesCausation: false",
  "inferredFailureOriginIsSourceTruth: false",
  "tenantIdentityInferredFromCorrelation: false",
  "customerIdentityInferredFromCorrelation: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}
assert.ok(!core.includes("fetch("));

const database = source(
  "lib/cross-application-interaction-trace-database.ts"
);
assert.ok(database.includes("listMasterShellSourceIngestionForUser"));
assert.ok(!database.includes("insert into"));
assert.ok(!database.includes("update app."));
assert.ok(!database.includes("delete from"));

const api = source(
  "app/api/cross-application-interaction-trace/route.ts"
);
assert.ok(api.includes("export async function GET()"));
assert.ok(!api.includes("export async function POST"));
assert.ok(api.includes("authentication_required"));

const page = source("app/cross-application-interaction-trace/page.tsx");
for (const token of [
  "Cross-Application Interaction Trace",
  "Correlation is not causation.",
  "Direction is intentionally not inferred.",
  "Inference only",
  "Read-only evidence intelligence."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(
  navigation.includes('href: "/cross-application-interaction-trace"')
);

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(
  commandCenter.includes('href="/cross-application-interaction-trace"')
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 342 — Comms Hub Complementary Plane Integration & Incident/Follow-Up Read Models** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 343 — Cross-Application Interaction Trace, Dependency Graph & Failure Propagation** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 344 — Module Health, Stuck-State, Staleness, HOLD & Blocker Intelligence"
  )
);

const docs = source(
  "../../docs/BUILD_343_CROSS_APPLICATION_INTERACTION_TRACE.md"
);
assert.ok(docs.includes("correlation does not prove causation"));
assert.ok(
  docs.includes(
    "Build 344 — Module Health, Stuck-State, Staleness, HOLD & Blocker Intelligence"
  )
);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build343-review.json")
);
assert.equal(review.build, 343);
assert.equal(review.authority.readOnly, true);
assert.equal(review.authority.peerWriteAllowed, false);
assert.equal(review.inference.correlationProvesCausation, false);
assert.equal(review.nextQueuedBuild, 344);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-343-cross-application-interaction-trace.ts";
assert.equal(pkg.scripts["verify:build343"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-342-comms-complementary-plane.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-343-cross-application-interaction-trace.ts"
    )
);

console.log(
  "Build 343 Cross-Application Interaction Trace, Dependency Graph & Failure Propagation verification passed."
);
