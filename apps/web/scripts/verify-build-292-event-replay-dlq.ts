import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  EVENT_BUS_REPLAY_LIMIT,
  eventBusFailureReplayable,
  nextReplayNumber,
  safeEventBusFailureCode,
  safeRecoveryReason
} from "../lib/event-recovery-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error("Build 292 verification failed: " + message);
  }
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  ensure(eventBusFailureReplayable("transient"), "transient replayable");
  ensure(eventBusFailureReplayable("unknown"), "unknown replayable");
  ensure(!eventBusFailureReplayable("permanent"), "permanent not replayable");
  ensure(!eventBusFailureReplayable("policy"), "policy not replayable");
  ensure(EVENT_BUS_REPLAY_LIMIT === 5, "bounded replay limit");
  ensure(nextReplayNumber(0) === 1, "first replay number");
  ensure(nextReplayNumber(4) === 5, "fifth replay number");

  let limitDenied = false;
  try {
    nextReplayNumber(5);
  } catch (error) {
    limitDenied =
      error instanceof Error &&
      error.message === "event_bus_replay_limit_reached";
  }
  ensure(limitDenied, "sixth replay denied");
  ensure(safeEventBusFailureCode("delivery.timeout"), "safe failure code");
  ensure(!safeEventBusFailureCode("BAD CODE"), "unsafe failure code denied");
  ensure(
    safeRecoveryReason("Reviewed transient timeout evidence."),
    "review reason accepted"
  );

  const [
    migration,
    core,
    database,
    api,
    page,
    client,
    navigation,
    operatorTools,
    eventBusPage,
    docs,
    statusRaw,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("../../db/migrations/0095_event_replay_dead_letter_recovery.sql"),
    source("lib/event-recovery-core.ts"),
    source("lib/event-recovery-database.ts"),
    source("app/api/event-recovery/route.ts"),
    source("app/event-recovery/page.tsx"),
    source("app/event-recovery/EventRecoveryConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("app/event-bus/page.tsx"),
    source("../../docs/BUILD_292_EVENT_REPLAY_DLQ_RECOVERY.md"),
    source("../../docs/integration/ql266-ai-data-platform-build292-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md"),
    source("package.json")
  ]);

  for (const token of [
    "event_bus_delivery_failures",
    "event_bus_dead_letters",
    "event_bus_replay_requests",
    "event_bus_replay_routes",
    "event_bus_recovery_audit",
    "enable row level security",
    "recovery-replay-not-authorized",
    "replay_number between 1 and 5"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }

  for (const table of [
    "event_bus_delivery_failures",
    "event_bus_dead_letters",
    "event_bus_replay_requests",
    "event_bus_replay_routes",
    "event_bus_recovery_audit"
  ]) {
    ensure(
      !migration.includes("grant update on app." + table),
      table + " has no update grant"
    );
    ensure(
      !migration.includes("grant delete on app." + table),
      table + " has no delete grant"
    );
  }

  for (const token of [
    "EVENT_BUS_REPLAY_LIMIT = 5",
    "category === \"transient\" || category === \"unknown\"",
    "event_bus_replay_limit_reached"
  ]) {
    ensure(core.includes(token), "core token " + token);
  }

  for (const token of [
    "event_bus_dead_letter_already_open",
    "event_bus_failure_not_replayable",
    "event_bus_subscription_not_active",
    "nextReplayNumber",
    "recovery-replay-not-authorized",
    "outboundNetworkDelivery: false",
    "dead-letter-dismissed"
  ]) {
    ensure(database.includes(token), "database token " + token);
  }

  ensure(
    api.includes("record-failure") &&
      api.includes("request-replay") &&
      api.includes("dismiss-dead-letter"),
    "recovery API actions"
  );
  ensure(
    page.includes("Build 292") &&
      page.includes("Event Replay, Dead-Letter Queue &amp; Recovery Console"),
    "recovery page"
  );
  ensure(
    client.includes("Record failure &amp; dead-letter") &&
      client.includes("Create held replay") &&
      client.includes("Record disposition"),
    "recovery controls"
  );
  ensure(
    navigation.includes("/event-recovery") &&
      operatorTools.includes("/event-recovery") &&
      eventBusPage.includes("/event-recovery"),
    "recovery navigation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 292, "status build");
  ensure(
    status.recovery.append_only_failure_evidence === true &&
      status.recovery.durable_dead_letter_queue === true,
    "durable append-only recovery"
  );
  ensure(
    status.recovery.replay_limit_per_dead_letter === 5 &&
      status.recovery.replay_route_state === "held" &&
      status.recovery.replay_hold_reason ===
        "recovery-replay-not-authorized",
    "bounded held replay"
  );
  ensure(
    status.recovery.automatic_retry === false &&
      status.recovery.outbound_network_delivery === false &&
      status.recovery.external_requests === 0 &&
      status.recovery.live_exchanges === 0,
    "no automatic/outbound replay"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(
    status.next_build === "292A" &&
      status.next_roadmap_build === 293,
    "292A prioritized before 293"
  );

  ensure(
    docs.includes(
      "Build 292A — CI Verification Consolidation & Promotion Run Reduction"
    ) &&
      docs.includes(
        "Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees"
      ),
    "next build priority documented"
  );
  ensure(
    roadmap.includes(
      "Build 292 — Event Replay, Dead-Letter Queue & Recovery Console"
    ) &&
      roadmap.includes(
        "Build 292A — CI Verification Consolidation & Promotion Run Reduction"
      ),
    "roadmap includes 292A"
  );

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts.build).startsWith(
      "tsx scripts/verify-build-292-event-replay-dlq.ts"
    ),
    "Build 292 verifier gates web build"
  );

  console.log(
    "Build 292 Event Replay, Dead-Letter Queue & Recovery Console verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
