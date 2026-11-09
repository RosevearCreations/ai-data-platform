import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildAiDataMasterShellEnvelope,
  buildMasterShellContractDescriptor,
  deterministicMasterShellIdempotencyKey,
  MASTER_SHELL_EVENT_FAMILIES,
  MASTER_SHELL_SOURCE_DEFINITIONS,
  MASTER_SHELL_SOURCE_IDS,
  masterShellPayloadHash,
  MasterShellContractError,
  parseMasterShellEventEnvelope
} from "../lib/master-shell-contract-v1";

const root = resolve(process.cwd());
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

const descriptor = buildMasterShellContractDescriptor(
  "2026-11-08T20:00:00.000Z"
);
assert.equal(descriptor.build, 335);
assert.equal(descriptor.contractVersion, "1.0.0");
assert.equal(descriptor.sourceApplications.length, 6);
assert.deepEqual([...MASTER_SHELL_SOURCE_IDS], [
  "yw",
  "icamp",
  "rosiedazzlers",
  "devilndove",
  "ai-data-platform",
  "rosevear-ai-hub"
]);
assert.equal(
  descriptor.sourceApplications.some(
    (item) => item.sourceId === "rosevear-comms-hub"
  ),
  false
);
assert.deepEqual([...MASTER_SHELL_EVENT_FAMILIES], [
  "source.health.reported",
  "release.promoted",
  "module.readiness.changed",
  "incident.opened",
  "incident.updated",
  "consent.changed",
  "workflow.status.changed",
  "audit.evidence.recorded"
]);
assert.equal(
  MASTER_SHELL_SOURCE_DEFINITIONS.find((item) => item.sourceId === "yw")?.shellId,
  "yard-workers"
);
assert.equal(
  MASTER_SHELL_SOURCE_DEFINITIONS.find((item) => item.sourceId === "yw")?.legacyInternalId,
  "yard-workers"
);

const payload = {
  commit: "a08e9bb3277d87bc",
  branch: "main",
  ciResult: "GREEN"
};
const payloadHash = masterShellPayloadHash(payload);
assert.match(payloadHash, /^[a-f0-9]{64}$/);

const idempotency = deterministicMasterShellIdempotencyKey({
  sourceId: "ai-data-platform",
  sourceRevision: "a08e9bb3277d87bc",
  sourceSequence: 7,
  eventType: "release.promoted",
  payloadHash
});
assert.equal(
  idempotency,
  deterministicMasterShellIdempotencyKey({
    sourceId: "ai-data-platform",
    sourceRevision: "a08e9bb3277d87bc",
    sourceSequence: 7,
    eventType: "release.promoted",
    payloadHash
  })
);

const envelope = buildAiDataMasterShellEnvelope({
  sourceRevision: "a08e9bb3277d87bc",
  sourceSequence: 7,
  eventType: "release.promoted",
  occurredAt: "2026-11-08T20:00:00.000Z",
  publishedAt: "2026-11-08T20:00:01.000Z",
  correlationId: "corr_123456789012",
  causationId: null,
  sensitivity: "internal",
  audience: ["rosevear-suite-owner", "rosevear-comms-hub"],
  evidenceURI: "urn:rosevear:evidence:build335-release",
  verificationState: "reported",
  payload
});
assert.equal(envelope.sourceId, "ai-data-platform");
assert.equal(envelope.shellId, "ai-data-platform");
assert.equal(envelope.correlationId, "corr_123456789012");
assert.equal(envelope.causationId, null);
assert.equal(envelope.payloadHash, payloadHash);
assert.equal(parseMasterShellEventEnvelope(envelope).eventId, envelope.eventId);

function expectCode(value: unknown, code: string) {
  let caught: unknown = null;
  try {
    parseMasterShellEventEnvelope(value);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof MasterShellContractError);
  assert.equal(caught.code, code);
}

expectCode(
  { ...envelope, shellId: "yard-workers" },
  "master_shell_shell_identity_mismatch"
);
expectCode(
  { ...envelope, payloadHash: "0".repeat(64) },
  "master_shell_payload_hash_mismatch"
);
expectCode(
  { ...envelope, unexpected: true },
  "master_shell_event_shape_invalid"
);
expectCode(
  { ...envelope, audience: ["unknown-audience"] },
  "master_shell_audience_invalid"
);
expectCode(
  {
    ...envelope,
    publishedAt: "2026-11-08T19:59:59.000Z"
  },
  "master_shell_event_time_order_invalid"
);

const eventSchema = JSON.parse(
  source("../../docs/contracts/rosevear-master-shell-event-v1.schema.json")
);
const registrySchema = JSON.parse(
  source("../../docs/contracts/rosevear-master-shell-registry-v1.schema.json")
);
assert.equal(eventSchema.properties.schema.const, "rosevear.master-shell.event.v1");
assert.deepEqual(eventSchema.properties.sourceId.enum, [...MASTER_SHELL_SOURCE_IDS]);
assert.equal(eventSchema.additionalProperties, false);
assert.equal(Array.isArray(eventSchema.allOf), true);
assert.equal(registrySchema.properties.contractVersion.const, "1.0.0");
assert.equal(registrySchema.required.includes("signerFingerprint"), true);
assert.equal(registrySchema.required.includes("statusExpiresAt"), true);

const api = source("app/api/master-shell-contract-v1/route.ts");
for (const token of [
  "authentication_required",
  "validate-event",
  "MAX_VALIDATION_BYTES",
  "parseMasterShellEventEnvelope",
  "persisted: false",
  "sourceConnectivityInferred: false",
  "api.master-shell-contract-v1.get",
  "api.master-shell-contract-v1.post"
]) {
  assert.ok(api.includes(token), "API token " + token);
}

const page = source("app/master-shell-contracts/page.tsx");
for (const token of [
  "Correlation &amp; Standard Event Envelope",
  "Six source shells",
  "Required provenance fields",
  "Master Shell V1 event vocabulary",
  "not a seventh child source",
  "missing evidence remains UNKNOWN or HOLD"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/master-shell-contracts"'));
assert.ok(navigation.includes('label: "Master Shell Contract V1"'));

const eventBusPage = source("app/event-bus/page.tsx");
assert.ok(eventBusPage.includes('href="/master-shell-contracts"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/master-shell-contracts"'));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build335-review.json")
);
assert.equal(review.build, 335);
assert.equal(review.eventContract.exactSixSourceIds.length, 6);
assert.equal(review.eventContract.commsHubControlPlaneNotSeventhSource, true);
assert.equal(review.safety.eventIngestionImplemented, false);
assert.equal(review.safety.sourceConnectivityInferred, false);
assert.equal(review.nextQueuedBuild, 336);

const docs = source(
  "../../docs/BUILD_335_MASTER_SHELL_CONTRACT_V1_CORRELATION_EVENT_ENVELOPE.md"
);
assert.ok(
  docs.includes(
    "Build 336 — Six-Source Registry, Freshness & Source State Machine"
  )
);
assert.ok(docs.includes("source-update ingestion remains Build 337"));

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
for (const token of [
  "Build 335 — Master Shell Contract V1, Correlation IDs & Standard Event Envelope",
  "Build 336 — Six-Source Registry, Freshness & Source State Machine",
  "Build 337 — Read-Only Source Update Ingestion & Provenance Normalization",
  "Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring",
  "Build 350 — Production Learning VIII, Master Shell Acceptance & Next Roadmap Renewal"
]) {
  assert.ok(roadmap.includes(token), "roadmap token " + token);
}
assert.ok(
  roadmap.includes(
    "Rosevear Comms Hub remains the complementary communications/control plane rather than a seventh child source"
  )
);

const response = source(
  "../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md"
);
assert.ok(response.includes("Build 335 contribution — Stage A contract foundation"));
assert.ok(response.includes("Build 337 remains responsible for read-only source update ingestion"));

const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(
  architecture.includes(
    "Build 335 — Master Shell Contract V1, Correlation IDs & Standard Event Envelope"
  )
);
assert.ok(security.includes("Build 335 Master Shell V1 contract security"));

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-335-master-shell-contract-v1.ts";
assert.equal(String(pkg.scripts["verify:build335"]), verifier);
assert.ok(String(pkg.scripts.build).includes(verifier));
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-334-api-database-dependency-performance-observatory.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-335-master-shell-contract-v1.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-335-master-shell-contract-v1.ts"
  ) < String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 335 Master Shell Contract V1, Correlation IDs & Standard Event Envelope verification passed."
);
