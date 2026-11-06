import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";

import {
  consentAllowsRequest,
  normalizeConsentEvidence,
  normalizeNotificationRequest,
  safeNotificationReviewReason,
  type ConsentState,
  type NotificationChannel
} from "./notification-consent-core";
import { listWorkspacesForUser, withUserDatabase } from "./database";

async function requireWorkspaceAdmin(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: string }>(
    `select role from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") throw new Error("workspace_admin_required");
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function dateOrNull(value: unknown) {
  return value === null || value === undefined ? null : new Date(String(value));
}

export async function listNotificationConsentForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(userId, async (client) => {
    const [consents, requests, evidence] = await Promise.all([
      client.query(`select * from app.notification_consent_evidence order by recorded_at desc limit 500`),
      client.query(`
        select r.*, rv.decision, rv.reason, rv.reviewed_at
        from app.notification_requests r
        left join app.notification_request_reviews rv on rv.request_id=r.request_id
        order by r.created_at desc limit 500`
      ),
      client.query(`select * from app.notification_delivery_evidence order by recorded_at desc limit 500`)
    ]);

    return {
      consents: consents.rows.map((row) => ({
        consentId: String(row.consent_id),
        workspaceId: String(row.workspace_id),
        canonicalTenantKey: String(row.canonical_tenant_key),
        customerRecordId: String(row.customer_record_id),
        channel: String(row.channel) as NotificationChannel,
        state: String(row.consent_state) as ConsentState,
        basis: String(row.consent_basis),
        sourceApplicationId: String(row.source_application_id),
        sourceRecordId: String(row.source_record_id),
        observedAt: new Date(String(row.observed_at)),
        expiresAt: dateOrNull(row.expires_at),
        evidenceSha256: String(row.evidence_sha256),
        recordedAt: new Date(String(row.recorded_at))
      })),
      requests: requests.rows.map((row) => ({
        requestId: String(row.request_id),
        workspaceId: String(row.workspace_id),
        canonicalTenantKey: String(row.canonical_tenant_key),
        sourceApplicationId: String(row.source_application_id),
        sourceRecordId: String(row.source_record_id),
        customerRecordId: String(row.customer_record_id),
        channel: String(row.channel) as NotificationChannel,
        templateKey: String(row.template_key),
        consentBasis: String(row.consent_basis),
        requestedAt: new Date(String(row.requested_at)),
        scheduledAt: dateOrNull(row.scheduled_at),
        contentSummary: String(row.content_summary),
        operatorApplicationId: "rosevear-comms-hub" as const,
        consentId: row.consent_id ? String(row.consent_id) : null,
        consentCheck: String(row.consent_check),
        state: "held" as const,
        holdReason: "notification-dispatch-not-authorized" as const,
        reviewDecision: row.decision === "approve" || row.decision === "reject" ? row.decision : null,
        reviewReason: row.reason ? String(row.reason) : null,
        reviewedAt: dateOrNull(row.reviewed_at),
        createdAt: new Date(String(row.created_at))
      })),
      evidence: evidence.rows.map((row) => ({
        evidenceId: String(row.evidence_id),
        workspaceId: String(row.workspace_id),
        requestId: String(row.request_id),
        status: String(row.status),
        providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null,
        observedAt: new Date(String(row.observed_at)),
        evidenceSha256: String(row.evidence_sha256),
        recordedAt: new Date(String(row.recorded_at))
      }))
    };
  });

  return {
    workspaces,
    ...state,
    summary: {
      consentEvidence: state.consents.length,
      grantedConsents: state.consents.filter((item) => item.state === "granted").length,
      heldRequests: state.requests.length,
      consentBlockedRequests: state.requests.filter((item) => item.consentCheck !== "consent-granted").length,
      approvedForFutureOperatorHandoff: state.requests.filter((item) => item.reviewDecision === "approve").length,
      deliveryEvidence: state.evidence.length
    },
    policy: {
      build286NotificationContractReused: true,
      contractId: "rosevear.shared.notification.v1",
      preferredOperatorApplicationId: "rosevear-comms-hub",
      consentRequiredBeforeApproval: true,
      requestsRemainHeld: true,
      outboundNetworkRequests: false,
      automaticDispatch: false,
      providerApiCalls: false,
      peerApplicationWrites: false,
      ql266Resumed: false
    }
  };
}

export async function recordNotificationConsent(userId: string, input: {
  workspaceId: string;
  canonicalTenantKey: string;
  customerRecordId: string;
  channel: string;
  state: string;
  basis: string;
  sourceApplicationId: string;
  sourceRecordId: string;
  observedAt: string;
  expiresAt?: string | null;
}) {
  const normalized = normalizeConsentEvidence(input);
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const consentId = randomUUID();
    const result = await client.query<{ consent_id: string }>(
      `insert into app.notification_consent_evidence (
        consent_id,workspace_id,canonical_tenant_key,customer_record_id,channel,
        consent_state,consent_basis,source_application_id,source_record_id,
        observed_at,expires_at,evidence_sha256,recorded_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      on conflict (workspace_id,canonical_tenant_key,customer_record_id,channel,evidence_sha256)
      do nothing returning consent_id`,
      [
        consentId,input.workspaceId,normalized.canonicalTenantKey,normalized.customerRecordId,
        normalized.channel,normalized.state,normalized.basis,normalized.sourceApplicationId,
        normalized.sourceRecordId,normalized.observedAt,normalized.expiresAt,normalized.evidenceSha256,userId
      ]
    );
    let resolvedId = result.rows[0]?.consent_id ? String(result.rows[0].consent_id) : "";
    if (!resolvedId) {
      const existing = await client.query<{ consent_id: string }>(
        `select consent_id from app.notification_consent_evidence
         where workspace_id=$1 and canonical_tenant_key=$2 and customer_record_id=$3
           and channel=$4 and evidence_sha256=$5 limit 1`,
        [input.workspaceId,normalized.canonicalTenantKey,normalized.customerRecordId,normalized.channel,normalized.evidenceSha256]
      );
      resolvedId = existing.rows[0]?.consent_id ?? "";
    }
    if (!resolvedId) throw new Error("notification_consent_conflict");
    await client.query(
      `insert into app.notification_consent_audit
       (audit_id,workspace_id,actor_user_id,action,consent_id,details)
       values ($1,$2,$3,'consent-recorded',$4,$5::jsonb)`,
      [randomUUID(),input.workspaceId,userId,resolvedId,JSON.stringify({
        channel: normalized.channel,
        state: normalized.state,
        evidenceSha256: normalized.evidenceSha256
      })]
    );
    return { consentId: resolvedId, ...normalized };
  });
}

export async function prepareNotificationRequest(userId: string, input: {
  workspaceId: string;
  canonicalTenantKey: string;
  sourceApplicationId: string;
  sourceRecordId: string;
  customerRecordId: string;
  channel: string;
  templateKey: string;
  consentBasis: string;
  requestedAt: string;
  scheduledAt?: string | null;
  subject?: string | null;
  contentSummary: string;
}) {
  const normalized = normalizeNotificationRequest(input);
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);

    const consentResult = await client.query(
      `select * from app.notification_consent_evidence
       where workspace_id=$1 and canonical_tenant_key=$2 and customer_record_id=$3 and channel=$4
       order by observed_at desc, recorded_at desc limit 1`,
      [input.workspaceId,normalized.canonicalTenantKey,normalized.customerRecordId,normalized.channel]
    );
    const row = consentResult.rows[0];
    const consent = row ? {
      canonicalTenantKey: String(row.canonical_tenant_key),
      customerRecordId: String(row.customer_record_id),
      channel: String(row.channel) as NotificationChannel,
      state: String(row.consent_state) as ConsentState,
      basis: String(row.consent_basis),
      sourceApplicationId: String(row.source_application_id),
      sourceRecordId: String(row.source_record_id),
      observedAt: new Date(String(row.observed_at)).toISOString(),
      expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
      evidenceSha256: String(row.evidence_sha256)
    } : null;

    const consentDecision = consentAllowsRequest(consent, normalized);
    const requestId = randomUUID();
    const result = await client.query<{ request_id: string }>(
      `insert into app.notification_requests (
        request_id,workspace_id,canonical_tenant_key,source_application_id,source_record_id,
        customer_record_id,channel,template_key,consent_basis,requested_at,scheduled_at,
        subject,content_summary,portable_record,request_sha256,consent_id,consent_check,created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18)
      on conflict (workspace_id,request_sha256) do nothing returning request_id`,
      [
        requestId,input.workspaceId,normalized.canonicalTenantKey,normalized.sourceApplicationId,
        normalized.sourceRecordId,normalized.customerRecordId,normalized.channel,normalized.templateKey,
        normalized.consentBasis,normalized.requestedAt,normalized.scheduledAt,normalized.subject,
        normalized.contentSummary,JSON.stringify(normalized.portableRecord),normalized.requestSha256,
        row?.consent_id ?? null,consentDecision.code,userId
      ]
    );
    let resolvedId = result.rows[0]?.request_id ? String(result.rows[0].request_id) : "";
    if (!resolvedId) {
      const existing = await client.query<{ request_id: string }>(
        `select request_id from app.notification_requests
         where workspace_id=$1 and request_sha256=$2 limit 1`,
        [input.workspaceId,normalized.requestSha256]
      );
      resolvedId = existing.rows[0]?.request_id ?? "";
    }
    if (!resolvedId) throw new Error("notification_request_conflict");
    await client.query(
      `insert into app.notification_consent_audit
       (audit_id,workspace_id,actor_user_id,action,request_id,details)
       values ($1,$2,$3,'notification-request-prepared',$4,$5::jsonb)`,
      [randomUUID(),input.workspaceId,userId,resolvedId,JSON.stringify({
        channel: normalized.channel,
        consentCheck: consentDecision.code,
        requestSha256: normalized.requestSha256,
        operatorApplicationId: "rosevear-comms-hub",
        dispatched: false
      })]
    );
    return { requestId: resolvedId, consentCheck: consentDecision.code, ...normalized };
  });
}

export async function reviewNotificationRequest(userId: string, input: {
  requestId: string;
  decision: "approve" | "reject";
  reason: string;
}) {
  if (!safeNotificationReviewReason(input.reason)) {
    throw new Error("notification_review_reason_invalid");
  }
  return withUserDatabase(userId, async (client) => {
    const request = await client.query(
      `select * from app.notification_requests where request_id=$1 limit 1`,
      [input.requestId]
    );
    const row = request.rows[0];
    if (!row) throw new Error("notification_request_not_found");
    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);
    if (input.decision === "approve" && String(row.consent_check) !== "consent-granted") {
      throw new Error("notification_consent_not_granted");
    }
    const reviewId = randomUUID();
    await client.query(
      `insert into app.notification_request_reviews
       (review_id,workspace_id,request_id,decision,reason,reviewed_by)
       values ($1,$2,$3,$4,$5,$6)`,
      [reviewId,workspaceId,input.requestId,input.decision,input.reason.trim(),userId]
    );
    await client.query(
      `insert into app.notification_consent_audit
       (audit_id,workspace_id,actor_user_id,action,request_id,review_id,details)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [randomUUID(),workspaceId,userId,input.decision === "approve" ? "request-approved-for-future-operator-handoff" : "request-rejected",
       input.requestId,reviewId,JSON.stringify({ dispatchOccurred:false, state:"held" })]
    );
    return { reviewId, requestId: input.requestId, decision: input.decision, state: "held" as const };
  });
}

export async function recordNotificationDeliveryEvidence(userId: string, input: {
  requestId: string;
  status: "not-dispatched" | "external-evidence-only";
  providerMessageId?: string | null;
  observedAt: string;
}) {
  return withUserDatabase(userId, async (client) => {
    const request = await client.query(`select workspace_id from app.notification_requests where request_id=$1 limit 1`,[input.requestId]);
    const workspaceId = request.rows[0]?.workspace_id ? String(request.rows[0].workspace_id) : "";
    if (!workspaceId) throw new Error("notification_request_not_found");
    await requireWorkspaceAdmin(client, workspaceId);
    const observed = new Date(input.observedAt);
    if (!Number.isFinite(observed.getTime())) throw new Error("notification_evidence_observed_at_invalid");
    const providerMessageId = input.providerMessageId?.trim() || null;
    const evidenceSha256 = sha256(JSON.stringify({
      requestId: input.requestId,
      status: input.status,
      providerMessageId,
      observedAt: observed.toISOString(),
      operatorApplicationId: "rosevear-comms-hub"
    }));
    const evidenceId = randomUUID();
    await client.query(
      `insert into app.notification_delivery_evidence
       (evidence_id,workspace_id,request_id,status,provider_message_id,observed_at,evidence_sha256,recorded_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [evidenceId,workspaceId,input.requestId,input.status,providerMessageId,observed.toISOString(),evidenceSha256,userId]
    );
    return { evidenceId, requestId: input.requestId, evidenceSha256 };
  });
}
