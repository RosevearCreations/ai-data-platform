import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  fingerprintCustomerIdentity,
  isCustomerIdentitySourceApplication,
  matchCustomerIdentityEvidence,
  normalizeCustomerIdentityRecordId,
  normalizeCustomerIdentityRecordVersion,
  normalizeCustomerIdentityTenantKey,
  safeCustomerIdentityReviewReason,
  type CustomerIdentityMatchRule,
  type CustomerIdentitySourceApplication
} from "./customer-identity-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

export interface CustomerIdentityObservationRecord {
  observationId: string;
  workspaceId: string;
  sourceApplicationId: CustomerIdentitySourceApplication;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  emailSha256: string | null;
  phoneSha256: string | null;
  nameSha256: string | null;
  postalSha256: string | null;
  evidenceSha256: string;
  observedAt: Date;
}

export interface CustomerIdentityCandidateRecord {
  candidateId: string;
  workspaceId: string;
  canonicalTenantKey: string;
  observationAId: string;
  observationBId: string;
  sourceApplicationA: CustomerIdentitySourceApplication;
  sourceRecordA: string;
  sourceApplicationB: CustomerIdentitySourceApplication;
  sourceRecordB: string;
  matchRule: CustomerIdentityMatchRule;
  confidenceScore: number;
  evidenceFields: string[];
  decision: "accept" | "reject" | null;
  decisionReason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}

function observationRow(
  row: Record<string, unknown>
): CustomerIdentityObservationRecord {
  const sourceApplicationId = String(row.source_application_id);
  if (!isCustomerIdentitySourceApplication(sourceApplicationId)) {
    throw new Error("customer_identity_source_application_invalid");
  }
  return {
    observationId: String(row.observation_id),
    workspaceId: String(row.workspace_id),
    sourceApplicationId,
    canonicalTenantKey: String(row.canonical_tenant_key),
    sourceRecordId: String(row.source_record_id),
    sourceRecordVersion:
      row.source_record_version === null ||
      row.source_record_version === undefined
        ? null
        : String(row.source_record_version),
    emailSha256:
      row.email_sha256 === null || row.email_sha256 === undefined
        ? null
        : String(row.email_sha256),
    phoneSha256:
      row.phone_sha256 === null || row.phone_sha256 === undefined
        ? null
        : String(row.phone_sha256),
    nameSha256:
      row.name_sha256 === null || row.name_sha256 === undefined
        ? null
        : String(row.name_sha256),
    postalSha256:
      row.postal_sha256 === null || row.postal_sha256 === undefined
        ? null
        : String(row.postal_sha256),
    evidenceSha256: String(row.evidence_sha256),
    observedAt: new Date(String(row.observed_at))
  };
}

function candidateRow(
  row: Record<string, unknown>
): CustomerIdentityCandidateRecord {
  const sourceApplicationA = String(row.source_application_a);
  const sourceApplicationB = String(row.source_application_b);
  if (
    !isCustomerIdentitySourceApplication(sourceApplicationA) ||
    !isCustomerIdentitySourceApplication(sourceApplicationB)
  ) {
    throw new Error("customer_identity_source_application_invalid");
  }
  const rule = String(row.match_rule) as CustomerIdentityMatchRule;
  return {
    candidateId: String(row.candidate_id),
    workspaceId: String(row.workspace_id),
    canonicalTenantKey: String(row.canonical_tenant_key),
    observationAId: String(row.observation_a_id),
    observationBId: String(row.observation_b_id),
    sourceApplicationA,
    sourceRecordA: String(row.source_record_a),
    sourceApplicationB,
    sourceRecordB: String(row.source_record_b),
    matchRule: rule,
    confidenceScore: Number(row.confidence_score),
    evidenceFields: Array.isArray(row.evidence_fields)
      ? row.evidence_fields.map(String)
      : [],
    decision:
      row.decision === "accept" || row.decision === "reject"
        ? row.decision
        : null,
    decisionReason:
      row.reason === null || row.reason === undefined
        ? null
        : String(row.reason),
    decidedAt:
      row.decided_at === null || row.decided_at === undefined
        ? null
        : new Date(String(row.decided_at)),
    createdAt: new Date(String(row.created_at))
  };
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
    throw new Error("workspace_admin_required");
  }
}

async function appendCustomerIdentityAudit(
  client: PoolClient,
  input: {
    workspaceId: string;
    userId: string;
    action:
      | "observation-recorded"
      | "candidate-created"
      | "match-accepted"
      | "match-rejected"
      | "observation-linked";
    observationId?: string | null;
    candidateId?: string | null;
    groupId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.customer_identity_audit (
      audit_id,workspace_id,actor_user_id,action,
      observation_id,candidate_id,group_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId,
      input.action,
      input.observationId ?? null,
      input.candidateId ?? null,
      input.groupId ?? null,
      JSON.stringify(input.details ?? {})
    ]
  );
}

async function generateCandidatesForObservation(
  client: PoolClient,
  userId: string,
  observation: CustomerIdentityObservationRecord
) {
  const possible = await client.query(
    `select *
     from app.customer_identity_observations
     where workspace_id=$1
       and canonical_tenant_key=$2
       and observation_id<>$3
       and source_application_id<>$4
       and (
         ($5::text is not null and email_sha256=$5)
         or ($6::text is not null and phone_sha256=$6)
         or (
           $7::text is not null
           and $8::text is not null
           and name_sha256=$7
           and postal_sha256=$8
         )
       )
     order by observed_at desc
     limit 500`,
    [
      observation.workspaceId,
      observation.canonicalTenantKey,
      observation.observationId,
      observation.sourceApplicationId,
      observation.emailSha256,
      observation.phoneSha256,
      observation.nameSha256,
      observation.postalSha256
    ]
  );

  const created: string[] = [];
  for (const raw of possible.rows) {
    const other = observationRow(raw);
    const match = matchCustomerIdentityEvidence(
      observation,
      other
    );
    if (!match) continue;

    const [observationAId, observationBId] =
      observation.observationId < other.observationId
        ? [observation.observationId, other.observationId]
        : [other.observationId, observation.observationId];

    const candidateId = randomUUID();
    const result = await client.query<{ candidate_id: string }>(
      `insert into app.customer_identity_candidates (
        candidate_id,workspace_id,canonical_tenant_key,
        observation_a_id,observation_b_id,match_rule,
        confidence_score,evidence_fields,state,created_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8::text[],
        'pending-review',$9
      )
      on conflict (observation_a_id,observation_b_id)
      do nothing
      returning candidate_id`,
      [
        candidateId,
        observation.workspaceId,
        observation.canonicalTenantKey,
        observationAId,
        observationBId,
        match.rule,
        match.confidenceScore,
        match.evidenceFields,
        userId
      ]
    );
    const insertedId = result.rows[0]?.candidate_id;
    if (!insertedId) continue;

    created.push(insertedId);
    await appendCustomerIdentityAudit(client, {
      workspaceId: observation.workspaceId,
      userId,
      action: "candidate-created",
      candidateId: insertedId,
      details: {
        matchRule: match.rule,
        confidenceScore: match.confidenceScore,
        evidenceFields: match.evidenceFields,
        automaticMerge: false,
        ownerReviewRequired: true
      }
    });
  }
  return created;
}

export async function listCustomerIdentityForUser(
  userId: string
) {
  const workspaces = await listWorkspacesForUser(userId);

  const state = await withUserDatabase(
    userId,
    async (client) => {
      const [observations, candidates, groups] =
        await Promise.all([
          client.query(
            `select *
             from app.customer_identity_observations
             order by observed_at desc
             limit 500`
          ),
          client.query(
            `select
               c.*,
               oa.source_application_id as source_application_a,
               oa.source_record_id as source_record_a,
               ob.source_application_id as source_application_b,
               ob.source_record_id as source_record_b,
               d.decision,d.reason,d.decided_at
             from app.customer_identity_candidates c
             inner join app.customer_identity_observations oa
               on oa.observation_id=c.observation_a_id
             inner join app.customer_identity_observations ob
               on ob.observation_id=c.observation_b_id
             left join app.customer_identity_decisions d
               on d.candidate_id=c.candidate_id
             order by
               case when d.decision is null then 0 else 1 end,
               c.confidence_score desc,
               c.created_at desc
             limit 500`
          ),
          client.query(
            `select
               g.group_id,g.workspace_id,g.created_at,
               count(l.link_id)::int as member_count,
               coalesce(
                 array_agg(
                   distinct o.source_application_id
                   order by o.source_application_id
                 ) filter (where o.source_application_id is not null),
                 array[]::text[]
               ) as applications
             from app.customer_identity_groups g
             left join app.customer_identity_links l
               on l.group_id=g.group_id
             left join app.customer_identity_observations o
               on o.observation_id=l.observation_id
             group by g.group_id,g.workspace_id,g.created_at
             order by g.created_at desc
             limit 300`
          )
        ]);

      return {
        observations: observations.rows.map(observationRow),
        candidates: candidates.rows.map(candidateRow),
        groups: groups.rows.map((row) => ({
          groupId: String(row.group_id),
          workspaceId: String(row.workspace_id),
          memberCount: Number(row.member_count),
          applications: Array.isArray(row.applications)
            ? row.applications.map(String)
            : [],
          createdAt: new Date(String(row.created_at))
        }))
      };
    }
  );

  return {
    workspaces,
    ...state,
    summary: {
      observations: state.observations.length,
      pendingCandidates: state.candidates.filter(
        (item) => item.decision === null
      ).length,
      acceptedCandidates: state.candidates.filter(
        (item) => item.decision === "accept"
      ).length,
      rejectedCandidates: state.candidates.filter(
        (item) => item.decision === "reject"
      ).length,
      identityGroups: state.groups.length
    },
    policy: {
      rawContactValuesPersisted: false,
      exactEvidenceRulesOnly: true,
      fuzzyMatching: false,
      crossTenantMatching: false,
      crossApplicationOnly: true,
      automaticMerge: false,
      ownerAdminReviewRequired: true,
      outboundNetworkRequests: false,
      ql266Resumed: false
    }
  };
}

export async function recordCustomerIdentityObservation(
  userId: string,
  input: {
    workspaceId: string;
    sourceApplicationId: string;
    canonicalTenantKey: string;
    sourceRecordId: string;
    sourceRecordVersion?: string | null;
    email?: string | null;
    phone?: string | null;
    displayName?: string | null;
    postalCode?: string | null;
  }
) {
  if (!isCustomerIdentitySourceApplication(input.sourceApplicationId)) {
    throw new Error("customer_identity_source_application_invalid");
  }
  const canonicalTenantKey =
    normalizeCustomerIdentityTenantKey(
      input.canonicalTenantKey
    );
  const sourceRecordId =
    normalizeCustomerIdentityRecordId(
      input.sourceRecordId
    );
  const sourceRecordVersion =
    normalizeCustomerIdentityRecordVersion(
      input.sourceRecordVersion
    );
  const fingerprint = fingerprintCustomerIdentity({
    sourceApplicationId: input.sourceApplicationId,
    canonicalTenantKey,
    sourceRecordId,
    sourceRecordVersion,
    email: input.email,
    phone: input.phone,
    displayName: input.displayName,
    postalCode: input.postalCode
  });

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);

    const observationId = randomUUID();
    const inserted = await client.query(
      `insert into app.customer_identity_observations (
        observation_id,workspace_id,source_application_id,
        canonical_tenant_key,source_record_id,source_record_version,
        email_sha256,phone_sha256,name_sha256,postal_sha256,
        evidence_sha256,observed_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      on conflict (
        workspace_id,source_application_id,canonical_tenant_key,
        source_record_id,evidence_sha256
      ) do nothing
      returning *`,
      [
        observationId,
        input.workspaceId,
        input.sourceApplicationId,
        canonicalTenantKey,
        sourceRecordId,
        sourceRecordVersion,
        fingerprint.emailSha256,
        fingerprint.phoneSha256,
        fingerprint.nameSha256,
        fingerprint.postalSha256,
        fingerprint.evidenceSha256,
        userId
      ]
    );

    let observation = inserted.rows[0]
      ? observationRow(inserted.rows[0])
      : null;

    if (!observation) {
      const existing = await client.query(
        `select *
         from app.customer_identity_observations
         where workspace_id=$1
           and source_application_id=$2
           and canonical_tenant_key=$3
           and source_record_id=$4
           and evidence_sha256=$5
         limit 1`,
        [
          input.workspaceId,
          input.sourceApplicationId,
          canonicalTenantKey,
          sourceRecordId,
          fingerprint.evidenceSha256
        ]
      );
      if (!existing.rows[0]) {
        throw new Error(
          "customer_identity_observation_conflict"
        );
      }
      observation = observationRow(existing.rows[0]);
    }

    if (inserted.rows[0]) {
      await appendCustomerIdentityAudit(client, {
        workspaceId: input.workspaceId,
        userId,
        action: "observation-recorded",
        observationId: observation.observationId,
        details: {
          sourceApplicationId: input.sourceApplicationId,
          canonicalTenantKey,
          sourceRecordId,
          evidenceFields: fingerprint.evidenceFields,
          rawContactValuesPersisted: false
        }
      });
    }

    const candidateIds =
      await generateCandidatesForObservation(
        client,
        userId,
        observation
      );

    return {
      observationId: observation.observationId,
      observationCreated: Boolean(inserted.rows[0]),
      candidateIds,
      rawContactValuesPersisted: false,
      automaticMerge: false
    };
  });
}

export async function reviewCustomerIdentityCandidate(
  userId: string,
  input: {
    candidateId: string;
    decision: "accept" | "reject";
    reason: string;
  }
) {
  const reason = input.reason.trim();
  if (
    input.decision !== "accept" &&
    input.decision !== "reject"
  ) {
    throw new Error("customer_identity_decision_invalid");
  }
  if (!safeCustomerIdentityReviewReason(reason)) {
    throw new Error("customer_identity_review_reason_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const result = await client.query(
      `select
         c.candidate_id,c.workspace_id,
         c.observation_a_id,c.observation_b_id
       from app.customer_identity_candidates c
       where c.candidate_id=$1
       limit 1
       for share of c`,
      [input.candidateId]
    );
    const candidate = result.rows[0];
    if (!candidate) {
      throw new Error("customer_identity_candidate_not_found");
    }
    const workspaceId = String(candidate.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    const existingDecision = await client.query(
      `select decision
       from app.customer_identity_decisions
       where candidate_id=$1
       limit 1`,
      [input.candidateId]
    );
    if (existingDecision.rows[0]) {
      throw new Error(
        "customer_identity_candidate_already_decided"
      );
    }

    let groupId: string | null = null;
    const linkedObservationIds: string[] = [];

    if (input.decision === "accept") {
      const observationIds = [
        String(candidate.observation_a_id),
        String(candidate.observation_b_id)
      ];
      const links = await client.query<{
        observation_id: string;
        group_id: string;
      }>(
        `select observation_id,group_id
         from app.customer_identity_links
         where observation_id=any($1::uuid[])`,
        [observationIds]
      );
      const groups = Array.from(
        new Set(links.rows.map((row) => row.group_id))
      );
      if (groups.length > 1) {
        throw new Error(
          "customer_identity_group_conflict_requires_manual_resolution"
        );
      }

      groupId = groups[0] ?? randomUUID();
      if (!groups.length) {
        await client.query(
          `insert into app.customer_identity_groups (
            group_id,workspace_id,created_from_candidate_id,
            created_by
          ) values ($1,$2,$3,$4)`,
          [
            groupId,
            workspaceId,
            input.candidateId,
            userId
          ]
        );
      }

      const alreadyLinked = new Set(
        links.rows.map((row) => row.observation_id)
      );
      for (const observationId of observationIds) {
        if (alreadyLinked.has(observationId)) continue;
        const link = await client.query(
          `insert into app.customer_identity_links (
            link_id,workspace_id,group_id,observation_id,
            linked_by
          ) values ($1,$2,$3,$4,$5)
          on conflict (observation_id) do nothing
          returning link_id`,
          [
            randomUUID(),
            workspaceId,
            groupId,
            observationId,
            userId
          ]
        );
        if (!link.rows[0]) {
          throw new Error(
            "customer_identity_observation_link_conflict"
          );
        }
        linkedObservationIds.push(observationId);
        await appendCustomerIdentityAudit(client, {
          workspaceId,
          userId,
          action: "observation-linked",
          observationId,
          candidateId: input.candidateId,
          groupId,
          details: {
            ownerReviewed: true,
            automaticMerge: false
          }
        });
      }
    }

    const decisionId = randomUUID();
    await client.query(
      `insert into app.customer_identity_decisions (
        decision_id,workspace_id,candidate_id,decision,
        reason,decided_by
      ) values ($1,$2,$3,$4,$5,$6)`,
      [
        decisionId,
        workspaceId,
        input.candidateId,
        input.decision,
        reason,
        userId
      ]
    );

    await appendCustomerIdentityAudit(client, {
      workspaceId,
      userId,
      action:
        input.decision === "accept"
          ? "match-accepted"
          : "match-rejected",
      candidateId: input.candidateId,
      groupId,
      details: {
        decision: input.decision,
        reason,
        linkedObservationCount: linkedObservationIds.length,
        automaticMerge: false,
        outboundNetworkRequests: false
      }
    });

    return {
      decisionId,
      candidateId: input.candidateId,
      decision: input.decision,
      groupId,
      linkedObservationIds,
      automaticMerge: false,
      outboundNetworkRequests: false
    };
  });
}
