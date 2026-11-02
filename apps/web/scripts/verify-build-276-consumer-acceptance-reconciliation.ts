import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildConsumerAcceptanceReconciliation } from "../lib/consumer-acceptance-reconciliation";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 276 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const workspaceId = "27600000-0000-4000-8000-000000000001";
  const live = buildConsumerAcceptanceReconciliation({
    generatedAt: "2026-11-02T18:00:00.000Z",
    configurations: [
      { target: "rosie-dazzlers", configured: true },
      { target: "devil-n-dove", configured: false }
    ],
    events: [
      {
        workspaceId,
        workspaceName: "Acceptance workspace",
        role: "owner",
        target: "rosie-dazzlers",
        transportMode: "conformance",
        eventType: "delivery-accepted",
        validationCode: "valid",
        details: { dryRun: true, liveMutationEnabled: false }
      },
      {
        workspaceId,
        workspaceName: "Acceptance workspace",
        role: "owner",
        target: "rosie-dazzlers",
        transportMode: "conformance",
        eventType: "delivery-rejected",
        validationCode: "duplicate",
        details: { dryRun: true }
      },
      {
        workspaceId,
        workspaceName: "Acceptance workspace",
        role: "owner",
        target: "rosie-dazzlers",
        transportMode: "live",
        eventType: "delivery-accepted",
        validationCode: "dry-run-valid",
        details: { dryRun: true }
      },
      {
        workspaceId,
        workspaceName: "Acceptance workspace",
        role: "owner",
        target: "rosie-dazzlers",
        transportMode: "live",
        eventType: "transport-error",
        validationCode: "consumer-timeout",
        details: { dryRun: true }
      }
    ],
    receipts: [
      {
        workspaceId,
        target: "rosie-dazzlers",
        transportMode: "live",
        receiptStatus: "accepted",
        dryRun: true
      },
      {
        workspaceId,
        target: "rosie-dazzlers",
        transportMode: "live",
        receiptStatus: "accepted",
        dryRun: false
      }
    ],
    liveDeliveries: [
      {
        workspaceId,
        status: "accepted",
        attemptCount: 2,
        replayKey: "replay-276",
        idempotencyKey: "replay-276",
        acknowledgement: {
          status: "accepted",
          code: "valid",
          receivedAt: "2026-11-02T17:59:00.000Z"
        }
      }
    ],
    activations: [
      {
        workspaceId,
        status: "active",
        expired: false
      }
    ]
  });

  ensure(
    live.schema === "ai-data-platform.consumer-acceptance-reconciliation.v1",
    "schema"
  );
  ensure(live.build === 276, "build number");
  ensure(live.exitCriterion.met === true, "controlled-live exit criterion");
  ensure(live.totals.conformanceAccepts === 1, "conformance acceptance");
  ensure(live.totals.liveDryRunAccepts === 1, "live dry-run acceptance");
  ensure(live.totals.controlledLiveAccepts === 1, "controlled-live acceptance");
  ensure(live.totals.replaySignals === 2, "replay evidence");
  ensure(live.totals.transportErrors === 1, "transport error retained");
  ensure(
    live.totals.controlledLiveAcceptedWithAcknowledgement === 1 &&
      live.totals.controlledLiveAcceptedMissingAcknowledgement === 0,
    "controlled-live acknowledgement coverage"
  );
  ensure(
    live.boundaries.conformanceIsLiveAuthorization === false &&
      live.boundaries.dryRunIsLiveMutation === false,
    "conformance/dry-run boundary"
  );
  ensure(
    live.boundaries.replayKeySource === "replayKey" &&
      live.boundaries.duplicateBehavior === "return-original-ack",
    "live replay contract"
  );

  const conformanceOnly = buildConsumerAcceptanceReconciliation({
    generatedAt: "2026-11-02T18:01:00.000Z",
    configurations: [{ target: "rosie-dazzlers", configured: true }],
    events: [
      {
        workspaceId,
        workspaceName: "Conformance workspace",
        role: "admin",
        target: "rosie-dazzlers",
        transportMode: "conformance",
        eventType: "delivery-accepted",
        validationCode: "valid",
        details: { dryRun: true }
      }
    ],
    receipts: [],
    liveDeliveries: [],
    activations: []
  });
  ensure(conformanceOnly.exitCriterion.met === false, "conformance cannot close live criterion");
  ensure(
    conformanceOnly.workspaces[0]?.status === "conformance-only",
    "conformance-only classification"
  );

  const [
    model,
    database,
    page,
    api,
    nav,
    pkg,
    doc,
    statusRaw,
    queue,
    controlledLive
  ] = await Promise.all([
    source("lib/consumer-acceptance-reconciliation.ts"),
    source("lib/consumer-acceptance-reconciliation-database.ts"),
    source("app/integration-delivery/page.tsx"),
    source("app/api/integrations/reconciliation/route.ts"),
    source("lib/application-navigation.ts"),
    source("package.json"),
    source("../../docs/BUILD_276_CONSUMER_ACCEPTANCE_REPLAY_DELIVERY_RECEIPT_RECONCILIATION.md"),
    source("../../docs/integration/ql266-ai-data-platform-build276-review.json"),
    source("../../docs/NEXT_BUILDS_273_280.md"),
    source("lib/controlled-live-delivery.ts")
  ]);

  ensure(
    database.includes("integration_delivery_events") &&
      database.includes("limit 500") &&
      database.includes("listControlledLiveDeliveryForUser"),
    "bounded durable evidence sources"
  );
  ensure(
    model.includes('"conformance-only"') &&
      model.includes('"dry-run-only"') &&
      model.includes('"live-evidence"'),
    "separate evidence classes"
  );
  ensure(
    model.includes('liveAcceptanceSource: "workspace_publication_live_deliveries"'),
    "controlled-live source boundary"
  );
  ensure(
    !model.includes("fetch(") &&
      !database.includes("fetch(") &&
      !api.includes("fetch("),
    "reconciliation performs no network request"
  );
  ensure(
    page.includes("Build 276") &&
      page.includes("Consumer Acceptance, Replay &amp; Delivery Receipt Reconciliation"),
    "Build 276 page"
  );
  ensure(
    page.includes("Conformance acceptance is contract evidence only") &&
      page.includes("Only the controlled-live ledger counts as live acceptance"),
    "UI live-authorization distinction"
  );
  ensure(
    page.includes("/api/integrations/reconciliation") &&
      api.includes("buildConsumerAcceptanceReconciliationForUser") &&
      api.includes('status: 401'),
    "authenticated reconciliation API"
  );
  ensure(nav.includes('label: "Consumer Acceptance"'), "navigation");
  ensure(
    pkg.includes("verify-build-276-consumer-acceptance-reconciliation.ts"),
    "verifier registered"
  );
  ensure(
    controlledLive.includes('idempotency.keySource !== "replayKey"') &&
      controlledLive.includes('idempotency.duplicateBehavior !== "return-original-ack"'),
    "existing controlled-live replay contract retained"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 276, "status build");
  ensure(
    status.consumer_acceptance_reconciliation.conformance_acceptance_separate === true &&
      status.consumer_acceptance_reconciliation.live_dry_run_acceptance_separate === true,
    "status evidence separation"
  );
  ensure(
    status.consumer_acceptance_reconciliation.synthetic_delivery === false &&
      status.consumer_acceptance_reconciliation.automatic_replay === false &&
      status.consumer_acceptance_reconciliation.automatic_receipt_creation === false,
    "no synthetic delivery/replay/receipt"
  );
  ensure(
    status.authorization.rls_preserved === true &&
      status.authorization.live_transport_gate_bypass === false,
    "authorization boundary"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 277, "next build");

  ensure(
    doc.includes("Conformance success and live dry-run success are never counted as controlled-live acceptance"),
    "documentation live-acceptance distinction"
  );
  ensure(
    doc.includes("Build 277 — Retention Cleanup Readiness & Storage Budget Reconciliation"),
    "next build documentation"
  );
  ensure(
    queue.includes("Build 276 — Consumer Acceptance, Replay & Delivery Receipt Reconciliation") &&
      queue.includes("Build 277 — Retention Cleanup Readiness & Storage Budget Reconciliation"),
    "queue continuity"
  );

  console.log(
    "Build 276 consumer acceptance, replay and delivery receipt reconciliation verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
