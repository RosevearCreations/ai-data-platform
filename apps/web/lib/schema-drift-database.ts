import { randomUUID } from "node:crypto";

import { getCrossAppDataContract } from "./cross-app-data-contract-registry";
import {
  normalizeFieldMappingEntries,
  validateFieldMappingEntries,
  type FieldMappingEntry
} from "./field-mapping-studio";
import {
  analyzeSchemaDrift,
  applyDeterministicRepairSuggestions,
  canonicalSchemaSnapshot,
  normalizeSourceSchemaFields,
  type AffectedMapping,
  type RepairSuggestion,
  type SchemaDriftChange,
  type SchemaFieldSnapshot,
  type SourceSchemaField
} from "./schema-drift-assistant";
import { listWorkspacesForUser, withUserDatabase } from "./database";

type MappingProfileRow = Record<string, unknown>;

function iso(value: unknown) {
  return value ? new Date(String(value)).toISOString() : null;
}

function jsonArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function profileFromRow(row: MappingProfileRow) {
  const contract = getCrossAppDataContract(String(row.contract_id));
  if (!contract) throw new Error("schema_drift_contract_not_found");
  const mappingEntries = jsonArray<FieldMappingEntry>(row.mapping_entries);
  const sourceFields = row.source_schema_fields
    ? normalizeSourceSchemaFields(row.source_schema_fields)
    : null;
  return {
    workspaceId: String(row.workspace_id),
    mappingProfileId: String(row.mapping_profile_id),
    applicationId: String(row.application_id),
    contractId: String(row.contract_id),
    contractVersion: String(row.contract_version),
    schemaFingerprint: String(row.schema_fingerprint),
    profileName: String(row.profile_name),
    sourceSchemaLabel: String(row.source_schema_label ?? ""),
    sourceSchemaVersion: row.source_schema_version
      ? String(row.source_schema_version)
      : null,
    sourceSchemaFingerprint: row.source_schema_fingerprint
      ? String(row.source_schema_fingerprint)
      : null,
    sourceSchemaFields: sourceFields,
    sourceSchemaReviewedAt: iso(row.source_schema_reviewed_at),
    mappingEntries,
    reviewStatus: String(row.review_status) as "draft" | "reviewed",
    revision: Number(row.revision),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    currentCanonicalFingerprint: contract.schemaFingerprint,
    canonicalCurrent:
      String(row.schema_fingerprint) === contract.schemaFingerprint,
    validation: validateFieldMappingEntries(mappingEntries, contract)
  };
}

function scanFromRow(row: Record<string, unknown>) {
  return {
    workspaceId: String(row.workspace_id),
    driftScanId: String(row.drift_scan_id),
    mappingProfileId: String(row.mapping_profile_id),
    profileRevision: Number(row.profile_revision),
    sourceSchemaVersion: String(row.source_schema_version),
    sourceSchemaFingerprint: String(row.source_schema_fingerprint),
    sourceSchemaFields: normalizeSourceSchemaFields(row.source_schema_fields),
    canonicalSchemaFingerprint: String(row.canonical_schema_fingerprint),
    canonicalSchemaFields: jsonArray<SchemaFieldSnapshot>(
      row.canonical_schema_fields
    ),
    driftState: String(row.drift_state) as
      | "baseline-required"
      | "clean"
      | "drift-detected",
    sourceChanges: jsonArray<SchemaDriftChange>(row.source_changes),
    canonicalChanges: jsonArray<SchemaDriftChange>(row.canonical_changes),
    affectedMappings: jsonArray<AffectedMapping>(row.affected_mappings),
    repairSuggestions: jsonArray<RepairSuggestion>(row.repair_suggestions),
    scannedBy: String(row.scanned_by),
    scannedAt: new Date(String(row.scanned_at)).toISOString()
  };
}

function repairFromRow(row: Record<string, unknown>) {
  return {
    workspaceId: String(row.workspace_id),
    repairSessionId: String(row.repair_session_id),
    driftScanId: String(row.drift_scan_id),
    mappingProfileId: String(row.mapping_profile_id),
    sourceProfileRevision: Number(row.source_profile_revision),
    proposedMappingEntries: jsonArray<FieldMappingEntry>(
      row.proposed_mapping_entries
    ),
    sourceSchemaVersion: String(row.source_schema_version),
    sourceSchemaFingerprint: String(row.source_schema_fingerprint),
    sourceSchemaFields: normalizeSourceSchemaFields(row.source_schema_fields),
    canonicalSchemaFingerprint: String(row.canonical_schema_fingerprint),
    status: String(row.status) as
      | "prepared"
      | "applied-to-mapping-draft"
      | "cancelled",
    note: String(row.note ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

async function requireWorkspaceAdmin(
  client: import("pg").PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    "select role from app.workspace_members where workspace_id=$1 and user_id=nullif(current_setting('app.user_id',true),'') limit 1",
    [workspaceId]
  );
  if (result.rows[0]?.role !== "owner" && result.rows[0]?.role !== "admin") {
    throw new Error("workspace_admin_required");
  }
}

async function appendDriftEvent(
  client: import("pg").PoolClient,
  userId: string,
  input: {
    workspaceId: string;
    mappingProfileId: string;
    driftScanId?: string | null;
    repairSessionId?: string | null;
    eventType:
      | "scan-recorded"
      | "repair-prepared"
      | "repair-applied-to-draft"
      | "repair-cancelled";
    details: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.workspace_field_mapping_drift_events (
      workspace_id,event_id,mapping_profile_id,drift_scan_id,repair_session_id,
      event_type,actor_user_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      input.workspaceId,
      randomUUID(),
      input.mappingProfileId,
      input.driftScanId ?? null,
      input.repairSessionId ?? null,
      input.eventType,
      userId,
      JSON.stringify(input.details)
    ]
  );
}

async function appendMappingProfileEvent(
  client: import("pg").PoolClient,
  userId: string,
  input: {
    workspaceId: string;
    mappingProfileId: string;
    revision: number;
    details: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.workspace_field_mapping_profile_events (
      workspace_id,event_id,mapping_profile_id,event_type,actor_user_id,revision,details
    ) values ($1,$2,$3,'reopened',$4,$5,$6::jsonb)`,
    [
      input.workspaceId,
      randomUUID(),
      input.mappingProfileId,
      userId,
      input.revision,
      JSON.stringify(input.details)
    ]
  );
}

export async function listSchemaDriftAssistantForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const [profiles, scans, repairs, events] = await Promise.all([
      client.query(
        "select * from app.workspace_field_mapping_profiles order by updated_at desc limit 500"
      ),
      client.query(
        "select * from app.workspace_field_mapping_drift_scans order by scanned_at desc limit 500"
      ),
      client.query(
        "select * from app.workspace_field_mapping_repair_sessions order by updated_at desc limit 500"
      ),
      client.query(
        "select * from app.workspace_field_mapping_drift_events order by created_at desc limit 500"
      )
    ]);
    return {
      profiles: profiles.rows.map(profileFromRow),
      scans: scans.rows.map(scanFromRow),
      repairs: repairs.rows.map(repairFromRow),
      events: events.rows.map((row) => ({
        eventId: String(row.event_id),
        mappingProfileId: String(row.mapping_profile_id),
        driftScanId: row.drift_scan_id ? String(row.drift_scan_id) : null,
        repairSessionId: row.repair_session_id
          ? String(row.repair_session_id)
          : null,
        eventType: String(row.event_type),
        details:
          row.details && typeof row.details === "object"
            ? (row.details as Record<string, unknown>)
            : {},
        createdAt: new Date(String(row.created_at)).toISOString()
      }))
    };
  });

  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace])
  );
  const latestScanByProfile = new Map<string, (typeof data.scans)[number]>();
  for (const scan of data.scans) {
    if (!latestScanByProfile.has(scan.mappingProfileId)) {
      latestScanByProfile.set(scan.mappingProfileId, scan);
    }
  }
  const activeRepairByProfile = new Map<string, (typeof data.repairs)[number]>();
  for (const repair of data.repairs) {
    if (
      repair.status === "prepared" &&
      !activeRepairByProfile.has(repair.mappingProfileId)
    ) {
      activeRepairByProfile.set(repair.mappingProfileId, repair);
    }
  }

  const profiles = data.profiles.map((profile) => {
    const workspace = workspaceById.get(profile.workspaceId);
    const latestScan = latestScanByProfile.get(profile.mappingProfileId) ?? null;
    const activeRepair =
      activeRepairByProfile.get(profile.mappingProfileId) ?? null;
    return {
      ...profile,
      workspaceName: workspace?.name ?? profile.workspaceId,
      canManage:
        workspace?.role === "owner" || workspace?.role === "admin",
      latestScan,
      activeRepair,
      deliveryReadiness:
        profile.reviewStatus !== "reviewed"
          ? "mapping-review-required"
          : !profile.sourceSchemaFingerprint
            ? "source-baseline-required"
            : !profile.canonicalCurrent
              ? "canonical-drift"
              : !latestScan
                ? "fresh-drift-scan-required"
                : latestScan.profileRevision !== profile.revision
                  ? "fresh-drift-scan-required"
                  : latestScan.driftState === "clean"
                    ? "drift-clear"
                    : latestScan.driftState
    };
  });

  return {
    schema: "ai-data-platform.schema-drift-repair-assistant.v1" as const,
    build: 288 as const,
    generatedAt: new Date().toISOString(),
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      role: workspace.role,
      canManage: workspace.role === "owner" || workspace.role === "admin"
    })),
    profiles,
    scans: data.scans,
    repairs: data.repairs,
    events: data.events,
    summary: {
      profiles: profiles.length,
      driftClear: profiles.filter(
        (profile) => profile.deliveryReadiness === "drift-clear"
      ).length,
      baselineRequired: profiles.filter(
        (profile) => profile.deliveryReadiness === "source-baseline-required"
      ).length,
      driftDetected: profiles.filter((profile) =>
        ["canonical-drift", "drift-detected"].includes(
          profile.deliveryReadiness
        )
      ).length,
      freshScanRequired: profiles.filter(
        (profile) => profile.deliveryReadiness === "fresh-drift-scan-required"
      ).length,
      preparedRepairs: data.repairs.filter(
        (repair) => repair.status === "prepared"
      ).length
    },
    policy: {
      driftMustBeClearBeforeDelivery: true as const,
      sourceSchemaValuesStored: false as const,
      schemaDescriptorsOnly: true as const,
      deterministicSuggestionsOnlyAutoPrepared: true as const,
      repairsApplyToDraftOnly: true as const,
      reviewedMappingNeverAutoApproved: true as const,
      ownerAdminMutationOnly: true as const,
      automaticConnectionActivation: false as const,
      liveExchangeAuthorized: false as const,
      ql266Resumed: false as const
    }
  };
}

export async function recordSchemaDriftScan(
  userId: string,
  input: {
    workspaceId: unknown;
    mappingProfileId: unknown;
    sourceSchemaVersion: unknown;
    sourceSchemaFields: unknown;
  }
) {
  const workspaceId = String(input.workspaceId ?? "").trim();
  const mappingProfileId = String(input.mappingProfileId ?? "").trim();
  const sourceSchemaVersion = String(input.sourceSchemaVersion ?? "").trim();
  if (!workspaceId || !mappingProfileId) {
    throw new Error("schema_drift_profile_required");
  }
  if (!sourceSchemaVersion || sourceSchemaVersion.length > 120) {
    throw new Error("schema_drift_source_version_invalid");
  }
  const currentSourceFields = normalizeSourceSchemaFields(
    input.sourceSchemaFields
  );

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);
    const profileResult = await client.query<MappingProfileRow>(
      "select * from app.workspace_field_mapping_profiles where workspace_id=$1 and mapping_profile_id=$2 for update",
      [workspaceId, mappingProfileId]
    );
    if (!profileResult.rows[0]) {
      throw new Error("field_mapping_profile_not_found");
    }
    const profile = profileFromRow(profileResult.rows[0]);
    const contract = getCrossAppDataContract(profile.contractId);
    if (!contract) throw new Error("schema_drift_contract_not_found");

    const priorScan = await client.query<Record<string, unknown>>(
      `select canonical_schema_fields
       from app.workspace_field_mapping_drift_scans
       where workspace_id=$1 and mapping_profile_id=$2
       order by scanned_at desc
       limit 1`,
      [workspaceId, mappingProfileId]
    );

    const analysis = analyzeSchemaDrift({
      mappingEntries: profile.mappingEntries,
      profileCanonicalFingerprint: profile.schemaFingerprint,
      profileSourceSchemaVersion: profile.sourceSchemaVersion,
      profileSourceSchemaFields: profile.sourceSchemaFields,
      currentSourceSchemaVersion: sourceSchemaVersion,
      currentSourceSchemaFields: currentSourceFields,
      currentContract: contract,
      previousCanonicalFields: priorScan.rows[0]
        ? jsonArray<SchemaFieldSnapshot>(
            priorScan.rows[0].canonical_schema_fields
          )
        : null
    });

    const driftScanId = randomUUID();
    const result = await client.query<Record<string, unknown>>(
      `insert into app.workspace_field_mapping_drift_scans (
        workspace_id,drift_scan_id,mapping_profile_id,profile_revision,
        source_schema_version,source_schema_fingerprint,source_schema_fields,
        canonical_schema_fingerprint,canonical_schema_fields,drift_state,
        source_changes,canonical_changes,affected_mappings,repair_suggestions,
        scanned_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10,
        $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15
      ) returning *`,
      [
        workspaceId,
        driftScanId,
        mappingProfileId,
        profile.revision,
        sourceSchemaVersion,
        analysis.sourceFingerprint,
        JSON.stringify(currentSourceFields),
        analysis.canonicalFingerprint,
        JSON.stringify(canonicalSchemaSnapshot(contract)),
        analysis.driftState,
        JSON.stringify(analysis.sourceChanges),
        JSON.stringify(analysis.canonicalChanges),
        JSON.stringify(analysis.affectedMappings),
        JSON.stringify(analysis.repairSuggestions),
        userId
      ]
    );

    await appendDriftEvent(client, userId, {
      workspaceId,
      mappingProfileId,
      driftScanId,
      eventType: "scan-recorded",
      details: {
        profileRevision: profile.revision,
        driftState: analysis.driftState,
        sourceSchemaVersion,
        sourceSchemaFingerprint: analysis.sourceFingerprint,
        canonicalSchemaFingerprint: analysis.canonicalFingerprint,
        blockingChanges: analysis.blockingChanges,
        affectedMappings: analysis.affectedMappings.length,
        suggestions: analysis.repairSuggestions.length
      }
    });

    return scanFromRow(result.rows[0]);
  });
}

export async function prepareSchemaDriftRepair(
  userId: string,
  input: {
    workspaceId: unknown;
    driftScanId: unknown;
    note?: unknown;
  }
) {
  const workspaceId = String(input.workspaceId ?? "").trim();
  const driftScanId = String(input.driftScanId ?? "").trim();
  const note = String(input.note ?? "").trim().slice(0, 4000);
  if (!workspaceId || !driftScanId) {
    throw new Error("schema_drift_scan_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);
    const scanResult = await client.query<Record<string, unknown>>(
      "select * from app.workspace_field_mapping_drift_scans where workspace_id=$1 and drift_scan_id=$2",
      [workspaceId, driftScanId]
    );
    if (!scanResult.rows[0]) throw new Error("schema_drift_scan_not_found");
    const scan = scanFromRow(scanResult.rows[0]);

    const profileResult = await client.query<MappingProfileRow>(
      "select * from app.workspace_field_mapping_profiles where workspace_id=$1 and mapping_profile_id=$2 for update",
      [workspaceId, scan.mappingProfileId]
    );
    if (!profileResult.rows[0]) {
      throw new Error("field_mapping_profile_not_found");
    }
    const profile = profileFromRow(profileResult.rows[0]);
    if (profile.revision !== scan.profileRevision) {
      throw new Error("schema_drift_scan_stale");
    }

    const contract = getCrossAppDataContract(profile.contractId);
    if (!contract) throw new Error("schema_drift_contract_not_found");
    if (contract.schemaFingerprint !== scan.canonicalSchemaFingerprint) {
      throw new Error("schema_drift_scan_stale");
    }

    const proposed = applyDeterministicRepairSuggestions(
      profile.mappingEntries,
      scan.repairSuggestions
    );
    normalizeFieldMappingEntries(proposed, contract);

    const repairSessionId = randomUUID();
    const result = await client.query<Record<string, unknown>>(
      `insert into app.workspace_field_mapping_repair_sessions (
        workspace_id,repair_session_id,drift_scan_id,mapping_profile_id,
        source_profile_revision,proposed_mapping_entries,source_schema_version,
        source_schema_fingerprint,source_schema_fields,canonical_schema_fingerprint,
        note,created_by,updated_by
      ) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb,$10,$11,$12,$12)
      returning *`,
      [
        workspaceId,
        repairSessionId,
        driftScanId,
        profile.mappingProfileId,
        profile.revision,
        JSON.stringify(proposed),
        scan.sourceSchemaVersion,
        scan.sourceSchemaFingerprint,
        JSON.stringify(scan.sourceSchemaFields),
        scan.canonicalSchemaFingerprint,
        note,
        userId
      ]
    );

    await appendDriftEvent(client, userId, {
      workspaceId,
      mappingProfileId: profile.mappingProfileId,
      driftScanId,
      repairSessionId,
      eventType: "repair-prepared",
      details: {
        sourceProfileRevision: profile.revision,
        proposedMappings: proposed.length,
        deterministicActions: scan.repairSuggestions.filter(
          (suggestion) =>
            suggestion.actionable &&
            suggestion.confidence === "deterministic"
        ).length,
        reviewRequiredSuggestions: scan.repairSuggestions.filter(
          (suggestion) => !suggestion.actionable
        ).length
      }
    });

    return repairFromRow(result.rows[0]);
  });
}

export async function applySchemaDriftRepairToDraft(
  userId: string,
  input: {
    workspaceId: unknown;
    repairSessionId: unknown;
    note?: unknown;
  }
) {
  const workspaceId = String(input.workspaceId ?? "").trim();
  const repairSessionId = String(input.repairSessionId ?? "").trim();
  const note = String(input.note ?? "").trim().slice(0, 4000);
  if (!workspaceId || !repairSessionId) {
    throw new Error("schema_drift_repair_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);
    const repairResult = await client.query<Record<string, unknown>>(
      "select * from app.workspace_field_mapping_repair_sessions where workspace_id=$1 and repair_session_id=$2 for update",
      [workspaceId, repairSessionId]
    );
    if (!repairResult.rows[0]) throw new Error("schema_drift_repair_not_found");
    const repair = repairFromRow(repairResult.rows[0]);
    if (repair.status !== "prepared") {
      throw new Error("schema_drift_repair_not_prepared");
    }

    const profileResult = await client.query<MappingProfileRow>(
      "select * from app.workspace_field_mapping_profiles where workspace_id=$1 and mapping_profile_id=$2 for update",
      [workspaceId, repair.mappingProfileId]
    );
    if (!profileResult.rows[0]) {
      throw new Error("field_mapping_profile_not_found");
    }
    const profile = profileFromRow(profileResult.rows[0]);
    if (profile.revision !== repair.sourceProfileRevision) {
      throw new Error("schema_drift_repair_stale");
    }

    const contract = getCrossAppDataContract(profile.contractId);
    if (!contract) throw new Error("schema_drift_contract_not_found");
    if (contract.schemaFingerprint !== repair.canonicalSchemaFingerprint) {
      throw new Error("schema_drift_repair_stale");
    }

    const entries = normalizeFieldMappingEntries(
      repair.proposedMappingEntries,
      contract
    );
    const validation = validateFieldMappingEntries(entries, contract);
    const revision = profile.revision + 1;

    const updated = await client.query<MappingProfileRow>(
      `update app.workspace_field_mapping_profiles
       set
         contract_version=$3,
         schema_fingerprint=$4,
         mapping_entries=$5::jsonb,
         source_schema_version=$6,
         source_schema_fingerprint=$7,
         source_schema_fields=$8::jsonb,
         source_schema_reviewed_at=now(),
         review_status='draft',
         revision=$9,
         reviewed_by=null,
         reviewed_at=null,
         updated_by=$10,
         updated_at=now()
       where workspace_id=$1 and mapping_profile_id=$2
       returning *`,
      [
        workspaceId,
        profile.mappingProfileId,
        contract.version,
        contract.schemaFingerprint,
        JSON.stringify(entries),
        repair.sourceSchemaVersion,
        repair.sourceSchemaFingerprint,
        JSON.stringify(repair.sourceSchemaFields),
        revision,
        userId
      ]
    );

    await client.query(
      `update app.workspace_field_mapping_repair_sessions
       set status='applied-to-mapping-draft', note=$3, updated_by=$4, updated_at=now()
       where workspace_id=$1 and repair_session_id=$2`,
      [workspaceId, repairSessionId, note || repair.note, userId]
    );

    await appendMappingProfileEvent(client, userId, {
      workspaceId,
      mappingProfileId: profile.mappingProfileId,
      revision,
      details: {
        build: 288,
        reason: "schema-drift-repair-applied-to-draft",
        driftScanId: repair.driftScanId,
        repairSessionId,
        sourceSchemaVersion: repair.sourceSchemaVersion,
        sourceSchemaFingerprint: repair.sourceSchemaFingerprint,
        canonicalSchemaFingerprint: repair.canonicalSchemaFingerprint,
        mappedTargets: validation.mappedTargets,
        mappedRequiredTargets: validation.mappedRequiredTargets,
        requiredTargets: validation.requiredTargets,
        reviewStatus: "draft"
      }
    });

    await appendDriftEvent(client, userId, {
      workspaceId,
      mappingProfileId: profile.mappingProfileId,
      driftScanId: repair.driftScanId,
      repairSessionId,
      eventType: "repair-applied-to-draft",
      details: {
        sourceProfileRevision: profile.revision,
        newProfileRevision: revision,
        reviewStatus: "draft",
        mappingReviewStillRequired: true
      }
    });

    return profileFromRow(updated.rows[0]);
  });
}

export async function cancelSchemaDriftRepair(
  userId: string,
  input: {
    workspaceId: unknown;
    repairSessionId: unknown;
    note?: unknown;
  }
) {
  const workspaceId = String(input.workspaceId ?? "").trim();
  const repairSessionId = String(input.repairSessionId ?? "").trim();
  const note = String(input.note ?? "").trim().slice(0, 4000);
  if (!workspaceId || !repairSessionId) {
    throw new Error("schema_drift_repair_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);
    const current = await client.query<Record<string, unknown>>(
      "select * from app.workspace_field_mapping_repair_sessions where workspace_id=$1 and repair_session_id=$2 for update",
      [workspaceId, repairSessionId]
    );
    if (!current.rows[0]) throw new Error("schema_drift_repair_not_found");
    const repair = repairFromRow(current.rows[0]);
    if (repair.status !== "prepared") {
      throw new Error("schema_drift_repair_not_prepared");
    }

    const result = await client.query<Record<string, unknown>>(
      `update app.workspace_field_mapping_repair_sessions
       set status='cancelled', note=$3, updated_by=$4, updated_at=now()
       where workspace_id=$1 and repair_session_id=$2
       returning *`,
      [workspaceId, repairSessionId, note || repair.note, userId]
    );

    await appendDriftEvent(client, userId, {
      workspaceId,
      mappingProfileId: repair.mappingProfileId,
      driftScanId: repair.driftScanId,
      repairSessionId,
      eventType: "repair-cancelled",
      details: { note: note || repair.note }
    });

    return repairFromRow(result.rows[0]);
  });
}
