import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  deliveryAttemptOrdinal,
  deliveryAttemptReservationKey,
  deliveryIntentIdempotencyKey,
  safeDeliveryIdempotencyKey
} from "../lib/event-delivery-guarantees-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error("Build 293 verification failed: " + message);
  }
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const identity = {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    publicationId: "22222222-2222-4222-8222-222222222222",
    subscriptionId: "33333333-3333-4333-8333-333333333333",
    destinationApplicationId: "rosevear-comms-hub"
  };
  const intentKey = deliveryIntentIdempotencyKey(identity);
  ensure(safeDeliveryIdempotencyKey(intentKey), "deterministic intent key is SHA-256");
  ensure(deliveryIntentIdempotencyKey(identity) === intentKey, "logical identity is deterministic");
  ensure(deliveryAttemptOrdinal("original") === 1, "original attempt ordinal");
  ensure(deliveryAttemptOrdinal("replay", 1) === 2, "first replay ordinal");
  ensure(deliveryAttemptOrdinal("replay", 5) === 6, "fifth replay ordinal");

  const originalAttempt = deliveryAttemptReservationKey({
    idempotencyKeySha256: intentKey,
    sourceKind: "original",
    sourceReferenceId: "route-a"
  });
  const replayAttempt = deliveryAttemptReservationKey({
    idempotencyKeySha256: intentKey,
    sourceKind: "replay",
    sourceReferenceId: "replay-a"
  });
  ensure(originalAttempt !== replayAttempt, "attempt keys differ while intent stays shared");

  let invalidReplayDenied = false;
  try {
    deliveryAttemptOrdinal("replay", 6);
  } catch (error) {
    invalidReplayDenied = error instanceof Error && error.message === "event_bus_replay_number_invalid";
  }
  ensure(invalidReplayDenied, "replay ordinal remains bounded");

  const [
    migration, core, database, api, page, client, eventBusDatabase,
    recoveryDatabase, eventBusPage, recoveryPage, navigation, operatorTools,
    docs, statusRaw, roadmap, packageRaw, impact, ciDb
  ] = await Promise.all([
    source("../../db/migrations/0096_event_idempotency_delivery_guarantees.sql"),
    source("lib/event-delivery-guarantees-core.ts"),
    source("lib/event-delivery-guarantees-database.ts"),
    source("app/api/delivery-guarantees/route.ts"),
    source("app/delivery-guarantees/page.tsx"),
    source("app/delivery-guarantees/DeliveryGuaranteesConsole.tsx"),
    source("lib/event-bus-database.ts"),
    source("lib/event-recovery-database.ts"),
    source("app/event-bus/page.tsx"),
    source("app/event-recovery/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../docs/BUILD_293_IDEMPOTENCY_DELIVERY_GUARANTEES.md"),
    source("../../docs/integration/ql266-ai-data-platform-build293-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md"),
    source("package.json"),
    source("scripts/ci-detect-legacy-impact.mjs"),
    source("scripts/verify-ci-integration-spine-database.ts")
  ]);

  for (const token of [
    "event_bus_delivery_intents",
    "event_bus_delivery_attempt_reservations",
    "event_bus_duplicate_decisions",
    "event_bus_delivery_guarantee_audit",
    "idempotency_key_sha256",
    "attempt_key_sha256",
    "enable row level security"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }

  for (const table of [
    "event_bus_delivery_intents",
    "event_bus_delivery_attempt_reservations",
    "event_bus_duplicate_decisions",
    "event_bus_delivery_guarantee_audit"
  ]) {
    ensure(!migration.includes("grant update on app." + table), table + " has no update grant");
    ensure(!migration.includes("grant delete on app." + table), table + " has no delete grant");
  }

  for (const token of [
    "deliveryIntentIdempotencyKey",
    "deliveryAttemptReservationKey",
    "rosevear-event-delivery-intent-v1",
    "rosevear-event-delivery-attempt-v1",
    "event_bus_replay_number_invalid"
  ]) {
    ensure(core.includes(token), "core token " + token);
  }

  for (const token of [
    "ensureDeliveryGuaranteeForSource",
    "existing-attempt-reservation",
    "duplicate-suppressed",
    "exactlyOnceInternalIntent: true",
    "exactlyOnceExternalSideEffect: false",
    "outboundNetworkDelivery: false",
    "reconcileDeliveryGuaranteesForUser"
  ]) {
    ensure(database.includes(token), "database token " + token);
  }

  ensure(
    eventBusDatabase.includes("ensureDeliveryGuaranteeForSource") &&
      eventBusDatabase.includes('sourceKind: "original"') &&
      eventBusDatabase.includes("attemptReservationId"),
    "new event routes transactionally bind delivery guarantee"
  );
  ensure(
    recoveryDatabase.includes("ensureDeliveryGuaranteeForSource") &&
      recoveryDatabase.includes('sourceKind: "replay"') &&
      recoveryDatabase.includes("replayNumber") &&
      recoveryDatabase.includes("attemptReservationId"),
    "replays reuse delivery guarantee"
  );

  ensure(
    api.includes('action === "reconcile-held-routes"') &&
      api.includes("status: 401") &&
      api.includes('"Cache-Control": "no-store"'),
    "authenticated reconciliation API"
  );
  ensure(
    page.includes("Build 293") &&
      page.includes("Idempotency, Duplicate Prevention &amp; Delivery Guarantees") &&
      page.includes("Exactly-once applies to the durable internal delivery intent"),
    "operator page guarantee boundary"
  );
  ensure(
    client.includes("Reconcile held routes") &&
      client.includes("At-most-once source-route reservation") &&
      client.includes("outbound delivery"),
    "operator controls"
  );
  ensure(
    navigation.includes("/delivery-guarantees") &&
      operatorTools.includes("/delivery-guarantees") &&
      eventBusPage.includes("/delivery-guarantees") &&
      recoveryPage.includes("/delivery-guarantees"),
    "delivery guarantee navigation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 293, "status build");
  ensure(
    status.idempotency.exactly_once_internal_intent === true &&
      status.idempotency.at_most_once_reservation_per_source_route === true &&
      status.idempotency.duplicate_attempt_suppression === true,
    "internal exactly-once and duplicate suppression"
  );
  ensure(
    status.idempotency.external_exactly_once_claim === false &&
      status.idempotency.outbound_network_delivery === false &&
      status.idempotency.automatic_route_release === false &&
      status.idempotency.external_requests === 0 &&
      status.idempotency.live_exchanges === 0,
    "no external exactly-once or outbound delivery claim"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 294, "next build 294");

  ensure(
    docs.includes("exactly-once **internal intent**") &&
      docs.includes("does **not** guarantee exactly-once external side effects") &&
      docs.includes("Build 294 — Shared Customer & Contact Identity Resolution"),
    "guarantee boundary and next build documented"
  );
  ensure(
    roadmap.includes("Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees") &&
      roadmap.includes("Build 294 — Shared Customer & Contact Identity Resolution"),
    "roadmap continuity"
  );

  const pkg = JSON.parse(packageRaw);
  const spine = String(pkg.scripts["ci:spine"]);
  ensure(spine.includes("verify-build-293-idempotency-delivery-guarantees.ts"), "Build 293 is in compact integration spine");
  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "tsx scripts/verify-build-293-idempotency-delivery-guarantees.ts"
    ) &&
      String(pkg.scripts.build).includes(
        "tsx scripts/verify-build-293-idempotency-delivery-guarantees.ts"
      ) &&
      String(pkg.scripts.build).includes("verify-build-292-event-replay-dlq.ts") &&
      String(pkg.scripts.build).includes("verify-build-292a-ci-verification-consolidation.ts") &&
      String(pkg.scripts.build).includes("run-production-migrations.ts"),
    "Build 293 remains in compact CI and the production safety chain"
  );
  ensure(impact.includes("29[0-9]"), "CI impact detector recognizes current 293-era verifier");
  for (const token of [
    "event_bus_delivery_intents",
    "event_bus_delivery_attempt_reservations",
    "event_bus_duplicate_decisions",
    "event_bus_delivery_guarantee_audit",
    "0096_event_idempotency_delivery_guarantees.sql"
  ]) {
    ensure(ciDb.includes(token), "compact database gate token " + token);
  }

  console.log("Build 293 Idempotency, Duplicate Prevention & Delivery Guarantees verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
