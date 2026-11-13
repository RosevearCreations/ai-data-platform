import type { Build383RuntimeContinuityIncidentLedgerModel } from "./yw562-runtime-continuity-incident-ledger";

export const BUILD_384 = 384 as const;
export const BUILD_384_SCHEMA =
  "rosevear.ai-data-platform.yw562-post-recovery-continuity-watch.v1" as const;
export const BUILD_384_CONTROLLER_BASE_REVISION =
  "b1a176044dca68c6ffec3f07f127b67d09aa3a6e" as const;

export type Build384WatchSample = {
  sampleId: string;
  observedAt: string;
  connectionState: "CONNECTED" | "DISCONNECTED_HOLD";
  renewalDriftState: "CURRENT" | "DRIFT_DETECTED";
  incidentState: "CLEAR" | "OPEN" | "CLOSED_VERIFIED";
  masterReceiptsHealthy: boolean;
};

export type Build384Recurrence = {
  recurrenceId: string;
  priorIncidentId: string;
  driftReason: string;
  detectedAt: string;
  threeMasterAcknowledged: boolean;
  preventionActionVerified: boolean;
};

export function composeBuild384PostRecoveryContinuityWatch(input: {
  build383: Build383RuntimeContinuityIncidentLedgerModel;
  watchSamples?: readonly Build384WatchSample[];
  recurrenceEvents?: readonly Build384Recurrence[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const samples = [...(input.watchSamples ?? [])].sort((a,b) =>
    b.observedAt.localeCompare(a.observedAt)
  );
  const recurrences = [...(input.recurrenceEvents ?? [])].sort((a,b) =>
    b.detectedAt.localeCompare(a.detectedAt)
  );

  const recoveredAndClear =
    input.build383.connectionState === "CONNECTED" &&
    input.build383.incidentLedgerState === "CLEAR";

  const recentSamples = samples.filter((sample) => {
    const observed = Date.parse(sample.observedAt);
    return Number.isFinite(observed) && now.getTime() - observed <= 30 * 60_000;
  });

  const continuitySamplesHealthy =
    recentSamples.length >= 3 &&
    recentSamples.every(
      (sample) =>
        sample.connectionState === "CONNECTED" &&
        sample.renewalDriftState === "CURRENT" &&
        sample.incidentState === "CLEAR" &&
        sample.masterReceiptsHealthy
    );

  const watchState = !recoveredAndClear
    ? ("HOLD_NOT_RECOVERED" as const)
    : continuitySamplesHealthy
      ? ("POST_RECOVERY_WATCH_HEALTHY" as const)
      : ("POST_RECOVERY_WATCH_INCOMPLETE" as const);

  const latestRecurrence = recurrences[0] ?? null;
  const recurrenceDetected = Boolean(latestRecurrence);

  const recurrenceState = !recurrenceDetected
    ? ("NO_RECURRENCE_DETECTED" as const)
    : latestRecurrence!.threeMasterAcknowledged
      ? ("RECURRENCE_ACKNOWLEDGED" as const)
      : ("RECURRENCE_ESCALATION_REQUIRED" as const);

  const preventionAuditState = !latestRecurrence
    ? continuitySamplesHealthy
      ? ("PREVENTION_CONTROLS_HEALTHY" as const)
      : ("PREVENTION_AUDIT_REQUIRED" as const)
    : latestRecurrence.threeMasterAcknowledged &&
        latestRecurrence.preventionActionVerified
      ? ("RECURRENCE_PREVENTION_VERIFIED" as const)
      : ("RECURRENCE_PREVENTION_REQUIRED" as const);

  const connectionState =
    watchState === "POST_RECOVERY_WATCH_HEALTHY" &&
    recurrenceState === "NO_RECURRENCE_DETECTED" &&
    preventionAuditState === "PREVENTION_CONTROLS_HEALTHY"
      ? ("CONNECTED" as const)
      : ("DISCONNECTED_HOLD" as const);

  return {
    schema: BUILD_384_SCHEMA,
    build: BUILD_384,
    controllerBaseRevision: BUILD_384_CONTROLLER_BASE_REVISION,
    build383: input.build383,
    watchState,
    recentSampleCount: recentSamples.length,
    continuitySamplesHealthy,
    recurrenceDetected,
    latestRecurrence,
    recurrenceState,
    preventionAuditState,
    connectionState,
    blockers: [
      ...(watchState === "HOLD_NOT_RECOVERED"
        ? ["Build 383 must be recovered and CLEAR before post-recovery watch can pass."]
        : []),
      ...(watchState === "POST_RECOVERY_WATCH_INCOMPLETE"
        ? ["At least three healthy post-recovery continuity samples are required within 30 minutes."]
        : []),
      ...(recurrenceState === "RECURRENCE_ESCALATION_REQUIRED"
        ? ["Recurrent drift requires acknowledgement by all three masters."]
        : []),
      ...(preventionAuditState === "RECURRENCE_PREVENTION_REQUIRED"
        ? ["Recurrence prevention action must be independently verified before CONNECTED can resume."]
        : [])
    ],
    policy: {
      minimumHealthySamples: 3,
      watchWindowMinutes: 30,
      recurrenceForcesHold: true,
      allThreeMastersMustAcknowledgeRecurrence: true,
      preventionActionMustBeVerified: true,
      historicalGreenCannotOverrideRecurrence: true,
      openRecurrenceCannotReportConnected: true
    }
  };
}

export type Build384PostRecoveryContinuityWatchModel = ReturnType<
  typeof composeBuild384PostRecoveryContinuityWatch
>;
