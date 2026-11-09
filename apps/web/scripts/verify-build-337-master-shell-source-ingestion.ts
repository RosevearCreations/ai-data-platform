import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  canAdvanceRegistryFromNormalizedUpdate,
  mapWebhookSourceToMasterShellSource,
  MASTER_SHELL_INGESTION_EVENT_TYPES,
  normalizeMasterShellSourceUpdate
} from "../lib/master-shell-source-ingestion-core";
import {
  masterShellPayloadHash
} from "../lib/master-shell-contract-v1";

const root = resolve(process.cwd());
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

assert.deepEqual([...MASTER_SHELL_INGESTION_EVENT_TYPES], [
  "source.health.reported",
  "release.promoted",
  "module.readiness.changed",
  "audit.evidence.recorded"
]);
assert.equal(mapWebhookSourceToMasterShellSource("yard-workers"), "yw");
assert.equal(mapWebhookSourceToMasterShellSource("icamp"), "icamp");
assert.throws(
  () => mapWebhookSourceToMasterShellSource("rosevear-comms-hub"),
  /master_shell_ingestion_comms_control_plane_not_source/
);

function envelope(input?: {
  tenantId?: string | null;
  audience?: string[];
  eventType?: string;
  payload?: Record<string, unknown>;
  verificationState?: string;
}) {
  const payload =
    input?.payload ??
    {
      expiresAt: "2026-11-09T05:00:00.000Z",
      registryStatus: "DISCOVERED",
      manifestURI: null,
      capabilityVersion: null,
      approvedOrigin: null,
      rolesAllowed: [],
      holdReason: null,
      testEvidenceURI: null,
      connectionEvidenceURI: null
    };
  return {
    eventId: "evt_123456789012",
    schema: "rosevear.master-shell.event.v1",
    schemaVersion: "1.0.0",
    sourceId: "yw",
    sourceRevision: "abc123",
    shellId: "yard-workers",
    tenantId:
      input?.tenantId === undefined
        ? "rosevear-landscaping"
        : input.tenantId,
    eventType:
      input?.eventType ?? "source.health.reported",
    occurredAt: "2026-11-09T03:00:00.000Z",
    publishedAt: "2026-11-09T03:00:01.000Z",
    sourceSequence: 7,
    correlationId: "corr_123456789012",
    causationId: null,
    idempotencyKey: "source-update:yw:7",
    sensitivity: "internal",
    audience: input?.audience ?? ["ai-data-platform"],
    evidenceURI: "urn:rosevear:evidence:build337-source",
    verificationState:
      input?.verificationState ?? "independently-verified",
    payloadHash: masterShellPayloadHash(payload),
    payload
  };
}

const normalized = normalizeMasterShellSourceUpdate({
  transportSourceApplicationId: "yard-workers",
  transportTenantId: "rosevear-landscaping",
  envelope: envelope(),
  now: new Date("2026-11-09T04:00:00.000Z")
});
assert.equal(normalized.sourceId, "yw");
assert.equal(normalized.freshness, "fresh");
assert.equal(normalized.eventType, "source.health.reported");
assert.equal(canAdvanceRegistryFromNormalizedUpdate(normalized), true);

const stale = normalizeMasterShellSourceUpdate({
  transportSourceApplicationId: "yard-workers",
  transportTenantId: "rosevear-landscaping",
  envelope: envelope({
    payload: {
      expiresAt: "2026-11-09T03:30:00.000Z",
      registryStatus: "DISCOVERED",
      manifestURI: null,
      capabilityVersion: null,
      approvedOrigin: null,
      rolesAllowed: [],
      holdReason: null,
      testEvidenceURI: null,
      connectionEvidenceURI: null
    }
  }),
  now: new Date("2026-11-09T04:00:00.000Z")
});
assert.equal(stale.freshness, "stale");
assert.equal(canAdvanceRegistryFromNormalizedUpdate(stale), false);

assert.throws(
  () =>
    normalizeMasterShellSourceUpdate({
      transportSourceApplicationId: "yard-workers",
      transportTenantId: "wrong-tenant",
      envelope: envelope()
    }),
  /master_shell_ingestion_tenant_mismatch/
);
assert.throws(
  () =>
    normalizeMasterShellSourceUpdate({
      transportSourceApplicationId: "yard-workers",
      transportTenantId: "rosevear-landscaping",
      envelope: envelope({ audience: ["rosevear-suite-owner"] })
    }),
  /master_shell_ingestion_audience_denied/
);
assert.throws(
  () =>
    normalizeMasterShellSourceUpdate({
      transportSourceApplicationId: "yard-workers",
      transportTenantId: "rosevear-landscaping",
      envelope: envelope({
        eventType: "incident.opened",
        payload: {
          expiresAt: "2026-11-09T05:00:00.000Z"
        }
      })
    }),
  /master_shell_ingestion_event_type_unsupported/
);

const releasePayload = {
  expiresAt: "2026-11-09T06:00:00.000Z",
  releaseId: "build-337",
  branch: "main",
  deploymentStatus: "GREEN",
  evidenceURI: "urn:rosevear:evidence:build337-release"
};
const release = normalizeMasterShellSourceUpdate({
  transportSourceApplicationId: "yard-workers",
  transportTenantId: "rosevear-landscaping",
  envelope: envelope({
    eventType: "release.promoted",
    payload: releasePayload
  }),
  now: new Date("2026-11-09T04:00:00.000Z")
});
assert.equal(release.eventType, "release.promoted");
assert.equal(canAdvanceRegistryFromNormalizedUpdate(release), false);

const migration = source(
  "../../db/migrations/0119_master_shell_source_update_ingestion.sql"
);
for (const token of [
  "master_shell_source_updates",
  "webhook_receipt_id",
  "transport_secret_fingerprint_sha256",
  "transport_identity_verified",
  "source_sequence",
  "sequence_state",
  "idempotency_key",
  "unique (webhook_receipt_id)",
  "unique (source_id, source_sequence)",
  "unique (source_id, idempotency_key)",
  "enable row level security",
  "grant select, insert",
  "revoke update, delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.includes("grant update"));
assert.ok(!migration.includes("grant delete"));

const database = source("lib/master-shell-source-ingestion-database.ts");
for (const token of [
  "ingestMasterShellWebhookReceipt",
  "listMasterShellSourceIngestionForUser",
  "signWebhookReceipt",
  "decodeWebhookSecret",
  "timingSafeEqual",
  "transportSecretFingerprint",
  "master-shell.source-update",
  "duplicate_suppressed",
  "out-of-order",
  "currentActiveTransportRequiredForRegistryProjection",
  "ownerAcceptanceRequiredForRegistryProjection"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(database.includes("secret.fill(0)"));
assert.ok(database.includes("row.enabled === true"));
assert.ok(database.includes("row.revoked_at === null"));
assert.ok(!database.includes("fetch("));

const api = source("app/api/master-shell-ingestion/route.ts");
for (const token of [
  "authentication_required",
  "ingest-webhook-receipt",
  "acceptRegistryState",
  "MAX_BODY_BYTES",
  "api.master-shell-ingestion.get",
  "api.master-shell-ingestion.post",
  "Cache-Control"
]) {
  assert.ok(api.includes(token), "API token " + token);
}

const page = source("app/master-shell-ingestion/page.tsx");
for (const token of [
  "Source Update Ingestion &amp; Provenance",
  "Read-only by design.",
  "Normalized provenance ledger",
  "Webhook Gateway",
  "Source Registry"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const consoleSource = source(
  "app/master-shell-ingestion/IngestionConsole.tsx"
);
assert.ok(consoleSource.includes("Normalize only"));
assert.ok(
  consoleSource.includes(
    "Normalize + accept qualifying state"
  )
);
assert.ok(
  consoleSource.includes(
    "Normalization and state acceptance are separate actions."
  )
);

const navigation = source("lib/application-navigation.ts");
const operatorTools = source("lib/module-operator-tools.ts");
const registryPage = source("app/master-shell-registry/page.tsx");
assert.ok(navigation.includes('href: "/master-shell-ingestion"'));
assert.ok(operatorTools.includes('"/master-shell-ingestion"'));
assert.ok(registryPage.includes('href="/master-shell-ingestion"'));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build337-review.json")
);
assert.equal(review.build, 337);
assert.equal(review.transport.acceptedReceiptRequired, true);
assert.equal(review.transport.receiptSignatureReverified, true);
assert.equal(review.safety.sourceMutationPerformed, false);
assert.equal(review.safety.outboundDeliveryPerformed, false);
assert.equal(review.safety.staleAdvancesRegistry, false);
assert.equal(review.nextQueuedBuild, 338);

const docs = source(
  "../../docs/BUILD_337_READ_ONLY_SOURCE_UPDATE_INGESTION_PROVENANCE.md"
);
assert.ok(
  docs.includes(
    "Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring"
  )
);
assert.ok(
  docs.includes(
    "Normalize stores a read-only provenance"
  ) ||
  docs.includes(
    "Normalization and registry acceptance are separate"
  )
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 336 — Six-Source Registry, Freshness & Source State Machine** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 337 — Read-Only Source Update Ingestion & Provenance Normalization** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring"
  )
);

const response = source(
  "../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md"
);
assert.ok(
  response.includes(
    "Build 337 contribution — read-only source update ingestion"
  )
);

const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(
  architecture.includes(
    "Build 337 — Read-Only Source Update Ingestion & Provenance Normalization"
  )
);
assert.ok(
  security.includes("Build 337 read-only source-ingestion security")
);

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(
  (dbSpine.match(/master_shell_source_updates/g) ?? []).length >= 2
);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-337-master-shell-source-ingestion.ts";
assert.equal(pkg.scripts["verify:build337"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-336-master-shell-source-registry.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-337-master-shell-source-ingestion.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-337-master-shell-source-ingestion.ts"
  ) < String(pkg.scripts.build).indexOf(
    "run-production-migrations.ts"
  )
);

console.log(
  "Build 337 Read-Only Source Update Ingestion & Provenance Normalization verification passed."
);
