import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildScheduleExchangeEnvelope,
  normalizeScheduleItem,
  safeScheduleReviewReason,
  scheduleRangesOverlap
} from "../lib/shared-scheduling-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 299 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const item = normalizeScheduleItem({
    canonicalTenantKey: "rosevear-main",
    sourceApplicationId: "rosiedazzlers",
    destinationApplicationId: "rosevear-comms-hub",
    sourceRecordId: "booking-299",
    itemType: "appointment",
    title: "Customer follow-up appointment",
    status: "tentative",
    startAt: "2026-11-07T14:00:00-05:00",
    endAt: "2026-11-07T15:00:00-05:00",
    timezone: "America/Toronto",
    locationText: "Tillsonburg, Ontario",
    customerRecordId: "customer-299",
    serviceRecordId: "service-299",
    staffRecordIds: ["staff-1"],
    equipmentRecordIds: ["vehicle-1"],
    notes: "Governed scheduling test fixture."
  });

  ensure(item.contractId === "rosevear.shared.booking.v1", "Build 286 booking contract reused");
  ensure(item.contractVersion === "1.0.0", "booking contract version retained");
  const prepared=buildScheduleExchangeEnvelope(item);
  ensure(
    prepared.envelope.state==="held" &&
    prepared.envelope.holdReason==="schedule-exchange-not-authorized" &&
    prepared.envelope.peerCalendarWriteRequested===false,
    "calendar exchange remains held without peer write"
  );
  ensure(scheduleRangesOverlap(
    {startAt:"2026-11-07T14:00:00-05:00",endAt:"2026-11-07T15:00:00-05:00"},
    {startAt:"2026-11-07T14:30:00-05:00",endAt:"2026-11-07T15:30:00-05:00"}
  ),"local overlap is detected");
  ensure(!scheduleRangesOverlap(
    {startAt:"2026-11-07T14:00:00-05:00",endAt:"2026-11-07T15:00:00-05:00"},
    {startAt:"2026-11-07T15:00:00-05:00",endAt:"2026-11-07T16:00:00-05:00"}
  ),"adjacent appointments are not marked overlapping");
  ensure(safeScheduleReviewReason("Owner reviewed the scheduling evidence."),"bounded review reason accepted");

  let sameAppDenied=false;
  try {
    normalizeScheduleItem({
      canonicalTenantKey:"camp-rosevear",
      sourceApplicationId:"icamp",
      destinationApplicationId:"icamp",
      sourceRecordId:"reservation-1",
      itemType:"booking",
      title:"Same app booking",
      status:"tentative",
      startAt:"2026-11-08T10:00:00Z",
      timezone:"UTC"
    });
  } catch(error) {
    sameAppDenied=error instanceof Error && error.message==="schedule_same_application_denied";
  }
  ensure(sameAppDenied,"same-application schedule exchange fails closed");

  const [migration,core,database,api,page,client,navigation,docs,packageRaw,ciDb,v298] = await Promise.all([
    source("../../db/migrations/0102_shared_scheduling_calendar_exchange.sql"),
    source("lib/shared-scheduling-core.ts"),
    source("lib/shared-scheduling-database.ts"),
    source("app/api/shared-scheduling/route.ts"),
    source("app/shared-scheduling/page.tsx"),
    source("app/shared-scheduling/SharedSchedulingConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_299_SHARED_SCHEDULING_CALENDAR_EXCHANGE.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("scripts/verify-build-298-shared-task-work-queue-exchange.ts")
  ]);

  for (const token of [
    "shared_schedule_items",
    "shared_schedule_conflict_evidence",
    "shared_schedule_exchange_packages",
    "shared_schedule_exchange_reviews",
    "shared_schedule_exchange_audit",
    "schedule-exchange-not-authorized",
    "peer_calendar_write_requested",
    "local-held-items-only",
    "enable row level security"
  ]) ensure(migration.includes(token),"migration token "+token);

  for (const table of [
    "shared_schedule_items",
    "shared_schedule_conflict_evidence",
    "shared_schedule_exchange_packages",
    "shared_schedule_exchange_reviews",
    "shared_schedule_exchange_audit"
  ]) {
    ensure(!migration.includes("grant update on app."+table),table+" has no UPDATE grant");
    ensure(!migration.includes("grant delete on app."+table),table+" has no DELETE grant");
  }

  for (const token of [
    "rosevear.shared.booking.v1",
    "normalizeScheduleItem",
    "scheduleRangesOverlap",
    "schedule_same_application_denied",
    "schedule-exchange-not-authorized",
    "peerCalendarWriteRequested:false"
  ]) ensure(core.includes(token),"core token "+token);

  for (const token of [
    "requireWorkspaceAdmin",
    "local-held-items-only",
    "schedule_local_conflicts_require_resolution",
    "schedule-approved-for-future-handoff",
    "peerCalendarWrites:false",
    "outboundNetworkRequests:false",
    "automaticAppointmentCreation:false",
    "ql266Resumed:false"
  ]) ensure(database.includes(token),"database boundary token "+token);

  ensure(
    api.includes('"create-schedule-item"') &&
    api.includes('"prepare-package"') &&
    api.includes('"review-package"') &&
    api.includes("status:401"),
    "authenticated scheduling API actions"
  );

  ensure(
    page.includes("Build 299") &&
    page.includes("local overlap") &&
    page.includes("no peer") &&
    page.includes("does not resume QL-266"),
    "operator boundary copy"
  );

  ensure(
    client.includes("Create held schedule item") &&
    client.includes("Prepare held calendar package") &&
    client.includes("Approve future handoff") &&
    client.includes("Peer calendar writes"),
    "operator scheduling controls"
  );

  ensure(navigation.includes('href: "/shared-scheduling"'),"navigation entry");
  ensure(docs.includes("Build 300") && docs.includes("no peer-calendar write"),"documentation and next build");

  const pkg=JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts.build).startsWith("tsx scripts/verify-build-296-shared-media-asset-exchange.ts"),
    "Build 296 remains leading production gate"
  );
  for(const verifier of [
    "verify-build-297-cross-app-notification-consent.ts",
    "verify-build-298-shared-task-work-queue-exchange.ts",
    "verify-build-299-shared-scheduling-calendar-exchange.ts"
  ]) ensure(String(pkg.scripts.build).includes(verifier),"production build verifier "+verifier);
  ensure(
    String(pkg.scripts["ci:spine"]).includes("verify-build-299-shared-scheduling-calendar-exchange.ts"),
    "Build 299 is in compact integration spine"
  );

  for(const table of [
    "shared_schedule_items","shared_schedule_conflict_evidence","shared_schedule_exchange_packages",
    "shared_schedule_exchange_reviews","shared_schedule_exchange_audit"
  ]) ensure(ciDb.includes('"'+table+'"'),"CI DB table "+table);

  for(const migrationName of [
    "0099_shared_media_asset_exchange.sql",
    "0100_cross_app_notification_consent.sql",
    "0101_shared_task_work_queue_exchange.sql",
    "0102_shared_scheduling_calendar_exchange.sql"
  ]) ensure(ciDb.includes(migrationName),"CI migration evidence "+migrationName);

  ensure(v298.includes("Build 298 verification passed"),"Build 298 inherited verifier remains present");

  console.log("Build 299 verification passed: scheduling packages remain held, local conflict evidence is scoped, and no peer calendar write occurs.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
