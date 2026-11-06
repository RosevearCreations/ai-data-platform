import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildTaskExchangeEnvelope,
  normalizeSharedTask,
  safeTaskReviewReason
} from "../lib/shared-task-exchange-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 298 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const task = normalizeSharedTask({
    sourceApplicationId: "rosiedazzlers",
    destinationApplicationId: "rosevear-comms-hub",
    canonicalTenantKey: "rosevear-main",
    sourceRecordType: "exception",
    sourceRecordId: "job-882-followup",
    taskKind: "follow-up",
    priority: "high",
    title: "Confirm customer follow-up",
    summary: "Review the governed job exception and prepare the next customer follow-up.",
    dueAt: "2026-11-07T15:00:00.000Z",
    assigneeHint: "operations"
  });

  ensure(task.taskKind === "follow-up" && task.priority === "high", "task fields normalize");
  const prepared = buildTaskExchangeEnvelope(task);
  ensure(
    prepared.envelope.state === "held" &&
    prepared.envelope.holdReason === "task-exchange-not-authorized" &&
    prepared.envelope.peerApplicationWriteRequested === false,
    "task exchange remains held without peer write"
  );

  let sameApplicationDenied = false;
  try {
    normalizeSharedTask({
      sourceApplicationId: "icamp",
      destinationApplicationId: "icamp",
      canonicalTenantKey: "camp-rosevear",
      sourceRecordType: "reservation",
      sourceRecordId: "r-42",
      taskKind: "review",
      priority: "normal",
      title: "Review reservation",
      summary: "Review one reservation."
    });
  } catch (error) {
    sameApplicationDenied =
      error instanceof Error && error.message === "task_same_application_denied";
  }
  ensure(sameApplicationDenied, "same-application exchange fails closed");
  ensure(safeTaskReviewReason("Owner reviewed the task handoff evidence."), "bounded review reason accepted");

  const [migration,core,database,api,page,client,navigation,docs,packageRaw,ciDb,v297] = await Promise.all([
    source("../../db/migrations/0101_shared_task_work_queue_exchange.sql"),
    source("lib/shared-task-exchange-core.ts"),
    source("lib/shared-task-exchange-database.ts"),
    source("app/api/shared-task-exchange/route.ts"),
    source("app/shared-task-exchange/page.tsx"),
    source("app/shared-task-exchange/SharedTaskExchangeConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_298_SHARED_TASK_WORK_QUEUE_EXCHANGE.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("scripts/verify-build-297-cross-app-notification-consent.ts")
  ]);

  for (const token of [
    "shared_task_work_items",
    "shared_task_links",
    "shared_task_exchange_packages",
    "shared_task_exchange_reviews",
    "shared_task_exchange_audit",
    "task-exchange-not-authorized",
    "peer_application_write_requested",
    "enable row level security"
  ]) ensure(migration.includes(token), "migration token " + token);

  for (const table of [
    "shared_task_work_items",
    "shared_task_links",
    "shared_task_exchange_packages",
    "shared_task_exchange_reviews",
    "shared_task_exchange_audit"
  ]) {
    ensure(!migration.includes("grant update on app." + table), table + " has no UPDATE grant");
    ensure(!migration.includes("grant delete on app." + table), table + " has no DELETE grant");
  }

  for (const token of [
    "normalizeSharedTask",
    "buildTaskExchangeEnvelope",
    "task_same_application_denied",
    "task-exchange-not-authorized",
    "peerApplicationWriteRequested: false"
  ]) ensure(core.includes(token), "core token " + token);

  for (const token of [
    "requireWorkspaceAdmin",
    "task-created",
    "task-linked",
    "package-approved-for-future-handoff",
    "peerApplicationWrites:false",
    "outboundNetworkRequests:false",
    "automaticTaskCreation:false",
    "ql266Resumed:false"
  ]) ensure(database.includes(token), "database boundary token " + token);

  ensure(
    api.includes('"create-task"') &&
    api.includes('"link-tasks"') &&
    api.includes('"prepare-package"') &&
    api.includes('"review-package"') &&
    api.includes("status:401"),
    "authenticated task exchange API"
  );

  ensure(
    page.includes("Build 298") &&
    page.includes("remain") &&
    page.includes("no peer") &&
    page.includes("does not resume QL-266"),
    "operator authorization boundary copy"
  );

  ensure(
    client.includes("Create held shared task") &&
    client.includes("Prepare held package") &&
    client.includes("Approve future handoff"),
    "operator task controls"
  );

  ensure(navigation.includes('href: "/shared-task-exchange"'), "navigation entry");
  ensure(docs.includes("Build 299") && docs.includes("no peer-application write"), "documentation and next build");

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts.build).startsWith("tsx scripts/verify-build-296-shared-media-asset-exchange.ts"),
    "Build 296 remains leading production gate"
  );
  ensure(
    String(pkg.scripts.build).includes("verify-build-297-cross-app-notification-consent.ts") &&
    String(pkg.scripts.build).includes("verify-build-298-shared-task-work-queue-exchange.ts"),
    "Build 297 and 298 gates remain wired"
  );
  ensure(
    String(pkg.scripts["ci:spine"]).includes("verify-build-298-shared-task-work-queue-exchange.ts"),
    "Build 298 is in compact integration spine"
  );

  for (const table of [
    "shared_task_work_items","shared_task_links","shared_task_exchange_packages",
    "shared_task_exchange_reviews","shared_task_exchange_audit"
  ]) ensure(ciDb.includes('"' + table + '"'), "CI DB table " + table);

  for (const migrationName of [
    "0099_shared_media_asset_exchange.sql",
    "0100_cross_app_notification_consent.sql",
    "0101_shared_task_work_queue_exchange.sql"
  ]) ensure(ciDb.includes(migrationName), "CI migration evidence " + migrationName);

  ensure(
    v297.includes("verify-build-297-cross-app-notification-consent.ts") ||
    v297.includes("Build 297 verification passed"),
    "Build 297 inherited verifier remains present"
  );

  console.log("Build 298 verification passed: shared tasks and follow-up packages remain held with no peer application write.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
