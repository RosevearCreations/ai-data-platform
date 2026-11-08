import { randomUUID } from "node:crypto";

import {
  buildHostInstallDryRun,
  generateApprovedHostInstallPackage,
  hostInstallSha256,
  moduleHostInstallerDescriptor,
  normalizeHostInstallManifest,
  type HostInstallCredentialEvidence,
  type HostInstallDryRun,
  type HostInstallManifest
} from "./module-host-installer";
import {
  credentialReferenceRiskState
} from "./credential-vault-database";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";
import { AI_DATA_MODULE_VERSION } from "./universal-module-contract";

type RawRow = Record<string, unknown>;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function dateIso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function nullableIso(value: unknown) {
  return value ? dateIso(value) : null;
}

async function requireWorkspaceAdmin(
  client: import("pg").PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("module_installer_workspace_admin_required");
  }
}

function enrollmentRow(row: RawRow) {
  return {
    enrollmentId: String(row.enrollment_id),
    workspaceId: String(row.workspace_id),
    hostApplicationId: String(row.host_application_id),
    hostInstanceId: String(row.host_instance_id),
    environment: String(row.environment),
    hostTenantId: String(row.host_tenant_id),
    platformTenantId: String(row.platform_tenant_id),
    moduleVersion: String(row.module_version),
    hostContractVersion: Number(row.host_contract_version),
    protocolVersion: Number(row.protocol_version),
    adapterKind: String(row.adapter_kind),
    defaultSurface: String(row.default_surface),
    requestedCapabilities: Array.isArray(row.requested_capabilities)
      ? row.requested_capabilities.map(String)
      : [],
    credentialRequirements: Array.isArray(row.credential_requirements)
      ? row.credential_requirements
      : [],
    credentialBindings: Array.isArray(row.credential_bindings)
      ? row.credential_bindings
      : [],
    transport: {
      transportId: String(row.transport_id),
      kind: String(row.transport_kind),
      destinationOrigin: String(row.transport_origin),
      securityLevel: String(row.transport_security_level)
    },
    manifest: object(row.manifest_snapshot),
    manifestSha256: String(row.manifest_sha256),
    dryRun: object(row.dry_run_snapshot),
    dryRunSha256: String(row.dry_run_sha256),
    state: String(row.state) as
      | "dry-run-held"
      | "dry-run-passed"
      | "approved"
      | "rejected",
    revision: Number(row.revision),
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    approvedAt: nullableIso(row.approved_at),
    approvalReason: row.approval_reason
      ? String(row.approval_reason)
      : null,
    approvalEventId: row.approval_event_id
      ? String(row.approval_event_id)
      : null,
    packageSha256: row.package_sha256
      ? String(row.package_sha256)
      : null,
    packageGeneratedAt: nullableIso(row.package_generated_at),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function eventRow(row: RawRow) {
  return {
    eventId: String(row.event_id),
    enrollmentId: String(row.enrollment_id),
    workspaceId: String(row.workspace_id),
    revision: Number(row.revision),
    eventType: String(row.event_type),
    manifestSha256: String(row.manifest_sha256),
    dryRunSha256: String(row.dry_run_sha256),
    details: object(row.details),
    actorUserId: String(row.actor_user_id),
    occurredAt: dateIso(row.occurred_at)
  };
}

async function credentialEvidence(
  client: import("pg").PoolClient,
  manifest: HostInstallManifest
): Promise<HostInstallCredentialEvidence[]> {
  if (!manifest.credentialBindings.length) return [];

  const ids = manifest.credentialBindings.map(
    (binding) => binding.credentialRefId
  );
  const result = await client.query<{
    credential_ref_id: string;
    workspace_id: string;
    reference_kind: string;
    lifecycle_status: string;
    expires_at: Date | null;
  }>(
    `select
       credential_ref_id::text,
       workspace_id::text,
       reference_kind,
       lifecycle_status,
       expires_at
     from app.workspace_credential_references
     where workspace_id=$1
       and credential_ref_id::text=any($2::text[])`,
    [manifest.tenancy.workspaceId, ids]
  );

  const byId = new Map(
    result.rows.map((row) => [
      row.credential_ref_id,
      row
    ])
  );

  return manifest.credentialBindings.map((binding) => {
    const row = byId.get(binding.credentialRefId);
    if (!row) {
      return {
        requirementId: binding.requirementId,
        credentialRefId: binding.credentialRefId,
        workspaceId: manifest.tenancy.workspaceId,
        referenceKind: "environment-variable" as const,
        lifecycleStatus: "revoked" as const,
        expiresAt: "1970-01-01T00:00:00.000Z"
      };
    }
    return {
      requirementId: binding.requirementId,
      credentialRefId: binding.credentialRefId,
      workspaceId: row.workspace_id,
      referenceKind: row.reference_kind as HostInstallCredentialEvidence["referenceKind"],
      lifecycleStatus:
        row.lifecycle_status === "active"
          ? ("active" as const)
          : ("revoked" as const),
      expiresAt: row.expires_at
        ? row.expires_at.toISOString()
        : null
    };
  });
}

async function appendEvent(
  client: import("pg").PoolClient,
  userId: string,
  input: {
    eventId?: string;
    enrollmentId: string;
    workspaceId: string;
    revision: number;
    eventType:
      | "dry-run-held"
      | "dry-run-passed"
      | "owner-approved"
      | "owner-rejected"
      | "package-generated";
    manifestSha256: string;
    dryRunSha256: string;
    details?: Record<string, unknown>;
  }
) {
  const eventId = input.eventId ?? randomUUID();
  await client.query(
    `insert into app.module_host_enrollment_events (
      event_id,enrollment_id,owner_user_id,workspace_id,revision,
      event_type,manifest_sha256,dry_run_sha256,details,
      actor_user_id
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$3)`,
    [
      eventId,
      input.enrollmentId,
      userId,
      input.workspaceId,
      input.revision,
      input.eventType,
      input.manifestSha256,
      input.dryRunSha256,
      JSON.stringify(input.details ?? {})
    ]
  );
  return eventId;
}

export async function prepareModuleHostEnrollment(
  userId: string,
  input: {
    manifest: unknown;
  }
) {
  const manifest = normalizeHostInstallManifest(input.manifest);

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(
      client,
      manifest.tenancy.workspaceId
    );

    const evidence = await credentialEvidence(client, manifest);
    const dryRun = buildHostInstallDryRun({
      manifest,
      credentialEvidence: evidence
    });
    const dryRunSha256 = hostInstallSha256(dryRun);

    const existing = await client.query(
      `select *
       from app.module_host_enrollments
       where owner_user_id=$1
         and workspace_id=$2
         and host_application_id=$3
         and host_instance_id=$4
         and environment=$5
         and platform_tenant_id=$6
       for update`,
      [
        userId,
        manifest.tenancy.workspaceId,
        manifest.hostApplication.id,
        manifest.hostApplication.instanceId,
        manifest.hostApplication.environment,
        manifest.tenancy.platformTenantId
      ]
    );

    const prior = existing.rows[0] as RawRow | undefined;
    const enrollmentId = prior
      ? String(prior.enrollment_id)
      : randomUUID();
    const revision = Number(prior?.revision ?? 0) + 1;
    const state =
      dryRun.state === "pass"
        ? "dry-run-passed"
        : "dry-run-held";

    const result = await client.query(
      `insert into app.module_host_enrollments (
        enrollment_id,owner_user_id,workspace_id,
        host_application_id,host_instance_id,environment,
        host_tenant_id,platform_tenant_id,module_version,
        host_contract_version,protocol_version,adapter_kind,
        default_surface,requested_capabilities,
        credential_requirements,credential_bindings,
        transport_id,transport_kind,transport_origin,
        transport_security_level,manifest_snapshot,
        manifest_sha256,dry_run_snapshot,dry_run_sha256,
        state,revision,approved_by,approved_at,
        approval_reason,approval_event_id,package_sha256,
        package_generated_at,created_by,updated_by,updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14::text[],$15::jsonb,$16::jsonb,$17,$18,$19,$20,
        $21::jsonb,$22,$23::jsonb,$24,$25,$26,
        null,null,null,null,null,null,$2,$2,now()
      )
      on conflict (
        owner_user_id,workspace_id,host_application_id,
        host_instance_id,environment,platform_tenant_id
      ) do update set
        host_tenant_id=excluded.host_tenant_id,
        module_version=excluded.module_version,
        host_contract_version=excluded.host_contract_version,
        protocol_version=excluded.protocol_version,
        adapter_kind=excluded.adapter_kind,
        default_surface=excluded.default_surface,
        requested_capabilities=excluded.requested_capabilities,
        credential_requirements=excluded.credential_requirements,
        credential_bindings=excluded.credential_bindings,
        transport_id=excluded.transport_id,
        transport_kind=excluded.transport_kind,
        transport_origin=excluded.transport_origin,
        transport_security_level=excluded.transport_security_level,
        manifest_snapshot=excluded.manifest_snapshot,
        manifest_sha256=excluded.manifest_sha256,
        dry_run_snapshot=excluded.dry_run_snapshot,
        dry_run_sha256=excluded.dry_run_sha256,
        state=excluded.state,
        revision=excluded.revision,
        approved_by=null,
        approved_at=null,
        approval_reason=null,
        approval_event_id=null,
        package_sha256=null,
        package_generated_at=null,
        updated_by=$2,
        updated_at=now()
      returning *`,
      [
        enrollmentId,
        userId,
        manifest.tenancy.workspaceId,
        manifest.hostApplication.id,
        manifest.hostApplication.instanceId,
        manifest.hostApplication.environment,
        manifest.tenancy.hostTenantId,
        manifest.tenancy.platformTenantId,
        AI_DATA_MODULE_VERSION,
        manifest.hostContractVersion,
        manifest.protocolVersion,
        manifest.runtime.framework,
        manifest.defaultSurface,
        manifest.requestedCapabilities,
        JSON.stringify(manifest.credentialRequirements),
        JSON.stringify(manifest.credentialBindings),
        dryRun.transportPreparation.transportId,
        dryRun.transportPreparation.kind,
        dryRun.transportPreparation.destinationOrigin,
        dryRun.transportPreparation.securityLevel,
        JSON.stringify(manifest),
        dryRun.manifestSha256,
        JSON.stringify(dryRun),
        dryRunSha256,
        state,
        revision
      ]
    );

    await appendEvent(client, userId, {
      enrollmentId,
      workspaceId: manifest.tenancy.workspaceId,
      revision,
      eventType: state,
      manifestSha256: dryRun.manifestSha256,
      dryRunSha256,
      details: {
        ownerApprovalEligible: dryRun.ownerApprovalEligible,
        heldChecks: dryRun.checks
          .filter((item) => item.state === "held")
          .map((item) => item.id),
        connectionActivated: false,
        trustAuthorized: false,
        capabilitiesGranted: false,
        networkRequestPerformed: false
      }
    });

    return enrollmentRow(result.rows[0] as RawRow);
  });
}

export async function decideModuleHostEnrollment(
  userId: string,
  input: {
    enrollmentId: string;
    decision: "approve" | "reject";
    reason: string;
  }
) {
  const reason = String(input.reason ?? "").trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new Error(
      "module_installer_owner_decision_reason_invalid"
    );
  }

  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_host_enrollments
       where enrollment_id=$1
       for update`,
      [input.enrollmentId]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_installer_enrollment_not_found");
    }
    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (
      input.decision === "approve" &&
      String(row.state) !== "dry-run-passed"
    ) {
      throw new Error(
        "module_installer_dry_run_pass_required"
      );
    }

    const revision = Number(row.revision) + 1;
    const eventId = randomUUID();
    const nextState =
      input.decision === "approve" ? "approved" : "rejected";

    const result = await client.query(
      `update app.module_host_enrollments
       set state=$2,
           revision=$3,
           approved_by=$4,
           approved_at=$5,
           approval_reason=$6,
           approval_event_id=$7,
           package_sha256=null,
           package_generated_at=null,
           updated_by=$8,
           updated_at=now()
       where enrollment_id=$1
       returning *`,
      [
        input.enrollmentId,
        nextState,
        revision,
        input.decision === "approve" ? userId : null,
        input.decision === "approve" ? new Date() : null,
        reason,
        input.decision === "approve" ? eventId : null,
        userId
      ]
    );

    await appendEvent(client, userId, {
      eventId,
      enrollmentId: input.enrollmentId,
      workspaceId,
      revision,
      eventType:
        input.decision === "approve"
          ? "owner-approved"
          : "owner-rejected",
      manifestSha256: String(row.manifest_sha256),
      dryRunSha256: String(row.dry_run_sha256),
      details: {
        reason,
        packageGenerationAuthorized:
          input.decision === "approve",
        connectionActivated: false,
        trustAuthorized: false,
        capabilitiesGranted: false
      }
    });

    return enrollmentRow(result.rows[0] as RawRow);
  });
}

export async function generateModuleHostEnrollmentPackage(
  userId: string,
  input: {
    enrollmentId: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_host_enrollments
       where enrollment_id=$1
       for update`,
      [input.enrollmentId]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_installer_enrollment_not_found");
    }
    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (
      String(row.state) !== "approved" ||
      !row.approval_event_id ||
      !row.approved_at
    ) {
      throw new Error(
        "module_installer_owner_approval_required"
      );
    }

    const manifest = object(row.manifest_snapshot);
    const dryRun =
      object(row.dry_run_snapshot) as unknown as HostInstallDryRun;

    if (
      hostInstallSha256(
        normalizeHostInstallManifest(manifest)
      ) !== String(row.manifest_sha256) ||
      hostInstallSha256(dryRun) !== String(row.dry_run_sha256)
    ) {
      throw new Error(
        "module_installer_persisted_evidence_hash_mismatch"
      );
    }

    const pkg = generateApprovedHostInstallPackage({
      enrollmentId: input.enrollmentId,
      approvalEventId: String(row.approval_event_id),
      approvedAt: dateIso(row.approved_at),
      manifest,
      dryRun,
      dryRunSha256: String(row.dry_run_sha256)
    });

    const revision = Number(row.revision) + 1;
    const result = await client.query(
      `update app.module_host_enrollments
       set package_sha256=$2,
           package_generated_at=$3,
           revision=$4,
           updated_by=$5,
           updated_at=now()
       where enrollment_id=$1
         and state='approved'
       returning *`,
      [
        input.enrollmentId,
        pkg.packageSha256,
        pkg.generatedAt,
        revision,
        userId
      ]
    );
    if (!result.rows[0]) {
      throw new Error(
        "module_installer_owner_approval_required"
      );
    }

    await appendEvent(client, userId, {
      enrollmentId: input.enrollmentId,
      workspaceId,
      revision,
      eventType: "package-generated",
      manifestSha256: String(row.manifest_sha256),
      dryRunSha256: String(row.dry_run_sha256),
      details: {
        packageSha256: pkg.packageSha256,
        fileCount: pkg.files.length,
        hostFilesWrittenByPlatform: false,
        connectionActivated: false,
        trustAuthorized: false
      }
    });

    return {
      enrollment: enrollmentRow(result.rows[0] as RawRow),
      package: pkg
    };
  });
}

export async function listModuleHostEnrollmentsForUser(
  userId: string
) {
  const workspaces = await listWorkspacesForUser(userId);
  const manageable = workspaces.filter(
    (item) => item.role === "owner" || item.role === "admin"
  );

  return withUserDatabase(userId, async (client) => {
    const [enrollments, events, references] = await Promise.all([
      client.query(
        `select *
         from app.module_host_enrollments
         where owner_user_id=$1
         order by updated_at desc
         limit 200`,
        [userId]
      ),
      client.query(
        `select *
         from app.module_host_enrollment_events
         where owner_user_id=$1
         order by occurred_at desc
         limit 500`,
        [userId]
      ),
      client.query(
        `select
           workspace_id::text,
           credential_ref_id::text,
           label,
           reference_kind,
           lifecycle_status,
           replacement_state,
           rotation_due_at,
           expires_at
         from app.workspace_credential_references
         order by created_at desc
         limit 500`
      )
    ]);

    return {
      schema:
        "rosevear.ai-data-platform.host-enrollment-center.v1" as const,
      build: 327 as const,
      generatedAt: new Date().toISOString(),
      descriptor: moduleHostInstallerDescriptor(),
      workspaces: manageable.map((item) => ({
        id: item.id,
        name: item.name,
        role: item.role
      })),
      credentialReferences: references.rows.map((row) => {
        const base = {
          workspaceId: String(row.workspace_id),
          credentialRefId: String(row.credential_ref_id),
          label: String(row.label),
          referenceKind: String(row.reference_kind) as
            | "environment-variable"
            | "external-vault-reference"
            | "provider-managed-reference",
          lifecycleStatus: String(row.lifecycle_status) as
            | "active"
            | "revoked",
          replacementState: String(row.replacement_state) as
            | "not-planned"
            | "prepared",
          rotationDueAt: nullableIso(row.rotation_due_at),
          expiresAt: nullableIso(row.expires_at)
        };
        return {
          ...base,
          riskState: credentialReferenceRiskState(base)
        };
      }),
      enrollments: enrollments.rows.map((row) =>
        enrollmentRow(row as RawRow)
      ),
      events: events.rows.map((row) =>
        eventRow(row as RawRow)
      ),
      security: {
        ownerAdminPreparationOnly: true as const,
        ownerApprovalRequiredForPackage: true as const,
        ownerApprovalActivatesConnection: false as const,
        ownerApprovalAuthorizesTrust: false as const,
        credentialValuesReturned: false as const,
        transportHealthInvented: false as const,
        hostFilesWrittenAutomatically: false as const,
        autonomyPolicyCreatedAutomatically: false as const
      }
    };
  });
}
