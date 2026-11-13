import type { Build382RuntimeRenewalDriftContinuityModel } from "./yw562-runtime-renewal-drift-continuity";

export const BUILD_383 = 383 as const;
export const BUILD_383_SCHEMA =
  "rosevear.ai-data-platform.yw562-runtime-continuity-incident-ledger.v1" as const;
export const BUILD_383_CONTROLLER_BASE_REVISION =
  "a364c042b6142754387d268eb28869de2fd1d84e" as const;

export type Build383Incident = {
  incidentId: string;
  driftReason: string;
  openedAt: string;
  lastRecoveryAttemptAt: string | null;
  recoveredAt: string | null;
  closureEvidenceVerified: boolean;
  masterAcknowledgements: Array<
    "rosevear-ai-hub" | "rosevear-comms-hub" | "ai-data-platform"
  >;
};

export function composeBuild383RuntimeContinuityIncidentLedger(input: {
  build382: Build382RuntimeRenewalDriftContinuityModel;
  incidents?: readonly Build383Incident[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const activeIncident =
    [...(input.incidents ?? [])]
      .filter((item) => !item.recoveredAt)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0] ?? null;

  const driftActive =
    input.build382.renewalDriftState === "DRIFT_DETECTED" ||
    input.build382.connectionState !== "CONNECTED";

  const incidentLedgerState = driftActive
    ? activeIncident
      ? ("OPEN_INCIDENT_TRACKED" as const)
      : ("INCIDENT_REQUIRED" as const)
    : activeIncident
      ? ("RECOVERY_CLOSURE_REQUIRED" as const)
      : ("CLEAR" as const);

  const openedAt = activeIncident ? Date.parse(activeIncident.openedAt) : NaN;
  const ageMinutes =
    activeIncident && Number.isFinite(openedAt)
      ? Math.max(0, Math.floor((now.getTime() - openedAt) / 60_000))
      : 0;

  const recoveryAgingState = !activeIncident
    ? ("NOT_APPLICABLE" as const)
    : ageMinutes < 5
      ? ("FRESH" as const)
      : ageMinutes < 15
        ? ("AGING" as const)
        : ("BREACHED" as const);

  const distinctMasters = new Set(activeIncident?.masterAcknowledgements ?? []);
  const threeMasterAcknowledged = distinctMasters.size === 3;

  const driftEscalationState = !activeIncident
    ? ("NONE" as const)
    : recoveryAgingState === "BREACHED" || !threeMasterAcknowledged
      ? ("ESCALATION_REQUIRED" as const)
      : ("MONITORED" as const);

  const closureState = !activeIncident
    ? ("NO_OPEN_INCIDENT" as const)
    : !activeIncident.recoveredAt
      ? ("OPEN" as const)
      : activeIncident.closureEvidenceVerified && threeMasterAcknowledged
        ? ("CLOSED_VERIFIED" as const)
        : ("CLOSURE_EVIDENCE_REQUIRED" as const);

  return {
    schema: BUILD_383_SCHEMA,
    build: BUILD_383,
    controllerBaseRevision: BUILD_383_CONTROLLER_BASE_REVISION,
    build382: input.build382,
    activeIncident,
    incidentLedgerState,
    recoveryAgeMinutes: ageMinutes,
    recoveryAgingState,
    threeMasterAcknowledged,
    driftEscalationState,
    closureState,
    connectionState:
      input.build382.connectionState === "CONNECTED" &&
      incidentLedgerState === "CLEAR"
        ? ("CONNECTED" as const)
        : ("DISCONNECTED_HOLD" as const),
    blockers: [
      ...(incidentLedgerState === "INCIDENT_REQUIRED"
        ? ["Runtime continuity drift requires a durable incident ledger entry."]
        : []),
      ...(recoveryAgingState === "BREACHED"
        ? ["Renewal recovery age exceeded the 15-minute escalation threshold."]
        : []),
      ...(activeIncident && !threeMasterAcknowledged
        ? ["All three masters must acknowledge the drift incident before closure."]
        : []),
      ...(closureState === "CLOSURE_EVIDENCE_REQUIRED"
        ? ["Verified recovery closure evidence is required before incident closure."]
        : [])
    ],
    policy: {
      driftIncidentMustBeDurable: true,
      recoveryAgingWarningMinutes: 5,
      recoveryAgingEscalationMinutes: 15,
      allThreeMasterAcknowledgementsRequired: true,
      closureEvidenceRequired: true,
      openIncidentCannotReportConnected: true,
      codeGreenCannotCloseIncident: true
    }
  };
}

export type Build383RuntimeContinuityIncidentLedgerModel = ReturnType<
  typeof composeBuild383RuntimeContinuityIncidentLedger
>;
