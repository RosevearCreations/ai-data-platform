import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  SHARED_COORDINATION_MODULE_VERSION,
  prepareNotificationModuleRequest,
  prepareScheduleModuleRequest,
  prepareTaskFollowUpModuleRequest,
  sharedCoordinationModuleDescriptor
} from "../lib/shared-coordination-module";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const host = {
  hostApplicationId: "rosevear.icamp",
  hostEnvironment: "production" as const,
  platformTenantId: "tenant-rosevear",
  workspaceId: "workspace-operations",
  auditCorrelationId: "audit-build319-shared-coordination"
};

async function main() {
  assert.equal(SHARED_COORDINATION_MODULE_VERSION, "1.0.0");

  const notification = prepareNotificationModuleRequest({
    host,
    request: {
      canonicalTenantKey: "rosevear-main",
      sourceApplicationId: "icamp",
      sourceRecordId: "reservation-319",
      customerRecordId: "customer-319",
      channel: "email",
      templateKey: "reservation-follow-up",
      consentBasis: "customer opt-in",
      requestedAt: "2026-11-08T03:40:00.000Z",
      contentSummary: "Reservation follow-up for customer review."
    },
    consentEvidence: {
      canonicalTenantKey: "rosevear-main",
      customerRecordId: "customer-319",
      channel: "email",
      state: "granted",
      basis: "customer opt-in",
      sourceApplicationId: "icamp",
      sourceRecordId: "consent-319",
      observedAt: "2026-11-08T03:30:00.000Z"
    },
    routePreference: "comms-hub"
  });

  assert.equal(notification.state, "held");
  assert.equal(notification.approvalEligible, true);
  assert.equal(notification.consentCheck, "consent-granted");
  assert.equal(
    notification.holdReason,
    "notification-dispatch-not-authorized"
  );
  assert.equal(notification.routing.commsHubRoutingRequested, true);
  assert.equal(notification.routing.commsHubRoutingAuthorized, false);
  assert.equal(notification.outboundDeliveryRequested, false);
  assert.match(
    notification.correlation.correlationSha256,
    /^[a-f0-9]{64}$/
  );

  const blockedNotification = prepareNotificationModuleRequest({
    host,
    request: {
      canonicalTenantKey: "rosevear-main",
      sourceApplicationId: "icamp",
      sourceRecordId: "reservation-320",
      customerRecordId: "customer-320",
      channel: "sms",
      templateKey: "reservation-alert",
      consentBasis: "customer opt-in",
      requestedAt: "2026-11-08T03:41:00.000Z",
      contentSummary: "Reservation alert."
    },
    consentEvidence: null
  });
  assert.equal(blockedNotification.approvalEligible, false);
  assert.equal(blockedNotification.consentCheck, "consent-missing");
  assert.equal(blockedNotification.conflicts.length, 1);
  assert.equal(blockedNotification.conflicts[0]?.kind, "consent");

  const task = prepareTaskFollowUpModuleRequest({
    host,
    task: {
      sourceApplicationId: "icamp",
      destinationApplicationId: "yard-workers",
      canonicalTenantKey: "rosevear-main",
      sourceRecordType: "reservation",
      sourceRecordId: "reservation-319",
      taskKind: "follow-up",
      priority: "high",
      title: "Prepare campsite follow-up",
      summary: "Review the reservation and prepare the related property task.",
      dueAt: "2026-11-09T15:00:00.000Z",
      linkedCustomerRecordId: "customer-319"
    },
    routePreference: "comms-hub"
  });
  assert.equal(task.state, "held");
  assert.equal(task.exchange.envelope.state, "held");
  assert.equal(task.exchange.envelope.peerApplicationWriteRequested, false);
  assert.equal(task.routing.preferredOperatorApplicationId, "rosevear-comms-hub");
  assert.equal(task.routing.commsHubRoutingAuthorized, false);

  const schedule = prepareScheduleModuleRequest({
    host,
    item: {
      canonicalTenantKey: "rosevear-main",
      sourceApplicationId: "icamp",
      destinationApplicationId: "yard-workers",
      sourceRecordId: "reservation-319",
      itemType: "job",
      title: "Campsite service visit",
      status: "tentative",
      startAt: "2026-11-10T14:00:00-05:00",
      endAt: "2026-11-10T15:00:00-05:00",
      timezone: "America/Toronto",
      customerRecordId: "customer-319"
    },
    localCandidates: [
      {
        scheduleId: "schedule-existing-319",
        canonicalTenantKey: "rosevear-main",
        destinationApplicationId: "yard-workers",
        status: "confirmed",
        startAt: "2026-11-10T14:30:00-05:00",
        endAt: "2026-11-10T15:30:00-05:00"
      },
      {
        scheduleId: "schedule-other-app-319",
        canonicalTenantKey: "rosevear-main",
        destinationApplicationId: "rosiedazzlers",
        status: "confirmed",
        startAt: "2026-11-10T14:30:00-05:00",
        endAt: "2026-11-10T15:30:00-05:00"
      }
    ],
    routePreference: "direct-governed"
  });

  assert.equal(schedule.state, "held");
  assert.equal(schedule.exchange.envelope.state, "held");
  assert.equal(schedule.exchange.envelope.peerCalendarWriteRequested, false);
  assert.equal(schedule.approvalEligible, false);
  assert.equal(schedule.conflicts.length, 1);
  assert.equal(schedule.conflicts[0]?.kind, "schedule-overlap");
  assert.equal(schedule.conflicts[0]?.localOnly, true);
  assert.equal(schedule.routing.commsHubRoutingRequested, false);

  const cleanSchedule = prepareScheduleModuleRequest({
    host,
    item: {
      canonicalTenantKey: "rosevear-main",
      sourceApplicationId: "icamp",
      destinationApplicationId: "yard-workers",
      sourceRecordId: "reservation-321",
      itemType: "job",
      title: "Non-conflicting campsite visit",
      status: "tentative",
      startAt: "2026-11-10T16:00:00-05:00",
      endAt: "2026-11-10T17:00:00-05:00",
      timezone: "America/Toronto"
    },
    localCandidates: [
      {
        scheduleId: "schedule-existing-321",
        canonicalTenantKey: "rosevear-main",
        destinationApplicationId: "yard-workers",
        status: "confirmed",
        startAt: "2026-11-10T14:30:00-05:00",
        endAt: "2026-11-10T15:30:00-05:00"
      }
    ]
  });
  assert.equal(cleanSchedule.approvalEligible, true);
  assert.equal(cleanSchedule.conflicts.length, 0);

  const repeatedTask = prepareTaskFollowUpModuleRequest({
    host,
    task: {
      sourceApplicationId: "icamp",
      destinationApplicationId: "yard-workers",
      canonicalTenantKey: "rosevear-main",
      sourceRecordType: "reservation",
      sourceRecordId: "reservation-319",
      taskKind: "follow-up",
      priority: "high",
      title: "Prepare campsite follow-up",
      summary: "Review the reservation and prepare the related property task.",
      dueAt: "2026-11-09T15:00:00.000Z",
      linkedCustomerRecordId: "customer-319"
    },
    routePreference: "comms-hub"
  });
  assert.equal(
    repeatedTask.correlation.correlationSha256,
    task.correlation.correlationSha256
  );

  const descriptor = sharedCoordinationModuleDescriptor();
  assert.deepEqual(descriptor.sourceBuilds, [297, 298, 299]);
  assert.equal(descriptor.optionalCommsHubRouting, true);
  assert.equal(descriptor.commsHubRoutingIsAuthorization, false);
  assert.equal(descriptor.outboundDeliverySeparatelyGoverned, true);
  assert.equal(descriptor.peerWritesRequestedByModule, false);

  const [
    moduleSource,
    api,
    notificationPage,
    taskPage,
    schedulePage,
    navigation,
    operatorTools,
    manifest,
    docs,
    review,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("lib/shared-coordination-module.ts"),
    source("app/api/module-shared-coordination/route.ts"),
    source("app/notification-consent/page.tsx"),
    source("app/shared-task-exchange/page.tsx"),
    source("app/shared-scheduling/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_319_SHARED_COORDINATION_MODULE_APIS.md"),
    source("../../docs/integration/ai-data-platform-build319-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "normalizeNotificationRequest",
    "consentAllowsRequest",
    "buildTaskExchangeEnvelope",
    "buildScheduleExchangeEnvelope",
    "scheduleRangesOverlap",
    "commsHubRoutingAuthorized: false",
    "outboundDeliveryRequested: false",
    "peerApplicationWriteRequested: false",
    "peerCalendarWriteRequested: false"
  ]) {
    assert.ok(
      moduleSource.includes(token),
      "Build 319 module source missing " + token
    );
  }

  for (const token of [
    "hostAPIsArePreparationOnly: true",
    "consentEvidenceRequiredForNotificationEligibility: true",
    "scheduleConflictEvidenceIsLocalOnly: true",
    "commsHubRoutingRequiresSeparateAuthorization: true",
    "outboundDeliveryAvailableFromDiscoveryRoute: false"
  ]) {
    assert.ok(api.includes(token), "Build 319 API missing " + token);
  }

  for (const page of [notificationPage, taskPage, schedulePage]) {
    assert.ok(page.includes("Build 319 shared coordination module"));
    assert.ok(page.includes("/api/module-shared-coordination"));
  }

  assert.ok(
    navigation.includes("shared coordination module") &&
      operatorTools.includes("shared coordination module")
  );

  for (const token of [
    '"shared-coordination-module-v1"',
    '"notification-module-api-v1"',
    '"task-follow-up-module-api-v1"',
    '"schedule-module-api-v1"',
    "sharedCoordinationDiscoveryDispatchesOutbound: false",
    "sharedCoordinationCommsRoutingGrantsAuthorization: false",
    "sharedCoordinationPeerWritesRequested: false",
    "sharedCoordinationScheduleConflictsAreLocalOnly: true"
  ]) {
    assert.ok(manifest.includes(token), "Build 319 manifest missing " + token);
  }

  for (const token of [
    "Build 319",
    "Notification request module",
    "Task and follow-up module",
    "Appointment and scheduling module",
    "Optional Comms Hub routing",
    "Build 320"
  ]) {
    assert.ok(docs.includes(token), "Build 319 docs missing " + token);
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 319);
  assert.equal(reviewJson.security.outboundDeliveryPerformed, false);
  assert.equal(
    reviewJson.security.commsHubPreferenceGrantsAuthorization,
    false
  );
  assert.equal(reviewJson.nextQueuedBuild, 320);

  assert.ok(
    roadmap.includes(
      "Build 319 — Shared Notification, Task, Follow-Up & Scheduling Module APIs"
    ) &&
      roadmap.includes("Build 320 — Shared Media, File & Asset Host Bridge")
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-319-shared-coordination-module.ts"
      ),
      "Build 319 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 319 Shared Notification, Task, Follow-Up & Scheduling Module APIs verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
