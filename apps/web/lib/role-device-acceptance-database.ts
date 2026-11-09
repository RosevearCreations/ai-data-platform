import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  ROLE_DEVICE_ACCEPTANCE_DEVICES,
  ROLE_DEVICE_ACCEPTANCE_ROLES,
  ROLE_DEVICE_ACCEPTANCE_STATES,
  composeRoleDeviceAcceptanceMatrix,
  validateRoleDeviceAcceptanceEvidence,
  type RoleDeviceAcceptanceDevice,
  type RoleDeviceAcceptanceEvidence,
  type RoleDeviceAcceptanceRole,
  type RoleDeviceAcceptanceState
} from "./role-device-acceptance-core";
import {
  listMasterApplicationInventoryForUser
} from "./master-application-inventory-database";
import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

type AcceptanceRow = {
  acceptance_id: string;
  actor_user_id: string;
  source_id: MasterShellSourceId;
  module_id: string | null;
  role_name: RoleDeviceAcceptanceRole;
  device_class: RoleDeviceAcceptanceDevice;
  record_version: string;
  state: RoleDeviceAcceptanceState;
  evidence_uri: string;
  reviewer: string;
  confidence: string;
  observed_at: Date;
  expires_at: Date;
  branch: string;
  commit_sha: string;
  notes: string | null;
  recorded_at: Date;
};

async function requireSuiteAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1
       from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) {
    throw new Error("role_device_acceptance_suite_admin_required");
  }
}

function rowToEvidence(row: AcceptanceRow) {
  return validateRoleDeviceAcceptanceEvidence({
    acceptanceId: row.acceptance_id,
    sourceId: row.source_id,
    moduleId: row.module_id,
    role: row.role_name,
    device: row.device_class,
    recordVersion: Number(row.record_version),
    state: row.state,
    evidenceURI: row.evidence_uri,
    reviewer: row.reviewer,
    confidence: Number(row.confidence),
    observedAt: row.observed_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    branch: row.branch,
    commitSha: row.commit_sha,
    notes: row.notes,
    recordedAt: row.recorded_at.toISOString()
  });
}

function validSourceId(value: string): value is MasterShellSourceId {
  return MASTER_SHELL_SOURCE_IDS.includes(value as MasterShellSourceId);
}

function validRole(value: string): value is RoleDeviceAcceptanceRole {
  return ROLE_DEVICE_ACCEPTANCE_ROLES.includes(
    value as RoleDeviceAcceptanceRole
  );
}

function validDevice(value: string): value is RoleDeviceAcceptanceDevice {
  return ROLE_DEVICE_ACCEPTANCE_DEVICES.includes(
    value as RoleDeviceAcceptanceDevice
  );
}

function validState(value: string): value is RoleDeviceAcceptanceState {
  return ROLE_DEVICE_ACCEPTANCE_STATES.includes(
    value as RoleDeviceAcceptanceState
  );
}

export async function listRoleDeviceAcceptanceForUser(
  userId: string,
  now = new Date()
) {
  const inventory = await listMasterApplicationInventoryForUser(userId, now);
  const evidence = await withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    const result = await client.query<AcceptanceRow>(
      `select distinct on (
         source_id,coalesce(module_id,''),role_name,device_class
       )
         acceptance_id,actor_user_id,source_id,module_id,role_name,
         device_class,record_version,state,evidence_uri,reviewer,
         confidence,observed_at,expires_at,branch,commit_sha,notes,
         recorded_at
       from app.master_role_device_acceptance_evidence
       order by
         source_id,coalesce(module_id,''),role_name,device_class,
         record_version desc,recorded_at desc`
    );
    return result.rows.map(rowToEvidence);
  });

  return {
    ...composeRoleDeviceAcceptanceMatrix({
      inventory,
      evidence,
      now
    }),
    inventoryEvidence: {
      schema: inventory.schema,
      build: inventory.build,
      generatedAt: inventory.generatedAt,
      applications: inventory.summary.applications,
      modules: inventory.summary.modules
    }
  };
}

export async function recordRoleDeviceAcceptanceEvidence(
  userId: string,
  input: {
    sourceId: string;
    moduleId?: string | null;
    role: string;
    device: string;
    state: string;
    evidenceURI: string;
    reviewer: string;
    confidence: number;
    observedAt: string;
    expiresAt: string;
    branch: string;
    commitSha: string;
    notes?: string | null;
  }
) {
  if (!validSourceId(input.sourceId)) {
    throw new Error("role_device_acceptance_source_invalid");
  }
  if (!validRole(input.role)) {
    throw new Error("role_device_acceptance_role_invalid");
  }
  if (!validDevice(input.device)) {
    throw new Error("role_device_acceptance_device_invalid");
  }
  if (!validState(input.state)) {
    throw new Error("role_device_acceptance_state_invalid");
  }

  const sourceId = input.sourceId;
  const role = input.role;
  const device = input.device;
  const state = input.state;
  const moduleId =
    input.moduleId === undefined ||
    input.moduleId === null ||
    input.moduleId === ""
      ? null
      : input.moduleId;

  const inventory = await listMasterApplicationInventoryForUser(userId);
  const application = inventory.applications.find(
    (item) => item.sourceId === sourceId
  );
  if (!application) {
    throw new Error("role_device_acceptance_source_not_found");
  }
  if (
    moduleId !== null &&
    !application.modules.some((item) => item.moduleId === moduleId)
  ) {
    throw new Error("role_device_acceptance_module_not_found");
  }

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    const lockKey = [
      "role-device-acceptance",
      sourceId,
      moduleId ?? "*",
      role,
      device
    ].join(":");
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      [lockKey]
    );

    const current = await client.query<{ record_version: string }>(
      `select record_version
       from app.master_role_device_acceptance_evidence
       where source_id=$1
         and module_id is not distinct from $2
         and role_name=$3
         and device_class=$4
       order by record_version desc
       limit 1`,
      [sourceId, moduleId, role, device]
    );

    const candidate: RoleDeviceAcceptanceEvidence =
      validateRoleDeviceAcceptanceEvidence({
        acceptanceId: randomUUID(),
        sourceId,
        moduleId,
        role,
        device,
        recordVersion:
          Number(current.rows[0]?.record_version ?? 0) + 1,
        state,
        evidenceURI: input.evidenceURI,
        reviewer: input.reviewer,
        confidence: input.confidence,
        observedAt: input.observedAt,
        expiresAt: input.expiresAt,
        branch: input.branch,
        commitSha: input.commitSha,
        notes:
          input.notes === undefined ||
          input.notes === null ||
          input.notes === ""
            ? null
            : input.notes,
        recordedAt: new Date().toISOString()
      });

    const result = await client.query<AcceptanceRow>(
      `insert into app.master_role_device_acceptance_evidence (
        acceptance_id,actor_user_id,source_id,module_id,role_name,
        device_class,record_version,state,evidence_uri,reviewer,
        confidence,observed_at,expires_at,branch,commit_sha,notes
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      returning *`,
      [
        candidate.acceptanceId,
        userId,
        candidate.sourceId,
        candidate.moduleId,
        candidate.role,
        candidate.device,
        candidate.recordVersion,
        candidate.state,
        candidate.evidenceURI,
        candidate.reviewer,
        candidate.confidence,
        candidate.observedAt,
        candidate.expiresAt,
        candidate.branch,
        candidate.commitSha,
        candidate.notes
      ]
    );
    return rowToEvidence(result.rows[0]);
  });
}
