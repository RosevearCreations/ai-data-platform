import { createHash, randomUUID } from "node:crypto";

import { withUserDatabase } from "./database";
import {
  BUILD_415_DELIVERY_AUTHORITY,
  BUILD_415_EVIDENCE_DOMAINS,
  evaluateBuild415Freshness,
  type Build415ApplicationId,
  type Build415EvidenceDomain,
  type Build415FreshnessObservation,
  type Build415RenewalRequest
} from "./master-evidence-freshness-renewal";
import { BUILD_405_APPLICATION_IDS } from "./master-assurance-renewal-security-comms-recertification";

function digest(value: string) {
  return "sha256:" + createHash("sha256").update(value).digest("hex");
}
function validAppId(value: string): value is Build415ApplicationId {
  return BUILD_405_APPLICATION_IDS.includes(value as Build415ApplicationId);
}
function validDomain(value: string): value is Build415EvidenceDomain {
  return BUILD_415_EVIDENCE_DOMAINS.includes(value as Build415EvidenceDomain);
}

export async function listBuild415FreshnessDashboard(
  userId: string,
  nowIso: string
) {
  return withUserDatabase(userId, async (client) => {
    const observations = await client.query<{
      observation_id:string;
      app_id:Build415ApplicationId;
      evidence_domain:Build415EvidenceDomain;
      source_evidence_id:string;
      evidence_digest:string;
      observed_at:string;
      expires_at:string;
      independently_verified:boolean;
      authority_preserved:boolean;
    }>(
      `select distinct on (app_id,evidence_domain)
        observation_id,app_id,evidence_domain,source_evidence_id,evidence_digest,
        observed_at::text,expires_at::text,independently_verified,authority_preserved
       from app.master_build415_evidence_freshness_observations
       order by app_id,evidence_domain,observed_at desc`
    );

    const requests = await client.query<{
      request_id:string;
      app_id:Build415ApplicationId;
      evidence_domain:Build415EvidenceDomain;
      reason_digest:string;
      requested_at:string;
      requester_role:"owner"|"operator";
    }>(
      `select request_id::text,app_id,evidence_domain,reason_digest,
              requested_at::text,requester_role
       from app.master_build415_renewal_requests
       order by requested_at desc
       limit 200`
    );

    const normalizedObservations: Build415FreshnessObservation[] =
      observations.rows.map((row)=>({
        observationId:row.observation_id,
        appId:row.app_id,
        evidenceDomain:row.evidence_domain,
        sourceEvidenceId:row.source_evidence_id,
        evidenceDigest:row.evidence_digest,
        observedAt:new Date(row.observed_at).toISOString(),
        expiresAt:new Date(row.expires_at).toISOString(),
        independentlyVerified:row.independently_verified,
        authorityPreserved:row.authority_preserved
      }));
    const normalizedRequests: Build415RenewalRequest[] =
      requests.rows.map((row)=>({
        requestId:row.request_id,
        appId:row.app_id,
        evidenceDomain:row.evidence_domain,
        reasonDigest:row.reason_digest,
        requestedAt:new Date(row.requested_at).toISOString(),
        requesterRole:row.requester_role
      }));

    return evaluateBuild415Freshness({
      build414SoftwareReleasePresent:true,
      observations:normalizedObservations,
      renewalRequests:normalizedRequests,
      nowIso
    });
  });
}

export async function requestBuild415EvidenceRenewal(input: {
  userId:string;
  appId:string;
  evidenceDomain:string;
  reason:string;
}) {
  const reason = input.reason.trim();
  if (!validAppId(input.appId)) throw new Error("build415_app_invalid");
  if (!validDomain(input.evidenceDomain)) throw new Error("build415_domain_invalid");
  if (reason.length < 8 || reason.length > 500) {
    throw new Error("build415_reason_invalid");
  }

  return withUserDatabase(input.userId, async (client) => {
    const role = await client.query<{role:"owner"|"operator"|null}>(
      "select app.current_master_sysop_role() as role"
    );
    const requesterRole = role.rows[0]?.role;
    if (requesterRole !== "owner" && requesterRole !== "operator") {
      throw new Error("build415_sysop_required");
    }

    const existing = await client.query<{request_id:string}>(
      `select request_id::text
       from app.master_build415_renewal_requests
       where app_id=$1 and evidence_domain=$2
         and requested_at > now() - interval '1 hour'
       order by requested_at desc
       limit 1`,
      [input.appId,input.evidenceDomain]
    );
    if (existing.rows[0]) {
      return {
        requestId:existing.rows[0].request_id,
        appId:input.appId,
        evidenceDomain:input.evidenceDomain,
        state:"ALREADY_QUEUED" as const,
        deliveryAuthority:BUILD_415_DELIVERY_AUTHORITY,
        note:"Existing renewal request reused. Evidence remains unchanged until the source produces a new independently verified receipt."
      };
    }

    const requestId = randomUUID();
    const reasonDigest = digest(reason);
    await client.query(
      `insert into app.master_build415_renewal_requests
       (request_id,app_id,evidence_domain,requester_user_id,requester_role,reason_digest)
       values ($1,$2,$3,$4,$5,$6)`,
      [requestId,input.appId,input.evidenceDomain,input.userId,requesterRole,reasonDigest]
    );

    return {
      requestId,
      appId:input.appId,
      evidenceDomain:input.evidenceDomain,
      state:"QUEUED" as const,
      deliveryAuthority:BUILD_415_DELIVERY_AUTHORITY,
      note:"Renewal intent queued only. The source application retains evidence authority; this request does not make stale evidence fresh."
    };
  });
}
