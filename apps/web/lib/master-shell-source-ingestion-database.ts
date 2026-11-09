import {
  createHash,
  randomUUID,
  timingSafeEqual
} from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  type MasterShellSourceId
} from "./master-shell-contract-v1";
import {
  canAdvanceRegistryFromNormalizedUpdate,
  mapWebhookSourceToMasterShellSource,
  normalizeMasterShellSourceUpdate,
  type NormalizedMasterShellSourceUpdate
} from "./master-shell-source-ingestion-core";
import {
  recordMasterShellSourceRegistryEvidence
} from "./master-shell-source-registry-database";
import type {
  MasterShellSourceEvidence
} from "./master-shell-source-registry-core";
import {
  decodeWebhookSecret,
  parseWebhookEventEnvelope,
  signWebhookReceipt,
  type WebhookReceiptPayload
} from "./webhook-gateway-core";

type ReceiptTransportRow = {
  receipt_id: string;
  endpoint_id: string;
  workspace_id: string;
  source_application_id: string;
  environment: "nonproduction" | "production";
  tenant_id: string | null;
  event_id: string;
  event_type: string;
  event_envelope: unknown;
  receipt_payload: unknown;
  receipt_signature: string;
  body_sha256: string;
  received_at: Date;
  endpoint_key: string;
  key_id: string;
  secret_env_var: string;
  enabled: boolean;
  revoked_at: Date | null;
};

type IngestionRow = {
  ingestion_id: string;
  workspace_id: string;
  webhook_receipt_id: string;
  source_id: MasterShellSourceId;
  transport_source_application_id: string;
  transport_endpoint_id: string;
  transport_key_id: string;
  transport_secret_fingerprint_sha256: string;
  environment: "nonproduction" | "production";
  tenant_id: string | null;
  master_event_id: string;
  event_type:
    | "source.health.reported"
    | "release.promoted"
    | "module.readiness.changed"
    | "audit.evidence.recorded";
  source_revision: string;
  source_sequence: string;
  sequence_state: "first" | "in-order" | "out-of-order";
  correlation_id: string;
  causation_id: string | null;
  evidence_uri: string;
  verification_state: string;
  normalized_payload: Record<string, unknown>;
  expires_at: Date;
  freshness: "fresh" | "stale";
  occurred_at: Date;
  published_at: Date;
  received_at: Date;
  ingested_at: Date;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameSignature(left: string, right: string) {
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(left, "base64url");
    b = Buffer.from(right, "base64url");
  } catch {
    return false;
  }
  const equal =
    a.byteLength === b.byteLength &&
    a.byteLength > 0 &&
    timingSafeEqual(a, b);
  a.fill(0);
  b.fill(0);
  return equal;
}

function transportSecretFingerprint(secret: Buffer) {
  return createHash("sha256").update(secret).digest("hex");
}

function receiptPayload(
  value: unknown
): WebhookReceiptPayload {
  const input = record(value);
  if (!input) {
    throw new Error("master_shell_ingestion_receipt_payload_invalid");
  }
  const payload = input as unknown as WebhookReceiptPayload;
  if (
    typeof payload.schema_version !== "string" ||
    typeof payload.gateway_id !== "string" ||
    typeof payload.endpoint_key !== "string" ||
    typeof payload.source_application_id !== "string" ||
    typeof payload.event_id !== "string" ||
    typeof payload.event_type !== "string" ||
    typeof payload.body_sha256 !== "string" ||
    payload.status !== "accepted" ||
    typeof payload.key_id !== "string" ||
    typeof payload.received_at !== "string"
  ) {
    throw new Error("master_shell_ingestion_receipt_payload_invalid");
  }
  return payload;
}

async function requireWorkspaceAdmin(
  client: PoolClient,
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
    throw new Error("master_shell_ingestion_workspace_admin_required");
  }
}

async function loadTransportReceipt(
  client: PoolClient,
  receiptId: string
) {
  const result = await client.query<ReceiptTransportRow>(
    `select
       r.receipt_id,r.endpoint_id,r.workspace_id,
       r.source_application_id,r.environment,r.tenant_id,
       r.event_id,r.event_type,r.event_envelope,r.receipt_payload,
       r.receipt_signature,r.body_sha256,r.received_at,
       e.endpoint_key,e.key_id,e.secret_env_var,e.enabled,e.revoked_at
     from app.webhook_receipts r
     join app.webhook_endpoints e on e.endpoint_id=r.endpoint_id
     where r.receipt_id=$1
     limit 1`,
    [receiptId]
  );
  if (!result.rows[0]) {
    throw new Error("master_shell_ingestion_receipt_not_found");
  }
  return result.rows[0];
}

function verifyTransportReceipt(row: ReceiptTransportRow) {
  if (row.event_type !== "master-shell.source-update") {
    throw new Error("master_shell_ingestion_transport_event_invalid");
  }

  const payload = receiptPayload(row.receipt_payload);
  if (
    payload.endpoint_key !== row.endpoint_key ||
    payload.source_application_id !== row.source_application_id ||
    payload.event_id !== row.event_id ||
    payload.event_type !== row.event_type ||
    payload.body_sha256 !== row.body_sha256 ||
    payload.key_id !== row.key_id ||
    payload.status !== "accepted"
  ) {
    throw new Error("master_shell_ingestion_receipt_binding_invalid");
  }

  const secret = decodeWebhookSecret(
    process.env[row.secret_env_var]
  );
  if (!secret) {
    throw new Error("master_shell_ingestion_transport_secret_unavailable");
  }

  try {
    const expectedSignature = signWebhookReceipt(secret, payload);
    if (!sameSignature(expectedSignature, row.receipt_signature)) {
      throw new Error(
        "master_shell_ingestion_receipt_signature_invalid"
      );
    }

    const outer = parseWebhookEventEnvelope(row.event_envelope);
    if (
      outer.eventId !== row.event_id ||
      outer.eventType !== row.event_type ||
      outer.sourceApplicationId !== row.source_application_id ||
      outer.tenantId !== row.tenant_id
    ) {
      throw new Error("master_shell_ingestion_outer_event_mismatch");
    }

    const sourceId = mapWebhookSourceToMasterShellSource(
      row.source_application_id
    );
    const masterShellEvent = record(outer.data)?.masterShellEvent;
    const normalized = normalizeMasterShellSourceUpdate({
      transportSourceApplicationId: row.source_application_id,
      transportTenantId: row.tenant_id,
      envelope: masterShellEvent
    });

    if (normalized.sourceId !== sourceId) {
      throw new Error("master_shell_ingestion_source_mismatch");
    }

    return {
      outer,
      normalized,
      secretFingerprint: transportSecretFingerprint(secret)
    };
  } finally {
    secret.fill(0);
  }
}

function rowToModel(row: IngestionRow) {
  return {
    ingestionId: row.ingestion_id,
    workspaceId: row.workspace_id,
    webhookReceiptId: row.webhook_receipt_id,
    sourceId: row.source_id,
    transportSourceApplicationId:
      row.transport_source_application_id,
    transportEndpointId: row.transport_endpoint_id,
    transportKeyId: row.transport_key_id,
    transportSecretFingerprintSha256:
      row.transport_secret_fingerprint_sha256,
    environment: row.environment,
    tenantId: row.tenant_id,
    masterEventId: row.master_event_id,
    eventType: row.event_type,
    sourceRevision: row.source_revision,
    sourceSequence: Number(row.source_sequence),
    sequenceState: row.sequence_state,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    evidenceURI: row.evidence_uri,
    verificationState: row.verification_state,
    normalizedPayload: row.normalized_payload,
    expiresAt: row.expires_at.toISOString(),
    freshness: row.freshness,
    occurredAt: row.occurred_at.toISOString(),
    publishedAt: row.published_at.toISOString(),
    receivedAt: row.received_at.toISOString(),
    ingestedAt: row.ingested_at.toISOString()
  };
}

function registryEvidenceFromUpdate(input: {
  update: NormalizedMasterShellSourceUpdate;
  environment: "nonproduction" | "production";
  transportKeyId: string;
  transportSecretFingerprintSha256: string;
  acceptRegistryState: boolean;
}): Omit<MasterShellSourceEvidence, "recordVersion"> | null {
  if (
    !canAdvanceRegistryFromNormalizedUpdate(input.update) ||
    !input.acceptRegistryState ||
    input.update.eventType !== "source.health.reported"
  ) {
    return null;
  }

  const payload =
    input.update.normalizedPayload as {
      expiresAt: string;
      registryStatus: Exclude<
        MasterShellSourceEvidence["declaredStatus"],
        "STALE"
      >;
      manifestURI: string | null;
      capabilityVersion: string | null;
      approvedOrigin: string | null;
      rolesAllowed: string[];
      holdReason: string | null;
      testEvidenceURI: string | null;
      connectionEvidenceURI: string | null;
    };

  const requiresTest =
    payload.registryStatus === "TEST_VERIFIED" ||
    payload.registryStatus === "CONNECTED";
  const isConnected = payload.registryStatus === "CONNECTED";

  return {
    sourceId: input.update.sourceId,
    environment: input.environment,
    declaredStatus: payload.registryStatus,
    statusObservedAt: input.update.envelope.occurredAt,
    statusExpiresAt: payload.expiresAt,
    evidenceURI: input.update.envelope.evidenceURI,
    manifestURI: payload.manifestURI,
    immutableRevision: input.update.envelope.sourceRevision,
    capabilityVersion: payload.capabilityVersion,
    approvedOrigin: payload.approvedOrigin,
    signerKeyId: input.transportKeyId,
    signerFingerprint:
      input.transportSecretFingerprintSha256,
    rolesAllowed: payload.rolesAllowed,
    holdReason: payload.holdReason,
    testEvidenceURI: payload.testEvidenceURI,
    connectionEvidenceURI: payload.connectionEvidenceURI,
    ownerAuthorized:
      payload.registryStatus === "AUTHORIZATION_HELD"
        ? false
        : input.acceptRegistryState,
    independentTestVerified: requiresTest,
    independentConnectionVerified: isConnected,
    evidenceAuthority: "independent-source-verification"
  };
}

export async function ingestMasterShellWebhookReceipt(
  userId: string,
  input: {
    receiptId: string;
    acceptRegistryState?: boolean;
  }
) {
  if (!UUID.test(input.receiptId)) {
    throw new Error("master_shell_ingestion_receipt_id_invalid");
  }

  const result = await withUserDatabase(userId, async (client) => {
    const row = await loadTransportReceipt(client, input.receiptId);
    await requireWorkspaceAdmin(client, row.workspace_id);

    const transport = verifyTransportReceipt(row);
    const update = transport.normalized;

    const prior = await client.query<{ max_sequence: string | null }>(
      `select max(source_sequence)::text as max_sequence
       from app.master_shell_source_updates
       where source_id=$1`,
      [update.sourceId]
    );
    const previous =
      prior.rows[0]?.max_sequence === null ||
      prior.rows[0]?.max_sequence === undefined
        ? null
        : Number(prior.rows[0].max_sequence);
    const sequenceState =
      previous === null
        ? "first"
        : update.envelope.sourceSequence > previous
          ? "in-order"
          : "out-of-order";

    const inserted = await client.query<IngestionRow>(
      `insert into app.master_shell_source_updates (
        ingestion_id,actor_user_id,workspace_id,webhook_receipt_id,
        source_id,transport_source_application_id,transport_endpoint_id,
        transport_key_id,transport_secret_fingerprint_sha256,
        transport_body_sha256,transport_receipt_signature,
        transport_identity_verified,environment,tenant_id,
        master_event_id,event_type,source_revision,source_sequence,
        sequence_state,correlation_id,causation_id,idempotency_key,
        sensitivity,evidence_uri,verification_state,payload_hash,
        normalized_payload,expires_at,freshness,occurred_at,published_at,
        received_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,$28,
        $29,$30,$31
      )
      on conflict do nothing
      returning *`,
      [
        randomUUID(),
        userId,
        row.workspace_id,
        row.receipt_id,
        update.sourceId,
        row.source_application_id,
        row.endpoint_id,
        row.key_id,
        transport.secretFingerprint,
        row.body_sha256,
        row.receipt_signature,
        row.environment,
        row.tenant_id,
        update.envelope.eventId,
        update.eventType,
        update.envelope.sourceRevision,
        update.envelope.sourceSequence,
        sequenceState,
        update.envelope.correlationId,
        update.envelope.causationId,
        update.envelope.idempotencyKey,
        update.envelope.sensitivity,
        update.envelope.evidenceURI,
        update.envelope.verificationState,
        update.envelope.payloadHash,
        JSON.stringify(update.normalizedPayload),
        update.expiresAt,
        update.freshness,
        update.envelope.occurredAt,
        update.envelope.publishedAt,
        row.received_at
      ]
    );

    if (!inserted.rows[0]) {
      throw new Error("master_shell_ingestion_duplicate_suppressed");
    }

    return {
      ingestion: rowToModel(inserted.rows[0]),
      update,
      transport: {
        environment: row.environment,
        keyId: row.key_id,
        secretFingerprint: transport.secretFingerprint,
        endpointCurrentActive:
          row.enabled === true && row.revoked_at === null
      },
      registryEligible:
        row.enabled === true &&
        row.revoked_at === null &&
        sequenceState !== "out-of-order" &&
        canAdvanceRegistryFromNormalizedUpdate(update)
    };
  });

  let registryAdvance:
    | { attempted: false; advanced: false; reason: string }
    | {
        attempted: true;
        advanced: boolean;
        reason: string | null;
        evidence?: MasterShellSourceEvidence;
      };

  if (!input.acceptRegistryState) {
    registryAdvance = {
      attempted: false,
      advanced: false,
      reason: "owner_state_acceptance_not_requested"
    };
  } else if (!result.registryEligible) {
    registryAdvance = {
      attempted: false,
      advanced: false,
      reason: "normalized_update_not_registry_eligible"
    };
  } else {
    const evidence = registryEvidenceFromUpdate({
      update: result.update,
      environment: result.transport.environment,
      transportKeyId: result.transport.keyId,
      transportSecretFingerprintSha256:
        result.transport.secretFingerprint,
      acceptRegistryState: true
    });
    if (!evidence) {
      registryAdvance = {
        attempted: false,
        advanced: false,
        reason: "normalized_update_not_registry_eligible"
      };
    } else {
      try {
        const recorded =
          await recordMasterShellSourceRegistryEvidence(
            userId,
            evidence,
            {
              evidenceAuthority:
                "independent-source-verification"
            }
          );
        registryAdvance = {
          attempted: true,
          advanced: true,
          reason: null,
          evidence: recorded
        };
      } catch (error) {
        registryAdvance = {
          attempted: true,
          advanced: false,
          reason:
            error instanceof Error
              ? error.message
              : "master_shell_registry_projection_failed"
        };
      }
    }
  }

  return {
    ...result.ingestion,
    registryAdvance,
    policy: {
      sourceMutationPerformed: false,
      outboundDeliveryPerformed: false,
      legacyReceiptUpgradedAutomatically: false,
      acceptedReceiptReverified: true,
      currentActiveTransportRequiredForRegistryProjection: true,
      rawSecretPersisted: false,
      outOfOrderAdvancesRegistry: false,
      staleEvidenceAdvancesRegistry: false,
      ownerAcceptanceRequiredForRegistryProjection: true
    }
  };
}

export async function listMasterShellSourceIngestionForUser(
  userId: string
) {
  return withUserDatabase(userId, async (client) => {
    const [ingestions, pending] = await Promise.all([
      client.query<IngestionRow>(
        `select *
         from app.master_shell_source_updates
         order by ingested_at desc
         limit 200`
      ),
      client.query<{
        receipt_id: string;
        workspace_id: string;
        source_application_id: string;
        tenant_id: string | null;
        event_id: string;
        received_at: Date;
      }>(
        `select
           r.receipt_id,r.workspace_id,r.source_application_id,
           r.tenant_id,r.event_id,r.received_at
         from app.webhook_receipts r
         where r.event_type='master-shell.source-update'
           and r.source_application_id <> 'rosevear-comms-hub'
           and not exists (
             select 1
             from app.master_shell_source_updates u
             where u.webhook_receipt_id=r.receipt_id
           )
         order by r.received_at desc
         limit 100`
      )
    ]);

    const normalized = ingestions.rows.map(rowToModel);
    return {
      schema: "ai-data-platform.master-shell-source-ingestion.v1",
      build: 337,
      generatedAt: new Date().toISOString(),
      ingestions: normalized,
      pendingReceipts: pending.rows.map((row) => ({
        receiptId: row.receipt_id,
        workspaceId: row.workspace_id,
        sourceApplicationId: row.source_application_id,
        sourceId: mapWebhookSourceToMasterShellSource(
          row.source_application_id
        ),
        tenantId: row.tenant_id,
        eventId: row.event_id,
        receivedAt: row.received_at.toISOString()
      })),
      summary: {
        ingested: normalized.length,
        pending: pending.rows.length,
        fresh: normalized.filter(
          (item) => item.freshness === "fresh"
        ).length,
        stale: normalized.filter(
          (item) => item.freshness === "stale"
        ).length,
        outOfOrder: normalized.filter(
          (item) => item.sequenceState === "out-of-order"
        ).length,
        independentlyVerified: normalized.filter(
          (item) =>
            item.verificationState === "independently-verified"
        ).length
      },
      policy: {
        signedWebhookReceiptRequired: true,
        signedReceiptReverified: true,
        exactSourceMappingRequired: true,
        exactTenantMatchRequired: true,
        aiDataAudienceRequired: true,
        duplicateSuppression: true,
        sourceSequenceTracked: true,
        outOfOrderPreservedButNotProjected: true,
        stalePreservedButNotProjected: true,
        sourceMutationPerformed: false,
        outboundDeliveryPerformed: false
      }
    };
  });
}
