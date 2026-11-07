import { randomUUID } from "node:crypto";

import {
  buildSharedApplicationIdentityMap
} from "./application-identity-mapping";
import {
  buildAppConnectionRegistry,
  type PeerApplicationId
} from "./app-connection-registry";
import {
  assertSixAppCertificationShape,
  evaluateApplicationCertification,
  summarizeIntegrationCertification,
  type IntegrationCertificationAssertion,
  type IntegrationCertificationDimension,
  type IntegrationCertificationEvidence
} from "./integration-certification-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

const EVIDENCE_WINDOW_DAYS = 30;

type EvidenceRefs = Partial<
  Record<IntegrationCertificationDimension, string[]>
>;

type RawRow = Record<string, unknown>;

function stringValue(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function dateIso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function pushRef(
  refs: EvidenceRefs,
  dimension: IntegrationCertificationDimension,
  value: unknown
) {
  const id = stringValue(value);
  if (!id) return;
  const current = refs[dimension] ?? [];
  if (!current.includes(id) && current.length < 20) current.push(id);
  refs[dimension] = current;
}

function emptyEvidence(applicationId: PeerApplicationId): IntegrationCertificationEvidence {
  return {
    applicationId,
    authentication: {
      acceptedVerified: 0,
      acceptedUnverified: 0,
      deniedAuthentication: 0
    },
    approvedExchange: {
      approvedHeldIntents: 0,
      invalidUnheldIntents: 0
    },
    eventHandling: {
      publishedFromAcceptedReceipt: 0,
      publicationReceiptMismatch: 0
    },
    failureRecovery: {
      heldReplayRoutes: 0,
      successfulSafeRecoveryAttempts: 0,
      invalidReleasedReplayRoutes: 0
    },
    tenantIsolation: {
      matchedTenantAccepted: 0,
      acceptedTenantMismatch: 0,
      tenantMismatchDenied: 0,
      uniqueCanonicalTenantKey: false
    }
  };
}

function isTenantMatch(left: unknown, right: unknown) {
  return stringValue(left) === stringValue(right);
}

function businessApplicationMap() {
  const identities = buildSharedApplicationIdentityMap().applications;
  return new Map(
    identities
      .filter(item => item.gatewayBusinessId)
      .map(item => [String(item.gatewayBusinessId), item.applicationId])
  );
}

function workspaceApplicationMap() {
  const identities = buildSharedApplicationIdentityMap().applications;
  return new Map(
    identities
      .filter(item => item.workspace.state === "mapped")
      .map(item => [item.workspace.workspaceId, item.applicationId])
  );
}

function canonicalTenantUniqueness() {
  const identities = buildSharedApplicationIdentityMap().applications;
  const counts = new Map<string, number>();
  for (const item of identities) {
    counts.set(
      item.canonicalTenantKey,
      (counts.get(item.canonicalTenantKey) ?? 0) + 1
    );
  }
  return new Map(
    identities.map(item => [
      item.applicationId,
      counts.get(item.canonicalTenantKey) === 1
    ])
  );
}

async function collectCertificationEvidence(userId: string) {
  const registry = buildAppConnectionRegistry();
  const applications = registry.peerApplications.map(item => item.id);
  const evidence = new Map(
    applications.map(applicationId => [
      applicationId,
      emptyEvidence(applicationId)
    ])
  );
  const refs = new Map(
    applications.map(applicationId => [
      applicationId,
      {} as EvidenceRefs
    ])
  );

  const rows = await withUserDatabase(userId, async client => {
    const [
      webhookAudit,
      webhookReceipts,
      publications,
      workflowIntents,
      replayRoutes,
      recoveryAttempts,
      integrationV1
    ] = await Promise.all([
      client.query(
        `select
           a.audit_id,a.outcome,a.reason_code,a.identity_verified,a.occurred_at,
           e.source_application_id,e.tenant_id as endpoint_tenant_id
         from app.webhook_request_audit a
         join app.webhook_endpoints e on e.endpoint_id=a.endpoint_id
         where a.occurred_at >= now()-($1::text||' days')::interval
         order by a.occurred_at desc
         limit 3000`,
        [EVIDENCE_WINDOW_DAYS]
      ),
      client.query(
        `select
           r.receipt_id,r.source_application_id,r.tenant_id as receipt_tenant_id,
           r.received_at,e.tenant_id as endpoint_tenant_id
         from app.webhook_receipts r
         join app.webhook_endpoints e on e.endpoint_id=r.endpoint_id
         where r.received_at >= now()-($1::text||' days')::interval
         order by r.received_at desc
         limit 3000`,
        [EVIDENCE_WINDOW_DAYS]
      ),
      client.query(
        `select
           p.publication_id,p.source_application_id,p.event_id,p.body_sha256,
           p.tenant_id as publication_tenant_id,p.published_at,
           r.receipt_id,r.source_application_id as receipt_source_application_id,
           r.event_id as receipt_event_id,r.body_sha256 as receipt_body_sha256,
           r.tenant_id as receipt_tenant_id
         from app.event_bus_publications p
         join app.webhook_receipts r on r.receipt_id=p.webhook_receipt_id
         where p.published_at >= now()-($1::text||' days')::interval
         order by p.published_at desc
         limit 3000`,
        [EVIDENCE_WINDOW_DAYS]
      ),
      client.query(
        `select
           i.intent_id,i.source_application_id,i.destination_application_id,
           i.state,i.hold_reason,i.created_at,r.decision,r.review_id
         from app.workflow_automation_action_intents i
         join app.workflow_automation_rule_reviews r
           on r.review_id=i.rule_review_id
         where i.created_at >= now()-($1::text||' days')::interval
         order by i.created_at desc
         limit 3000`,
        [EVIDENCE_WINDOW_DAYS]
      ),
      client.query(
        `select
           rr.replay_route_id,rr.state,rr.hold_reason,rr.created_at,
           p.source_application_id,s.destination_application_id
         from app.event_bus_replay_routes rr
         join app.event_bus_publications p
           on p.publication_id=rr.publication_id
         join app.event_bus_subscriptions s
           on s.subscription_id=rr.subscription_id
         where rr.created_at >= now()-($1::text||' days')::interval
         order by rr.created_at desc
         limit 3000`,
        [EVIDENCE_WINDOW_DAYS]
      ),
      client.query(
        `select
           a.attempt_id,a.outcome,a.attempted_at,p.workspace_id
         from app.integration_recovery_attempts a
         join app.integration_recovery_plans p on p.plan_id=a.plan_id
         where a.attempted_at >= now()-($1::text||' days')::interval
         order by a.attempted_at desc
         limit 3000`,
        [EVIDENCE_WINDOW_DAYS]
      ),
      client.query(
        `select
           a.audit_id,a.connection_id,a.business_id,a.tenant_id,
           a.outcome,a.reason_code,a.identity_verified,a.occurred_at,
           c.tenant_id as configured_tenant_id
         from app.integration_v1_request_audit a
         left join app.integration_v1_connections c
           on c.connection_id=a.connection_id
         where a.occurred_at >= now()-($1::text||' days')::interval
         order by a.occurred_at desc
         limit 3000`,
        [EVIDENCE_WINDOW_DAYS]
      )
    ]);
    return {
      webhookAudit: webhookAudit.rows as RawRow[],
      webhookReceipts: webhookReceipts.rows as RawRow[],
      publications: publications.rows as RawRow[],
      workflowIntents: workflowIntents.rows as RawRow[],
      replayRoutes: replayRoutes.rows as RawRow[],
      recoveryAttempts: recoveryAttempts.rows as RawRow[],
      integrationV1: integrationV1.rows as RawRow[]
    };
  });

  const knownApplications = new Set(applications);
  const businessMap = businessApplicationMap();
  const workspaceMap = workspaceApplicationMap();
  const tenantUnique = canonicalTenantUniqueness();

  for (const applicationId of applications) {
    evidence.get(applicationId)!.tenantIsolation.uniqueCanonicalTenantKey =
      tenantUnique.get(applicationId) === true;
  }

  for (const row of rows.webhookAudit) {
    const applicationId = String(row.source_application_id) as PeerApplicationId;
    if (!knownApplications.has(applicationId)) continue;
    const item = evidence.get(applicationId)!;
    const itemRefs = refs.get(applicationId)!;
    if (row.outcome === "accepted") {
      if (row.identity_verified === true) item.authentication.acceptedVerified++;
      else item.authentication.acceptedUnverified++;
      pushRef(itemRefs, "authentication", row.audit_id);
    } else {
      if (
        /auth|identity|signature|secret|credential|key/i.test(
          String(row.reason_code ?? "")
        )
      ) {
        item.authentication.deniedAuthentication++;
        pushRef(itemRefs, "authentication", row.audit_id);
      }
      if (String(row.reason_code) === "webhook_tenant_mismatch") {
        item.tenantIsolation.tenantMismatchDenied++;
        pushRef(itemRefs, "tenant-isolation", row.audit_id);
      }
    }
  }

  for (const row of rows.webhookReceipts) {
    const applicationId = String(row.source_application_id) as PeerApplicationId;
    if (!knownApplications.has(applicationId)) continue;
    const item = evidence.get(applicationId)!;
    const itemRefs = refs.get(applicationId)!;
    if (
      row.receipt_tenant_id !== null &&
      isTenantMatch(row.receipt_tenant_id, row.endpoint_tenant_id)
    ) {
      item.tenantIsolation.matchedTenantAccepted++;
      pushRef(itemRefs, "tenant-isolation", row.receipt_id);
    }
    if (!isTenantMatch(row.receipt_tenant_id, row.endpoint_tenant_id)) {
      item.tenantIsolation.acceptedTenantMismatch++;
      pushRef(itemRefs, "tenant-isolation", row.receipt_id);
    }
  }

  for (const row of rows.publications) {
    const applicationId = String(row.source_application_id) as PeerApplicationId;
    if (!knownApplications.has(applicationId)) continue;
    const item = evidence.get(applicationId)!;
    const itemRefs = refs.get(applicationId)!;
    const matches =
      String(row.source_application_id) ===
        String(row.receipt_source_application_id) &&
      String(row.event_id) === String(row.receipt_event_id) &&
      String(row.body_sha256) === String(row.receipt_body_sha256) &&
      isTenantMatch(row.publication_tenant_id, row.receipt_tenant_id);
    if (matches) item.eventHandling.publishedFromAcceptedReceipt++;
    else item.eventHandling.publicationReceiptMismatch++;
    pushRef(itemRefs, "event-handling", row.publication_id);
    pushRef(itemRefs, "event-handling", row.receipt_id);
  }

  for (const row of rows.workflowIntents) {
    const related = [
      String(row.source_application_id),
      String(row.destination_application_id)
    ] as PeerApplicationId[];
    for (const applicationId of related) {
      if (!knownApplications.has(applicationId)) continue;
      const item = evidence.get(applicationId)!;
      const itemRefs = refs.get(applicationId)!;
      if (
        row.decision === "approve" &&
        row.state === "held" &&
        row.hold_reason === "workflow-action-not-authorized"
      ) {
        item.approvedExchange.approvedHeldIntents++;
      } else if (row.decision === "approve") {
        item.approvedExchange.invalidUnheldIntents++;
      }
      pushRef(itemRefs, "approved-exchange", row.intent_id);
      pushRef(itemRefs, "approved-exchange", row.review_id);
    }
  }

  for (const row of rows.replayRoutes) {
    const related = [
      String(row.source_application_id),
      String(row.destination_application_id)
    ] as PeerApplicationId[];
    for (const applicationId of related) {
      if (!knownApplications.has(applicationId)) continue;
      const item = evidence.get(applicationId)!;
      const itemRefs = refs.get(applicationId)!;
      if (
        row.state === "held" &&
        row.hold_reason === "recovery-replay-not-authorized"
      ) {
        item.failureRecovery.heldReplayRoutes++;
      } else {
        item.failureRecovery.invalidReleasedReplayRoutes++;
      }
      pushRef(itemRefs, "failure-recovery", row.replay_route_id);
    }
  }

  for (const row of rows.recoveryAttempts) {
    const applicationId = workspaceMap.get(String(row.workspace_id));
    if (!applicationId || !knownApplications.has(applicationId)) continue;
    if (row.outcome === "succeeded") {
      evidence.get(applicationId)!.failureRecovery.successfulSafeRecoveryAttempts++;
      pushRef(refs.get(applicationId)!, "failure-recovery", row.attempt_id);
    }
  }

  for (const row of rows.integrationV1) {
    const applicationId = businessMap.get(String(row.business_id));
    if (!applicationId || !knownApplications.has(applicationId)) continue;
    const item = evidence.get(applicationId)!;
    const itemRefs = refs.get(applicationId)!;

    if (row.outcome === "accepted") {
      if (row.identity_verified === true) item.authentication.acceptedVerified++;
      else item.authentication.acceptedUnverified++;
      pushRef(itemRefs, "authentication", row.audit_id);

      if (
        row.tenant_id !== null &&
        row.configured_tenant_id !== undefined &&
        isTenantMatch(row.tenant_id, row.configured_tenant_id)
      ) {
        item.tenantIsolation.matchedTenantAccepted++;
        pushRef(itemRefs, "tenant-isolation", row.audit_id);
      }
      if (
        row.configured_tenant_id !== undefined &&
        !isTenantMatch(row.tenant_id, row.configured_tenant_id)
      ) {
        item.tenantIsolation.acceptedTenantMismatch++;
        pushRef(itemRefs, "tenant-isolation", row.audit_id);
      }
    } else {
      if (
        /auth|identity|signature|credential|key|nonce|stale/i.test(
          String(row.reason_code ?? "")
        )
      ) {
        item.authentication.deniedAuthentication++;
        pushRef(itemRefs, "authentication", row.audit_id);
      }
      if (String(row.reason_code) === "cross_tenant_denied") {
        item.tenantIsolation.tenantMismatchDenied++;
        pushRef(itemRefs, "tenant-isolation", row.audit_id);
      }
    }
  }

  const assertions = applications.flatMap(applicationId =>
    evaluateApplicationCertification(
      evidence.get(applicationId)!,
      refs.get(applicationId)
    )
  );
  assertSixAppCertificationShape(applications, assertions);

  return {
    applications,
    assertions,
    summary: summarizeIntegrationCertification(assertions),
    evidence: applications.map(applicationId => evidence.get(applicationId)!),
    refs
  };
}

function runRow(row: RawRow) {
  return {
    runId: String(row.run_id),
    suiteVersion: String(row.suite_version),
    applicationsExpected: Number(row.applications_expected),
    checksExpected: Number(row.checks_expected),
    evidenceWindowDays: Number(row.evidence_window_days),
    passedCount: Number(row.passed_count),
    failedCount: Number(row.failed_count),
    blockedCount: Number(row.blocked_count),
    overallOutcome: String(row.overall_outcome) as "passed" | "failed" | "blocked",
    generatedBy: String(row.generated_by),
    generatedAt: dateIso(row.generated_at)
  };
}

function assertionRow(row: RawRow): IntegrationCertificationAssertion & {
  assertionId: string;
  runId: string;
  checkedAt: string;
} {
  return {
    assertionId: String(row.assertion_id),
    runId: String(row.run_id),
    applicationId: String(row.application_id) as PeerApplicationId,
    dimension: String(row.dimension) as IntegrationCertificationDimension,
    outcome: String(row.outcome) as "pass" | "fail" | "blocked",
    evidenceCode: String(row.evidence_code),
    evidenceRefs: Array.isArray(row.evidence_refs)
      ? row.evidence_refs.map(String)
      : [],
    detail: String(row.detail),
    checkedAt: dateIso(row.checked_at)
  };
}

export async function listIntegrationCertificationForUser(userId: string) {
  const registry = buildAppConnectionRegistry();
  const identity = buildSharedApplicationIdentityMap();
  const state = await withUserDatabase(userId, async client => {
    const [runs, assertions] = await Promise.all([
      client.query(
        `select * from app.integration_certification_runs
         order by generated_at desc
         limit 30`
      ),
      client.query(
        `select * from app.integration_certification_assertions
         where run_id in (
           select run_id from app.integration_certification_runs
           order by generated_at desc
           limit 30
         )
         order by checked_at desc,application_id,dimension`
      )
    ]);
    return {
      runs: runs.rows.map(runRow),
      assertions: assertions.rows.map(assertionRow)
    };
  });

  const latest = state.runs[0] ?? null;
  const latestAssertions = latest
    ? state.assertions.filter(item => item.runId === latest.runId)
    : [];

  return {
    schema: "ai-data-platform.six-app-integration-certification.v1" as const,
    build: 304 as const,
    generatedAt: new Date().toISOString(),
    evidenceWindowDays: EVIDENCE_WINDOW_DAYS,
    applications: registry.peerApplications.map(app => {
      const mapped = identity.applications.find(item => item.applicationId === app.id);
      const assertions = latestAssertions.filter(
        item => item.applicationId === app.id
      );
      return {
        applicationId: app.id,
        displayName: app.displayName,
        repository: app.repository,
        canonicalTenantKey: mapped?.canonicalTenantKey ?? null,
        workspaceBindingState: mapped?.workspace.state ?? "unmapped",
        assertions
      };
    }),
    runs: state.runs,
    latestRun: latest,
    latestAssertions,
    policy: {
      exactlySixApplications: true as const,
      exactlyFiveDimensionsPerApplication: true as const,
      missingEvidenceBlocksCertification: true as const,
      contradictoryEvidenceFailsCertification: true as const,
      evidenceIdsOnlyPersisted: true as const,
      rawSecretsPersisted: false as const,
      eventBodiesPersisted: false as const,
      automaticConnectionActivation: false as const,
      heldActionRelease: false as const,
      automaticReplay: false as const,
      destinationExecution: false as const,
      ql266Resumed: false as const
    }
  };
}

export async function runIntegrationCertification(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  if (!workspaces.some(item => item.role === "owner" || item.role === "admin")) {
    throw new Error("integration_certification_owner_admin_required");
  }

  const result = await collectCertificationEvidence(userId);
  const runId = randomUUID();

  await withUserDatabase(userId, async client => {
    await client.query("begin");
    try {
      await client.query(
        `insert into app.integration_certification_runs (
          run_id,suite_version,applications_expected,checks_expected,
          evidence_window_days,passed_count,failed_count,blocked_count,
          overall_outcome,generated_by
        ) values ($1,'304.1',6,30,$2,$3,$4,$5,$6,$7)`,
        [
          runId,
          EVIDENCE_WINDOW_DAYS,
          result.summary.passed,
          result.summary.failed,
          result.summary.blocked,
          result.summary.overallOutcome,
          userId
        ]
      );

      for (const item of result.assertions) {
        await client.query(
          `insert into app.integration_certification_assertions (
            assertion_id,run_id,application_id,dimension,outcome,
            evidence_code,evidence_refs,detail,generated_by
          ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
          [
            randomUUID(),
            runId,
            item.applicationId,
            item.dimension,
            item.outcome,
            item.evidenceCode,
            JSON.stringify(item.evidenceRefs),
            item.detail,
            userId
          ]
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });

  return {
    runId,
    evidenceWindowDays: EVIDENCE_WINDOW_DAYS,
    ...result.summary,
    assertions: result.assertions,
    connectionActivated: false as const,
    heldActionReleased: false as const,
    replayExecuted: false as const,
    destinationActionExecuted: false as const,
    ql266Resumed: false as const
  };
}
