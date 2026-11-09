import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const ROLE_DEVICE_ACCEPTANCE_BUILD = 345 as const;

export const ROLE_DEVICE_ACCEPTANCE_ROLES = [
  "customer",
  "worker",
  "admin"
] as const;

export const ROLE_DEVICE_ACCEPTANCE_DEVICES = [
  "mobile",
  "tablet",
  "desktop"
] as const;

export const ROLE_DEVICE_ACCEPTANCE_STATES = [
  "ACCEPTED",
  "PARTIAL",
  "FAILED"
] as const;

export type RoleDeviceAcceptanceRole =
  (typeof ROLE_DEVICE_ACCEPTANCE_ROLES)[number];
export type RoleDeviceAcceptanceDevice =
  (typeof ROLE_DEVICE_ACCEPTANCE_DEVICES)[number];
export type RoleDeviceAcceptanceState =
  (typeof ROLE_DEVICE_ACCEPTANCE_STATES)[number];
export type RoleDeviceEffectiveState =
  | RoleDeviceAcceptanceState
  | "UNKNOWN"
  | "STALE";

export type RoleDeviceAcceptanceEvidence = {
  acceptanceId: string;
  sourceId: MasterShellSourceId;
  moduleId: string | null;
  role: RoleDeviceAcceptanceRole;
  device: RoleDeviceAcceptanceDevice;
  recordVersion: number;
  state: RoleDeviceAcceptanceState;
  evidenceURI: string;
  reviewer: string;
  confidence: number;
  observedAt: string;
  expiresAt: string;
  branch: string;
  commitSha: string;
  notes: string | null;
  recordedAt: string;
};

export type RoleDeviceInventoryInput = {
  applications: Array<{
    sourceId: MasterShellSourceId;
    displayName: string;
    modules: Array<{ moduleId: string }>;
  }>;
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,1000}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/;
const COMMIT = /^[a-f0-9]{7,64}$/;
const URI = /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;

function includes<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function validIso(value: unknown) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export function roleDeviceScopeKey(input: {
  sourceId: MasterShellSourceId;
  moduleId: string | null;
}) {
  return input.sourceId + "::" + (input.moduleId ?? "*");
}

export function roleDeviceCellKey(input: {
  sourceId: MasterShellSourceId;
  moduleId: string | null;
  role: RoleDeviceAcceptanceRole;
  device: RoleDeviceAcceptanceDevice;
}) {
  return [
    roleDeviceScopeKey(input),
    input.role,
    input.device
  ].join("::");
}

export function validateRoleDeviceAcceptanceEvidence(
  input: RoleDeviceAcceptanceEvidence
) {
  if (!SAFE_ID.test(input.acceptanceId)) {
    throw new Error("role_device_acceptance_id_invalid");
  }
  if (!MASTER_SHELL_SOURCE_IDS.includes(input.sourceId)) {
    throw new Error("role_device_acceptance_source_invalid");
  }
  if (input.moduleId !== null && !SAFE_ID.test(input.moduleId)) {
    throw new Error("role_device_acceptance_module_invalid");
  }
  if (!includes(ROLE_DEVICE_ACCEPTANCE_ROLES, input.role)) {
    throw new Error("role_device_acceptance_role_invalid");
  }
  if (!includes(ROLE_DEVICE_ACCEPTANCE_DEVICES, input.device)) {
    throw new Error("role_device_acceptance_device_invalid");
  }
  if (!includes(ROLE_DEVICE_ACCEPTANCE_STATES, input.state)) {
    throw new Error("role_device_acceptance_state_invalid");
  }
  if (!Number.isSafeInteger(input.recordVersion) || input.recordVersion < 1) {
    throw new Error("role_device_acceptance_version_invalid");
  }
  if (!URI.test(input.evidenceURI)) {
    throw new Error("role_device_acceptance_evidence_uri_invalid");
  }
  if (
    !SAFE_TEXT.test(input.reviewer) ||
    input.reviewer.length > 160
  ) {
    throw new Error("role_device_acceptance_reviewer_invalid");
  }
  if (
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 1
  ) {
    throw new Error("role_device_acceptance_confidence_invalid");
  }
  if (
    !validIso(input.observedAt) ||
    !validIso(input.expiresAt) ||
    Date.parse(input.expiresAt) <= Date.parse(input.observedAt)
  ) {
    throw new Error("role_device_acceptance_time_invalid");
  }
  if (!BRANCH.test(input.branch)) {
    throw new Error("role_device_acceptance_branch_invalid");
  }
  if (!COMMIT.test(input.commitSha)) {
    throw new Error("role_device_acceptance_commit_invalid");
  }
  if (
    input.notes !== null &&
    (!SAFE_TEXT.test(input.notes) || input.notes.length > 1000)
  ) {
    throw new Error("role_device_acceptance_notes_invalid");
  }
  if (!validIso(input.recordedAt)) {
    throw new Error("role_device_acceptance_recorded_at_invalid");
  }
  return input;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function composeRoleDeviceAcceptanceMatrix(input: {
  inventory: RoleDeviceInventoryInput;
  evidence: RoleDeviceAcceptanceEvidence[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const latest = new Map<string, RoleDeviceAcceptanceEvidence>();

  for (const raw of input.evidence) {
    const item = validateRoleDeviceAcceptanceEvidence(raw);
    const key = roleDeviceCellKey(item);
    const current = latest.get(key);
    if (!current || item.recordVersion > current.recordVersion) {
      latest.set(key, item);
    }
  }

  const scopes = input.inventory.applications.flatMap((application) => {
    const scopeDefs = [
      { moduleId: null as string | null, label: application.displayName + " · application" },
      ...application.modules.map((module) => ({
        moduleId: module.moduleId,
        label: application.displayName + " · " + module.moduleId
      }))
    ];

    return scopeDefs.map((scope) => {
      const rows = ROLE_DEVICE_ACCEPTANCE_ROLES.map((role) => ({
        role,
        cells: ROLE_DEVICE_ACCEPTANCE_DEVICES.map((device) => {
          const evidence =
            latest.get(
              roleDeviceCellKey({
                sourceId: application.sourceId,
                moduleId: scope.moduleId,
                role,
                device
              })
            ) ?? null;

          const effectiveState: RoleDeviceEffectiveState =
            evidence === null
              ? "UNKNOWN"
              : Date.parse(evidence.expiresAt) <= now.getTime()
                ? "STALE"
                : evidence.state;

          return {
            sourceId: application.sourceId,
            moduleId: scope.moduleId,
            role,
            device,
            effectiveState,
            evidenceId: evidence?.acceptanceId ?? null,
            evidenceURI: evidence?.evidenceURI ?? null,
            reviewer: evidence?.reviewer ?? null,
            confidence: evidence?.confidence ?? null,
            observedAt: evidence?.observedAt ?? null,
            expiresAt: evidence?.expiresAt ?? null,
            branch: evidence?.branch ?? null,
            commitSha: evidence?.commitSha ?? null,
            notes: evidence?.notes ?? null,
            recordVersion: evidence?.recordVersion ?? null,
            implementationReadinessInferred: false,
            automatedTestReadinessInferred: false,
            productionAcceptanceInferred: false
          };
        })
      }));

      const cells = rows.flatMap((row) => row.cells);
      const freshMeasured = cells.filter(
        (cell) =>
          cell.effectiveState === "ACCEPTED" ||
          cell.effectiveState === "PARTIAL" ||
          cell.effectiveState === "FAILED"
      ).length;
      const accepted = cells.filter(
        (cell) => cell.effectiveState === "ACCEPTED"
      ).length;
      const partial = cells.filter(
        (cell) => cell.effectiveState === "PARTIAL"
      ).length;
      const failed = cells.filter(
        (cell) => cell.effectiveState === "FAILED"
      ).length;
      const stale = cells.filter(
        (cell) => cell.effectiveState === "STALE"
      ).length;
      const unknown = cells.filter(
        (cell) => cell.effectiveState === "UNKNOWN"
      ).length;

      const overallState =
        failed > 0
          ? "FAILED"
          : stale > 0
            ? "STALE"
            : unknown > 0
              ? "UNKNOWN"
              : partial > 0
                ? "PARTIAL"
                : accepted === cells.length
                  ? "ACCEPTED"
                  : "UNKNOWN";

      return {
        scopeKey: roleDeviceScopeKey({
          sourceId: application.sourceId,
          moduleId: scope.moduleId
        }),
        sourceId: application.sourceId,
        displayName: application.displayName,
        moduleId: scope.moduleId,
        label: scope.label,
        rows,
        overallState,
        summary: {
          cells: cells.length,
          accepted,
          partial,
          failed,
          stale,
          unknown,
          freshMeasured,
          evidenceCoveragePercent: percent(freshMeasured, cells.length),
          acceptedPercent:
            freshMeasured === cells.length
              ? percent(accepted, cells.length)
              : null
        }
      };
    });
  });

  const allCells = scopes.flatMap((scope) =>
    scope.rows.flatMap((row) => row.cells)
  );

  return {
    schema: "ai-data-platform.role-device-acceptance-matrix.v1",
    build: ROLE_DEVICE_ACCEPTANCE_BUILD,
    generatedAt: now.toISOString(),
    dimensions: {
      roles: [...ROLE_DEVICE_ACCEPTANCE_ROLES],
      devices: [...ROLE_DEVICE_ACCEPTANCE_DEVICES],
      cellsPerScope:
        ROLE_DEVICE_ACCEPTANCE_ROLES.length *
        ROLE_DEVICE_ACCEPTANCE_DEVICES.length
    },
    scopes,
    summary: {
      applications: input.inventory.applications.length,
      scopes: scopes.length,
      cells: allCells.length,
      accepted: allCells.filter(
        (cell) => cell.effectiveState === "ACCEPTED"
      ).length,
      partial: allCells.filter(
        (cell) => cell.effectiveState === "PARTIAL"
      ).length,
      failed: allCells.filter(
        (cell) => cell.effectiveState === "FAILED"
      ).length,
      stale: allCells.filter(
        (cell) => cell.effectiveState === "STALE"
      ).length,
      unknown: allCells.filter(
        (cell) => cell.effectiveState === "UNKNOWN"
      ).length
    },
    policy: {
      evidenceBackedOnly: true,
      missingEvidenceMeansAccepted: false,
      implementationImpliesAcceptance: false,
      automatedTestingImpliesAcceptance: false,
      sourceReadinessImpliesAcceptance: false,
      deploymentGreenImpliesAcceptance: false,
      acceptanceMutationOfSourcePerformed: false,
      peerWritePerformed: false,
      externalProbePerformed: false
    }
  };
}

export type RoleDeviceAcceptanceMatrix = ReturnType<
  typeof composeRoleDeviceAcceptanceMatrix
>;
